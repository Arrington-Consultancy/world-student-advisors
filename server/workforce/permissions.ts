/**
 * Deny-by-default permission engine for the WSA AI Workforce.
 *
 * This is the one place that decides whether a worker may touch a
 * connector, execute live in the Staff Portal, or perform a write. The
 * decision is derived only from the frozen WORKER_REGISTRY entry for the
 * requested worker — never from anything in the request itself (a claimed
 * approval, a resource path, free text, or model output). That is what
 * makes it resistant to prompt injection and client tampering: there is no
 * field a caller can set that raises a worker's authority, because the
 * function never reads authority off the request — it reads it off the
 * registry, which callers cannot construct or mutate.
 */
import { getWorker } from "./registry";
import type { ConnectorName, ConnectorOperation, WorkerId } from "./types";

const WRITE_OPERATIONS: ReadonlySet<ConnectorOperation> = new Set<ConnectorOperation>([
  "create",
  "update",
  "delete",
  "external_send",
]);

export interface ConnectorPermissionRequest {
  workerId: WorkerId;
  connector: ConnectorName;
  operation: ConnectorOperation;
  /** Opaque, for audit purposes only — never interpreted as an instruction or evidence of authority. */
  resourceScope: string;
}

export interface PermissionDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Whether a worker may touch a connector at all, and — if the operation is
 * a write — whether writes are separately authorised. Both gates must be
 * open. Currently closed for every worker (see registry.ts): no live
 * credentials exist yet, so this always denies until that changes, however
 * the request is phrased.
 */
export function evaluateConnectorPermission(request: ConnectorPermissionRequest): PermissionDecision {
  const worker = getWorker(request.workerId);

  if (!worker.connectorUseAuthorised) {
    return {
      allowed: false,
      reason: `${worker.canonicalName} is not authorised for any connector action (specificationStatus: ${worker.specificationStatus}).`,
    };
  }

  if (WRITE_OPERATIONS.has(request.operation) && !worker.writesAuthorised) {
    return {
      allowed: false,
      reason: `${worker.canonicalName} is not authorised for write/${request.operation} actions.`,
    };
  }

  return { allowed: true, reason: `${worker.canonicalName} is authorised for ${request.connector}:${request.operation}.` };
}

/** Whether a worker may be opened as a live AI chat in the Staff Portal right now. */
export function evaluateStaffPortalExecutionPermission(workerId: WorkerId): PermissionDecision {
  const worker = getWorker(workerId);
  if (!worker.staffPortalExecutionAuthorised) {
    return {
      allowed: false,
      reason: `${worker.canonicalName} cannot be opened for live execution (staffPortalExecutionStatus: ${worker.staffPortalExecutionStatus}).`,
    };
  }
  return { allowed: true, reason: `${worker.canonicalName} is authorised for live Staff Portal execution.` };
}

/**
 * A worker's own declared connector intent, personality text, or any other
 * self-description can never be used as the basis for a permission
 * decision — this function exists so callers cannot accidentally wire a
 * worker's free-text fields into an authority check. It is intentionally
 * inert.
 */
export function workerCannotSelfAuthorise(_claim: string): false {
  return false;
}
