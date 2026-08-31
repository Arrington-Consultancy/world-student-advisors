/**
 * Shared connector-action plumbing for SharePoint, Google Drive and
 * Pipedrive.
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
import { checkAccessForStaffUser } from "../../access/enforcement";
import { WORKER_FUNCTIONAL_SCOPE, CONNECTOR_OPERATION_ACTION } from "../../access/workerScope";
import { recordAuditEvent, type AuditAuthMethod } from "../audit";
import { getWorker } from "../registry";
import { evaluateWsaScope } from "../wsaScope";
import type { ConnectorName, ConnectorOperation, ConnectorState, WorkerId } from "../types";
import type { PermissionDecision } from "../permissions";

export interface ConnectorActionRequest {
  workerId: WorkerId;
  connector: ConnectorName;
  operation: ConnectorOperation;
  /** Opaque description of what's being targeted — a path, folder name, record type. Never full document content. */
  resourceScope: string;
  caseId?: string;
  /** From the verified staff session — never client-supplied. Null for a shared-password session, which carries no individual identity. */
  staffUserId: number | null;
  authMethod: AuditAuthMethod;
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
 * The signed-in staff member's own access check (Access Control Standard
 * §1, §4, §6). Separate from the worker gate above and neither substitutes
 * for the other: a worker being authorised for a connector must never let
 * it fetch something the person asking may not see.
 *
 * The scope and action are derived from the worker and the operation
 * (access/workerScope.ts), never from the request — resourceScope is audit
 * text and is not consulted here.
 */
export type StaffAccessCheck = (request: ConnectorActionRequest) => Promise<PermissionDecision>;

const checkStaffAccessForConnectorAction: StaffAccessCheck = async request => {
  const outcome = await checkAccessForStaffUser(request.staffUserId, {
    action: CONNECTOR_OPERATION_ACTION[request.operation],
    functionalScope: WORKER_FUNCTIONAL_SCOPE[request.workerId],
  });
  return { allowed: outcome.allowed, reason: outcome.reason };
};

/**
 * Runs one connector action through: permission check (deny by default) →
 * configuration/state check → attempt → retry-once-on-failure → honest
 * report. Every step is audit-logged, whether or not it ever reaches a
 * live system.
 *
 * `evaluatePermission` and `checkStaffAccess` default to the real,
 * registry-backed permission engine and the real staff access gate. They
 * are only ever overridden in tests that need to exercise the state/retry
 * machinery in isolation — no production code path supplies a different
 * one, so neither can become a way to bypass the real gates. A test below
 * asserts the defaults deny.
 */
export async function runConnectorAction(
  request: ConnectorActionRequest,
  getState: ConnectorStateCheck,
  attempt: ConnectorAttempt,
  evaluatePermission: (req: ConnectorActionRequest) => PermissionDecision = evaluateConnectorPermission,
  checkStaffAccess: StaffAccessCheck = checkStaffAccessForConnectorAction,
): Promise<ConnectorActionResult> {
  const worker = getWorker(request.workerId);
  const permission = evaluatePermission(request);

  if (!permission.allowed) {
    recordAuditEvent({
      staffUserId: request.staffUserId,
      authMethod: request.authMethod,
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

  // The staff member's own access, checked in addition to the worker's.
  // Deliberately after the worker gate: that gate is a platform-level fact
  // ("this worker may not touch connectors at all") true whoever is asking,
  // and reporting it first avoids telling someone their own permissions are
  // wrong when nothing is open to anyone. Both must pass regardless.
  const staffAccess = await checkStaffAccess(request);
  if (!staffAccess.allowed) {
    recordAuditEvent({
      staffUserId: request.staffUserId,
      authMethod: request.authMethod,
      workerId: request.workerId,
      workerSpecificationVersion: worker.specificationVersion,
      caseId: request.caseId,
      requestedCapability: `${request.connector}:${request.operation}`,
      permissionDecision: "denied",
      permissionReason: staffAccess.reason,
      connector: request.connector,
      connectorOperation: request.operation,
      success: null,
      targetResourceId: request.resourceScope,
      errorCategory: "permission_denied",
    });
    return { success: false, connectorState: "unconfigured", message: staffAccess.reason };
  }

  // The WSA boundary. Both gates above answer "may this person, through
  // this worker, do this kind of thing" — neither answers "is the thing
  // being reached actually WSA's". Every connector here points at a system
  // WSA shares with something else: the Microsoft tenant also holds
  // Arrington Consultancy work, a Google account also holds personal and
  // Scott-project folders, a CRM holds far more than students. So this is
  // checked separately, from server-controlled allowlists, and it is
  // checked at the chokepoint so no connector can be added that forgets it.
  const wsaScope = evaluateWsaScope(request.connector, request.resourceScope);
  if (!wsaScope.withinWsaScope) {
    recordAuditEvent({
      staffUserId: request.staffUserId,
      authMethod: request.authMethod,
      workerId: request.workerId,
      workerSpecificationVersion: worker.specificationVersion,
      caseId: request.caseId,
      requestedCapability: `${request.connector}:${request.operation}`,
      permissionDecision: "denied",
      permissionReason: wsaScope.reason,
      connector: request.connector,
      connectorOperation: request.operation,
      success: null,
      targetResourceId: request.resourceScope,
      errorCategory: "permission_denied",
    });
    return { success: false, connectorState: "unconfigured", message: wsaScope.reason };
  }

  const state = getState();
  if (state !== "operational") {
    const message = describeUnavailableState(request.connector, state);
    recordAuditEvent({
      staffUserId: request.staffUserId,
      authMethod: request.authMethod,
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
      copyableHandoff: { intendedDestination: request.resourceScope, preservedWork: "Not attempted. The connector is not available, and nothing was sent or written." },
    };
  }

  const attemptResult = await attemptOnceWithRetry(attempt, request);

  recordAuditEvent({
    staffUserId: request.staffUserId,
    authMethod: request.authMethod,
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

/** Display names, exhaustive over ConnectorName so adding a connector cannot silently inherit another's name in staff-facing text. */
const CONNECTOR_DISPLAY_NAME: Readonly<Record<ConnectorName, string>> = Object.freeze({
  sharepoint: "SharePoint",
  google_drive: "Google Drive",
  pipedrive: "Pipedrive",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
});

function describeUnavailableState(connector: ConnectorName, state: ConnectorState): string {
  const name = CONNECTOR_DISPLAY_NAME[connector];
  switch (state) {
    case "unconfigured":
      return `${name} connector is not configured. No credentials exist for this environment yet, and nothing was read or written.`;
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
