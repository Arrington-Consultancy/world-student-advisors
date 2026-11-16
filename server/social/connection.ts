/**
 * Connecting a WSA social account: two independent permission layers that
 * must both hold, and neither of which may stand in for the other.
 *
 * WSA internal authority decides what a staff member may do through WSA
 * systems. External platform authority decides which pages, profiles and
 * assets that same human is actually allowed to grant access to, and with
 * which scopes. Meta, LinkedIn, YouTube and TikTok each answer that
 * question themselves, and WSA must never manufacture, infer or
 * substitute for their answer.
 *
 * The two failure modes this is built to prevent are opposites:
 *
 * A WSA permission must never let somebody connect an account they are
 * not authorised to connect externally. That is why a connection cannot
 * be constructed here without a PlatformGrant, which only an OAuth
 * response can produce. There is no code path that builds one from a
 * name, a handle, or an internal list.
 *
 * And being an administrator on a platform must never confer WSA
 * permission by itself. That is why the internal gate is evaluated first
 * and independently, and a person who passes OAuth but lacks WSA
 * authority is refused with the internal reason.
 *
 * A manually maintained administrator list is deliberately NOT the
 * technical gate. Where a platform can authoritatively state who may
 * grant access, that platform is the authority. The ownership map exists
 * for continuity and recovery risk, which is a different question.
 *
 * Nothing here performs live external access. There is no network call in
 * this module, and a test asserts there is none. It is the architecture
 * and the checks; activation remains a separate controlled decision.
 */
import { decideForProfile } from "../access/enforcement";
import type { AccessDecision, StaffAccessProfile } from "../access/accessControl";
import type { WorkerId } from "../workforce/types";

export type SocialPlatform = "meta_facebook" | "meta_instagram" | "linkedin" | "youtube" | "tiktok";

export const PLATFORM_LABELS: Readonly<Record<SocialPlatform, string>> = Object.freeze({
  meta_facebook: "Facebook (Meta)",
  meta_instagram: "Instagram (Meta)",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
});

/**
 * Never requested, never accepted, never stored. These belong to the
 * person and the platform, and an integration that asks for them has
 * replaced the platform's authorisation with an impersonation of it.
 */
export const NEVER_COLLECTED: readonly string[] = Object.freeze([
  "Social platform passwords",
  "Multi-factor authentication codes",
  "Recovery codes",
  "Security questions",
  "Any authentication secret that should remain with the external platform",
]);

/**
 * What the platform returned. Only an OAuth response produces this, which
 * is what stops an account being connected on WSA's say-so.
 */
export interface PlatformGrant {
  platform: SocialPlatform;
  /** The platform's own identifier for the page, profile or channel. */
  assetId: string;
  assetName: string;
  /** Exactly the scopes the platform granted. Not the scopes requested. */
  grantedScopes: readonly string[];
  /** The platform's reference for the human who authorised. Not a secret. */
  authorisingPlatformUserRef: string;
  grantedAt: string;
}

export interface SocialConnection {
  platform: SocialPlatform;
  assetId: string;
  assetName: string;
  grantedScopes: readonly string[];
  /** The WSA staff member who connected it, from the verified session. */
  connectedByStaffUserId: number;
  connectedAt: string;
  /** Where the authority came from, kept so it can be re-checked later. */
  provenance: string;
  status: "active" | "revoked";
}

/**
 * The WSA internal gate.
 *
 * Connecting an external account is credential administration: the staff
 * member is handing WSA standing access to something outside it. So it
 * needs the social_media scope, the credential_admin action and the
 * credentials_security overlay, all of which already exist in the Staff
 * Portal Access Control Standard. No new permission is introduced and the
 * Access Matrix is unchanged.
 */
export function evaluateWsaConnectAuthority(
  profile: StaffAccessProfile | null,
  now?: Date,
): AccessDecision {
  if (!profile) {
    return {
      allowed: false,
      deniedDimension: "account_status",
      reason: "No authenticated staff member. A social connection is always made by a named person.",
    };
  }
  return decideForProfile(
    profile,
    {
      action: "credential_admin",
      functionalScope: "social_media",
      sensitiveCategory: "credentials_security",
    },
    now,
  );
}

export type ConnectionOutcome =
  | { connected: true; connection: SocialConnection }
  | { connected: false; refusedBy: "wsa_authority" | "platform_authority"; reason: string };

/**
 * Record a connection the platform has already authorised.
 *
 * Both layers are checked here, in this order, and the order is the
 * point: a person who lacks WSA authority is refused before any platform
 * answer is considered, so external administration can never be the thing
 * that lets them in.
 */
export function recordConnection(input: {
  profile: StaffAccessProfile | null;
  grant: PlatformGrant | null;
  now?: Date;
}): ConnectionOutcome {
  const wsa = evaluateWsaConnectAuthority(input.profile, input.now);
  if (!wsa.allowed) {
    return { connected: false, refusedBy: "wsa_authority", reason: wsa.reason };
  }

  // No grant means the platform did not authorise this person for this
  // asset. WSA does not fill that in.
  if (!input.grant) {
    return {
      connected: false,
      refusedBy: "platform_authority",
      reason:
        "No platform authorisation. The account can only be connected through the platform's own authorisation flow, " +
        "which decides which assets this person may grant.",
    };
  }
  if (input.grant.grantedScopes.length === 0) {
    return {
      connected: false,
      refusedBy: "platform_authority",
      reason: `${PLATFORM_LABELS[input.grant.platform]} granted no scopes for ${input.grant.assetName}, so there is nothing to connect.`,
    };
  }

  return {
    connected: true,
    connection: {
      platform: input.grant.platform,
      assetId: input.grant.assetId,
      assetName: input.grant.assetName,
      grantedScopes: [...input.grant.grantedScopes],
      connectedByStaffUserId: input.profile!.staffUserId,
      connectedAt: (input.now ?? new Date()).toISOString(),
      provenance:
        `Authorised on ${PLATFORM_LABELS[input.grant.platform]} by platform user ` +
        `${input.grant.authorisingPlatformUserRef} on ${input.grant.grantedAt}.`,
      status: "active",
    },
  };
}

/**
 * What a worker may actually do with a connection.
 *
 * The intersection of four layers, and a capability has to survive all
 * four. The platform's granted scopes are the ceiling: a worker cannot be
 * given something the platform never handed over, however the internal
 * records are configured.
 */
export function capabilitiesForWorker(input: {
  workerId: WorkerId;
  connection: SocialConnection;
  /** Scopes the worker's controlled record permits, per connectorScope. */
  workerPermittedScopes: readonly string[];
  /** Scopes the signed-in staff member may exercise. */
  staffPermittedScopes: readonly string[];
  /** Scopes this specific task actually needs. Necessity, not convenience. */
  taskRequiredScopes: readonly string[];
}): readonly string[] {
  if (input.connection.status !== "active") return [];
  const platform = new Set(input.connection.grantedScopes);
  const worker = new Set(input.workerPermittedScopes);
  const staff = new Set(input.staffPermittedScopes);
  return input.taskRequiredScopes.filter(s => platform.has(s) && worker.has(s) && staff.has(s));
}

/** The flow, in order, for the interface and for anyone reviewing it. */
export const CONNECTION_FLOW: readonly string[] = Object.freeze([
  "An authenticated WSA staff member starts the connection.",
  "WSA checks their internal authority: social_media scope, credential_admin action, credentials_security overlay.",
  "The staff member is sent to the platform's own authorisation flow.",
  "The platform decides which accounts and assets that person may grant, and which scopes are available.",
  "The staff member selects only the WSA-relevant assets the platform offered.",
  "The connection is recorded with platform provenance, granted scopes, the connecting staff identity and an audit event.",
  "Nia receives only what survives the intersection of WSA authority, worker authority, the platform grant and task necessity.",
]);

/** No connector is live. Stated here so the interface cannot imply otherwise. */
export const ACTIVATION_STATE = Object.freeze({
  anyPlatformConnected: false,
  note:
    "No social platform is connected. This is the connection architecture and its permission checks. Activating a " +
    "connector, requesting production scopes and creating a live external connection each remain separate controlled " +
    "decisions, and none of them is taken by building this.",
});
