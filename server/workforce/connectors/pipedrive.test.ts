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

describe("Pipedrive connector — isolation from the live website credential", () => {
  it("reports unconfigured when no workforce-specific CRM token is set", () => {
    delete process.env.WORKFORCE_PIPEDRIVE_API_TOKEN;
    expect(getPipedriveStatus()).toBe("unconfigured");
  });

  it("does not treat the live website's PIPEDRIVE_API_TOKEN as a workforce credential", () => {
    // This is the one connector where the wrong answer reaches real
    // student data: the contact form writes live Persons and Leads with
    // this token today.
    process.env.PIPEDRIVE_API_TOKEN = "live-website-token";
    delete process.env.WORKFORCE_PIPEDRIVE_API_TOKEN;
    expect(getPipedriveStatus()).toBe("unconfigured");
  });

  it("still refuses to call itself operational with a workforce token present, pending a tested scope", () => {
    process.env.WORKFORCE_PIPEDRIVE_API_TOKEN = "x";
    expect(getPipedriveStatus()).toBe("permission_missing");
  });

  it("never imports the live Pipedrive client or reads its token", () => {
    // Matching source text rather than behaviour on purpose: the point is
    // that no future edit can quietly wire the website's write token into
    // a worker path without this failing. Comments are stripped first —
    // the module's own doc comment explains why it avoids that token, and
    // saying so must not read as doing so.
    const code = readFileSync(new URL("./pipedrive.ts", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/from\s+["'][^"']*\/pipedrive["']/);
    expect(code).not.toContain("pipedriveApiToken");
    // Negative lookbehind: WORKFORCE_PIPEDRIVE_API_TOKEN contains the
    // website variable's name as a substring, and is the one we want.
    expect(code).not.toMatch(/(?<!WORKFORCE_)PIPEDRIVE_API_TOKEN/);
    expect(code).toContain("WORKFORCE_PIPEDRIVE_API_TOKEN");
  });

  it("exposes no write path at all — a worker cannot create, update or delete a CRM record through this module", async () => {
    const module = await import("./pipedrive");
    const writeish = Object.keys(module).filter(name => /create|update|delete|write|send/i.test(name));
    expect(writeish).toEqual([]);
  });
});

describe("Pipedrive connector — every worker is denied today", () => {
  it("search and read fail for every worker, without ever claiming success", async () => {
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
    const result = await readPipedriveRecord({ workerId: "sophie", resourceScope: "person/1", staffUserId: 1, authMethod: "entra_sso" });
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
