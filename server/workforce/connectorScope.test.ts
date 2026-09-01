/**
 * The connector grant record, tested against Access Matrix v0.2 section 2.
 *
 * This suite previously asserted that Maya was the only worker with any
 * grant. That was the transcription being wrong, and the test agreeing
 * with it: the Matrix fills in a SharePoint line for all sixteen rows of
 * its table, not for Maya alone. A test that agrees with a misreading is
 * how a misreading survives, so the assertions here now quote the record.
 */
import { describe, expect, it } from "vitest";
import { WORKER_CONNECTOR_SCOPE, connectorScopeGrants } from "./connectorScope";
import { evaluateConnectorPermission } from "./permissions";
import { listWorkers, getWorker } from "./registry";
import type { ConnectorName, ConnectorOperation, WorkerId } from "./types";

const CONNECTORS: ConnectorName[] = ["sharepoint", "google_drive", "linkedin", "facebook", "youtube", "whatsapp"];
const OPERATIONS: ConnectorOperation[] = ["search", "read", "create", "update", "delete", "external_send"];
const SOCIAL: ConnectorName[] = ["linkedin", "facebook", "youtube", "whatsapp"];

/** Every worker the Matrix gives a SharePoint line. Nia is absent from it. */
const SHAREPOINT_READERS: WorkerId[] = [
  "wsa_core_brain", "sophie", "daniel", "amelia", "oliver", "james", "priya",
  "harper", "olivia", "grace", "ethan", "maya", "alex", "wsa_governance_assurance",
  "staff_receptionist",
];

/** The Matrix lines carrying an explicit write verb: "write-back", or "write". */
const SHAREPOINT_WRITERS: WorkerId[] = ["wsa_core_brain", "sophie", "amelia", "grace", "wsa_governance_assurance"];

describe("SharePoint grants are transcribed from Access Matrix v0.2 section 2", () => {
  it("every worker the Matrix gives a SharePoint line can search and read", () => {
    for (const id of SHAREPOINT_READERS) {
      expect(connectorScopeGrants(id, "sharepoint", "search")).toBe(true);
      expect(connectorScopeGrants(id, "sharepoint", "read")).toBe(true);
    }
  });

  it("only the five lines with an explicit write verb carry create and update", () => {
    for (const id of SHAREPOINT_READERS) {
      const expected = SHAREPOINT_WRITERS.includes(id);
      expect(connectorScopeGrants(id, "sharepoint", "create")).toBe(expected);
      expect(connectorScopeGrants(id, "sharepoint", "update")).toBe(expected);
    }
  });

  it("no worker holds delete or external_send on SharePoint, writer or not", () => {
    for (const w of listWorkers()) {
      expect(connectorScopeGrants(w.id, "sharepoint", "delete")).toBe(false);
      expect(connectorScopeGrants(w.id, "sharepoint", "external_send")).toBe(false);
    }
  });

  it("a noun is not a write verb: the four workers whose line names an output hold read only", () => {
    // Daniel "designated discovery output", Oliver "suitability output",
    // James "authorised application outputs", Harper "funding-gap outputs".
    for (const id of ["daniel", "oliver", "james", "harper"] as const) {
      expect(connectorScopeGrants(id, "sharepoint", "read")).toBe(true);
      expect(connectorScopeGrants(id, "sharepoint", "create")).toBe(false);
      expect(connectorScopeGrants(id, "sharepoint", "update")).toBe(false);
    }
  });

  it("Maya's records-control scope is read, because a scope is not a licence to write", () => {
    expect(getWorker("maya").roleTitle).toBe("SharePoint & Records Control");
    expect(connectorScopeGrants("maya", "sharepoint", "read")).toBe(true);
    for (const op of ["create", "update", "delete", "external_send"] as const) {
      expect(connectorScopeGrants("maya", "sharepoint", op)).toBe(false);
    }
  });

  it("Nia holds nothing on any connector, because Matrix v0.2 predates her", () => {
    for (const c of CONNECTORS) {
      for (const op of OPERATIONS) expect(connectorScopeGrants("nia", c, op)).toBe(false);
    }
  });

  it("no worker holds any social channel", () => {
    for (const w of listWorkers()) {
      for (const c of SOCIAL) {
        for (const op of OPERATIONS) expect(connectorScopeGrants(w.id, c, op)).toBe(false);
      }
    }
  });

  it("Google Drive is read-only wherever the Matrix grants it, and absent otherwise", () => {
    const driveReaders: WorkerId[] = ["wsa_core_brain", "ethan", "maya", "alex", "wsa_governance_assurance"];
    for (const w of listWorkers()) {
      const expected = driveReaders.includes(w.id);
      expect(connectorScopeGrants(w.id, "google_drive", "read")).toBe(expected);
      for (const op of ["create", "update", "delete", "external_send"] as const) {
        expect(connectorScopeGrants(w.id, "google_drive", op)).toBe(false);
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
    // Nia is now the worker with no SharePoint grant, and the reason names
    // the controlled record rather than her authorisation flags.
    const decision = evaluateConnectorPermission({
      workerId: "nia", connector: "sharepoint", operation: "read", resourceScope: "wsa-site/x",
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("no sharepoint:read scope");
    expect(decision.reason).toContain("not a code change");
  });

  it("a granted worker is refused on the authorisation flag, which names what is actually blocking", () => {
    const decision = evaluateConnectorPermission({
      workerId: "sophie", connector: "sharepoint", operation: "read", resourceScope: "wsa-site/x",
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("not authorised for any connector action");
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
