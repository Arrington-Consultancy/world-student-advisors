/**
 * Staff RBAC primitives.
 *
 * Deliberately minimal: the Staff Portal currently authenticates with a
 * single shared password (see staffPortalAuth.ts's own doc comment — "not
 * a per-user account system, unlike the Student Portal"), so there is no
 * individual staff identity to attach a role to yet. This module keeps
 * authentication (staffPortalAuth.ts — "is this a valid session?") and
 * authorisation (this file — "what may this session actually do?") as
 * separate concerns from day one, so that per-staff identity can be added
 * later without restructuring every call site: every capability beyond
 * bare portal access defaults to denied, marked pendingGovernance, until a
 * controlled WSA staff-role document is inspected and per-role mappings
 * are implemented against it. Nothing here invents authority for a named
 * staff member.
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

export interface StaffPrincipal {
  /** Whether the caller holds a valid, currently-active Staff Portal session token — from requireStaffPortalAuth, never client-asserted. */
  authenticated: boolean;
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

/**
 * The single authorisation gate every capability check goes through.
 * Authentication alone only ever grants staff_portal_access and
 * view_workforce_status (read-only visibility of the controlled estate's
 * real status) — everything else, including opening any individual
 * worker, viewing student data, connector writes, and approval/admin
 * authority, is denied pending a controlled WSA staff-role document.
 */
export function evaluateStaffCapability(principal: StaffPrincipal, capability: StaffCapability): RbacDecision {
  if (!principal.authenticated) {
    return { allowed: false, reason: "No valid Staff Portal session.", pendingGovernance: false };
  }

  if (capability === "staff_portal_access" || capability === "view_workforce_status") {
    return { allowed: true, reason: "Granted by a valid Staff Portal session.", pendingGovernance: false };
  }

  return {
    allowed: false,
    reason: `No controlled WSA staff-role mapping exists yet for "${capabilityLabel(capability)}". A valid Staff Portal login does not itself grant this.`,
    pendingGovernance: true,
  };
}
