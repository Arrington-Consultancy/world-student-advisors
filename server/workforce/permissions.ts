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
import { WORKER_CRM_SCOPE, NO_CRM_COLUMN_IN_ACCESS_MATRIX, type CrmScope } from "./crmScope";
import { connectorScopeGrants, NO_CONNECTOR_GRANT } from "./connectorScope";
import { NO_CONTROLLED_CRM_DECISION } from "./types";
import type { ConnectorName, ConnectorOperation, WorkerRegistryEntry, WorkerId } from "./types";

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
 * Whether a worker may touch a connector at all, whether the CRM
 * specifically is open to it, and — if the operation is a write — whether
 * writes are separately authorised. Every applicable gate must be open.
 * Currently closed for every worker (see registry.ts): no live connector
 * credentials exist yet, so this always denies until that changes, however
 * the request is phrased.
 */
export function evaluateConnectorPermission(request: ConnectorPermissionRequest): PermissionDecision {
  const worker = getWorker(request.workerId);

  // Checked before the general connector gate on purpose. Both are true
  // today, but they are not equally durable: the general gate opens as
  // soon as credentials are provisioned and tested, whereas the CRM gate
  // cannot be opened by any deployment step at all — it needs a change to
  // a controlled document. Reporting the CRM reason first tells the caller
  // what is actually blocking them, and keeps telling the truth after the
  // general gate opens.
  if (request.connector === "pipedrive") {
    const crmDenial = denyUnlessCrmGranted(worker, request.operation);
    if (crmDenial) return crmDenial;
  }

  // The controlled record's per-connector grant. Checked for everything
  // except the CRM, which has its own stricter double gate above. A worker
  // with no grant is refused here regardless of the flags below, so
  // provisioning a credential can never quietly widen who may use it.
  if (request.connector !== "pipedrive" && !connectorScopeGrants(request.workerId, request.connector, request.operation)) {
    return {
      allowed: false,
      reason: `${worker.canonicalName} has no ${request.connector}:${request.operation} scope. ${NO_CONNECTOR_GRANT}`,
    };
  }

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

/**
 * The CRM gate: a worker reaches Pipedrive only if the controlled record
 * grants it, in two independent places that must agree.
 *
 * 1. Its registry entry's connectorIntent.pipedrive must no longer carry
 *    NO_CONTROLLED_CRM_DECISION — compared by identity against the shared
 *    constant, so a worker cannot be let through by rewording its intent
 *    line into something that reads like a grant.
 * 2. WORKER_CRM_SCOPE must hold a scope for it that covers this exact
 *    operation — so a grant is per-operation, and read access never
 *    implies the ability to write to a student's CRM record.
 *
 * Requiring both means neither editing a free-text field nor adding a row
 * to one map is enough on its own. Returns null only when the worker is
 * genuinely granted; a decision object otherwise.
 *
 * `scopes` defaults to the real controlled record and is only ever passed
 * in by tests, which need to exercise what a granted worker would look
 * like without fabricating one in the registry. No production call site
 * supplies it, so it cannot become a bypass; the tests below assert the
 * default denies everyone.
 */
export function denyUnlessCrmGranted(
  worker: WorkerRegistryEntry,
  operation: ConnectorOperation,
  scopes: Readonly<Record<WorkerId, CrmScope | null>> = WORKER_CRM_SCOPE,
): PermissionDecision | null {
  if (worker.connectorIntent.pipedrive === NO_CONTROLLED_CRM_DECISION) {
    return {
      allowed: false,
      reason: `${worker.canonicalName} has no controlled CRM decision on record. ${NO_CRM_COLUMN_IN_ACCESS_MATRIX}`,
    };
  }

  const scope = scopes[worker.id];
  if (!scope) {
    return {
      allowed: false,
      reason: `${worker.canonicalName} has no evidenced Pipedrive scope. ${NO_CRM_COLUMN_IN_ACCESS_MATRIX}`,
    };
  }

  if (!scope.operations.has(operation)) {
    return {
      allowed: false,
      reason: `${worker.canonicalName}'s Pipedrive scope (${scope.evidence}) does not cover ${operation}.`,
    };
  }

  return null;
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
