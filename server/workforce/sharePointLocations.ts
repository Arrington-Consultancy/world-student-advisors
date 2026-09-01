/**
 * Which SharePoint locations each worker may reach.
 *
 * WHY THIS EXISTS. Until now the WSA boundary check (wsaScope.ts) asked
 * one question of a SharePoint request: is this path inside the WSA site?
 * That was the right question and it is not enough, because the WSA site
 * is one drive and it holds far more than WSA's controlled records. Read
 * from the live tenant on 1 September 2026, its root contains
 * 03_FAMILY_&_PERSONAL (28 GB), 04_FINANCE_&_BANKING, 05_HUB with named
 * individuals' folders and 13. Appraisals_Feedback_Docs, 01_ADMIN_&_
 * GOVERNANCE/04_HR_&_People Governance, and a folder named for one member
 * of staff. Every one of those was inside the site, and so every one of
 * them was inside scope for any worker holding a SharePoint grant.
 *
 * The Worker Personality and Connector Access Matrix v0.2 does not permit
 * that. Its first principle is "Workers receive only the minimum
 * SharePoint access needed for their role", its section 3 requires read
 * and write to "follow its controlled remit and designated record
 * locations", and its section 5 makes the deployment owner verify
 * "permitted SharePoint locations" before a worker is called
 * connector-ready. A site-wide scope satisfies none of those.
 *
 * So this module is the designation the Matrix requires, and it is the
 * narrower of the two gates: a path must be inside the WSA site AND
 * inside a location designated for that particular worker.
 *
 * WHY EVERY LIST IS EMPTY. Because no controlled record designates one.
 * The Matrix describes each worker's SharePoint access in prose — "Funding
 * profile, verified scholarship evidence and funding-gap outputs" — and
 * those are record CLASSES, not locations. Reading the live site, the
 * record classes most of them name do not exist there at all: there is no
 * per-student case structure in SharePoint, and the platform's case
 * material lives in the database instead. Choosing a folder to stand in
 * for "admissions records" would be inventing the designation the Matrix
 * says the deployment owner must verify, and a wrong guess points a worker
 * at either nothing or somebody's personal files.
 *
 * An empty list is therefore the correct state and not an unfinished one.
 * It denies, it denies loudly with a reason naming what is missing, and
 * when a designation is made the enforcement it needs is already here and
 * already tested rather than written under pressure on activation day.
 *
 * WHAT THIS MODULE CANNOT DO. Widen anything. It is consulted only to
 * refuse: there is no code path in which a designation here grants an
 * operation that the Access Matrix, the worker's own authorisation flags,
 * the signed-in staff member's permissions and the WSA boundary have not
 * each already allowed.
 */
import type { WorkerId } from "./types";

/**
 * A designated location, as a path relative to the WSA site's drive root,
 * with no leading or trailing slash. A worker designated "16_WEBSITE" may
 * reach that folder and everything beneath it, and nothing else.
 */
export type SharePointLocation = string;

/**
 * The designation. Total over WorkerId by the type, so a worker added
 * without a SharePoint answer will not compile rather than inheriting
 * somebody else's locations or, worse, defaulting to the whole site.
 */
export const WORKER_SHAREPOINT_LOCATIONS: Readonly<Record<WorkerId, readonly SharePointLocation[]>> = Object.freeze({
  wsa_core_brain: Object.freeze([]),
  sophie: Object.freeze([]),
  daniel: Object.freeze([]),
  amelia: Object.freeze([]),
  oliver: Object.freeze([]),
  james: Object.freeze([]),
  priya: Object.freeze([]),
  harper: Object.freeze([]),
  olivia: Object.freeze([]),
  grace: Object.freeze([]),
  ethan: Object.freeze([]),
  maya: Object.freeze([]),
  alex: Object.freeze([]),
  nia: Object.freeze([]),
  wsa_governance_assurance: Object.freeze([]),
  staff_receptionist: Object.freeze([]),
});

/**
 * Areas of the live WSA drive that must never be designated to any
 * worker, whatever else is decided later.
 *
 * This is separate from the per-worker designation on purpose. A
 * designation is a decision somebody makes; this is a decision already
 * made, and it is checked independently so that designating a location by
 * mistake cannot reach these. It is matched as a run of whole path
 * segments anywhere in the path, so naming a parent catches everything
 * under it and a nested folder of the same name is caught too.
 *
 * Every entry was read from the live site rather than guessed, and each
 * is here because its content is categorically not worker material:
 * personal and family files, company banking, HR and appraisal records,
 * an individual member of staff's own folder, and the credential store
 * that the ring fence in wsaScope.ts already catches by name — listed
 * again here so it is denied by location as well as by filename.
 */
export const NEVER_DESIGNATED: readonly SharePointLocation[] = Object.freeze([
  "03_FAMILY_&_PERSONAL",
  "04_FINANCE_&_BANKING",
  "05_HUB/13. Appraisals_Feedback_Docs",
  "05_HUB/14_HUB Password",
  "05_HUB/17_Job Seekers",
  "01_ADMIN_&_GOVERNANCE/04_HR_&_People Governance",
  "Mary Obeng",
]);

export const NO_LOCATION_DESIGNATED =
  "No SharePoint location is designated for this worker. The Worker Personality and Connector Access Matrix v0.2 " +
  "section 3 requires read and write to follow designated record locations, and section 5 requires the deployment " +
  "owner to verify permitted SharePoint locations before a worker is connector-ready. Designating one is a " +
  "controlled decision, not a code change.";

export const LOCATION_NOT_DESIGNATED =
  "That SharePoint location is not designated for this worker. Being inside the WSA site is not sufficient: the " +
  "site also holds personal, financial and HR material that no worker may reach.";

export const NEVER_DESIGNATED_REASON =
  "That SharePoint location can never be designated to any worker. Personal, family, banking, HR, appraisal and " +
  "credential material is out of bounds for the whole workforce, whatever any designation says.";

export interface LocationDecision {
  permitted: boolean;
  reason: string;
}

/** Path-prefix containment: "16_WEBSITE" contains "16_WEBSITE/a", not "16_WEBSITE_OLD". */
function isWithin(path: string, location: SharePointLocation): boolean {
  return path === location || path.startsWith(`${location}/`);
}

function segments(value: string): string[] {
  return value.split("/").filter(part => part !== "");
}

/**
 * Whether a forbidden location appears anywhere in the path as a run of
 * whole segments.
 *
 * Deliberately more defensive than the prefix match used for
 * designations, and the difference matters. The prefix match depends on
 * the site id having been stripped correctly, which depends on
 * SHAREPOINT_GRAPH_SITE_ID being configured. It is not configured in
 * production today, and a production acceptance run caught this exactly:
 * an unstripped path meant "wsa-site/03_FAMILY_&_PERSONAL/x" did not start
 * with "03_FAMILY_&_PERSONAL" and sailed past the forbidden check.
 *
 * Nothing was reachable anyway, because the WSA boundary refuses every
 * SharePoint request while the site is unconfigured. But this is the one
 * check whose failure mode is a worker reading somebody's bank statements,
 * and leaning on a different gate for its correctness is the fragility
 * this module exists to remove. So it no longer depends on configuration
 * being right.
 *
 * Segment-aligned, so "03_FAMILY_&_PERSONAL_ARCHIVE" is still a different
 * folder, and a nested folder of the same name is caught too: a directory
 * called Passwords three levels down is the same risk as one at the root.
 */
function containsForbidden(path: string, location: SharePointLocation): boolean {
  const haystack = segments(path);
  const needle = segments(location);
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    if (needle.every((part, j) => haystack[i + j] === part)) return true;
  }
  return false;
}

/**
 * Strips the configured site id from a resource scope, leaving the path
 * within the drive. wsaScope.ts has already established that the scope is
 * inside the site before this runs, so a scope that does not carry the
 * prefix is treated as a bare path rather than rejected twice.
 */
function pathWithinSite(resourceScope: string, siteId: string | undefined): string {
  const trimmed = resourceScope.trim().replace(/^\/+|\/+$/g, "");
  if (!siteId) return trimmed;
  if (trimmed === siteId) return "";
  return trimmed.startsWith(`${siteId}/`) ? trimmed.slice(siteId.length + 1) : trimmed;
}

/**
 * Whether this worker may reach this SharePoint path.
 *
 * Order matters and is deliberate. The never-designated areas are checked
 * first, so they are refused for the same reason whether or not the worker
 * has any designation at all: somebody reading the audit trail should see
 * "this is out of bounds for everyone", not "this worker happens to lack
 * a designation covering it", which reads like something a designation
 * could fix.
 */
export function decideSharePointLocation(
  workerId: WorkerId,
  resourceScope: string,
  siteId: string | undefined = process.env.SHAREPOINT_GRAPH_SITE_ID,
): LocationDecision {
  const path = pathWithinSite(resourceScope, siteId);

  // Segment containment rather than a prefix, so a missing or mismatched
  // site id cannot let a forbidden area through. Checking the raw scope as
  // well was tried and removed: segment matching already catches an
  // unstripped path, no test could tell the two apart, and defensive code
  // that implies a guarantee it is not providing is worse than none.
  for (const forbidden of NEVER_DESIGNATED) {
    if (containsForbidden(path, forbidden)) {
      return { permitted: false, reason: NEVER_DESIGNATED_REASON };
    }
  }

  const designated = WORKER_SHAREPOINT_LOCATIONS[workerId];
  if (designated.length === 0) {
    return { permitted: false, reason: NO_LOCATION_DESIGNATED };
  }

  // The site root itself is never a designation. A worker designated a
  // folder may read that folder, not the drive that contains it.
  if (path === "") {
    return { permitted: false, reason: LOCATION_NOT_DESIGNATED };
  }

  for (const location of designated) {
    if (isWithin(path, location)) {
      return { permitted: true, reason: `Within the designated location "${location}".` };
    }
  }

  return { permitted: false, reason: LOCATION_NOT_DESIGNATED };
}
