/**
 * Shared connector-action plumbing for SharePoint and Google Drive.
 *
 * The contract from WSA_Universal_Worker_Instructions_v1.0_APPROVED.docx
 * section 6 ("Connector truthfulness") governs everything here: a worker
 * must never claim a write succeeded unless it actually did; on failure,
 * read the error, retry once with a fresh attempt, and after a second
 * genuine failure report the actual error and provide a copyable handoff
 * rather than claiming the record is current. That is implemented once
 * here rather than duplicated per connector.
 */
import { evaluateConnectorPermission } from "../permissions";
import { recordAuditEvent } from "../audit";
import { getWorker } from "../registry";
import type { ConnectorName, ConnectorOperation, ConnectorState, WorkerId } from "../types";
import type { PermissionDecision } from "../permissions";

export interface ConnectorActionRequest {
  workerId: WorkerId;
  connector: ConnectorName;
  operation: ConnectorOperation;
  /** Opaque description of what's being targeted — a path, folder name, record type. Never full document content. */
  resourceScope: string;
  caseId?: string;
  /** From the verified Staff Portal session — never client-supplied. */
  staffIdentity: string;
}

export interface ConnectorActionResult {
  success: boolean;
  connectorState: ConnectorState;
  /** Human-readable, honest — never "saved" unless success is true. */
  message: string;
  /** Present only when success is false after the permitted retry — where the intended write should have landed, and the work to preserve. */
  copyableHandoff?: { intendedDestination: string; preservedWork: string };
}

/** A connector's live-state check: does it have configured, tested credentials for this operation? Implemented per connector — never assumes yes. */
export type ConnectorStateCheck = () => ConnectorState;

/** A connector's actual attempt at the action, once permission and configuration are confirmed. Implemented per connector; may throw. */
export type ConnectorAttempt = (request: ConnectorActionRequest) => Promise<{ success: boolean; message: string }>;

/**
 * Runs one connector action through: permission check (deny by default) →
 * configuration/state check → attempt → retry-once-on-failure → honest
 * report. Every step is audit-logged, whether or not it ever reaches a
 * live system.
 *
 * `evaluatePermission` defaults to the real, registry-backed permission
 * engine and is only ever overridden in tests that need to exercise the
 * state/retry machinery in isolation — no production code path supplies a
 * different one, so this cannot become a way to bypass the real gate.
 */
export async function runConnectorAction(
  request: ConnectorActionRequest,
  getState: ConnectorStateCheck,
  attempt: ConnectorAttempt,
  evaluatePermission: (req: ConnectorActionRequest) => PermissionDecision = evaluateConnectorPermission,
): Promise<ConnectorActionResult> {
  const worker = getWorker(request.workerId);
  const permission = evaluatePermission(request);

  if (!permission.allowed) {
    recordAuditEvent({
      staffIdentity: request.staffIdentity,
      workerId: request.workerId,
      workerSpecificationVersion: worker.specificationVersion,
      caseId: request.caseId,
      requestedCapability: `${request.connector}:${request.operation}`,
      permissionDecision: "denied",
      permissionReason: permission.reason,
      connector: request.connector,
      connectorOperation: request.operation,
      success: null,
      targetResourceId: request.resourceScope,
      errorCategory: "permission_denied",
    });
    return { success: false, connectorState: "unconfigured", message: permission.reason };
  }

  const state = getState();
  if (state !== "operational") {
    const message = describeUnavailableState(request.connector, state);
    recordAuditEvent({
      staffIdentity: request.staffIdentity,
      workerId: request.workerId,
      workerSpecificationVersion: worker.specificationVersion,
      caseId: request.caseId,
      requestedCapability: `${request.connector}:${request.operation}`,
      permissionDecision: "allowed",
      permissionReason: permission.reason,
      connector: request.connector,
      connectorOperation: request.operation,
      success: false,
      targetResourceId: request.resourceScope,
      errorCategory: state === "unconfigured" || state === "permission_missing" ? "connector_unconfigured" : "connector_unavailable",
    });
    return {
      success: false,
      connectorState: state,
      message,
      copyableHandoff: { intendedDestination: request.resourceScope, preservedWork: "Not attempted — connector not available. Nothing was sent or written." },
    };
  }

  const attemptResult = await attemptOnceWithRetry(attempt, request);

  recordAuditEvent({
    staffIdentity: request.staffIdentity,
    workerId: request.workerId,
    workerSpecificationVersion: worker.specificationVersion,
    caseId: request.caseId,
    requestedCapability: `${request.connector}:${request.operation}`,
    permissionDecision: "allowed",
    permissionReason: permission.reason,
    connector: request.connector,
    connectorOperation: request.operation,
    success: attemptResult.success,
    targetResourceId: request.resourceScope,
    errorCategory: attemptResult.success ? "none" : "connector_error",
  });

  if (!attemptResult.success) {
    return {
      success: false,
      connectorState: state,
      message: attemptResult.message,
      copyableHandoff: { intendedDestination: request.resourceScope, preservedWork: attemptResult.message },
    };
  }

  return { success: true, connectorState: state, message: attemptResult.message };
}

async function attemptOnceWithRetry(
  attempt: ConnectorAttempt,
  request: ConnectorActionRequest,
): Promise<{ success: boolean; message: string }> {
  try {
    const first = await attempt(request);
    if (first.success) return first;
    const second = await attempt(request);
    return second;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown connector error.";
    return { success: false, message: `Connector action failed: ${errorMessage}` };
  }
}

function describeUnavailableState(connector: ConnectorName, state: ConnectorState): string {
  const name = connector === "sharepoint" ? "SharePoint" : "Google Drive";
  switch (state) {
    case "unconfigured":
      return `${name} connector is not configured — no credentials exist for this environment yet. Nothing was read or written.`;
    case "permission_missing":
      return `${name} credentials exist but lack the required permission for this action. Nothing was read or written.`;
    case "unavailable":
      return `${name} is currently unreachable. Nothing was read or written.`;
    case "degraded":
      return `${name} is responding in a degraded state; the action was not attempted. Nothing was read or written.`;
    default:
      return `${name} connector is not available. Nothing was read or written.`;
  }
}
