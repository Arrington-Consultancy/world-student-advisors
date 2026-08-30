/**
 * Which connector operations each worker is granted, per connector.
 *
 * The CRM has its own record (crmScope.ts) because it needs a second,
 * independent agreement before anything opens. This is the general one:
 * SharePoint, Google Drive and the social channels.
 *
 * Maya is the only worker with a grant, and she is not a choice made here.
 * Her Worker Register role title is "SharePoint & Records Control", and
 * her Access Matrix entry already reads "Records-control scope across
 * authorised SharePoint locations" and "Read/migration access only when
 * moving or reconciling authorised legacy records". Naming her is a
 * transcription of what the controlled record already says; naming anyone
 * else would have been an invention.
 *
 * Read only. The Matrix grants Maya a records-control SCOPE, which is the
 * right to look across authorised locations. It does not grant her the
 * right to change what she finds, and a scope is not a licence to write —
 * so create, update, delete and external_send are absent rather than
 * present-and-false, because an operation that is not listed cannot be
 * granted by a typo.
 *
 * Every other worker holds nothing. The map is total over WorkerId, so a
 * worker added without a connector answer will not compile.
 *
 * A grant here is still not access. Four things must agree before a worker
 * reaches anything: this record, the worker's own connectorUseAuthorised
 * flag (false for everyone until credentials exist and are tested), the
 * signed-in staff member's own permissions, and the WSA boundary including
 * the credential ring-fence.
 */
import type { ConnectorName, ConnectorOperation, WorkerId } from "./types";

export type ConnectorGrant = Readonly<Partial<Record<ConnectorName, ReadonlySet<ConnectorOperation>>>>;

const READ_ONLY: ReadonlySet<ConnectorOperation> = Object.freeze(new Set<ConnectorOperation>(["search", "read"]));

export const WORKER_CONNECTOR_SCOPE: Readonly<Record<WorkerId, ConnectorGrant>> = Object.freeze({
  wsa_core_brain: {},
  sophie: {},
  daniel: {},
  amelia: {},
  oliver: {},
  james: {},
  priya: {},
  harper: {},
  olivia: {},
  grace: {},
  ethan: {},
  /**
   * "SharePoint & Records Control" — the WSA records-control function.
   * SharePoint is her source of truth; Drive is read/migration only, which
   * the Matrix limits to reconciling authorised legacy records.
   */
  maya: Object.freeze({ sharepoint: READ_ONLY, google_drive: READ_ONLY }),
  alex: {},
  /**
   * Nia owns organic social, but Worker Register v0.42 records her as
   * NOT APPROVED with NO LIVE PUBLISHING AUTHORITY, and NIA-G01 to
   * NIA-G07 are unresolved — including which accounts she may draft for,
   * schedule, publish, edit, delete or reply on. Until those are decided
   * she holds nothing, which is the whole point of recording them as open.
   */
  nia: {},
  wsa_governance_assurance: {},
  staff_receptionist: {},
});

export const NO_CONNECTOR_GRANT =
  "No controlled record grants this worker a scope on this connector. " +
  "Adding one is an amendment to the Worker Personality and Connector Access Matrix, not a code change.";

/** Whether the controlled record grants this worker this exact operation on this connector. */
export function connectorScopeGrants(
  workerId: WorkerId,
  connector: ConnectorName,
  operation: ConnectorOperation,
): boolean {
  return WORKER_CONNECTOR_SCOPE[workerId][connector]?.has(operation) ?? false;
}
