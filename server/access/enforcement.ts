/**
 * Enforcement — the single gate every consequential surface passes through.
 *
 * The standard is explicit that hiding a button is not access control:
 * enforcement has to happen where the data is fetched and where the action
 * is taken. So this module exists to be *called by* the backend/query
 * layer, AI context assembly, SharePoint and Drive retrieval, search,
 * export and every consequential action — not to be trusted alongside a
 * separate UI check.
 *
 * Three properties are structural rather than conventional:
 *
 * 1. Authority never comes from the request. Every function here takes a
 *    verified `StaffSession` and re-resolves the profile from the staff
 *    record (identity.ts). There is no parameter by which a caller can
 *    assert a level, a scope or a permission, so a crafted API call has
 *    nothing to elevate.
 *
 * 2. Filtering happens before data leaves the server. filterAccessibleCases
 *    returns the subset the staff member may see, so an unauthorised record
 *    is never serialised into a response for the client to hide.
 *
 * 3. The staff gate and the worker gate are independent and BOTH must
 *    pass. A worker being authorised for a connector does not let it fetch
 *    something the signed-in staff member may not see, and a staff member's
 *    seniority does not let an unapproved worker act. Neither substitutes
 *    for the other — authoriseConnectorRetrieval takes both and requires
 *    both.
 */
import { TRPCError } from "@trpc/server";
import type { StaffSession } from "../staffSession";
import { resolveStaffAccessProfile, type ProfileResolution } from "./identity";
import {
  evaluateAccess,
  type AccessDecision,
  type AccessRequest,
  type CaseContext,
  type StaffAccessProfile,
} from "./accessControl";

/**
 * The outcome of a gate: the decision plus everything an audit line needs.
 * Returned rather than thrown by the composable helpers, so a caller can
 * record a denial and continue with a filtered result instead of failing
 * a whole request.
 */
export interface EnforcementOutcome {
  allowed: boolean;
  /** Which dimension refused, or "profile" when no profile could be resolved. */
  deniedDimension: string | null;
  reason: string;
  staffUserId: number | null;
  action: string;
  functionalScope: string;
}

function outcomeFromDecision(
  decision: AccessDecision,
  staffUserId: number,
  request: AccessRequest,
): EnforcementOutcome {
  return {
    allowed: decision.allowed,
    deniedDimension: decision.allowed ? null : decision.deniedDimension,
    reason: decision.reason,
    staffUserId,
    action: request.action,
    functionalScope: request.functionalScope,
  };
}

function outcomeFromUnresolvedProfile(resolution: ProfileResolution, request: AccessRequest): EnforcementOutcome {
  if (resolution.resolved) throw new Error("outcomeFromUnresolvedProfile called with a resolved profile");
  return {
    allowed: false,
    deniedDimension: "profile",
    reason: resolution.detail,
    staffUserId: null,
    action: request.action,
    functionalScope: request.functionalScope,
  };
}

/**
 * The general gate. Resolves the profile live and evaluates one request.
 *
 * A shared-password session resolves to no profile and is therefore denied
 * everything here. That is deliberate and is the point of the transition to
 * individual identity: an access assignment cannot be attached to a session
 * that identifies no one, so the standard cannot be enforced for it. Such a
 * session keeps whatever pre-existing Staff Portal behaviour it had; it
 * simply gains nothing that goes through this gate.
 */
export async function checkAccess(session: StaffSession, request: AccessRequest): Promise<EnforcementOutcome> {
  return checkAccessForStaffUser(staffUserIdOf(session), request);
}

/**
 * The same gate for a caller that already holds a verified staff id rather
 * than the session object — the connector chokepoint, which carries
 * staffUserId through from the session precisely so nothing downstream has
 * to reconstruct one. Null (a shared-password session) resolves to no
 * profile and is denied.
 *
 * Taking the id rather than a session is the point: there is no way to
 * satisfy this by assembling a session-shaped object, because there is
 * nothing on a session but the id that this reads.
 */
export async function checkAccessForStaffUser(
  staffUserId: number | null,
  request: AccessRequest,
): Promise<EnforcementOutcome> {
  const resolution = await resolveStaffAccessProfile(staffUserId);
  if (!resolution.resolved) return outcomeFromUnresolvedProfile(resolution, request);
  return outcomeFromDecision(evaluateAccess(resolution.profile, request), resolution.profile.staffUserId, request);
}

/** The only authority a session carries here: which individual it identifies, if any. */
function staffUserIdOf(session: StaffSession): number | null {
  return session.authMethod === "entra_sso" ? session.staffUserId : null;
}

/**
 * The gate for a consequential action: same decision, but a denial stops
 * the request rather than shaping it. Use this for export, external send,
 * submit, approve, delete, financial action, access administration and
 * credential administration — anything where "carry on with less" is not a
 * safe outcome.
 *
 * FORBIDDEN, not NOT_FOUND: the staff member is authenticated, and the
 * denial reason names only the dimension that refused, never the content
 * that was protected.
 */
export async function requireAccess(session: StaffSession, request: AccessRequest): Promise<EnforcementOutcome> {
  const outcome = await checkAccess(session, request);
  if (!outcome.allowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: outcome.reason });
  }
  return outcome;
}

// ── Query layer ─────────────────────────────────────────────────────────
/**
 * Filters a set of case-bearing rows down to those the staff member may
 * see, so inaccessible records never leave the server.
 *
 * The caller supplies how to read a row's case context; the decision is
 * still made here, against the live profile. A caller that forgets to call
 * this gets nothing helpful — there is no "unfiltered" convenience path in
 * this module for it to reach for instead.
 */
export async function filterAccessibleCases<T>(
  session: StaffSession,
  rows: readonly T[],
  toCaseContext: (row: T) => CaseContext,
  request: Omit<AccessRequest, "case">,
): Promise<{ rows: T[]; outcome: EnforcementOutcome; withheldCount: number }> {
  const resolution = await resolveStaffAccessProfile(staffUserIdOf(session));
  if (!resolution.resolved) {
    return { rows: [], outcome: outcomeFromUnresolvedProfile(resolution, request as AccessRequest), withheldCount: rows.length };
  }

  const profile = resolution.profile;
  // The non-case dimensions are checked once: if the staff member may not
  // perform this action in this scope at all, no row is evaluated and none
  // is returned.
  const base = evaluateAccess(profile, request as AccessRequest);
  if (!base.allowed) {
    return {
      rows: [],
      outcome: outcomeFromDecision(base, profile.staffUserId, request as AccessRequest),
      withheldCount: rows.length,
    };
  }

  const permitted = rows.filter(row => evaluateAccess(profile, { ...request, case: toCaseContext(row) }).allowed);
  return {
    rows: permitted,
    outcome: outcomeFromDecision(base, profile.staffUserId, request as AccessRequest),
    withheldCount: rows.length - permitted.length,
  };
}

// ── Search ──────────────────────────────────────────────────────────────
/**
 * Search is the classic leak: a result list that names records the searcher
 * may not open still discloses that they exist, who they concern and
 * roughly what they say. So search runs the same gate over its results
 * before they are returned, and the count reported to the user is the count
 * of what they may actually see — a withheld row is not shown as a
 * redacted placeholder, because a placeholder is itself a disclosure.
 */
export async function filterSearchResults<T>(
  session: StaffSession,
  results: readonly T[],
  toCaseContext: (row: T) => CaseContext,
  request: Omit<AccessRequest, "case">,
): Promise<{ results: T[]; outcome: EnforcementOutcome; withheldCount: number }> {
  const filtered = await filterAccessibleCases(session, results, toCaseContext, request);
  return { results: filtered.rows, outcome: filtered.outcome, withheldCount: filtered.withheldCount };
}

// ── Export ──────────────────────────────────────────────────────────────
/**
 * Export is a separate permission from read, and this is where that is
 * enforced rather than assumed. Both gates apply: the staff member must
 * hold export_download, AND every row in the export must independently
 * pass the read gate — an export may never contain a record its owner
 * could not have opened one at a time.
 */
export async function authoriseExport<T>(
  session: StaffSession,
  rows: readonly T[],
  toCaseContext: (row: T) => CaseContext,
  request: Omit<AccessRequest, "case" | "action">,
): Promise<{ rows: T[]; outcome: EnforcementOutcome; withheldCount: number }> {
  const exportOutcome = await requireAccess(session, { ...request, action: "export_download" });
  const readable = await filterAccessibleCases(session, rows, toCaseContext, { ...request, action: "read" });
  return { rows: readable.rows, outcome: exportOutcome, withheldCount: readable.withheldCount };
}

// ── AI context assembly ─────────────────────────────────────────────────
/**
 * The AI layer asks the same question as any other reader, on behalf of the
 * signed-in staff member — it has no identity or authority of its own.
 *
 * Filtering happens BEFORE assembly, not after generation: material the
 * staff member may not see is never placed in the context window at all,
 * so there is nothing for a prompt to talk a worker into revealing. The
 * worker's own registry permission is a separate gate the caller applies in
 * addition (see workforce/context.ts); passing this one does not satisfy
 * that one.
 */
export async function selectAuthorisedContext<T>(
  session: StaffSession,
  candidates: readonly T[],
  toCaseContext: (row: T) => CaseContext,
  request: Omit<AccessRequest, "case">,
): Promise<{ context: T[]; outcome: EnforcementOutcome; withheldCount: number }> {
  const filtered = await filterAccessibleCases(session, candidates, toCaseContext, request);
  return { context: filtered.rows, outcome: filtered.outcome, withheldCount: filtered.withheldCount };
}

// ── SharePoint / Google Drive retrieval ─────────────────────────────────
export interface ConnectorRetrievalRequest extends AccessRequest {
  /** For audit only — never interpreted as evidence of authority. */
  resourceReference: string;
}

/**
 * Retrieval from a controlled document store must satisfy BOTH gates:
 * the worker's registry permission (passed in, evaluated by
 * workforce/permissions.ts) and the signed-in staff member's own access.
 *
 * The worker gate is reported first when both refuse. That ordering is
 * about the reason, not the result — both must pass either way — and it is
 * deliberate: the worker gate is a platform-level fact ("this worker may
 * not touch connectors at all"), true no matter who is asking. Reporting
 * the staff dimension first would tell someone their own permissions are
 * wrong when in fact nothing is open to anyone, which is the wrong thing
 * for an assurance reviewer to read in the log and the wrong thing for a
 * staff member to be told. It also matches the order the real chokepoint
 * (workforce/connectors/shared.ts) already evaluates them in, so there is
 * one story rather than two.
 */
export async function authoriseConnectorRetrieval(
  session: StaffSession,
  request: ConnectorRetrievalRequest,
  workerPermission: { allowed: boolean; reason: string },
): Promise<EnforcementOutcome> {
  if (!workerPermission.allowed) {
    return {
      allowed: false,
      deniedDimension: "worker_authorisation",
      reason: workerPermission.reason,
      staffUserId: null,
      action: request.action,
      functionalScope: request.functionalScope,
    };
  }

  return checkAccess(session, request);
}

/** Exported for tests and for callers that already hold a resolved profile. */
export function decideForProfile(profile: StaffAccessProfile, request: AccessRequest, now?: Date): AccessDecision {
  return evaluateAccess(profile, request, now);
}
