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

/** The approval every grant below cites. One string so a grant cannot cite a different authority by accident. */
export const CRM_GRANT_AUTHORITY =
  "Tom Arrington approval, 11 September 2026, of the WSA Worker Connector Matrix. Recorded in the Worker Personality and Connector Access Matrix v0.3 (CRM column) and WSA Change Log Change Entry 087. Read-only first rollout; no write operation granted.";

const READ: CrmScope = Object.freeze({ operations: new Set<ConnectorOperation>(["read"]), evidence: CRM_GRANT_AUTHORITY });
const SEARCH_READ: CrmScope = Object.freeze({ operations: new Set<ConnectorOperation>(["search", "read"]), evidence: CRM_GRANT_AUTHORITY });

/**
 * Granted 11 September 2026 on Tom Arrington's approval of the connector
 * matrix. Every grant is a read; the first rollout is read-only and
 * James's stage update is held for a later approval. The per-worker
 * constraints that make these least-privilege (Sophie's exact-identifier
 * lookup, Olivia's confirmed-student condition, Priya's visa_regulated
 * overlay on the staff member, Grace's audit-sample limit) are enforced
 * in connectors/pipedrive.ts, which is the only path these grants open.
 *
 * Amelia, Ethan, Alex, Maya and Nia are null as approved: none of their
 * remits concerns a student record.
 */
export const WORKER_CRM_SCOPE: Readonly<Record<WorkerId, CrmScope | null>> = Object.freeze({
  wsa_core_brain: null,
  sophie: SEARCH_READ,
  daniel: READ,
  amelia: null,
  oliver: READ,
  james: READ,
  priya: READ,
  harper: READ,
  olivia: READ,
  grace: SEARCH_READ,
  ethan: null,
  maya: null,
  alex: null,
  nia: null,
  wsa_governance_assurance: null,
  staff_receptionist: null,
});
