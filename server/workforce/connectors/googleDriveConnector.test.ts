import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";

/**
 * The Drive worker connector against a faked Drive API. The gates are the
 * production code; only the network is replaced. Proves: the service
 * account signs a drive.readonly assertion; a designated root lists; a
 * Google Doc is exported as text with provenance and freshness; a file
 * outside the root is refused by ancestry however it was named; a search
 * names only the root and its subfolders; an undesignated worker never
 * reaches the network.
 */
vi.mock("../../access/identity", () => ({ resolveStaffAccessProfile: vi.fn() }));
vi.mock("../../db", () => ({ getDb: async () => null }));
const { resolveStaffAccessProfile } = await import("../../access/identity");
const { readGoogleDriveFile, searchGoogleDrive, resetDriveTokenCache, DRIVE_PRECEDENCE_NOTE } = await import("./googleDrive");
const { clearAuditLog, getAuditLog } = await import("../audit");

const ROOT = "1NfrRjUKTDsG1YiHzLpR8sHPmuuK18Zux";
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const SA_EMAIL = "wsa-workforce@wsa-reporting-mirror.iam.gserviceaccount.com";
const ORIGINAL_ENV = { ...process.env };

const FILES: Record<string, any> = {
  [ROOT]: { id: ROOT, name: "WSA Website Operating System", mimeType: "application/vnd.google-apps.folder", parents: ["1ciKTYlcEHbsmJWJKaUkLpyb2v9HZsJbJ"] },
  sub1: { id: "sub1", name: "WSA Website Images", mimeType: "application/vnd.google-apps.folder", parents: [ROOT] },
  doc1: { id: "doc1", name: "WSA Website Master Specification v1.0", mimeType: "application/vnd.google-apps.document", modifiedTime: "2026-08-17T19:45:24.751Z", parents: [ROOT] },
  img1: { id: "img1", name: "wsa_logo.png", mimeType: "image/png", size: "76014", modifiedTime: "2026-07-29T08:37:48.984Z", parents: ["sub1"] },
  outside: { id: "outside", name: "Arrington Consultancy - Half-Time Team Talk", mimeType: "application/vnd.google-apps.document", parents: ["16gt8iUovwFbZR6nGwRaUwgQVeWXFKycm"] },
  "16gt8iUovwFbZR6nGwRaUwgQVeWXFKycm": { id: "16gt8iUovwFbZR6nGwRaUwgQVeWXFKycm", name: "WSA Editable Docs", mimeType: "application/vnd.google-apps.folder", parents: ["1ciKTYlcEHbsmJWJKaUkLpyb2v9HZsJbJ"] },
  "1ciKTYlcEHbsmJWJKaUkLpyb2v9HZsJbJ": { id: "1ciKTYlcEHbsmJWJKaUkLpyb2v9HZsJbJ", name: "World Student Advisors", mimeType: "application/vnd.google-apps.folder", parents: [] },
};
let requests: Array<{ url: string; body?: string }>;
let assertionScope: string | null;
function fakeDrive() {
  requests = []; assertionScope = null;
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    requests.push({ url: url.toString(), body: init?.body ? String(init.body) : undefined });
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
    if (url.host === "oauth2.googleapis.com") {
      const assertion = new URLSearchParams(String(init?.body)).get("assertion")!;
      assertionScope = JSON.parse(Buffer.from(assertion.split(".")[1], "base64url").toString()).scope;
      return json({ access_token: "sa-token", expires_in: 3600 });
    }
    if (url.pathname === "/drive/v3/files") {
      const q = url.searchParams.get("q") ?? "";
      const parents = [...q.matchAll(/'([^']+)' in parents/g)].map(m => m[1]);
      const term = /contains '([^']+)'/.exec(q)?.[1]?.toLowerCase();
      const files = Object.values(FILES).filter(f => parents.some(p => f.parents.includes(p))).filter(f => !term || f.name.toLowerCase().includes(term));
      return json({ files });
    }
    const exp = /^\/drive\/v3\/files\/([^/]+)\/export$/.exec(url.pathname);
    if (exp) return new Response(`Body of ${FILES[exp[1]].name}`, { status: 200, headers: { "content-type": "text/plain" } });
    const one = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    if (one) return FILES[one[1]] ? json(FILES[one[1]]) : json({ error: "nf" }, 404);
    return json({ error: `unhandled ${url.pathname}` }, 404);
  };
}
const profile = () => ({ resolved: true as const, profile: { staffUserId: 7, baseAccessLevel: 1 as const, functionalScopes: ["marketing_seo", "records_control", "paid_media"], caseScope: "organisation" as const, actionPermissions: ["read"], sensitiveOverlays: [], status: "active" as const, teamId: null, temporaryGrants: [], unrecognisedValues: [] } });
const entra = { staffUserId: 7, authMethod: "entra_sso" as const };

beforeEach(() => {
  clearAuditLog(); resetDriveTokenCache();
  process.env.WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: SA_EMAIL, private_key: PEM });
  vi.mocked(resolveStaffAccessProfile).mockImplementation(async () => profile() as never);
});
afterEach(() => { process.env = { ...ORIGINAL_ENV }; vi.restoreAllMocks(); });

describe("Google Drive worker connector", () => {
  it("Ethan lists his designated root; the assertion asks for drive.readonly only", async () => {
    const f = fakeDrive();
    const r = await readGoogleDriveFile({ ...entra, workerId: "ethan", resourceScope: `root/${ROOT}` }, f);
    expect(r.success).toBe(true);
    expect(assertionScope).toBe("https://www.googleapis.com/auth/drive.readonly");
    const data = r.data as any;
    expect(data.source).toBe("google_drive");
    expect(data.root.name).toBe("WSA Website Operating System");
    expect(data.precedence).toBe(DRIVE_PRECEDENCE_NOTE);
    expect(data.entries.map((e: any) => e.name).sort()).toEqual(["WSA Website Images", "WSA Website Master Specification v1.0"]);
    for (const q of requests.filter(q => q.url.includes("/drive/v3/files?"))) expect(new URL(q.url).searchParams.get("q")).toContain(`'${ROOT}' in parents`);
  });
  it("reads a Google Doc as text, with modified time and retrieval time recorded", async () => {
    const r = await readGoogleDriveFile({ ...entra, workerId: "ethan", resourceScope: `root/${ROOT}/file/doc1` }, fakeDrive());
    expect(r.success).toBe(true);
    const data = r.data as any;
    expect(data.file.text).toBe("Body of WSA Website Master Specification v1.0");
    expect(data.file.modifiedTime).toBe("2026-08-17T19:45:24.751Z");
    expect(data.retrievedAt).toBeTruthy();
    expect(r.message).toContain("modified 2026-08-17");
  });
  it("reads a file inside a subfolder of the root by walking its ancestry, and refuses a file outside the root however it is named", async () => {
    const inside = await readGoogleDriveFile({ ...entra, workerId: "ethan", resourceScope: `root/${ROOT}/file/img1` }, fakeDrive());
    expect(inside.success).toBe(true);
    expect((inside.data as any).file.text).toBeUndefined();
    const outside = await readGoogleDriveFile({ ...entra, workerId: "ethan", resourceScope: `root/${ROOT}/file/outside` }, fakeDrive());
    expect(outside.success).toBe(false);
    expect(outside.message).toContain("not inside");
    expect(requests.some(q => q.url.includes("/export"))).toBe(false);
  });
  it("a search names the root and its subfolders and nothing else", async () => {
    const r = await searchGoogleDrive({ ...entra, workerId: "ethan", resourceScope: `root/${ROOT}/search/specification` }, fakeDrive());
    expect(r.success).toBe(true);
    const search = requests.map(q => new URL(q.url).searchParams.get("q") ?? "").filter(q => q.includes("contains"));
    expect(search).toHaveLength(1);
    expect(search[0]).toContain(`'${ROOT}' in parents`);
    expect(search[0]).toContain(`'sub1' in parents`);
    expect(search[0]).not.toContain("16gt8iUovwFbZR6nGwRaUwgQVeWXFKycm");
    expect((r.data as any).entries.map((e: any) => e.name)).toEqual(["WSA Website Master Specification v1.0"]);
  });
  it("Alex may not use Ethan's root, and Sophie has no Drive at all: refused at the gate before any network call", async () => {
    const f = fakeDrive();
    const alex = await readGoogleDriveFile({ ...entra, workerId: "alex", resourceScope: `root/${ROOT}` }, f);
    const sophie = await readGoogleDriveFile({ ...entra, workerId: "sophie", resourceScope: `root/${ROOT}` }, f);
    expect(alex.success).toBe(false); expect(sophie.success).toBe(false);
    expect(requests).toHaveLength(0);
    const events = getAuditLog();
    expect(events.every(e => e.permissionDecision === "denied" && e.errorCategory === "permission_denied")).toBe(true);
    // Alex holds a Drive grant, so it is the folder gate at the chokepoint, not the permission engine, that refuses him.
    expect(events[0].permissionReason).toContain("not designated for this worker");
  });
  it("the never-designated Editable Docs folder is refused for everyone, even a worker with a Drive grant", async () => {
    const f = fakeDrive();
    const r = await readGoogleDriveFile({ ...entra, workerId: "maya", resourceScope: "root/16gt8iUovwFbZR6nGwRaUwgQVeWXFKycm" }, f);
    expect(r.success).toBe(false);
    expect(requests).toHaveLength(0);
  });
});
