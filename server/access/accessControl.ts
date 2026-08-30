/**
 * WSA Staff Portal access control — the pure permission model.
 *
 * Implements WSA Staff Portal Access Control Standard v1.0 (APPROVED,
 * 30 August 2026, approval authority Tom Arrington). Every rule below
 * traces to a numbered section of that standard, quoted at the point it
 * is enforced, so a reviewer can check the code against the document
 * without holding both in their head.
 *
 * This file is deliberately PURE: no database, no network, no session, no
 * environment. It decides, given an access profile and a description of
 * what is being touched, whether that is permitted. Wiring it to identity,
 * routes, AI context assembly, connectors, search and export happens in
 * later stages; nothing here can have a production effect on its own.
 *
 * Standard §1 — three independent dimensions, ALL of which must be
 * satisfied: "A member of staff must satisfy all three before seeing or
 * changing information... This avoids the unsafe assumption that a senior
 * title automatically permits every technical action."
 *
 * Standard §9 — "Permission denial must fail closed. Missing or ambiguous
 * permission means no access until resolved." Every unknown value, absent
 * mapping and unrecognised input in this file therefore denies.
 */

// ── Dimension 1: access level (§2) ──────────────────────────────────────
export type AccessLevel = 1 | 2 | 3 | 4 | 5;

/** §2 table, "Name" column — for display and audit only; never for decisions. */
export const ACCESS_LEVEL_NAMES: Readonly<Record<AccessLevel, string>> = Object.freeze({
  1: "Executive / Full Business",
  2: "Senior Management",
  3: "Function / Team Management",
  4: "Caseworker / Adviser",
  5: "Restricted / Own Applicants",
});

// ── Dimension 2: functional scope (§4) ──────────────────────────────────
/** §4 — the approved scope list, verbatim. A scope outside this set denies. */
export const FUNCTIONAL_SCOPES = [
  "executive",
  "operations",
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
  /**
   * Organic social. Deliberately separate from marketing_seo rather than
   * folded into it: Worker Register v0.42 draws the boundary explicitly —
   * Nia owns organic social, Ethan owns SEO — and this list is what the
   * collaboration layer uses to reject an out-of-lane contribution. Give
   * them one shared scope and each could contribute in the other's lane,
   * which is the boundary the Register exists to hold.
   */
  "social_media",
  "paid_media",
  "records_control",
  "governance",
  "finance",
  "safeguarding",
  "technical_administration",
] as const;
export type FunctionalScope = (typeof FUNCTIONAL_SCOPES)[number];

// ── Dimension 3: action permission (§6) ─────────────────────────────────
/** §6 table, verbatim. Note EXPORT_DOWNLOAD, EXTERNAL_SEND, SUBMIT,
 *  DELETE_DESTRUCTIVE, FINANCIAL_ACTION, ACCESS_ADMIN and CREDENTIAL_ADMIN
 *  are ordinary members of this list precisely so they must be granted
 *  explicitly and can never be inferred from READ (§3, §6). */
export const ACTION_PERMISSIONS = [
  "read",
  "create",
  "update",
  "comment_handoff",
  "export_download",
  "external_send",
  "submit",
  "approve",
  "delete_destructive",
  "financial_action",
  "access_admin",
  "credential_admin",
] as const;
export type ActionPermission = (typeof ACTION_PERMISSIONS)[number];

/**
 * §3 — "Level 1 means the broadest authorised business-data visibility. It
 * must not be implemented as a magic 'can do anything' flag. Technical
 * super-administration, credential management, deletion, payment
 * authority, external submission authority, advertising spend authority
 * and other consequential capabilities are separate permissions."
 *
 * These are listed here ONLY for documentation and for the guard in
 * assertNoLevelDerivedActions(); no code path grants them from a level.
 */
export const CONSEQUENTIAL_ACTIONS: ReadonlySet<ActionPermission> = new Set<ActionPermission>([
  "export_download",
  "external_send",
  "submit",
  "delete_destructive",
  "financial_action",
  "access_admin",
  "credential_admin",
]);

// ── Case scope (§5) ─────────────────────────────────────────────────────
/** §5 — "The platform should support organisation-wide, team-wide,
 *  assigned-caseload and own-applicant scopes." */
export const CASE_SCOPES = ["organisation", "team", "assigned_caseload", "own_applicants"] as const;
export type CaseScope = (typeof CASE_SCOPES)[number];

// ── Sensitive-data overlays (§7) ────────────────────────────────────────
/** §7 — the recommended overlay list, verbatim. */
export const SENSITIVE_OVERLAYS = [
  "finance",
  "safeguarding",
  "visa_regulated",
  "hr_staff_private",
  "complaints_legal",
  "credentials_security",
  "records_destructive",
] as const;
export type SensitiveOverlay = (typeof SENSITIVE_OVERLAYS)[number];

/**
 * §7 — "Certain information requires an additional explicit overlay EVEN
 * WHEN THE BASE LEVEL WOULD OTHERWISE PERMIT ACCESS." The overlay is
 * therefore a NECESSARY condition, never a sufficient one: it is checked
 * in addition to level, scope and action, not instead of any of them.
 *
 * A minimum level is also required per category, so an overlay granted in
 * error cannot hand a Level 5 account material a Level 5 account should
 * never reach. §8 requires finance to be reachable by finance staff whose
 * level is "based on seniority" rather than only by Level 1, which is why
 * finance sits at 3 rather than 1.
 */
export const SENSITIVE_OVERLAY_MIN_LEVEL: Readonly<Record<SensitiveOverlay, AccessLevel>> = Object.freeze({
  finance: 3,
  safeguarding: 3,
  visa_regulated: 4,
  hr_staff_private: 2,
  complaints_legal: 2,
  credentials_security: 1,
  records_destructive: 2,
});

// ── Business (non-case) data classes ────────────────────────────────────
/**
 * The §2 table states each level's business visibility and its explicit
 * exclusions in prose. These classes make that prose decidable. Each entry
 * cites the table wording it comes from. A class absent from this map is
 * DENIED at every level (§9 fail closed) rather than defaulting to open.
 */
export const BUSINESS_DATA_MIN_LEVEL: Readonly<Record<string, AccessLevel>> = Object.freeze({
  /** L1 "company financial records"; L2 excludes "company financial ledgers,
   *  banking, payroll, director/private financial records". Also gated by
   *  the finance overlay — see requiresSensitiveOverlay below. */
  company_financial: 1,
  /** L1 "audit information"; L3 excludes "governance administration". */
  governance: 2,
  /** L1 "commercial records"; L3 excludes "unrelated commercial
   *  intelligence"; L5 excludes "confidential partner/commercial records". */
  commercial_intelligence: 2,
  /** L2 "Broad operational, partner, performance, marketing and governance
   *  visibility"; L4 excludes "broad business analytics unless required". */
  business_analytics: 2,
  /** L3 "team performance and function-specific records"; L4 excludes
   *  "management-only data"; L5 excludes "governance or management data". */
  management_reporting: 3,
  /** L3 "Relevant operational policies, partner/institution information";
   *  L4 "approved institution/course/partner information and relevant
   *  procedures". */
  partner_institution: 4,
  operational_policy: 4,
  /** L5 "Minimum shared knowledge required to service those applicants." */
  shared_operational_knowledge: 5,
});

/** Business classes that ALSO require a named overlay, per §7. */
const BUSINESS_CLASS_REQUIRED_OVERLAY: Readonly<Record<string, SensitiveOverlay>> = Object.freeze({
  company_financial: "finance",
});

// ── The access profile (§10 recommended user-access object) ─────────────
export type AccountStatus = "active" | "suspended" | "disabled";

/**
 * §10 — "Recommended user-access object: baseAccessLevel (1-5),
 * functionalScopes[], caseScope, actionPermissions[], sensitiveOverlays[],
 * temporaryGrants[], status and audit metadata."
 *
 * teamId is additionally required because §5's team-wide case scope is
 * otherwise undecidable — "team-wide" cannot be evaluated without knowing
 * which team the staff member belongs to. It carries no authority of its
 * own; it only scopes case visibility for a profile whose caseScope is
 * already "team".
 */
export interface TemporaryGrant {
  /** §9 — "All permission changes, temporary elevations and high-risk
   *  actions must be logged with who, what, when and reason." */
  grantedByStaffUserId: number;
  reason: string;
  grantedAt: Date;
  /** §9 — "Temporary access should expire automatically where technically
   *  possible." A grant is inert from this instant onward. */
  expiresAt: Date;
  functionalScopes?: readonly FunctionalScope[];
  actionPermissions?: readonly ActionPermission[];
  sensitiveOverlays?: readonly SensitiveOverlay[];
  /** A temporary grant may only widen case scope, never narrow it. */
  caseScope?: CaseScope;
}

export interface StaffAccessProfile {
  staffUserId: number;
  baseAccessLevel: AccessLevel;
  functionalScopes: readonly FunctionalScope[];
  caseScope: CaseScope;
  actionPermissions: readonly ActionPermission[];
  sensitiveOverlays: readonly SensitiveOverlay[];
  temporaryGrants: readonly TemporaryGrant[];
  status: AccountStatus;
  teamId: string | null;
  /** Audit metadata (§10). Descriptive only — never consulted for a decision. */
  assignedByStaffUserId: number | null;
  assignedAt: Date | null;
  assignmentReason: string | null;
}

// ── The access request ──────────────────────────────────────────────────
/**
 * What is being touched. Deliberately describes ONLY the resource and the
 * action: there is no field by which a caller can assert what permissions
 * they hold. Authority is read exclusively from the server-resolved
 * StaffAccessProfile, so a crafted request body cannot elevate anything —
 * this is the structural answer to §9's "hide inaccessible data at the
 * query/retrieval layer, not merely hide buttons in the interface" and to
 * a direct-API bypass attempt.
 */
export interface CaseContext {
  /** Staff explicitly assigned to the applicant/case. */
  assignedStaffUserIds: readonly number[];
  /** §5 — an auditable assignment for "temporary cover or escalation". */
  sharedWithStaffUserIds?: readonly number[];
  teamId: string | null;
}

export interface AccessRequest {
  action: ActionPermission;
  functionalScope: FunctionalScope;
  /** Present when reading business (non-case) information. */
  businessDataClass?: string;
  /** Present when the material falls in a §7 sensitive category. */
  sensitiveCategory?: SensitiveOverlay;
  /** Present when the request touches a student/applicant case. */
  case?: CaseContext;
}

export type DeniedDimension =
  | "account_status"
  | "action_permission"
  | "functional_scope"
  | "access_level"
  | "sensitive_overlay"
  | "case_scope"
  | "unknown_value";

export type AccessDecision =
  | { allowed: true; reason: string }
  | { allowed: false; deniedDimension: DeniedDimension; reason: string };

function deny(deniedDimension: DeniedDimension, reason: string): AccessDecision {
  return { allowed: false, deniedDimension, reason };
}

// ── Effective profile: base rights plus live temporary grants ───────────
export interface EffectiveAccess {
  baseAccessLevel: AccessLevel;
  functionalScopes: ReadonlySet<FunctionalScope>;
  actionPermissions: ReadonlySet<ActionPermission>;
  sensitiveOverlays: ReadonlySet<SensitiveOverlay>;
  caseScope: CaseScope;
  teamId: string | null;
}

const CASE_SCOPE_BREADTH: Readonly<Record<CaseScope, number>> = Object.freeze({
  own_applicants: 0,
  assigned_caseload: 1,
  team: 2,
  organisation: 3,
});

/**
 * Applies every temporary grant that has not expired at `now`. An expired
 * grant contributes NOTHING — it is not merely flagged, it is absent from
 * the returned sets, so no downstream check can accidentally honour it
 * (§9, automatic expiry).
 *
 * A temporary grant never raises baseAccessLevel: §2's levels are the
 * standing authority decision, and a temporary elevation of level would
 * be a role change rather than cover. Grants may add scopes, actions and
 * overlays, and may widen case scope only.
 */
export function resolveEffectiveAccess(profile: StaffAccessProfile, now: Date): EffectiveAccess {
  const functionalScopes = new Set<FunctionalScope>(profile.functionalScopes);
  const actionPermissions = new Set<ActionPermission>(profile.actionPermissions);
  const sensitiveOverlays = new Set<SensitiveOverlay>(profile.sensitiveOverlays);
  let caseScope = profile.caseScope;

  for (const grant of profile.temporaryGrants) {
    if (!(grant.expiresAt instanceof Date) || grant.expiresAt.getTime() <= now.getTime()) continue;
    for (const s of grant.functionalScopes ?? []) functionalScopes.add(s);
    for (const a of grant.actionPermissions ?? []) actionPermissions.add(a);
    for (const o of grant.sensitiveOverlays ?? []) sensitiveOverlays.add(o);
    if (grant.caseScope && CASE_SCOPE_BREADTH[grant.caseScope] > CASE_SCOPE_BREADTH[caseScope]) {
      caseScope = grant.caseScope;
    }
  }

  return {
    baseAccessLevel: profile.baseAccessLevel,
    functionalScopes,
    actionPermissions,
    sensitiveOverlays,
    caseScope,
    teamId: profile.teamId,
  };
}

// ── Case-scope evaluation (§5) ──────────────────────────────────────────
function evaluateCaseAccess(
  effective: EffectiveAccess,
  staffUserId: number,
  context: CaseContext,
): AccessDecision {
  const assigned = context.assignedStaffUserIds.includes(staffUserId);
  const shared = (context.sharedWithStaffUserIds ?? []).includes(staffUserId);

  switch (effective.caseScope) {
    case "organisation":
      // §2 L1 — "All student and applicant records across the organisation".
      return { allowed: true, reason: "Organisation-wide case scope." };
    case "team": {
      // §2 L3 — "All cases within the person's approved team... Cross-team
      // cases only through explicit handoff/escalation."
      if (effective.teamId && context.teamId && effective.teamId === context.teamId) {
        return { allowed: true, reason: "Case is within the staff member's team." };
      }
      if (shared) {
        return { allowed: true, reason: "Cross-team case reached through an explicit handoff." };
      }
      return deny(
        "case_scope",
        "Team-wide scope does not reach this case: it belongs to another team and no explicit handoff exists.",
      );
    }
    case "assigned_caseload": {
      // §2 L4 — "Assigned caseload plus cases explicitly shared for cover,
      // collaboration or escalation."
      if (assigned) return { allowed: true, reason: "Case is on the staff member's assigned caseload." };
      if (shared) return { allowed: true, reason: "Case was explicitly shared for cover or escalation." };
      return deny("case_scope", "Case is not on this staff member's assigned caseload and was not shared with them.");
    }
    case "own_applicants": {
      // §2 L5 — "Only applicants explicitly assigned to that user". Sharing
      // deliberately does NOT widen this: the level exists to keep a tightly
      // scoped user to their own applicants.
      if (assigned) return { allowed: true, reason: "Applicant is explicitly assigned to this staff member." };
      return deny("case_scope", "Restricted scope reaches only applicants explicitly assigned to this staff member.");
    }
    default:
      return deny("unknown_value", "Unrecognised case scope — failing closed.");
  }
}

// ── The single evaluation entry point ───────────────────────────────────
/**
 * §1 — all three dimensions must be satisfied; §9 — deny closed.
 *
 * Order is deliberate: status, then action, then scope, then level, then
 * overlay, then case. Each returns the dimension that failed so a denial
 * is diagnosable in the audit log without leaking what the data was.
 */
export function evaluateAccess(
  profile: StaffAccessProfile,
  request: AccessRequest,
  now: Date = new Date(),
): AccessDecision {
  // §9 — "Access must be removed or changed promptly when staff role,
  // employment, team or responsibilities change." A non-active account
  // holds no access at all, regardless of what its profile still says.
  if (profile.status !== "active") {
    return deny("account_status", `Staff account status is "${profile.status}", not active.`);
  }

  // Unknown enum values deny before anything else is considered (§9).
  if (!(ACTION_PERMISSIONS as readonly string[]).includes(request.action)) {
    return deny("unknown_value", "Unrecognised action — failing closed.");
  }
  if (!(FUNCTIONAL_SCOPES as readonly string[]).includes(request.functionalScope)) {
    return deny("unknown_value", "Unrecognised functional scope — failing closed.");
  }

  const effective = resolveEffectiveAccess(profile, now);

  // Dimension 3 (§6): the action itself must be granted. Checked before
  // anything else a senior level might seem to imply — §3.
  if (!effective.actionPermissions.has(request.action)) {
    return deny(
      "action_permission",
      `Action "${request.action}" is not granted to this staff member. Consequential actions are never inherited from an access level.`,
    );
  }

  // Dimension 2 (§4): "A user sees only the intersection between their
  // access level and their functional scope."
  if (!effective.functionalScopes.has(request.functionalScope)) {
    return deny("functional_scope", `Functional scope "${request.functionalScope}" is not granted to this staff member.`);
  }

  // Dimension 1 (§2): business-data breadth by level.
  if (request.businessDataClass !== undefined) {
    const minLevel = BUSINESS_DATA_MIN_LEVEL[request.businessDataClass];
    if (minLevel === undefined) {
      return deny("unknown_value", `Unrecognised business data class "${request.businessDataClass}" — failing closed.`);
    }
    if (effective.baseAccessLevel > minLevel) {
      return deny(
        "access_level",
        `Access level ${effective.baseAccessLevel} does not reach business data class "${request.businessDataClass}".`,
      );
    }
    const impliedOverlay = BUSINESS_CLASS_REQUIRED_OVERLAY[request.businessDataClass];
    if (impliedOverlay && !effective.sensitiveOverlays.has(impliedOverlay)) {
      return deny(
        "sensitive_overlay",
        `Business data class "${request.businessDataClass}" additionally requires the "${impliedOverlay}" overlay, which this staff member does not hold.`,
      );
    }
  }

  // §7 overlays — necessary in addition to everything above, never sufficient.
  if (request.sensitiveCategory !== undefined) {
    if (!(SENSITIVE_OVERLAYS as readonly string[]).includes(request.sensitiveCategory)) {
      return deny("unknown_value", "Unrecognised sensitive category — failing closed.");
    }
    if (!effective.sensitiveOverlays.has(request.sensitiveCategory)) {
      return deny(
        "sensitive_overlay",
        `Sensitive category "${request.sensitiveCategory}" requires an explicit overlay, which this staff member does not hold.`,
      );
    }
    const minLevel = SENSITIVE_OVERLAY_MIN_LEVEL[request.sensitiveCategory];
    if (effective.baseAccessLevel > minLevel) {
      return deny(
        "access_level",
        `Access level ${effective.baseAccessLevel} is below the minimum for sensitive category "${request.sensitiveCategory}".`,
      );
    }
  }

  // §5 case scope.
  if (request.case !== undefined) {
    const caseDecision = evaluateCaseAccess(effective, profile.staffUserId, request.case);
    if (!caseDecision.allowed) return caseDecision;
  }

  return { allowed: true, reason: "Level, functional scope, action permission and case scope all satisfied." };
}

/**
 * Guard used by the tests and safe to call anywhere: asserts that no
 * consequential action is reachable purely because of a high access level
 * (§3). Returns the consequential actions this profile actually holds —
 * which must always be ones explicitly granted, never derived.
 */
export function consequentialActionsHeld(profile: StaffAccessProfile, now: Date = new Date()): ActionPermission[] {
  const effective = resolveEffectiveAccess(profile, now);
  return Array.from(effective.actionPermissions).filter(a => CONSEQUENTIAL_ACTIONS.has(a)).sort();
}
