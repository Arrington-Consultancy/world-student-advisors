/**
 * Which Pipedrive (CRM) operations each worker is actually granted.
 *
 * WSA_Worker_Personality_Connector_Access_Matrix_v0.2 — the controlled
 * document that defines connector access per worker — has a SharePoint
 * column and a Google Drive column and no CRM column at all, and its own
 * authority note states that it "does not itself grant a Microsoft,
 * Google, portal, CRM, advertising or government permission". So there is
 * no evidenced Pipedrive scope for any worker, and every entry below is
 * null. That is a transcription of the record, not a judgement about what
 * a worker ought to be able to do, and it must not be filled in here: the
 * Access Matrix needs a CRM column first (a Tom Arrington approval and a
 * Governance & Assurance checkpoint), and only then does a row here get a
 * value.
 *
 * This is deliberately a separate record from WorkerRegistryEntry's
 * connectorIntent.pipedrive. Intent is descriptive free text; this is the
 * grant. The permission engine requires BOTH to be open, so neither
 * rewording a worker's intent line nor adding a row here can grant CRM
 * access on its own.
 *
 * Pipedrive matters more than the other two connectors do today, because
 * it is the only one that is already live: server/pipedrive.ts holds a
 * working API token and the public contact form writes real student leads
 * through it. SharePoint and Google Drive fail closed because nothing is
 * configured; Pipedrive must fail closed on purpose.
 *
 * The map is total over WorkerId, enforced by the type — a worker added
 * without a CRM answer will not compile.
 */
import type { ConnectorOperation, WorkerId } from "./types";

export interface CrmScope {
  /** Exactly the Pipedrive operations the controlled record grants. Never widened at the call site. */
  operations: ReadonlySet<ConnectorOperation>;
  /** The controlled document, version and column this grant was transcribed from. */
  evidence: string;
}

/** Why every entry below is null, quoted back to the caller so a denial explains itself. */
export const NO_CRM_COLUMN_IN_ACCESS_MATRIX =
  "WSA_Worker_Personality_Connector_Access_Matrix_v0.2 defines no CRM column, so no worker has an evidenced Pipedrive scope. Adding one is a controlled-record change, not a code change.";

export const WORKER_CRM_SCOPE: Readonly<Record<WorkerId, CrmScope | null>> = Object.freeze({
  wsa_core_brain: null,
  sophie: null,
  daniel: null,
  amelia: null,
  oliver: null,
  james: null,
  priya: null,
  harper: null,
  olivia: null,
  grace: null,
  ethan: null,
  maya: null,
  alex: null,
  wsa_governance_assurance: null,
  staff_receptionist: null,
});
