import { describe, expect, it } from "vitest";
import { WORKER_CONNECTOR_SCOPE, connectorScopeGrants } from "./connectorScope";
import { evaluateConnectorPermission } from "./permissions";
import { listWorkers, getWorker } from "./registry";
import type { ConnectorName, ConnectorOperation } from "./types";

const CONNECTORS: ConnectorName[] = ["sharepoint", "google_drive", "linkedin", "facebook", "youtube", "whatsapp"];
const OPERATIONS: ConnectorOperation[] = ["search", "read", "create", "update", "delete", "external_send"];

describe("Maya is the only worker with a connector grant, and it is transcribed not chosen", () => {
  it("her role title is why — SharePoint and Records Control", () => {
    expect(getWorker("maya").roleTitle).toBe("SharePoint & Records Control");
  });

  it("she holds search and read on SharePoint and Google Drive", () => {
    for (const c of ["sharepoint", "google_drive"] as const) {
      expect(connectorScopeGrants("maya", c, "search")).toBe(true);
      expect(connectorScopeGrants("maya", c, "read")).toBe(true);
    }
  });

  it("a records-control scope is not a licence to write", () => {
    for (const c of ["sharepoint", "google_drive"] as const) {
      for (const op of ["create", "update", "delete", "external_send"] as const) {
        expect(connectorScopeGrants("maya", c, op)).toBe(false);
      }
    }
  });

  it("she holds nothing on any social channel", () => {
    for (const c of ["linkedin", "facebook", "youtube", "whatsapp"] as const) {
      for (const op of OPERATIONS) expect(connectorScopeGrants("maya", c, op)).toBe(false);
    }
  });

  it("every other worker holds nothing at all", () => {
    for (const w of listWorkers()) {
      if (w.id === "maya") continue;
      for (const c of CONNECTORS) {
        for (const op of OPERATIONS) expect(connectorScopeGrants(w.id, c, op)).toBe(false);
      }
    }
  });

  it("the map is total over WorkerId", () => {
    expect(Object.keys(WORKER_CONNECTOR_SCOPE)).toHaveLength(listWorkers().length);
  });
});

describe("a grant is still not access", () => {
  it("Maya is refused today, because no credential exists and connector use is unauthorised", () => {
    const decision = evaluateConnectorPermission({
      workerId: "maya", connector: "sharepoint", operation: "read", resourceScope: "wsa-site/x",
    });
    expect(decision.allowed).toBe(false);
    expect(getWorker("maya").connectorUseAuthorised).toBe(false);
  });

  it("a worker with no grant is refused for that reason specifically, before the flags", () => {
    const decision = evaluateConnectorPermission({
      workerId: "ethan", connector: "sharepoint", operation: "read", resourceScope: "wsa-site/x",
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("no sharepoint:read scope");
    expect(decision.reason).toContain("not a code change");
  });

  it("every worker is still denied every connector operation", () => {
    let permitted = 0;
    for (const w of listWorkers()) {
      for (const c of CONNECTORS) {
        for (const op of OPERATIONS) {
          if (evaluateConnectorPermission({ workerId: w.id, connector: c, operation: op, resourceScope: "wsa-site/x" }).allowed) permitted += 1;
        }
      }
    }
    expect(permitted).toBe(0);
  });
});
