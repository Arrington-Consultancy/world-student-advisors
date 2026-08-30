/**
 * The one-system pipeline.
 *
 * Implements clauses 33, 13 and 14 of the WSA AI Operational Standard v1.0
 * (APPROVED). Clause 33 sets the expected flow explicitly:
 *
 *   Receptionist -> routed specialist -> collaboration if needed ->
 *   recommendation -> quality check -> humanisation -> authorised action ->
 *   record or timeline update -> escalation or approval where required
 *
 * This module runs that flow in that order and refuses to skip a step. It
 * is pure: no database, no network, no model calls, no connector use. The
 * caller supplies what each stage produced; this decides whether the flow
 * may proceed, what the staff member is allowed to see, and which actions
 * may be taken versus prepared for a human.
 *
 * The ordering is the substance. A recommendation that has not passed the
 * quality check must never reach a humanisation pass, and text that failed
 * the quality check must never reach a staff member however good it reads.
 * Each stage therefore consumes the previous stage's result rather than
 * the original input, so a caller cannot quietly bypass one.
 *
 * On clauses 13 and 14: the standard wants AI to stop telling humans to do
 * routine work it is already allowed to do, while keeping consequential
 * actions behind human approval. Those are the same decision made twice,
 * so it is made once here. An action is executed only when it is both
 * non-consequential AND permitted by the staff member's own access. A
 * consequential action is never executed; it is prepared in full so the
 * human approves or rejects rather than redoing the work.
 */
import {
  CONSEQUENTIAL_ACTIONS,
  evaluateAccess,
  type AccessDecision,
  type ActionPermission,
  type CaseContext,
  type FunctionalScope,
  type SensitiveOverlay,
  type StaffAccessProfile,
} from "../access/accessControl";
import { combineContributions, type CollaborationRequest, type CollaborationResult } from "./collaboration";
import { runQualityCheck, acceptHumanisation, type QualityCheckResult, type HumanisationResult } from "./qualityCheck";
import type { WorkerId } from "../workforce/types";

export type PipelineStage =
  | "access"
  | "collaboration"
  | "quality_check"
  | "humanisation"
  | "action"
  | "complete";

export type PipelineOutcome =
  | "answered"
  | "answered_pending_approval"
  | "escalated"
  | "refused";

export interface ProposedAction {
  actionId: string;
  /** What the worker wants to do. */
  action: ActionPermission;
  functionalScope: FunctionalScope;
  description: string;
  case?: CaseContext;
  sensitiveCategory?: SensitiveOverlay;
  /** Everything needed for a human to approve without redoing the work (§14). */
  preparedPayload: string;
}

export type ActionDisposition = "executed" | "prepared_for_approval" | "refused";

export interface ActionDecision {
  actionId: string;
  disposition: ActionDisposition;
  reason: string;
  /** Present when prepared for approval, so the human is not asked to rebuild it. */
  preparedPayload: string | null;
}

export interface PipelineRequest {
  /** From the verified session. Never from request input. */
  profile: StaffAccessProfile;
  /** What the receptionist routed and to whom (§1). */
  routedToWorkerId: WorkerId;
  functionalScope: FunctionalScope;
  sensitiveCategory?: SensitiveOverlay;
  case?: CaseContext;
  collaboration: CollaborationRequest;
  /** The optional humanisation pass output. Omit to skip humanisation. */
  humanisedText?: string;
  proposedActions?: readonly ProposedAction[];
}

export interface PipelineResult {
  outcome: PipelineOutcome;
  /** How far the flow got. Useful for audit and for explaining a refusal. */
  reachedStage: PipelineStage;
  /** The text a staff member may actually see. Null unless the flow completed. */
  visibleText: string | null;
  accessDecision: AccessDecision;
  collaboration: CollaborationResult | null;
  qualityCheck: QualityCheckResult | null;
  humanisation: HumanisationResult | null;
  actionDecisions: readonly ActionDecision[];
  /** Set when the matter needs a human before it can go further (§17, §18). */
  escalationRequired: string | null;
  refusalReason: string | null;
}

function refused(
  reachedStage: PipelineStage,
  accessDecision: AccessDecision,
  refusalReason: string,
  partial: Partial<PipelineResult> = {},
): PipelineResult {
  return {
    outcome: "refused",
    reachedStage,
    visibleText: null,
    accessDecision,
    collaboration: null,
    qualityCheck: null,
    humanisation: null,
    actionDecisions: [],
    escalationRequired: null,
    refusalReason,
    ...partial,
  };
}

/**
 * Runs the clause 33 flow. Stages happen in the stated order and a failure
 * at any stage stops the flow there, so the reached stage always says
 * truthfully how far it got.
 */
export function runPipeline(request: PipelineRequest, now: Date = new Date()): PipelineResult {
  // Stage 1: the requesting human's own access (§4, §32). Checked before
  // any specialist work is assembled, so unauthorised material never
  // enters the context in the first place.
  const accessDecision = evaluateAccess(
    request.profile,
    {
      action: "read",
      functionalScope: request.functionalScope,
      sensitiveCategory: request.sensitiveCategory,
      case: request.case,
    },
    now,
  );

  if (!accessDecision.allowed) {
    return refused("access", accessDecision, accessDecision.reason);
  }

  // Stage 2: collaboration and combined recommendation (§7, §8, §9).
  const collaboration = combineContributions(request.collaboration);

  if (collaboration.outcome === "invalid") {
    return refused("collaboration", accessDecision, collaboration.humanCheckReason ?? "Collaboration could not be formed.", {
      collaboration,
    });
  }

  if (collaboration.outcome === "human_check_required") {
    return {
      outcome: "escalated",
      reachedStage: "collaboration",
      visibleText: null,
      accessDecision,
      collaboration,
      qualityCheck: null,
      humanisation: null,
      actionDecisions: [],
      escalationRequired: collaboration.humanCheckReason,
      refusalReason: null,
    };
  }

  const recommendation = collaboration.recommendation as string;

  // Stage 3: accuracy and quality check (§10). Runs on the recommendation,
  // never on the humanised text, because the humanisation pass has not
  // happened yet and checking it afterwards would be the wrong order.
  const qualityCheck = runQualityCheck({
    text: recommendation,
    permissionChecked: true,
    hasUnresolvedDisagreement: collaboration.unresolvedDisagreements.length > 0,
    disagreementVisibleInText: collaboration.unresolvedDisagreements.length === 0
      ? false
      : collaboration.unresolvedDisagreements.every(d =>
          d.positions.every(p => recommendation.includes(p.position)),
        ),
    workerBoundaryBreaches: collaboration.rejectedContributions.map(r => r.reason),
    evidenceInsufficient: false,
  });

  if (!qualityCheck.passed) {
    return {
      outcome: "escalated",
      reachedStage: "quality_check",
      visibleText: null,
      accessDecision,
      collaboration,
      qualityCheck,
      humanisation: null,
      actionDecisions: [],
      escalationRequired: `The quality check blocked this output: ${qualityCheck.blocking.map(b => b.detail).join(" ")}`,
      refusalReason: null,
    };
  }

  // Stage 4: humanisation (§10). Optional, and only ever applied to text
  // that already passed the check. A rejected pass falls back to the
  // checked text rather than blocking the answer, because the substance
  // was already sound.
  let humanisation: HumanisationResult | null = null;
  let visibleText = recommendation;

  if (request.humanisedText !== undefined) {
    humanisation = acceptHumanisation(recommendation, request.humanisedText);
    visibleText = humanisation.text;
  }

  // Stage 5: authorised actions (§13, §14).
  const actionDecisions = decideActions(request.profile, request.proposedActions ?? [], now);
  const anyPrepared = actionDecisions.some(a => a.disposition === "prepared_for_approval");

  return {
    outcome: anyPrepared ? "answered_pending_approval" : "answered",
    reachedStage: "complete",
    visibleText,
    accessDecision,
    collaboration,
    qualityCheck,
    humanisation,
    actionDecisions,
    escalationRequired:
      collaboration.outcome === "recommendation_with_unresolved_disagreement" ? collaboration.humanCheckReason : null,
    refusalReason: null,
  };
}

/**
 * §13 and §14 in one place. An action runs only when it is both routine
 * and permitted. A consequential action is never executed here however
 * broad the staff member's permissions are, because the standard reserves
 * those for a human decision; it is prepared instead, in full.
 *
 * An action the staff member is not permitted at all is refused rather
 * than prepared, since preparing work that nobody present may approve
 * would just move the refusal further down the line.
 */
export function decideActions(
  profile: StaffAccessProfile,
  proposed: readonly ProposedAction[],
  now: Date = new Date(),
): ActionDecision[] {
  return proposed.map(p => {
    const decision = evaluateAccess(
      profile,
      { action: p.action, functionalScope: p.functionalScope, sensitiveCategory: p.sensitiveCategory, case: p.case },
      now,
    );

    if (!decision.allowed) {
      return {
        actionId: p.actionId,
        disposition: "refused" as const,
        reason: decision.reason,
        preparedPayload: null,
      };
    }

    if (CONSEQUENTIAL_ACTIONS.has(p.action)) {
      return {
        actionId: p.actionId,
        disposition: "prepared_for_approval" as const,
        reason: `"${p.action}" is a consequential action and is reserved for human approval, so it has been prepared rather than taken.`,
        preparedPayload: p.preparedPayload,
      };
    }

    return {
      actionId: p.actionId,
      disposition: "executed" as const,
      reason: `"${p.action}" is a routine action within this staff member's authority, so it was taken rather than described.`,
      preparedPayload: null,
    };
  });
}
