/**
 * Context isolation layer.
 *
 * Every worker gets only the minimum necessary context: its own
 * specification, the one case it was asked about (never a caller's whole
 * loaded case list), and only upstream outputs from workers whose
 * registry entry actually names this worker as a handoff target. This is
 * enforced by filtering structured fields (worker id, student id, case id,
 * a hard-coded WSA-only data source) — never by reading free text for
 * instructions, so nothing in a case field, an upstream output's summary,
 * or any other string can change what gets included. A worker whose
 * staffPortalExecutionAuthorised is false gets no case context at all,
 * however the request is shaped — context is never assembled for a worker
 * that isn't authorised to use it.
 */
import { getWorker } from "./registry";
import { evaluateStaffPortalExecutionPermission } from "./permissions";
import type { WorkerId } from "./types";

/** The only data source this platform may ever include in a worker's context. Not a parameter — hard-coded, so no caller can widen it. */
const WSA_DATA_SOURCE = "wsa" as const;

export interface CaseData {
  caseId: string;
  studentId: string;
  /** Which business/project this record belongs to. Only "wsa" records are ever eligible — see WSA_DATA_SOURCE. */
  source: "wsa" | "arrington_consultancy" | "scott_project" | "personal";
  fields: Record<string, unknown>;
}

export interface UpstreamOutput {
  fromWorkerId: WorkerId;
  caseId: string;
  summary: string;
}

export interface ContextRequest {
  workerId: WorkerId;
  caseId: string;
  requestedByStudentId: string;
  /** Every case the caller happens to have loaded — the function filters this down, the caller is not trusted to have pre-filtered it. */
  availableCases: CaseData[];
  availableUpstreamOutputs: UpstreamOutput[];
}

export interface WorkerContext {
  workerId: WorkerId;
  ownSpecificationReference: string;
  caseData: CaseData | null;
  upstreamOutputs: UpstreamOutput[];
  denied: boolean;
  deniedReason?: string;
}

/**
 * `evaluateExecutionPermission` defaults to the real permission engine.
 * It is only ever overridden in tests that need to exercise the filtering
 * logic in isolation from the (currently universal) execution denial —
 * production code never supplies a different one.
 */
export function buildWorkerContext(
  request: ContextRequest,
  evaluateExecutionPermission: (workerId: WorkerId) => ReturnType<typeof evaluateStaffPortalExecutionPermission> = evaluateStaffPortalExecutionPermission,
): WorkerContext {
  const worker = getWorker(request.workerId);
  const executionPermission = evaluateExecutionPermission(request.workerId);

  if (!executionPermission.allowed) {
    return {
      workerId: request.workerId,
      ownSpecificationReference: worker.controlledBriefReference,
      caseData: null,
      upstreamOutputs: [],
      denied: true,
      deniedReason: executionPermission.reason,
    };
  }

  const caseData =
    request.availableCases.find(
      c => c.caseId === request.caseId && c.studentId === request.requestedByStudentId && c.source === WSA_DATA_SOURCE,
    ) ?? null;

  const upstreamOutputs = request.availableUpstreamOutputs.filter(
    o => o.caseId === request.caseId && handsOffTo(o.fromWorkerId, request.workerId),
  );

  return {
    workerId: request.workerId,
    ownSpecificationReference: worker.controlledBriefReference,
    caseData,
    upstreamOutputs,
    denied: false,
  };
}

/** True if the registry records fromWorkerId as evidenced to hand off to toWorkerId. */
function handsOffTo(fromWorkerId: WorkerId, toWorkerId: WorkerId): boolean {
  const from = getWorker(fromWorkerId);
  return from.evidencedHandoffs.includes(toWorkerId);
}
