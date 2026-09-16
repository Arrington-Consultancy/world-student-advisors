import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomBytes } from "node:crypto";

/**
 * The consent redirect: the state must verify before any code is spent,
 * a grant carrying a write scope is refused and never stored, and no token
 * value reaches a URL, the audit log or a response.
 */
vi.mock("../db", () => ({ getDb: async () => null }));
vi.mock("./pipedriveOAuth", async importOriginal => {
  const actual = await importOriginal<typeof import("./pipedriveOAuth")>();
  return { ...actual, exchangeAuthorisationCode: vi.fn(), storeGrant: vi.fn(async () => 42) };
});

const oauth = await import("./pipedriveOAuth");
const { registerPipedriveOAuthRoutes } = await import("./pipedriveOAuthRoutes");
const { clearAuditLog, getAuditLog } = await import("../workforce/audit");

const KEY = randomBytes(32).toString("base64");
const ORIGINAL_ENV = { ...process.env };

type Handler = (req: { query: Record<string, string | undefined> }, res: { redirect: (url: string) => void }) => Promise<void>;
function mount(): Handler {
  let handler: Handler | null = null;
  registerPipedriveOAuthRoutes({ get: (_path: string, h: Handler) => { handler = h; } } as never);
  if (!handler) throw new Error("route not registered");
  return handler;
}
async function call(query: Record<string, string | undefined>): Promise<string> {
  let redirected = "";
  await mount()(({ query }), { redirect: (url: string) => { redirected = url; } });
  return redirected;
}
const TOKENS = { accessToken: "access-token-value-1234567890", refreshToken: "refresh-token-value-1234567890", expiresAt: new Date(Date.now() + 3600_000), apiDomain: "https://worldstudentadvisors.pipedrive.com", scope: "base leads:read deals:read contacts:read search:read" };

beforeEach(() => {
  clearAuditLog();
  process.env.PIPEDRIVE_OAUTH_CLIENT_ID = "a"; process.env.PIPEDRIVE_OAUTH_CLIENT_SECRET = "b"; process.env.PIPEDRIVE_OAUTH_TOKEN_KEY = KEY;
  vi.mocked(oauth.exchangeAuthorisationCode).mockReset();
  vi.mocked(oauth.storeGrant).mockClear();
});
afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

describe("Pipedrive OAuth callback", () => {
  it("registers on the fixed callback path", () => {
    const paths: string[] = [];
    registerPipedriveOAuthRoutes({ get: (p: string) => { paths.push(p); } } as never);
    expect(paths).toEqual(["/api/connectors/pipedrive/callback"]);
  });
  it("sends the browser back with unconfigured when the application variables are absent, spending nothing", async () => {
    delete process.env.PIPEDRIVE_OAUTH_TOKEN_KEY;
    expect(await call({ code: "c", state: "s" })).toBe("/staff-portal?pipedrive=unconfigured");
    expect(oauth.exchangeAuthorisationCode).not.toHaveBeenCalled();
  });
  it("refuses a missing or forged state before exchanging the code", async () => {
    expect(await call({ code: "c" })).toBe("/staff-portal?pipedrive=invalid");
    expect(await call({ code: "c", state: "forged" })).toBe("/staff-portal?pipedrive=state_invalid");
    expect(oauth.exchangeAuthorisationCode).not.toHaveBeenCalled();
  });
  it("reports a user who declined at Pipedrive without exchanging anything", async () => {
    expect(await call({ error: "access_denied" })).toBe("/staff-portal?pipedrive=denied");
    expect(oauth.exchangeAuthorisationCode).not.toHaveBeenCalled();
  });
  it("stores a read-only grant, audits by identifier, and never puts a token in the redirect or the audit row", async () => {
    vi.mocked(oauth.exchangeAuthorisationCode).mockResolvedValue(TOKENS);
    const state = await oauth.signState(7, KEY);
    const redirect = await call({ code: "the-code", state });
    expect(redirect).toBe("/staff-portal?pipedrive=connected");
    expect(oauth.storeGrant).toHaveBeenCalledWith(TOKENS, 7, expect.objectContaining({ clientId: "a" }));
    const [event] = getAuditLog();
    expect(event.staffUserId).toBe(7);
    expect(event.workerId).toBe("staff_portal");
    expect(event.requestedCapability).toBe("connector:pipedrive:authorise");
    expect(event.permissionDecision).toBe("allowed");
    expect(event.success).toBe(true);
    expect(event.permissionReason).toContain("worldstudentadvisors.pipedrive.com");
    expect(event.permissionReason).toContain("leads:read");
    expect(JSON.stringify(event)).not.toContain("access-token-value");
    expect(JSON.stringify(event)).not.toContain("refresh-token-value");
    expect(redirect).not.toContain("access-token-value");
  });
  it("stores a grant carrying the approved :full scopes (Change Entry 100)", async () => {
    vi.mocked(oauth.exchangeAuthorisationCode).mockResolvedValue({ ...TOKENS, scope: "base deals:full contacts:full leads:full search:read" });
    const state = await oauth.signState(7, KEY);
    expect(await call({ code: "the-code", state })).toBe("/staff-portal?pipedrive=connected");
    expect(oauth.storeGrant).toHaveBeenCalledTimes(1);
    const [event] = getAuditLog();
    expect(event.permissionDecision).toBe("allowed");
    expect(event.permissionReason).toContain("deals:full");
  });
  it("refuses and does not store a grant that carries a scope outside the approved set, naming the excess", async () => {
    vi.mocked(oauth.exchangeAuthorisationCode).mockResolvedValue({ ...TOKENS, scope: "base deals:full leads:read admin mail:full" });
    const state = await oauth.signState(7, KEY);
    expect(await call({ code: "the-code", state })).toBe("/staff-portal?pipedrive=scopes_refused");
    expect(oauth.storeGrant).not.toHaveBeenCalled();
    const [event] = getAuditLog();
    expect(event.permissionDecision).toBe("denied");
    expect(event.permissionReason).toContain("admin, mail:full");
    expect(event.permissionReason).not.toContain("deals:full");
    expect(event.errorCategory).toBe("permission_denied");
  });
  it("reports an exchange failure plainly and stores nothing", async () => {
    vi.mocked(oauth.exchangeAuthorisationCode).mockRejectedValue(new Error("Pipedrive token endpoint refused: invalid_grant"));
    const state = await oauth.signState(7, KEY);
    expect(await call({ code: "the-code", state })).toBe("/staff-portal?pipedrive=exchange_failed");
    expect(oauth.storeGrant).not.toHaveBeenCalled();
  });
});
