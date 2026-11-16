/**
 * Unified staff-session resolution for protected Staff Portal procedures.
 *
 * Two token types exist during the Entra transition: the legacy
 * shared-password session (staffPortalAuth.ts) and the individual Entra ID
 * session (staffIdentityAuth.ts). They are minted with different signing
 * secrets and different `purpose` claims, so neither can ever verify as
 * the other. This module tries the individual-identity path first (with
 * its live isActive re-check), then falls back to the shared-password
 * path, and hands the caller a single StaffSession that always states
 * which path authenticated it — the authMethod distinction the RBAC and
 * audit layers depend on structurally.
 *
 * Configuration-safe by construction: an Entra token can only exist if
 * completeMicrosoftSignIn minted one, which requires the STAFF_SSO_*
 * configuration and a signature-verified Microsoft ID token. When Entra is
 * unconfigured there are simply no such tokens in circulation, and this
 * resolver behaves exactly like requireStaffPortalAuth did — absence of
 * configuration can never widen access, only leave the legacy path as the
 * sole way in. The client contributes nothing but the opaque token
 * string: staffUserId, email and displayName come from the verified JWT
 * plus the live staff_users row, never from request input.
 */
import { TRPCError } from "@trpc/server";
import { verifyStaffPortalToken } from "./staffPortalAuth";
import { verifyStaffIdentityToken, requireActiveStaffIdentity } from "./staffIdentityAuth";
import { verifyExecutiveToken, EXECUTIVE_STAFF_USER_ID } from "./access/executiveAccess";

export type StaffSession =
  | { authMethod: "entra_sso"; staffUserId: number; email: string; displayName: string }
  /**
   * Break-glass executive access. Carries a staffUserId so every existing
   * gate, audit line and screen works unchanged, but it is the reserved
   * negative sentinel rather than a person, so nothing can mistake it for
   * one. See access/executiveAccess.ts.
   */
  | { authMethod: "shared_executive"; staffUserId: number; email: string; displayName: string }
  | { authMethod: "shared_password"; staffUserId: null };

/**
 * Resolves a staff session from either token type, or throws UNAUTHORIZED.
 * Every protected workforce procedure goes through this — nothing may
 * accept a raw token and decide identity for itself.
 */
export async function resolveStaffSession(token: string): Promise<StaffSession> {
  // Individual identity first: verifyStaffIdentityToken is a cheap local
  // signature check that returns null for any non-Entra token (including
  // shared-password tokens, which carry a different purpose and secret).
  const identityPayload = await verifyStaffIdentityToken(token);
  if (identityPayload) {
    // Re-checks the staff_users row is still active right now — a
    // deactivated staff member is rejected here even with a valid token.
    const identity = await requireActiveStaffIdentityAsTrpcError(token);
    return { authMethod: "entra_sso", ...identity };
  }

  // Break-glass executive access, checked before the legacy shared
  // password because it is the stronger of the two shared routes and they
  // are minted with different secrets, so neither can shadow the other.
  if (await verifyExecutiveToken(token)) {
    return {
      authMethod: "shared_executive",
      staffUserId: EXECUTIVE_STAFF_USER_ID,
      email: "executive-access",
      displayName: "Executive access (shared credential)",
    };
  }

  const sharedPasswordValid = await verifyStaffPortalToken(token);
  if (sharedPasswordValid) {
    return { authMethod: "shared_password", staffUserId: null };
  }

  throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to the Staff Portal to use this tool." });
}

/** requireActiveStaffIdentity throws plain Errors; protected procedures need TRPCErrors so the client sees a proper 401, not a 500. */
async function requireActiveStaffIdentityAsTrpcError(
  token: string,
): Promise<{ staffUserId: number; email: string; displayName: string }> {
  try {
    return await requireActiveStaffIdentity(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Staff session could not be verified.";
    throw new TRPCError({ code: "UNAUTHORIZED", message });
  }
}
