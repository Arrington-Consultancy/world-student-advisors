import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { getPipedriveStatus, searchPipedrive, readPipedriveRecord } from "./pipedrive";
import { clearAuditLog, getAuditLog } from "../audit";
import { listWorkers } from "../registry";

beforeEach(() => {
  clearAuditLog();
});

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("Pipedrive connector — read-only by construction, on a dedicated worker credential", () => {
  it("reports unconfigured when no workforce CRM credential is set", () => {
    delete process.env.WORKFORCE_PIPEDRIVE_API_TOKEN;
    expect(getPipedriveStatus()).toBe("unconfigured");
  });
  it("does not treat the live website's PIPEDRIVE_API_TOKEN as a workforce credential", () => {
    // Tom Arrington, 11 September 2026: do not reuse the public contact-form
    // Pipedrive token. That token writes live Persons and Leads today.
    process.env.PIPEDRIVE_API_TOKEN = "live-website-token";
    delete process.env.WORKFORCE_PIPEDRIVE_API_TOKEN;
    expect(getPipedriveStatus()).toBe("unconfigured");
  });
  it("reports operational with the dedicated credential present", () => {
    process.env.WORKFORCE_PIPEDRIVE_API_TOKEN = "x";
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
    // Negative lookbehind: WORKFORCE_PIPEDRIVE_API_TOKEN contains the
    // website variable's name as a substring, and is the one we want.
    expect(code).not.toMatch(/(?<!WORKFORCE_)PIPEDRIVE_API_TOKEN/);
    expect(code).toContain("WORKFORCE_PIPEDRIVE_API_TOKEN");
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
    process.env.WORKFORCE_PIPEDRIVE_API_TOKEN = "x";
    for (const worker of listWorkers()) {
      const base = { workerId: worker.id, resourceScope: "person/1", staffUserId: 1, authMethod: "entra_sso" as const };
      const searchResult = await searchPipedrive(base);
      const readResult = await readPipedriveRecord(base);
      expect(searchResult.success).toBe(false);
      expect(readResult.success).toBe(false);
    }
  });

  it("is refused at the permission gate, before the connector state is ever consulted", async () => {
    // Denied even with a token present: the refusal is the controlled
    // record, not a missing credential.
    process.env.WORKFORCE_PIPEDRIVE_API_TOKEN = "x";
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
