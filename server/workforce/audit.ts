/**
 * Audit framework for the WSA AI Workforce, independent of any live
 * connector — every permission decision and connector attempt is recorded
 * whether or not a real SharePoint/Drive connection exists yet, so the
 * audit trail is meaningful from day one rather than only once connectors
 * go live.
 *
 * Every event is kept in-process (fast, always available, used by this
 * module's own tests) and — best-effort — persisted to the
 * workforce_audit_events table (drizzle/0005_staff_identity_and_audit.sql,
 * not yet applied to any real database) so the record survives a server
 * restart or Railway redeploy, which the in-process log alone cannot.
 * Durable persistence never blocks or fails the caller's actual work: if
 * the database is unavailable, the in-process record still exists and a
 * warning is logged.
 */
import { getDb } from "../db";
import { workforceAuditEvents } from "../../drizzle/schema";
import type { ConnectorName, ConnectorOperation, WorkerId } from "./types";

export type ErrorCategory =
  | "permission_denied"
  | "connector_unconfigured"
  | "connector_unavailable"
  | "connector_error"
  | "validation_error"
  | "none";

/** Which authentication path produced the session this event belongs to. Never lost or defaulted away — see server/staffRBAC.ts. */
export type AuditAuthMethod = "entra_sso" | "shared_password";

export interface AuditEvent {
  timestamp: string;
  /** The resolved staff_users.id for an entra_sso session; null for a shared-password session, which carries no individual identity. Never client-supplied. */
  staffUserId: number | null;
  authMethod: AuditAuthMethod;
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

/**
 * Records one audit event: always in-process, and best-effort to durable
 * storage. Never throws and never awaited by the caller for the durable
 * write specifically — a logging failure, of either kind, must not block
 * or fail the caller's actual work.
 */
export function recordAuditEvent(event: Omit<AuditEvent, "timestamp">): void {
  let fullEvent: AuditEvent;
  try {
    fullEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      permissionReason: redact(event.permissionReason) ?? "",
      targetResourceId: redact(event.targetResourceId),
    };
    auditLog.push(fullEvent);
  } catch {
    // Auditing must never take down the caller's actual work.
    return;
  }
  void persistAuditEventDurably(fullEvent);
}

/**
 * Best-effort durable write. Swallows every failure (no database
 * configured, connection error, schema mismatch) after logging a warning
 * — the in-process record above is never lost even when this is. Exported
 * for tests; not part of this module's normal call surface otherwise.
 */
export async function persistAuditEventDurably(event: AuditEvent): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(workforceAuditEvents).values({
      staffUserId: event.staffUserId,
      authMethod: event.authMethod,
      workerId: event.workerId,
      workerSpecificationVersion: event.workerSpecificationVersion,
      caseId: event.caseId,
      requestedCapability: event.requestedCapability,
      permissionDecision: event.permissionDecision,
      permissionReason: event.permissionReason,
      connector: event.connector,
      connectorOperation: event.connectorOperation,
      success: event.success === null ? null : event.success ? 1 : 0,
      targetResourceId: event.targetResourceId,
      handoffToWorkerId: event.handoffToWorkerId,
      errorCategory: event.errorCategory,
    });
  } catch (error) {
    console.warn("[Workforce audit] Durable persistence failed, so the event remains in the in-process log only:", error);
  }
}

/**
 * ARCHITECTURAL SEAM — material writes vs. informational events.
 *
 * recordAuditEvent above is deliberately best-effort: an informational
 * event (a routing decision, a denied permission check) must never block
 * the caller. That posture is NOT acceptable for a future material
 * business write (SharePoint record update, CRM change, external send):
 * the system must never reach "the business record changed but the
 * required audit trail silently failed."
 *
 * This function is the enforcement point for that future path. It awaits
 * durable persistence and reports honestly whether the audit record is
 * actually stored. The contract for any future material connector write
 * is:
 *
 *   permission check → business write → recordMaterialAuditEvent →
 *   if durablyStored is false, surface a controlled warning to staff and
 *   route to the failure handling in Universal Worker Instructions §6
 *   (honest report + copyable handoff) — never a silent success.
 *
 * Whether a failed audit write should also block the business write
 * itself (write-ahead auditing) is a governance decision to take when
 * material writes are first authorised — nothing is authorised to make
 * material writes today, so no caller exists yet.
 */
export async function recordMaterialAuditEvent(event: Omit<AuditEvent, "timestamp">): Promise<{ durablyStored: boolean }> {
  const fullEvent: AuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
    permissionReason: redact(event.permissionReason) ?? "",
    targetResourceId: redact(event.targetResourceId),
  };
  auditLog.push(fullEvent);
  try {
    const db = await getDb();
    if (!db) return { durablyStored: false };
    await db.insert(workforceAuditEvents).values({
      staffUserId: fullEvent.staffUserId,
      authMethod: fullEvent.authMethod,
      workerId: fullEvent.workerId,
      workerSpecificationVersion: fullEvent.workerSpecificationVersion,
      caseId: fullEvent.caseId,
      requestedCapability: fullEvent.requestedCapability,
      permissionDecision: fullEvent.permissionDecision,
      permissionReason: fullEvent.permissionReason,
      connector: fullEvent.connector,
      connectorOperation: fullEvent.connectorOperation,
      success: fullEvent.success === null ? null : fullEvent.success ? 1 : 0,
      targetResourceId: fullEvent.targetResourceId,
      handoffToWorkerId: fullEvent.handoffToWorkerId,
      errorCategory: fullEvent.errorCategory,
    });
    return { durablyStored: true };
  } catch (error) {
    console.warn("[Workforce audit] MATERIAL event failed durable persistence, and the caller must surface this:", error);
    return { durablyStored: false };
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
