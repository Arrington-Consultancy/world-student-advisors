/**
 * The worker execution layer.
 *
 * One function, one path, every gate on it. A staff member's request
 * reaches a model only after: their own access is checked, the worker is
 * confirmed approved AND executable, an approved controlled brief exists
 * to run under, and context has been assembled by the isolation layer.
 * Afterwards the output passes the quality gate before anybody sees it.
 *
 * The order is deliberate and each step consumes the previous one, so
 * there is no arrangement of arguments that skips a gate.
 *
 * Model choice is configuration, not identity. The worker decides what is
 * said; server/_core/llm.ts decides which model says it. A worker's brief
 * contains no model name, so WSA can change model or provider without
 * touching a single line of worker governance.
 *
 * Nothing here writes to a connector, sends anything externally, or takes
 * a consequential action. Execution produces text and a record of having
 * produced it. Acting on that text remains the pipeline's decision and,
 * for anything consequential, a human's.
 */
import { invokeLLM } from "../_core/llm";
import { getWorker } from "../workforce/registry";
import { evaluateStaffPortalExecutionPermission } from "../workforce/permissions";
import { buildWorkerContext, type CaseData, type UpstreamOutput } from "../workforce/context";
import { checkAccessForStaffUser } from "../access/enforcement";
import { WORKER_FUNCTIONAL_SCOPE } from "../access/workerScope";
import { runQualityCheck, type QualityCheckResult } from "../operating/qualityCheck";
import { getControlledBrief, NO_CONTROLLED_BRIEF } from "./briefs";
import { composeSystemPrompt, composeUserMessage, type ContributorInput } from "./prompt";
import type { WorkerId } from "../workforce/types";

export type ExecutionOutcome =
  | "answered"
  | "refused_staff_access"
  | "refused_worker_not_executable"
  | "refused_no_brief"
  | "refused_no_context"
  | "blocked_quality"
  | "model_unavailable";

export interface ExecutionRequest {
  /** From the verified session. Never from request input. */
  staffUserId: number | null;
  workerId: WorkerId;
  /** What the staff member typed. Always a user message, never system text. */
  requestText: string;
  caseId?: string;
  studentId?: string;
  availableCases?: CaseData[];
  availableUpstreamOutputs?: UpstreamOutput[];
  contributions?: readonly ContributorInput[];
}

export interface ExecutionResult {
  outcome: ExecutionOutcome;
  /** The text a staff member may actually see. Null unless the flow completed. */
  visibleText: string | null;
  /** Why, in terms the staff member can act on. */
  reason: string;
  workerId: WorkerId;
  workerName: string;
  /** The controlled document the worker executed under, for the record. */
  briefReference: string | null;
  qualityCheck: QualityCheckResult | null;
}

function refuse(
  outcome: ExecutionOutcome,
  reason: string,
  workerId: WorkerId,
  briefReference: string | null = null,
): ExecutionResult {
  return {
    outcome,
    visibleText: null,
    reason,
    workerId,
    workerName: getWorker(workerId).canonicalName,
    briefReference,
    qualityCheck: null,
  };
}

export async function executeWorker(request: ExecutionRequest): Promise<ExecutionResult> {
  const worker = getWorker(request.workerId);

  // 1. The requesting human's own access, before anything is assembled.
  const staffAccess = await checkAccessForStaffUser(request.staffUserId, {
    action: "read",
    functionalScope: WORKER_FUNCTIONAL_SCOPE[request.workerId],
  });
  if (!staffAccess.allowed) {
    return refuse("refused_staff_access", staffAccess.reason, request.workerId);
  }

  // 2. The worker's own approval and deployment authorisation.
  const execution = evaluateStaffPortalExecutionPermission(request.workerId);
  if (!execution.allowed) {
    return refuse("refused_worker_not_executable", execution.reason, request.workerId);
  }

  // 3. An approved controlled brief to run under. A worker with no brief
  //    cannot execute even if every flag above is open, because there is
  //    nothing it would lawfully be executing.
  const brief = getControlledBrief(request.workerId);
  if (!brief) {
    return refuse(
      "refused_no_brief",
      `${worker.canonicalName} has no approved controlled operating guide. ${NO_CONTROLLED_BRIEF}`,
      request.workerId,
    );
  }

  // 4. Context, assembled by the isolation layer rather than by the caller.
  const context = buildWorkerContext({
    workerId: request.workerId,
    caseId: request.caseId ?? "",
    requestedByStudentId: request.studentId ?? "",
    availableCases: request.availableCases ?? [],
    availableUpstreamOutputs: request.availableUpstreamOutputs ?? [],
  });
  if (context.denied) {
    return refuse("refused_no_context", context.deniedReason ?? "Context was refused.", request.workerId, brief.sourceDocument);
  }

  const promptInputs = { brief, context, contributions: request.contributions ?? [] };
  const system = composeSystemPrompt(promptInputs);
  const user = composeUserMessage(request.requestText, promptInputs);

  // 5. Model execution. Model choice is configuration; the worker's
  //    governance says nothing about which model runs it.
  let modelText: string;
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      maxTokens: 2048,
    });
    modelText = response.choices[0]?.message?.content ?? "";
  } catch (err) {
    return refuse(
      "model_unavailable",
      `The model could not be reached: ${err instanceof Error ? err.message : "unknown error"}. ` +
      "Nothing was recorded and no work was done.",
      request.workerId,
      brief.sourceDocument,
    );
  }

  if (modelText.trim() === "") {
    return refuse("model_unavailable", "The model returned nothing.", request.workerId, brief.sourceDocument);
  }

  // 6. The quality gate, on the model's output, before any staff member
  //    sees it. Text that fails is not shown however well it reads.
  const quality = runQualityCheck({
    text: modelText,
    permissionChecked: true,
    hasUnresolvedDisagreement: false,
    disagreementVisibleInText: false,
    workerBoundaryBreaches: [],
    evidenceInsufficient: false,
  });

  if (!quality.passed) {
    return {
      outcome: "blocked_quality",
      visibleText: null,
      reason:
        `${worker.canonicalName}'s answer did not pass the release check: ` +
        quality.blocking.map(f => f.detail).join(" ") +
        " It has not been shown, and nothing was recorded as advice.",
      workerId: request.workerId,
      workerName: worker.canonicalName,
      briefReference: brief.sourceDocument,
      qualityCheck: quality,
    };
  }

  return {
    outcome: "answered",
    visibleText: modelText,
    reason: `${worker.canonicalName} answered under ${brief.sourceDocument}.`,
    workerId: request.workerId,
    workerName: worker.canonicalName,
    briefReference: brief.sourceDocument,
    qualityCheck: quality,
  };
}
