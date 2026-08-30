/**
 * Escalation routing, ownership and closure.
 *
 * Implements clauses 18 and 19 of the WSA AI Operational Standard v1.0
 * (APPROVED). Pure: no database, no network, no notifications sent. It
 * decides who should be told and what the escalation record must contain.
 * Actually sending anything is a separate, separately gated step, and
 * nothing here may claim a human was notified.
 *
 * The routing rule is the part worth reading carefully. §18 says to alert
 * "the relevant authorised manager or highest-clearance human for that
 * subject" and, in the same breath, "do not indiscriminately expose
 * sensitive information to every privileged person". Those pull in
 * opposite directions, and the resolution is that clearance alone is never
 * enough: a recipient must be BOTH authorised for the subject AND relevant
 * to it. A Level 1 executive with no safeguarding overlay is not a valid
 * recipient for a safeguarding escalation, however senior they are.
 *
 * Where more than one human is both authorised and relevant, more than one
 * may be alerted (§18). Where nobody is, that is itself a finding: the
 * escalation stays open and unrouted rather than being quietly downgraded
 * or sent to whoever happens to be available.
 */
import {
  evaluateAccess,
  SENSITIVE_OVERLAY_MIN_LEVEL,
  type SensitiveOverlay,
  type FunctionalScope,
  type StaffAccessProfile,
} from "../access/accessControl";
import type { WorkerId } from "../workforce/types";

export type EscalationReason =
  | "worker_disagreement"
  | "evidence_insufficient"
  | "permission_request"
  | "consequential_action_awaiting_approval"
  | "blocked_case"
  | "high_risk_delay"
  | "safeguarding_concern"
  | "suspected_fraud"
  | "complaint"
  | "data_breach"
  | "regulated_immigration_matter";

export type EscalationStatus = "open" | "acknowledged" | "decided" | "closed";

/**
 * Reasons that carry a sensitive category. A recipient must hold the
 * matching overlay, not merely a high level. Reasons absent from this map
 * carry no overlay requirement.
 */
export const ESCALATION_SENSITIVE_CATEGORY: Readonly<Partial<Record<EscalationReason, SensitiveOverlay>>> = Object.freeze({
  safeguarding_concern: "safeguarding",
  suspected_fraud: "complaints_legal",
  complaint: "complaints_legal",
  data_breach: "credentials_security",
  regulated_immigration_matter: "visa_regulated",
});

/**
 * §19 — an escalation without an owner is not tracked, it is just noise.
 * Every field here is required at creation except the ones that only exist
 * once a human has acted.
 */
export interface Escalation {
  escalationId: string;
  reason: EscalationReason;
  /** What actually needs deciding, in one sentence. */
  decisionRequired: string;
  /** The case, client or business area this concerns. Null for a system-level matter. */
  caseId: string | null;
  functionalScope: FunctionalScope;
  workersInvolved: readonly WorkerId[];
  raisedAt: Date;
  /** Set once routed. An escalation with no owner is unrouted, not closed. */
  ownerStaffUserId: number | null;
  status: EscalationStatus;
  /** Set only when status is "decided" or "closed". */
  outcome: string | null;
  decidedByStaffUserId: number | null;
  decidedAt: Date | null;
  /** §16 — whether a repeat of this produced a controlled fix. */
  learningCaptured: boolean;
}

export interface CandidateRecipient {
  staffUserId: number;
  displayName: string;
  profile: StaffAccessProfile;
}

export interface RoutingDecision {
  recipients: readonly { staffUserId: number; displayName: string; reason: string }[];
  /** True when nobody was both authorised and relevant. */
  unroutable: boolean;
  reason: string;
  /** Candidates deliberately excluded, and why. Kept so over-exposure is auditable. */
  excluded: readonly { staffUserId: number; reason: string }[];
}

/**
 * Chooses who to alert. A candidate qualifies only when they can actually
 * read the subject matter, which is decided by the same access model that
 * governs every other read, not by a separate seniority rule.
 */
export function routeEscalation(
  escalation: Pick<Escalation, "reason" | "functionalScope" | "caseId">,
  candidates: readonly CandidateRecipient[],
  now: Date = new Date(),
): RoutingDecision {
  const sensitiveCategory = ESCALATION_SENSITIVE_CATEGORY[escalation.reason];
  const recipients: { staffUserId: number; displayName: string; reason: string }[] = [];
  const excluded: { staffUserId: number; reason: string }[] = [];

  for (const candidate of candidates) {
    const decision = evaluateAccess(
      candidate.profile,
      { action: "read", functionalScope: escalation.functionalScope, sensitiveCategory },
      now,
    );

    if (!decision.allowed) {
      excluded.push({ staffUserId: candidate.staffUserId, reason: decision.reason });
      continue;
    }

    // §18 — authorised is necessary but not sufficient. The recipient must
    // also be able to act, which means holding approve or access_admin.
    // Someone who can only read is a reader, not an escalation owner.
    const canDecide =
      evaluateAccess(candidate.profile, { action: "approve", functionalScope: escalation.functionalScope }, now).allowed ||
      evaluateAccess(candidate.profile, { action: "access_admin", functionalScope: escalation.functionalScope }, now).allowed;

    if (!canDecide) {
      excluded.push({
        staffUserId: candidate.staffUserId,
        reason: "Authorised to read this subject but holds no approve or access-administration permission, so cannot decide it.",
      });
      continue;
    }

    recipients.push({
      staffUserId: candidate.staffUserId,
      displayName: candidate.displayName,
      reason: sensitiveCategory
        ? `Authorised for ${escalation.functionalScope} including the ${sensitiveCategory} overlay, and able to decide.`
        : `Authorised for ${escalation.functionalScope} and able to decide.`,
    });
  }

  if (recipients.length === 0) {
    return {
      recipients: [],
      unroutable: true,
      reason: sensitiveCategory
        ? `No candidate is both authorised for the ${sensitiveCategory} overlay in ${escalation.functionalScope} and able to decide. The escalation stays open and unrouted.`
        : `No candidate is both authorised for ${escalation.functionalScope} and able to decide. The escalation stays open and unrouted.`,
      excluded,
    };
  }

  return {
    recipients,
    unroutable: false,
    reason: `${recipients.length} authorised and relevant recipient(s).`,
    excluded,
  };
}

export interface EscalationValidity {
  valid: boolean;
  problems: readonly string[];
}

/**
 * §19 — checks an escalation record carries everything the standard
 * requires: owner, reason, area, workers, decision required, status and
 * outcome. Closure is the strict part. An escalation cannot be closed
 * without an owner, a recorded outcome and a named decider, because a
 * closure with none of those is indistinguishable from the matter being
 * dropped.
 */
export function validateEscalation(e: Escalation): EscalationValidity {
  const problems: string[] = [];

  if (!e.escalationId.trim()) problems.push("Escalation has no id.");
  if (!e.decisionRequired.trim()) problems.push("Escalation does not say what needs deciding.");
  if (e.workersInvolved.length === 0) problems.push("Escalation records no workers involved.");

  if (e.status === "open" && e.outcome !== null) {
    problems.push("An open escalation must not already carry an outcome.");
  }

  if (e.status === "acknowledged" && e.ownerStaffUserId === null) {
    problems.push("An acknowledged escalation must have an owner.");
  }

  if (e.status === "decided" || e.status === "closed") {
    if (e.ownerStaffUserId === null) problems.push(`A ${e.status} escalation must have an owner.`);
    if (e.outcome === null || !e.outcome.trim()) problems.push(`A ${e.status} escalation must record its outcome.`);
    if (e.decidedByStaffUserId === null) problems.push(`A ${e.status} escalation must name who decided it.`);
    if (e.decidedAt === null) problems.push(`A ${e.status} escalation must record when it was decided.`);
  }

  if (e.decidedAt !== null && e.decidedAt.getTime() < e.raisedAt.getTime()) {
    problems.push("Escalation was decided before it was raised.");
  }

  return { valid: problems.length === 0, problems };
}

/**
 * Whether an escalation still needs a human. Used by the Manager Attention
 * view (§20) so the two cannot drift apart.
 */
export function isAwaitingHuman(e: Escalation): boolean {
  return e.status === "open" || e.status === "acknowledged";
}

/**
 * §18's minimum-level guard, exposed for callers that want to explain the
 * routing rule rather than just apply it.
 */
export function minimumLevelForReason(reason: EscalationReason): number | null {
  const category = ESCALATION_SENSITIVE_CATEGORY[reason];
  return category ? SENSITIVE_OVERLAY_MIN_LEVEL[category] : null;
}
