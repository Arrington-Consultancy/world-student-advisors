/**
 * The approved profile for WSA's first access administrator.
 *
 * WHY THIS IS A CONSTANT AND NOT A PARAMETER. Everything that establishes
 * or completes the first administrator reads this one definition, and
 * nothing accepts a profile as input. That is what makes the bootstrap and
 * its completion bounded: they can produce exactly this and nothing else,
 * so no caller, argument or workflow input can widen what they do.
 *
 * WHAT WENT WRONG BEFORE. The bootstrap granted "executive", "operations",
 * "governance" and "technical_administration". That reads sensibly and it
 * deadlocked WSA in production on 3 September 2026, in two separate ways
 * that both had to be fixed here.
 *
 * The first is the one that showed on screen. The bootstrap left the
 * account short of the access it actually needed, and the access screen
 * then refused to let the administrator complete it, because
 * decideAssignment correctly refuses self-administration. The old comment
 * said a second administrator would widen the first, which sounds like a
 * process and is really a deadlock: there was no second administrator, and
 * appointing one is itself an access change.
 *
 * The second would have bitten immediately afterwards. An administrator
 * may not grant what they do not hold. Holding four scopes, none of them a
 * worker scope, the first administrator could never have assigned
 * enquiry_triage or admissions to anybody, so the estate could not have
 * been administered even with the first wall gone.
 *
 * Both are fixed by the bootstrap establishing the whole approved profile
 * in one atomic step, rather than a partial one it has no way to finish.
 *
 * THE PROFILE. Tom Arrington specified it on 3 September 2026 under
 * "Tom Arrington explicit first-administrator access approval": Level 1,
 * organisation case scope, the thirteen staff-facing worker scopes, and
 * read, create, update and access_admin.
 *
 * read, create and update are what writing an assignment actually needs.
 * access_admin is the point of the role. The other six consequential
 * permissions are absent rather than present-and-false, so that submit,
 * external_send, financial_action, approve, delete_destructive and
 * credential_admin cannot be granted here by a typo, and are not implied
 * by administering access.
 *
 * SENSITIVE OVERLAYS ARE ABSENT ON PURPOSE, AND THAT IS NOT THE SAME AS
 * EMPTY. This profile does not mention them, and the completion route
 * leaves whatever overlays an account already holds exactly as they are.
 * An overlay is a separate approval about a category of material, not part
 * of being an administrator, so this must neither grant one nor take one
 * away.
 */
import type { AccessLevel, ActionPermission, CaseScope, FunctionalScope } from "./accessControl";

export const FIRST_ADMINISTRATOR_LEVEL: AccessLevel = 1;

export const FIRST_ADMINISTRATOR_CASE_SCOPE: CaseScope = "organisation";

/**
 * One per staff-facing worker, so the first administrator can assign the
 * workforce to colleagues. Without these the account holds access_admin
 * and still cannot administer, because nobody grants what they do not
 * hold.
 */
export const FIRST_ADMINISTRATOR_SCOPES: readonly FunctionalScope[] = Object.freeze([
  "enquiry_triage",
  "discovery",
  "education_research",
  "suitability",
  "admissions",
  "visa_compliance",
  "scholarships_funding",
  "pre_arrival_student_success",
  "quality_assurance",
  "marketing_seo",
  "records_control",
  "paid_media",
  "social_media",
]);

export const FIRST_ADMINISTRATOR_ACTIONS: readonly ActionPermission[] = Object.freeze([
  "read",
  "create",
  "update",
  "access_admin",
]);

export const FIRST_ADMINISTRATOR_REASON =
  "First access administrator, established by controlled bootstrap.";

export const FIRST_ADMINISTRATOR_AUTHORITY =
  "Tom Arrington explicit first-administrator access approval, 3 September 2026.";
