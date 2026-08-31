/**
 * "What needs doing next for this student?"
 *
 * A staff member should not have to know that Daniel owns discovery,
 * Amelia owns research and James owns admissions in order to ask what
 * happens next on a case. This turns one question into a coordinated
 * answer, and the coordination is where a workforce either keeps its
 * boundaries or quietly loses them.
 *
 * Four properties hold, and each is structural rather than a convention:
 *
 * ONE LEAD. Exactly one worker owns the combined answer, chosen from the
 * case's own recorded owner where that worker can execute, and never
 * invented. Contributors remain responsible for their own contribution
 * only.
 *
 * NO POOLED CONTEXT. Each contributor is executed through executeWorker
 * with its own brief and its own separately assembled context. There is
 * no shared blob that everyone reads. A contributor sees what the
 * isolation layer grants it, which is the same thing it would see if a
 * staff member had asked it directly.
 *
 * CONTRIBUTIONS ARE EVIDENCE. A specialist's answer reaches the lead as
 * labelled information through composeUserMessage, never as instruction,
 * so one worker cannot direct another by writing a sentence that reads
 * like an order.
 *
 * GAPS ARE NAMED, NEVER FILLED. A worker that is unapproved, blocked or
 * refused by the staff member's own access is reported as a gap with its
 * reason. The lead is told the contribution is missing. Nothing is
 * simulated on an absent specialist's behalf, because a plausible guess
 * at what Priya would say is exactly the failure the approval blocks
 * exist to prevent.
 */
import { executeWorker, type ExecutionResult } from "./execute";
import { getWorker } from "../workforce/registry";
import { evaluateStaffPortalExecutionPermission } from "../workforce/permissions";
import { combineContributions, type WorkerContribution, type CollaborationResult } from "../operating/collaboration";
import { WORKER_FUNCTIONAL_SCOPE } from "../access/workerScope";
import type { CaseData, UpstreamOutput } from "../workforce/context";
import type { CaseStage } from "../workforce/caseModel";
import type { WorkerId } from "../workforce/types";

export interface OrchestrationRequest {
  staffUserId: number | null;
  requestText: string;
  caseId: string;
  studentId: string;
  availableCases: CaseData[];
  availableUpstreamOutputs?: UpstreamOutput[];
  /** The case's own recorded position, where one exists. */
  caseStage?: CaseStage;
  /** Specialists the router identified as relevant to the request. */
  candidateWorkerIds: readonly WorkerId[];
}

export interface ContributionGap {
  workerId: WorkerId;
  workerName: string;
  /** Why this specialist could not contribute, in the staff member's terms. */
  reason: string;
}

export type OrchestrationOutcome =
  | "answered"
  | "no_authorised_lead"
  | "no_case_record"
  | "lead_failed";

export interface OrchestrationResult {
  outcome: OrchestrationOutcome;
  leadWorkerId: WorkerId | null;
  leadWorkerName: string | null;
  /** The one coherent answer, or null where none could be produced. */
  visibleText: string | null;
  reason: string;
  /** Specialists that genuinely contributed. */
  contributingWorkerIds: readonly WorkerId[];
  /** Specialists that could not, each with its reason. Never silently dropped. */
  gaps: readonly ContributionGap[];
  collaboration: CollaborationResult | null;
}

/**
 * Which worker owns the combined answer.
 *
 * The case's own recorded owner wins where it can execute, because the
 * controlled record already decided that and this layer must not
 * relitigate it. Otherwise the first candidate that can execute takes it.
 * If nothing can execute there is no lead, and that is reported rather
 * than worked around.
 */
export function selectLead(
  candidateWorkerIds: readonly WorkerId[],
  caseStage?: CaseStage,
): WorkerId | null {
  const canExecute = (id: WorkerId) => evaluateStaffPortalExecutionPermission(id).allowed;

  if (caseStage && canExecute(caseStage.owningWorkerId)) return caseStage.owningWorkerId;
  return candidateWorkerIds.find(canExecute) ?? null;
}

/**
 * Turns a specialist's execution result into a contribution the
 * collaboration layer will accept, or into a gap.
 *
 * Confidence and evidence quality are read from what actually happened
 * rather than asserted. A worker whose answer was withheld by the quality
 * gate or its own scope check contributes nothing, and says so.
 */
function toContribution(workerId: WorkerId, result: ExecutionResult): WorkerContribution | ContributionGap {
  if (result.outcome === "answered" && result.visibleText) {
    return {
      workerId,
      position: result.visibleText,
      // A specialist answering inside its own remit from controlled
      // context is "likely", not "certain". Certainty is a claim about
      // evidence, and no worker currently reads a live source.
      confidence: "likely",
      // No connector is configured, so no worker can verify anything
      // against a live system. Recording this as partial is the honest
      // position and the collaboration layer weighs it accordingly.
      evidenceQuality: "partial",
      functionalScope: WORKER_FUNCTIONAL_SCOPE[workerId],
    };
  }

  return {
    workerId,
    workerName: getWorker(workerId).canonicalName,
    reason: result.reason,
  };
}

function isGap(x: WorkerContribution | ContributionGap): x is ContributionGap {
  return "reason" in x;
}

export async function orchestrateCaseRequest(request: OrchestrationRequest): Promise<OrchestrationResult> {
  const gaps: ContributionGap[] = [];

  // The student must resolve to a case this staff member may see. That
  // check belongs to the isolation layer and happens per worker inside
  // executeWorker; what is checked here is only that a record exists at
  // all, so the failure reads as "no record" rather than as every
  // specialist mysteriously refusing.
  const caseRecord = request.availableCases.find(
    c => c.caseId === request.caseId && c.studentId === request.studentId && c.source === "wsa",
  );
  if (!caseRecord) {
    return {
      outcome: "no_case_record",
      leadWorkerId: null,
      leadWorkerName: null,
      visibleText: null,
      reason:
        `No WSA case record was found for case ${request.caseId}. Without one there is nothing for a ` +
        "specialist to work from, and no worker will be asked to guess.",
      contributingWorkerIds: [],
      gaps: [],
      collaboration: null,
    };
  }

  const leadWorkerId = selectLead(request.candidateWorkerIds, request.caseStage);

  // Every candidate that is not the lead is asked for its own bounded
  // view, one at a time, each through the full gate stack.
  const contributors = request.candidateWorkerIds.filter(id => id !== leadWorkerId);
  const contributions: WorkerContribution[] = [];

  for (const workerId of contributors) {
    const permission = evaluateStaffPortalExecutionPermission(workerId);
    if (!permission.allowed) {
      gaps.push({ workerId, workerName: getWorker(workerId).canonicalName, reason: permission.reason });
      continue;
    }

    const result = await executeWorker({
      staffUserId: request.staffUserId,
      workerId,
      requestText: request.requestText,
      caseId: request.caseId,
      studentId: request.studentId,
      availableCases: request.availableCases,
      availableUpstreamOutputs: request.availableUpstreamOutputs,
      // Deliberately no contributions passed down. A contributor answers
      // from its own lane, not from what its colleagues have said, or the
      // first answer anchors every one that follows.
    });

    const outcome = toContribution(workerId, result);
    if (isGap(outcome)) gaps.push(outcome);
    else contributions.push(outcome);
  }

  if (!leadWorkerId) {
    return {
      outcome: "no_authorised_lead",
      leadWorkerId: null,
      leadWorkerName: null,
      visibleText: null,
      reason:
        "No specialist able to own this request is currently authorised to execute in the Staff Portal, so " +
        "there is nobody to own a combined answer. The specialists this needed are listed, with the reason " +
        "each is unavailable.",
      contributingWorkerIds: [],
      gaps: [
        ...gaps,
        ...request.candidateWorkerIds
          .filter(id => !gaps.some(g => g.workerId === id))
          .map(id => ({
            workerId: id,
            workerName: getWorker(id).canonicalName,
            reason: evaluateStaffPortalExecutionPermission(id).reason,
          })),
      ],
      collaboration: null,
    };
  }

  // The collaboration layer validates the shape of what was gathered:
  // one valid lead, each contribution inside its contributor's own
  // registered scope, disagreement kept visible.
  const collaboration = combineContributions({
    caseId: request.caseId,
    leadWorkerId,
    contributions,
  });

  for (const rejected of collaboration.rejectedContributions) {
    gaps.push({
      workerId: rejected.workerId,
      workerName: getWorker(rejected.workerId).canonicalName,
      reason: rejected.reason,
    });
  }

  // The lead now answers, seeing the accepted contributions as labelled
  // evidence. It runs through the same gates as any other execution;
  // being the lead confers no additional authority.
  const leadResult = await executeWorker({
    staffUserId: request.staffUserId,
    workerId: leadWorkerId,
    requestText: buildLeadRequest(request, gaps),
    caseId: request.caseId,
    studentId: request.studentId,
    availableCases: request.availableCases,
    availableUpstreamOutputs: request.availableUpstreamOutputs,
    contributions: contributions
      .filter(c => collaboration.contributingWorkerIds.includes(c.workerId))
      .map(c => ({
        fromWorkerId: c.workerId,
        fromWorkerName: getWorker(c.workerId).canonicalName,
        position: c.position,
      })),
  });

  if (leadResult.outcome !== "answered" || !leadResult.visibleText) {
    return {
      outcome: "lead_failed",
      leadWorkerId,
      leadWorkerName: getWorker(leadWorkerId).canonicalName,
      visibleText: null,
      reason: leadResult.reason,
      contributingWorkerIds: collaboration.contributingWorkerIds,
      gaps,
      collaboration,
    };
  }

  return {
    outcome: "answered",
    leadWorkerId,
    leadWorkerName: getWorker(leadWorkerId).canonicalName,
    visibleText: leadResult.visibleText,
    reason: `${getWorker(leadWorkerId).canonicalName} owns this answer under ${leadResult.briefReference}.`,
    contributingWorkerIds: collaboration.contributingWorkerIds,
    gaps,
    collaboration,
  };
}

/**
 * What the lead is actually asked.
 *
 * The gaps are included on purpose. A lead that does not know a
 * specialist was unavailable will answer as though the whole picture is
 * present, and the missing piece disappears silently. Telling it which
 * views are absent is what makes the caveat appear in the answer.
 */
function buildLeadRequest(request: OrchestrationRequest, gaps: readonly ContributionGap[]): string {
  const parts = [request.requestText];

  if (request.caseStage) {
    parts.push("");
    parts.push(
      `RECORDED CASE POSITION: stage "${request.caseStage.currentStage}", status ${request.caseStage.status}. ` +
      `Next controlled action: ${request.caseStage.nextControlledAction}`,
    );
    const unmet = request.caseStage.prerequisites.filter(p => !p.satisfied);
    if (unmet.length > 0) {
      parts.push(`Unmet prerequisites: ${unmet.map(p => p.description).join("; ")}.`);
    }
  }

  if (gaps.length > 0) {
    parts.push("");
    parts.push(
      "SPECIALISTS WHO COULD NOT CONTRIBUTE. Their view is genuinely missing from this answer. Say so where it " +
      "matters, and do not cover the gap with your own opinion on their subject:",
    );
    for (const gap of gaps) parts.push(`- ${gap.workerName}: ${gap.reason}`);
  }

  return parts.join("\n");
}
