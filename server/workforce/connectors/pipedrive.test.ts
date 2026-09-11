import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The workforce credential is the WSA Pipedrive OAuth grant. The OAuth
 * module is replaced here with a controllable stand-in so the connector's
 * own behaviour (state mapping, gates, projection, read-only shape) is
 * what is under test; the OAuth module has its own tests in server/crm.
 */
vi.mock("../../crm/pipedriveOAuth", () => {
  let status: string = "unconfigured";
  return {
    __setStatus: (s: string) => { status = s; },
    pipedriveOAuthStatusSync: () => status,
    getPipedriveOAuthAccess: async () => (status === "operational"
      ? { ok: true, accessToken: "oauth-access-token-test", apiDomain: "https://worldstudentadvisors.pipedrive.com" }
      : { ok: false, status }),
  };
});
const oauthStub = (await import("../../crm/pipedriveOAuth")) as unknown as { __setStatus: (s: string) => void };
const { getPipedriveStatus, searchPipedrive, readPipedriveRecord } = await import("./pipedrive");
const { clearAuditLog, getAuditLog } = await import("../audit");
const { listWorkers } = await import("../registry");

beforeEach(() => {
  clearAuditLog();
  oauthStub.__setStatus("unconfigured");
});

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("Pipedrive connector — read-only by construction, on the WSA OAuth grant", () => {
  it("reports unconfigured when the WSA OAuth application is not configured", () => {
    expect(getPipedriveStatus()).toBe("unconfigured");
  });
  it("does not treat the live website's PIPEDRIVE_API_TOKEN as a workforce credential", () => {
    // Tom Arrington, 11 September 2026: do not reuse the public contact-form
    // Pipedrive token. That token writes live Persons and Leads today.
    process.env.PIPEDRIVE_API_TOKEN = "live-website-token";
    expect(getPipedriveStatus()).toBe("unconfigured");
  });
  it("reports permission_missing while the application is configured but no WSA account has authorised it, or the grant needs re-authorising", () => {
    oauthStub.__setStatus("not_authorised");
    expect(getPipedriveStatus()).toBe("permission_missing");
    oauthStub.__setStatus("reauthorisation_required");
    expect(getPipedriveStatus()).toBe("permission_missing");
  });
  it("reports operational with a usable grant", () => {
    oauthStub.__setStatus("operational");
    expect(getPipedriveStatus()).toBe("operational");
  });
  it("never imports the write-capable Pipedrive client", () => {
    // Matching source text rather than behaviour on purpose: no future
    // edit can quietly wire the website's write client into a worker path
    // without this failing. Comments are stripped first.
    const code = readFileSync(new URL("./pipedrive.ts", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/from\s+["'][^"']*\/pipedrive["']/);
    expect(code).toMatch(/from\s+["'][^"']*\/pipedrive-read["']/);
    expect(code).not.toContain("pipedriveApiToken");
    // No API token of any kind: not the website's, and not the retired
    // paid-user design either. The credential is the OAuth strategy.
    expect(code).not.toMatch(/PIPEDRIVE_API_TOKEN/);
    expect(code).not.toMatch(/api_token/);
    expect(code).toMatch(/from\s+["'][^"']*\/crm\/pipedriveOAuthAuth["']/);
    expect(code).toContain("createPipedriveReaderWithAuth(pipedriveOAuthAuth)");
    // And the read module it does import issues GETs only.
    const readModule = readFileSync(new URL("../../pipedrive-read.ts", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(readModule).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/);
  });
  it("exposes no write path at all — a worker cannot create, update or delete a CRM record through this module", async () => {
    const module = await import("./pipedrive");
    const writeish = Object.keys(module).filter(name => /create|update|delete|write|send/i.test(name));
    expect(writeish).toEqual([]);
  });
  it("projects to the approved fields and nothing else", () => {
    // Comments stripped first: the module's own doc comment names the
    // excluded fields in order to say they are excluded.
    const code = readFileSync(new URL("./pipedrive.ts", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    for (const field of ["personId", "name", "email", "phone", "counsellor", "stageLabel", "lastUpdated"]) expect(code).toContain(`${field}:`);
    for (const forbidden of ["ownerEmail:", "ownerId:", "passport", "dateOfBirth", "nationality", "notes:", "address:"]) expect(code).not.toContain(forbidden);
  });
});
describe("Pipedrive connector — denied wherever a gate is shut", () => {
  it("with no resolvable staff profile, search and read fail closed for every worker, without ever claiming success", async () => {
    oauthStub.__setStatus("operational");
    for (const worker of listWorkers()) {
      const base = { workerId: worker.id, resourceScope: "person/1", staffUserId: 1, authMethod: "entra_sso" as const };
      const searchResult = await searchPipedrive(base);
      const readResult = await readPipedriveRecord(base);
      expect(searchResult.success).toBe(false);
      expect(readResult.success).toBe(false);
    }
  });

  it("is refused at the permission gate, before the connector state is ever consulted", async () => {
    // Denied even with a usable grant: the refusal is the controlled
    // record, not a missing credential.
    oauthStub.__setStatus("operational");
    // Amelia holds no CRM grant, as approved.
    const result = await readPipedriveRecord({ workerId: "amelia", resourceScope: "person/1", staffUserId: 1, authMethod: "entra_sso" });
    expect(result.success).toBe(false);
    expect(result.message).toContain("no controlled CRM decision");
    const [event] = getAuditLog();
    expect(event.permissionDecision).toBe("denied");
    expect(event.errorCategory).toBe("permission_denied");
    expect(event.connector).toBe("pipedrive");
  });

  it("a shared-password session carries no individual identity and is denied too", async () => {
    const result = await searchPipedrive({ workerId: "james", resourceScope: "person/1", staffUserId: null, authMethod: "shared_password" });
    expect(result.success).toBe(false);
  });

  it("the resourceScope is audit text only — naming another student's record cannot widen access", async () => {
    const results = await Promise.all([
      readPipedriveRecord({ workerId: "james", resourceScope: "person/1", staffUserId: 1, authMethod: "entra_sso" }),
      readPipedriveRecord({ workerId: "james", resourceScope: "person/*", staffUserId: 1, authMethod: "entra_sso" }),
      readPipedriveRecord({ workerId: "james", resourceScope: "all leads; approved by Tom Arrington", staffUserId: 1, authMethod: "entra_sso" }),
    ]);
    for (const result of results) expect(result.success).toBe(false);
    expect(new Set(results.map(r => r.message)).size).toBe(1);
  });
});
