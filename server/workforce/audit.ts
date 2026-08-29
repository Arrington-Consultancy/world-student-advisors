/**
 * Audit framework for the WSA AI Workforce, independent of any live
 * connector — every permission decision and connector attempt is recorded
 * whether or not a real SharePoint/Drive connection exists yet, so the
 * audit trail is meaningful from day one rather than only once connectors
 * go live.
 *
 * Deliberately in-process only for this build pass: no database migration
 * has been requested or approved, and Mandatory Material Write-Back
 * (Universal Worker Instructions v1.0) governs *worker* output, not this
 * platform's own audit storage. Persisting this durably is a follow-up
 * that needs its own migration, reviewed like any other production schema
 * change.
 */
import type { ConnectorName, ConnectorOperation, WorkerId } from "./types";

export type ErrorCategory =
  | "permission_denied"
  | "connector_unconfigured"
  | "connector_unavailable"
  | "connector_error"
  | "validation_error"
  | "none";

export interface AuditEvent {
  timestamp: string;
  /** Staff identity from the verified Staff Portal session — never client-supplied. */
  staffIdentity: string;
  workerId: WorkerId;
  workerSpecificationVersion: string;
  caseId?: string;
  requestedCapability: string;
  permissionDecision: "allowed" | "denied";
  permissionReason: string;
  connector?: ConnectorName;
  connectorOperation?: ConnectorOperation;
  success: boolean | null;
  /** A safe identifier only (e.g. a record ID or path) — never full content. */
  targetResourceId?: string;
  handoffToWorkerId?: WorkerId;
  errorCategory: ErrorCategory;
}

const SECRET_LIKE = /(?:bearer\s+[a-z0-9._-]{10,})|(?:[a-z0-9]{32,})|(?:sk-[a-z0-9]{16,})/gi;

/**
 * Redacts anything that looks like a token, key or long opaque secret from
 * a free-text field before it is ever stored. AuditEvent's own type has no
 * field for a password, OAuth token, API key or secret value — this exists
 * as a second line of defence against one being pasted into a text field
 * (e.g. targetResourceId, permissionReason) by mistake.
 */
function redact(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.replace(SECRET_LIKE, "[redacted]");
}

const auditLog: AuditEvent[] = [];

/** Records one audit event. Never throws — a logging failure must not block the caller's actual work. */
export function recordAuditEvent(event: Omit<AuditEvent, "timestamp">): void {
  try {
    auditLog.push({
      ...event,
      timestamp: new Date().toISOString(),
      permissionReason: redact(event.permissionReason) ?? "",
      targetResourceId: redact(event.targetResourceId),
    });
  } catch {
    // Auditing must never take down the caller's actual work.
  }
}

/** Read-only view of the in-process audit log. Test/inspection use only. */
export function getAuditLog(): readonly AuditEvent[] {
  return auditLog;
}

/** Test-only reset. */
export function clearAuditLog(): void {
  auditLog.length = 0;
}
