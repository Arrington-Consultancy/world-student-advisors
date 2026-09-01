/**
 * Which connector operations each worker is granted, per connector.
 *
 * Transcribed from WSA_Worker_Personality_Connector_Access_Matrix_v0.2
 * (APPROVED_STANDARDS), section 2, read from SharePoint on 1 September
 * 2026. Each entry below quotes the Matrix line it comes from, so the
 * transcription can be checked against the record without opening it.
 *
 * The CRM has its own record (crmScope.ts) because it needs a second,
 * independent agreement before anything opens. This is the general one:
 * SharePoint, Google Drive and the social channels.
 *
 * WHAT THIS FILE USED TO SAY, AND WHY IT WAS WRONG. Until this revision it
 * named Maya as the only worker with any grant, on the reasoning that
 * "naming anyone else would have been an invention". That reading does not
 * survive the record. Matrix section 2 has a SharePoint column, and it is
 * filled in for every worker in the table, not for Maya alone. The earlier
 * transcription appears to have treated only Maya's line as grant-shaped,
 * because hers uses the word "scope", and read the other fifteen as
 * description. They are the same column of the same table.
 *
 * The error was in the safe direction and it opened nothing, because three
 * further gates were closed anyway. It was still a misreading of a
 * controlled record, and the record is what this file exists to reflect.
 *
 * THE WRITE RULE. A write operation is granted only where the Matrix uses
 * an explicit write verb: "write-back", or "write". Four workers plus the
 * Core Brain qualify. Several others name an "output" or a "record" —
 * Daniel's "designated discovery output", Oliver's "suitability output",
 * James's "authorised application outputs", Harper's "funding-gap
 * outputs", Alex's "authorised campaign records", the Receptionist's
 * "authorised routing record" — and a noun is not a verb. Those may well
 * be intended as worker writes, but they may equally describe a record the
 * platform produces, and the difference is exactly the difference between
 * a worker that can alter WSA's records and one that cannot. Guessing in
 * the permissive direction is not available, so they are read-only here
 * and the ambiguity is recorded for governance rather than resolved in
 * code.
 *
 * Where a write IS granted it is create and update only. Delete and
 * external_send are absent rather than present-and-false, because an
 * operation that is not listed cannot be granted by a typo, and neither is
 * implied by any Matrix line.
 *
 * NIA IS ABSENT FROM THE MATRIX. Version 0.2 predates her: she enters the
 * controlled record at Worker Register v0.42. So she has no SharePoint or
 * Drive line to transcribe, and inventing one would be inventing the
 * decision the Matrix exists to record. She holds nothing here, and the
 * gap is a conflict for governance to close, not a code question.
 *
 * A GRANT HERE IS STILL NOT ACCESS. Five things must agree before a worker
 * reaches anything in SharePoint: this record, the designated location for
 * that worker (sharePointLocations.ts, empty for everyone), the worker's
 * own connectorUseAuthorised flag (false for everyone until credentials
 * exist and are tested), the signed-in staff member's own permissions, and
 * the WSA boundary including the credential ring-fence.
 */
import type { ConnectorName, ConnectorOperation, WorkerId } from "./types";

export type ConnectorGrant = Readonly<Partial<Record<ConnectorName, ReadonlySet<ConnectorOperation>>>>;

const READ: ReadonlySet<ConnectorOperation> = Object.freeze(new Set<ConnectorOperation>(["search", "read"]));
const READ_WRITE: ReadonlySet<ConnectorOperation> = Object.freeze(
  new Set<ConnectorOperation>(["search", "read", "create", "update"]),
);

export const WORKER_CONNECTOR_SCOPE: Readonly<Record<WorkerId, ConnectorGrant>> = Object.freeze({
  /**
   * "Broad read of WSA governance and worker controls; controlled
   * governance write-back." Drive: "Read only when legacy/migration
   * evidence is materially relevant."
   */
  wsa_core_brain: Object.freeze({ sharepoint: READ_WRITE, google_drive: READ }),
  /** "Relevant enquiry/triage records; designated triage write-back." Drive: "None by default." */
  sophie: Object.freeze({ sharepoint: READ_WRITE }),
  /** "Discovery profile inputs and designated discovery output." No write verb. Drive: "None by default." */
  daniel: Object.freeze({ sharepoint: READ }),
  /** "Approved discovery/research records; research-pack write-back." Drive: "None by default." */
  amelia: Object.freeze({ sharepoint: READ_WRITE }),
  /** "QC-passed discovery and research packs; suitability output." No write verb. Drive: "None by default." */
  oliver: Object.freeze({ sharepoint: READ }),
  /** "Application evidence, admissions records and authorised application outputs." No write verb. */
  james: Object.freeze({ sharepoint: READ }),
  /** "Minimum necessary visa/compliance case evidence within verified authority." Read only. */
  priya: Object.freeze({ sharepoint: READ }),
  /** "Funding profile, verified scholarship evidence and funding-gap outputs." No write verb. */
  harper: Object.freeze({ sharepoint: READ }),
  /** "Minimum necessary pre-arrival/student-success records." Read only. */
  olivia: Object.freeze({ sharepoint: READ }),
  /** "Read access to records needed for authorised audit; controlled QA findings write-back." */
  grace: Object.freeze({ sharepoint: READ_WRITE }),
  /**
   * "Website/SEO governance and approved performance evidence." Read only.
   * Drive: "Read access where current website/Search Console legacy
   * evidence is stored in Drive; no student-case data."
   */
  ethan: Object.freeze({ sharepoint: READ, google_drive: READ }),
  /**
   * "Records-control scope across authorised SharePoint locations."
   * A scope is the right to look across authorised locations. It is not a
   * licence to change what is found, and her hard boundary is "No blind
   * retries, destructive action or retention decision without authority."
   * Drive: "Read/migration access only when moving or reconciling
   * authorised legacy records."
   */
  maya: Object.freeze({ sharepoint: READ, google_drive: READ }),
  /**
   * "Paid-media governance, approved measurement evidence and authorised
   * campaign records." No write verb.
   * Drive: "Read access to relevant legacy marketing/website evidence only."
   */
  alex: Object.freeze({ sharepoint: READ, google_drive: READ }),
  /**
   * Not present in Access Matrix v0.2, which predates her. Worker Register
   * v0.42 also records her as NOT APPROVED with NO LIVE PUBLISHING
   * AUTHORITY and NIA-G01 to NIA-G07 unresolved. Two independent reasons
   * to hold nothing, and neither is a code question.
   */
  nia: {},
  /** "Read across controlled governance evidence; write authorised assurance records." */
  wsa_governance_assurance: Object.freeze({ sharepoint: READ_WRITE, google_drive: READ }),
  /**
   * "Current Worker Register, minimum routing metadata and authorised
   * routing record." No write verb, and its hard boundary is "Routes only."
   */
  staff_receptionist: Object.freeze({ sharepoint: READ }),
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
