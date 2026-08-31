/**
 * Generic case/handoff primitives.
 *
 * Kept deliberately generic: WSA_Student_Journey (the controlled document
 * that would define the actual approved stage sequence) was not located
 * and inspected in this build pass, so this does not encode any specific
 * WSA stage sequence — only the structural shape (stage, owner,
 * prerequisites, status, blocked reason, next controlled action) that the
 * approved Core Operating System and Worker Register already evidence.
 * Do not add a hard-coded WSA stage sequence here until that document has
 * actually been read.
 */
import { getWorker } from "./registry";
import { evaluateStaffPortalExecutionPermission } from "./permissions";
import type { WorkerId } from "./types";

export interface Prerequisite {
  description: string;
  satisfied: boolean;
}

export type CaseStatus = "on_track" | "blocked" | "awaiting_handoff" | "complete";

export interface CaseStage {
  caseId: string;
  currentStage: string;
  owningWorkerId: WorkerId;
  prerequisites: Prerequisite[];
  status: CaseStatus;
  blockedReason?: string;
  nextControlledAction: string;
}

export interface HandoffEvaluation {
  /** Whether the handoff is procedurally valid: an evidenced relationship in the registry, with every prerequisite satisfied. */
  handoffValid: boolean;
  reason: string;
  /** Separate from handoffValid on purpose: a valid handoff can still not be executable if the downstream worker isn't authorised yet. */
  downstreamExecutionAuthorised: boolean;
}

/**
 * Whether a case may hand off from one worker to another. A downstream
 * worker can never receive a case while an upstream prerequisite remains
 * unsatisfied, however the handoff was evidenced — this is checked before
 * the registry relationship, not after.
 */
export function evaluateHandoff(fromWorkerId: WorkerId, toWorkerId: WorkerId, prerequisites: Prerequisite[]): HandoffEvaluation {
  const unmet = prerequisites.filter(p => !p.satisfied);
  if (unmet.length > 0) {
    return {
      handoffValid: false,
      reason: `${unmet.length} unmet prerequisite(s): ${unmet.map(p => p.description).join("; ")}.`,
      downstreamExecutionAuthorised: false,
    };
  }

  const from = getWorker(fromWorkerId);
  if (!from.evidencedHandoffs.includes(toWorkerId)) {
    return {
      handoffValid: false,
      reason: `No controlled evidence that ${from.canonicalName} hands off to ${getWorker(toWorkerId).canonicalName}.`,
      downstreamExecutionAuthorised: false,
    };
  }

  const downstreamPermission = evaluateStaffPortalExecutionPermission(toWorkerId);
  return {
    handoffValid: true,
    reason: `Handoff from ${from.canonicalName} to ${getWorker(toWorkerId).canonicalName} is evidenced and all prerequisites are satisfied.`,
    downstreamExecutionAuthorised: downstreamPermission.allowed,
  };
}

/** Produces the staff-facing view of a stage — status/blocker language a colleague could act on without private chat history. */
export function describeCaseStage(stage: CaseStage): string {
  const owner = getWorker(stage.owningWorkerId).canonicalName;
  const base = `${stage.currentStage}, owned by ${owner}, status: ${stage.status}.`;
  if (stage.status === "blocked" && stage.blockedReason) return `${base} Blocked: ${stage.blockedReason}. Next: ${stage.nextControlledAction}`;
  return `${base} Next: ${stage.nextControlledAction}`;
}
