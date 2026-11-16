import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getLinkedInStatus, getFacebookStatus, getYouTubeStatus, getWhatsAppStatus,
         readChannelActivity, draftChannelContent, publishToChannel } from "./social";
import { clearAuditLog, getAuditLog } from "../audit";
import { listWorkers } from "../registry";

const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  clearAuditLog();
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("WORKFORCE_")) delete process.env[k];
  }
});
afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

describe("social connectors report their real state", () => {
  it("all four are unconfigured with no credentials", () => {
    expect(getLinkedInStatus()).toBe("unconfigured");
    expect(getFacebookStatus()).toBe("unconfigured");
    expect(getYouTubeStatus()).toBe("unconfigured");
    expect(getWhatsAppStatus()).toBe("unconfigured");
  });

  it("a credential alone is not enough — the WSA account allowlist is also required", () => {
    process.env.WORKFORCE_LINKEDIN_ACCESS_TOKEN = "token";
    expect(getLinkedInStatus()).toBe("unconfigured");
    process.env.WORKFORCE_LINKEDIN_ALLOWED_ACCOUNTS = "world-student-advisors";
    // Still not operational: having both does not prove the grant was tested.
    expect(getLinkedInStatus()).toBe("permission_missing");
  });
});

describe("every worker is refused every social action today", () => {
  const base = { resourceScope: "world-student-advisors/posts", staffUserId: 1, authMethod: "entra_sso" as const };

  it("read, draft and publish are all denied for every worker on every channel", async () => {
    for (const worker of listWorkers()) {
      for (const c of ["linkedin", "facebook", "youtube", "whatsapp"] as const) {
        const read = await readChannelActivity(c, { ...base, workerId: worker.id });
        const draft = await draftChannelContent(c, { ...base, workerId: worker.id });
        const publish = await publishToChannel(c, { ...base, workerId: worker.id });
        expect(read.success).toBe(false);
        expect(draft.success).toBe(false);
        expect(publish.success).toBe(false);
      }
    }
  });

  it("the refusal is audited with the connector and operation named", async () => {
    await publishToChannel("linkedin", { ...base, workerId: "ethan" });
    const [event] = getAuditLog();
    expect(event.permissionDecision).toBe("denied");
    expect(event.connector).toBe("linkedin");
    expect(event.connectorOperation).toBe("external_send");
  });

  it("publishing consumes external_send, a consequential permission, not create", async () => {
    await draftChannelContent("facebook", { ...base, workerId: "ethan" });
    await publishToChannel("facebook", { ...base, workerId: "ethan" });
    const [draft, publish] = getAuditLog();
    expect(draft.connectorOperation).toBe("create");
    expect(publish.connectorOperation).toBe("external_send");
  });

  it("no worker path can reach a channel outside the WSA account allowlist", async () => {
    const result = await readChannelActivity("linkedin", {
      ...base, workerId: "ethan", resourceScope: "some-other-company/posts",
    });
    expect(result.success).toBe(false);
  });
});
