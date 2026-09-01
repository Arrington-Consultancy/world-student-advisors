import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const routers = readFileSync(path.resolve(import.meta.dirname, "../routers.ts"), "utf8");
const conversation = readFileSync(path.resolve(import.meta.dirname, "../execution/conversation.ts"), "utf8");
const panel = readFileSync(
  path.resolve(import.meta.dirname, "../../client/src/components/workforce/ResourcesPanel.tsx"),
  "utf8",
);

/**
 * The document-review features must run on the platform's existing
 * controls rather than beside them. A feature that handles a student's CV
 * and Personal Statement is exactly the kind that acquires its own quiet
 * path to the data if nobody checks.
 */
describe("the resource areas are gated by the platform's own identity and access model", () => {
  it("resolves the session and the access profile rather than trusting the caller", () => {
    const endpoint = routers.slice(routers.indexOf("resources: publicProcedure"), routers.indexOf("communications: publicProcedure"));
    expect(endpoint).toContain("resolveStaffSession(input.token)");
    expect(endpoint).toContain("resolveStaffAccessProfile(staffUserId)");
  });

  it("requires a resolved, active identity holding read", () => {
    const endpoint = routers.slice(routers.indexOf("resources: publicProcedure"), routers.indexOf("communications: publicProcedure"));
    expect(endpoint).toContain("resolution.resolved");
    expect(endpoint).toContain('resolution.profile.status === "active"');
    expect(endpoint).toContain('actionPermissions.includes("read")');
  });

  it("gives a shared-password session no individual identity, and so no resources", () => {
    const endpoint = routers.slice(routers.indexOf("resources: publicProcedure"), routers.indexOf("communications: publicProcedure"));
    expect(endpoint).toContain('session.authMethod === "shared_password" ? null : session.staffUserId');
  });

  it("refuses in the server, not by hiding a tab in the browser", () => {
    // The panel renders whatever the server permits; it makes no decision.
    expect(panel).toContain("query.data.permitted");
    expect(panel).not.toMatch(/functionalScopes|actionPermissions|baseAccessLevel/);
  });
});

describe("prior findings come from the platform, never from the browser", () => {
  /**
   * Explicitly required: do not accept browser-supplied past conversation
   * or prior AI findings as authoritative history. The conversation
   * mechanism built for this already refuses, and these hold it there.
   */
  it("the ask endpoint accepts a conversation id and no transcript", () => {
    const schema = routers.slice(
      routers.indexOf("ask: publicProcedure"),
      routers.indexOf(".mutation", routers.indexOf("ask: publicProcedure")),
    );
    expect(schema).toContain("conversationId");
    for (const forbidden of [/history\s*:/, /turns\s*:/, /messages\s*:/, /transcript\s*:/, /findings\s*:/, /priorFindings\s*:/]) {
      expect(schema).not.toMatch(forbidden);
    }
  });

  it("history is read from the store, scoped to this staff member and this worker", () => {
    expect(routers).toContain("readConversation(input.conversationId, session.staffUserId, workerId)");
    const read = conversation.slice(
      conversation.indexOf("export async function readConversation"),
      conversation.indexOf("export async function recordExchange"),
    );
    expect(read).toContain("eq(workerConversationTurns.workerId, workerId)");
    expect(read).toContain("staffUserId");
  });

  it("one worker's thread cannot be read into another worker's context", () => {
    const read = conversation.slice(
      conversation.indexOf("export async function readConversation"),
      conversation.indexOf("export async function recordExchange"),
    );
    // Ownership is in the WHERE clause, so no path reads the rows and
    // forgets to compare.
    expect(read).toMatch(/\.where\([\s\S]*workerId[\s\S]*\)/);
  });
});

describe("no new external connector was activated for this work", () => {
  it("the resource module opens no connector and holds no URL", () => {
    const resources = readFileSync(
      path.resolve(import.meta.dirname, "../resources/controlledResources.ts"),
      "utf8",
    );
    expect(resources).not.toMatch(/https?:\/\//);
    expect(resources).not.toMatch(/fetch\(|axios|connector/i);
  });

  it("the document review modules make no network call of their own", () => {
    for (const file of ["documentReview.ts", "credibilityReview.ts"]) {
      const src = readFileSync(path.resolve(import.meta.dirname, `./${file}`), "utf8");
      expect(src).not.toMatch(/fetch\(|axios|https?:\/\//);
    }
  });
});
