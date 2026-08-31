import { describe, expect, it } from "vitest";
import { getWorker, listWorkers } from "./registry";
import { evaluateConnectorPermission, evaluateStaffPortalExecutionPermission } from "./permissions";
import { connectorScopeGrants } from "./connectorScope";
import { WORKER_CRM_SCOPE } from "./crmScope";
import { WORKER_FUNCTIONAL_SCOPE } from "../access/workerScope";
import { routeStaffRequest } from "./router";
import type { ConnectorName, ConnectorOperation } from "./types";

/**
 * Nia is transcribed from WSA_AI_Worker_Register_v0.42.docx, read from the
 * governance library on 30 August 2026. These assert the transcription
 * matches the record, and that the record's own restrictions are real
 * rather than decorative.
 */
describe("Nia is transcribed exactly as the Register records her", () => {
  it("carries the Register's name, function and version", () => {
    const nia = getWorker("nia");
    expect(nia.canonicalName).toBe("Nia");
    expect(nia.roleTitle).toBe("Social Media & Content Intelligence");
    expect(nia.specificationVersion).toBe("v0.1 + Social Brain Control Pack v0.1");
  });

  it("is approved for drafting only, with the account gates still recorded", () => {
    // Approved 31 August for work inside the Staff Portal that publishes
    // nothing. NIA-G01 to NIA-G07 govern account-level authority and are
    // untouched, which the blockers below assert.
    expect(getWorker("nia").specificationStatus).toBe("approved");
    expect(getWorker("nia").gatekeeperReview).toBe("pending");
  });

  it("has NO LIVE PUBLISHING AUTHORITY — no connector grant on any social channel", () => {
    for (const c of ["linkedin", "facebook", "youtube", "whatsapp", "sharepoint", "google_drive"] as ConnectorName[]) {
      for (const op of ["search", "read", "create", "update", "delete", "external_send"] as ConnectorOperation[]) {
        expect(connectorScopeGrants("nia", c, op)).toBe(false);
        expect(evaluateConnectorPermission({ workerId: "nia", connector: c, operation: op, resourceScope: "x" }).allowed).toBe(false);
      }
    }
  });

  it("cannot publish even though publishing is what she is for", () => {
    const decision = evaluateConnectorPermission({
      workerId: "nia", connector: "instagram" as ConnectorName, operation: "external_send", resourceScope: "worldstudentadv",
    });
    expect(decision.allowed).toBe(false);
  });

  it("holds no CRM scope", () => {
    expect(WORKER_CRM_SCOPE.nia).toBeNull();
  });

  it("executes for drafting, and holds no publishing capability", () => {
    expect(evaluateStaffPortalExecutionPermission("nia").allowed).toBe(true);
    const publish = getWorker("nia").capabilities.find(c => c.id === "publish")!;
    expect(publish.unavailableBecause).not.toBeNull();
  });

  it("records the NIA-G01 to NIA-G07 blockers rather than glossing them", () => {
    const blockers = getWorker("nia").materialBlockers.join(" ");
    expect(blockers).toContain("NIA-G01");
    expect(blockers).toContain("NIA-G07");
    expect(blockers).toContain("Governance & Assurance");
  });
});

describe("Nia's lane is genuinely separate from her neighbours'", () => {
  it("has her own functional scope, not Ethan's", () => {
    expect(WORKER_FUNCTIONAL_SCOPE.nia).toBe("social_media");
    expect(WORKER_FUNCTIONAL_SCOPE.ethan).toBe("marketing_seo");
    expect(WORKER_FUNCTIONAL_SCOPE.nia).not.toBe(WORKER_FUNCTIONAL_SCOPE.ethan);
  });

  it("no two of the marketing workers share a scope", () => {
    const scopes = [WORKER_FUNCTIONAL_SCOPE.nia, WORKER_FUNCTIONAL_SCOPE.ethan, WORKER_FUNCTIONAL_SCOPE.alex];
    expect(new Set(scopes).size).toBe(3);
  });

  it("her brief names what she must not do, by owner", () => {
    const notFor = getWorker("nia").personality.whatNotFor;
    for (const neighbour of ["Ethan", "Alex", "Amelia", "Oliver", "Harper", "Priya"]) {
      expect(notFor).toContain(neighbour);
    }
  });

  it("she may use others' evidence but not invent facts", () => {
    expect(getWorker("nia").personality.whatNotFor).toContain("may not invent a fact");
  });
});

describe("Reception routes social work to Nia and nothing else to her", () => {
  it("routes a social content request to Nia", () => {
    const r = routeStaffRequest("draft an instagram post about our Nigeria results");
    expect(r.responsibleWorkerId).toBe("nia");
  });

  it("does not take SEO from Ethan", () => {
    expect(routeStaffRequest("how is our SEO doing").responsibleWorkerId).toBe("ethan");
  });

  it("does not take visa work", () => {
    expect(routeStaffRequest("check this student's visa evidence").responsibleWorkerId).toBe("priya");
  });

  it("offers her for drafting, which is what she can actually do", () => {
    const r = routeStaffRequest("write a linkedin post");
    expect(r.responsibleWorkerId).toBe("nia");
    expect(r.availability).toBe("available");
  });
});

describe("the estate remains closed apart from the one authorised worker", () => {
  it("opened execution for the approved workers and a connector for nobody", () => {
    for (const w of listWorkers()) {
      // Execution opened under recorded decisions on 31 August. Connector
      // authority did not, and that separation is the point.
      expect(w.connectorUseAuthorised, w.id).toBe(false);
      expect(w.writesAuthorised, w.id).toBe(false);
    }
    expect(listWorkers()).toHaveLength(16);
  });
});
