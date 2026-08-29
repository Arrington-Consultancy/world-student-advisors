/**
 * Staff RBAC primitives.
 *
 * Two authentication paths now exist: the legacy shared Staff Portal
 * password (staffPortalAuth.ts — one password, no individual identity)
 * and individual Microsoft Entra ID sign-in (staffIdentityAuth.ts). The
 * shared password is kept working during the transition (see its own
 * module comment on why), but it must never be treated as equivalent to
 * an individual identity: authMethod is carried on every StaffPrincipal
 * so that distinction can never be silently lost, and a shared_password
 * principal is structurally barred from anything beyond the two baseline
 * capabilities below — permanently, not just because nothing else happens
 * to be approved yet. This module keeps authentication ("is this a valid
 * session?") and authorisation ("what may this session actually do?") as
 * separate concerns: every capability beyond bare portal access defaults
 * to denied, marked pendingGovernance, until a controlled WSA staff-role
 * document is inspected and per-role mappings are implemented against it.
 * Nothing here invents authority for a named staff member.
 */
import type { WorkerId } from "./workforce/types";

export type StaffCapability =
  | "staff_portal_access"
  | "view_workforce_status"
  | { kind: "open_worker"; workerId: WorkerId }
  | "view_student_data"
  | "connector_write"
  | "approval_authority"
  | "admin";

const BASELINE_CAPABILITIES: ReadonlySet<StaffCapability> = new Set<StaffCapability>(["staff_portal_access", "view_workforce_status"]);

export interface StaffPrincipal {
  /** Whether the caller holds a valid, currently-active Staff Portal session token — from requireStaffPortalAuth or requireActiveStaffIdentity, never client-asserted. */
  authenticated: boolean;
  /** Which authentication path produced this session. Absent only when authenticated is false. */
  authMethod?: "entra_sso" | "shared_password";
  /** Set only for authMethod "entra_sso" — the resolved staff_users row. Never set from client input. */
  staffUserId?: number;
  email?: string;
  displayName?: string;
}

export interface RbacDecision {
  allowed: boolean;
  reason: string;
  /** True when this capability has no controlled WSA role mapping yet, so the denial is a governance gap rather than a considered "no". */
  pendingGovernance: boolean;
}

function capabilityLabel(capability: StaffCapability): string {
  return typeof capability === "string" ? capability : `${capability.kind}:${capability.workerId}`;
}

function isBaselineCapability(capability: StaffCapability): boolean {
  return typeof capability === "string" && BASELINE_CAPABILITIES.has(capability);
}

/**
 * The single authorisation gate every capability check goes through.
 * Authentication alone only ever grants staff_portal_access and
 * view_workforce_status (read-only visibility of the controlled estate's
 * real status) — everything else, including opening any individual
 * worker, viewing student data, connector writes, and approval/admin
 * authority, is denied pending a controlled WSA staff-role document. A
 * shared-password session is denied anything beyond that baseline
 * unconditionally, since it carries no individual identity to attribute a
 * higher-risk action to.
 */
export function evaluateStaffCapability(principal: StaffPrincipal, capability: StaffCapability): RbacDecision {
  if (!principal.authenticated) {
    return { allowed: false, reason: "No valid Staff Portal session.", pendingGovernance: false };
  }

  if (isBaselineCapability(capability)) {
    return { allowed: true, reason: "Granted by a valid Staff Portal session.", pendingGovernance: false };
  }

  if (principal.authMethod === "shared_password") {
    return {
      allowed: false,
      reason: "Shared-password sessions carry no individual identity and cannot be granted this, regardless of future role mappings.",
      pendingGovernance: false,
    };
  }

  return {
    allowed: false,
    reason: `No controlled WSA staff-role mapping exists yet for "${capabilityLabel(capability)}". A valid Staff Portal login does not itself grant this.`,
    pendingGovernance: true,
  };
}
