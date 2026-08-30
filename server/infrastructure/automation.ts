/**
 * WSA Infrastructure Automation — the controlled core.
 *
 * This module holds every authority boundary, idempotency decision and
 * request builder for the "WSA Infrastructure Automation" identity as pure
 * functions, so all of it is unit-testable without touching Microsoft,
 * Railway or the database. The orchestrator
 * (scripts/infra/provision-staff-sso.ts) supplies I/O; nothing in here
 * performs any.
 *
 * Authority model (approved design):
 *  - Microsoft Entra: an app registration holding ONLY the
 *    Application.ReadWrite.OwnedBy application permission, authenticated
 *    from GitHub Actions via workload identity federation (no stored
 *    Microsoft secret). Graph itself then restricts it to applications it
 *    owns; this module additionally restricts it to the single allowlisted
 *    application below.
 *  - Railway: the existing project token scoped to project
 *    vibrant-learning / environment production; this module additionally
 *    pins the exact project, environment and service IDs and the exact
 *    variable names it may write.
 *  - No self-escalation: nothing here can request permissions, grant
 *    consent, assign roles, create tokens or touch worker
 *    approval/execution state. The WSA worker registry
 *    (server/workforce/registry.ts) is not imported and not writable from
 *    this path.
 */

export const AUTOMATION_IDENTITY = "wsa_infrastructure_automation";

/** Exact Railway coordinates. Never matched fuzzily; anything else is refused. */
export const RAILWAY_TARGET = Object.freeze({
  projectId: "3cd481de-9208-4b57-afb6-60dae1215de5", // vibrant-learning
  environmentId: "c7bf951d-1145-4c4b-b8a6-22b092d5e42f", // production
  serviceId: "34b59fd5-63f2-4a56-ac9d-f14aabfe1e99", // world-student-advisors
});

export const RAILWAY_GRAPHQL_ENDPOINT = "https://backboard.railway.com/graphql/v2";

/** The ONLY Entra application this automation may create or manage. */
export const MANAGED_SSO_APP_DISPLAY_NAME = "WSA Staff Portal Authentication";

/** The ONLY variable names this automation may write, ever. */
export const ALLOWED_VARIABLE_NAMES = Object.freeze([
  "STAFF_SSO_TENANT_ID",
  "STAFF_SSO_CLIENT_ID",
  "STAFF_SSO_CLIENT_SECRET",
  "STAFF_SSO_REDIRECT_URI",
] as const);

export const PRODUCTION_REDIRECT_URI = "https://www.worldstudentadvisors.com/staff-portal";

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/** Prefix for client secrets this automation creates, so rotation can prune ONLY its own. */
export const AUTOMATION_SECRET_PREFIX = "wsa-infra-rotated-";

/**
 * Microsoft Graph well-known identifiers for the delegated OIDC sign-in
 * scopes (openid / profile / email) on the Microsoft Graph resource app.
 * These are the narrowest sign-in scopes and the only ones the Staff
 * Portal authentication app is allowed to declare.
 */
export const GRAPH_RESOURCE_APP_ID = "00000003-0000-0000-c000-000000000000";
export const OIDC_SCOPE_IDS = Object.freeze({
  openid: "37f7f235-527c-4136-accd-4a02d197296e",
  profile: "14dad69e-099b-42c9-810b-d002981feec1",
  email: "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0",
});

/** Mirrors server/workforce/audit.ts — anything secret-shaped is refused outright in audit text. */
const SECRET_LIKE = /(?:bearer\s+[a-z0-9._-]{10,})|(?:[a-z0-9~._-]{32,})|(?:sk-[a-z0-9]{16,})/i;

export class AutomationAuthorityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutomationAuthorityError";
  }
}

export function assertAuthorisedRailwayTarget(target: {
  projectId: string;
  environmentId: string;
  serviceId: string;
}): void {
  if (
    target.projectId !== RAILWAY_TARGET.projectId ||
    target.environmentId !== RAILWAY_TARGET.environmentId ||
    target.serviceId !== RAILWAY_TARGET.serviceId
  ) {
    throw new AutomationAuthorityError(
      "Refusing Railway operation: target does not exactly match the authorised project/environment/service.",
    );
  }
}

export function assertAuthorisedVariableNames(names: readonly string[]): void {
  const allowed = new Set<string>(ALLOWED_VARIABLE_NAMES);
  for (const name of names) {
    if (!allowed.has(name)) {
      throw new AutomationAuthorityError(
        `Refusing variable write: "${name}" is not in the authorised STAFF_SSO_* allowlist.`,
      );
    }
  }
  if (names.length === 0) {
    throw new AutomationAuthorityError("Refusing variable write: empty variable set.");
  }
}

/**
 * Audit text fields must carry names and short identifier PREFIXES only.
 * Any 32+ character token-shaped run (which includes full UUIDs — the
 * prefix convention is deliberate) is treated as possibly secret and the
 * whole write is refused — the caller must truncate or summarise, never
 * paste. Full deployment IDs belong in the dedicated deploymentId column.
 */
export function assertNoSecretLikeContent(field: string, value: string): void {
  if (SECRET_LIKE.test(value)) {
    throw new AutomationAuthorityError(
      `Refusing audit write: field "${field}" contains secret-shaped content.`,
    );
  }
}

export interface GraphApplication {
  id: string;
  appId: string;
  displayName: string;
  signInAudience?: string;
  web?: { redirectUris?: string[] };
  passwordCredentials?: Array<{
    keyId: string;
    displayName?: string | null;
    endDateTime?: string;
  }>;
}

/**
 * Idempotent selection of the managed application from the set of
 * applications the automation can see (with Application.ReadWrite.OwnedBy,
 * Graph already limits that set to owned applications).
 *
 * Stable-identifier pinning: after the first run, the created app's
 * client ID is persisted as STAFF_SSO_CLIENT_ID on the authorised Railway
 * service; later runs pass it back here as pinnedAppId so repeated
 * operation never depends on display-name matching alone.
 *  - pinned ID found            → manage that app; if its display name has
 *                                 drifted from the controlled name, STOP
 *                                 (identifier and name disagree; never guess)
 *  - pinned ID absent BUT a
 *    name-alike app exists      → STOP; never silently adopt an app that is
 *                                 not the pinned one
 *  - no pin (first run):
 *      none present             → create (the caller may create exactly this app)
 *      exactly one              → manage it
 *      more than one            → ambiguity; STOP rather than guess or duplicate
 */
export function selectManagedApplication(
  applications: readonly GraphApplication[],
  pinnedAppId?: string,
): { decision: "create" } | { decision: "manage"; application: GraphApplication } {
  if (pinnedAppId) {
    const pinned = applications.find(app => app.appId === pinnedAppId);
    if (pinned) {
      if (pinned.displayName !== MANAGED_SSO_APP_DISPLAY_NAME) {
        throw new AutomationAuthorityError(
          `Pinned application ${pinnedAppId.slice(0, 8)}… no longer carries the controlled name "${MANAGED_SSO_APP_DISPLAY_NAME}". Identifier and name disagree; stopping.`,
        );
      }
      return { decision: "manage", application: pinned };
    }
    const nameAlikes = applications.filter(app => app.displayName === MANAGED_SSO_APP_DISPLAY_NAME);
    if (nameAlikes.length > 0) {
      throw new AutomationAuthorityError(
        `Pinned application ${pinnedAppId.slice(0, 8)}… is not among the owned applications, but ${nameAlikes.length} name-alike app(s) exist. Refusing to adopt an unpinned application; resolve manually.`,
      );
    }
    // Pinned app gone and nothing name-alike: legitimate recreation.
    return { decision: "create" };
  }
  const matches = applications.filter(app => app.displayName === MANAGED_SSO_APP_DISPLAY_NAME);
  if (matches.length === 0) return { decision: "create" };
  if (matches.length === 1) return { decision: "manage", application: matches[0] };
  throw new AutomationAuthorityError(
    `Ambiguous state: ${matches.length} owned applications are named "${MANAGED_SSO_APP_DISPLAY_NAME}". Stopping; resolve manually.`,
  );
}

/** Creation payload for the managed app: single tenant, exact redirect, OIDC scopes only. */
export function buildApplicationCreatePayload(): Record<string, unknown> {
  return {
    displayName: MANAGED_SSO_APP_DISPLAY_NAME,
    signInAudience: "AzureADMyOrg",
    web: { redirectUris: [PRODUCTION_REDIRECT_URI] },
    requiredResourceAccess: [
      {
        resourceAppId: GRAPH_RESOURCE_APP_ID,
        resourceAccess: [
          { id: OIDC_SCOPE_IDS.openid, type: "Scope" },
          { id: OIDC_SCOPE_IDS.profile, type: "Scope" },
          { id: OIDC_SCOPE_IDS.email, type: "Scope" },
        ],
      },
    ],
  };
}

/**
 * If the managed app is missing the production redirect URI, produce a
 * PATCH body that ADDS it (never removing whatever an admin configured).
 * Returns null when no patch is needed.
 */
export function buildRedirectPatchIfNeeded(app: GraphApplication): Record<string, unknown> | null {
  const existing = app.web?.redirectUris ?? [];
  if (existing.includes(PRODUCTION_REDIRECT_URI)) return null;
  return { web: { redirectUris: [...existing, PRODUCTION_REDIRECT_URI] } };
}

/** Display name for a newly rotated secret, e.g. wsa-infra-rotated-2026-08-29. */
export function automationSecretDisplayName(now: Date): string {
  return `${AUTOMATION_SECRET_PREFIX}${now.toISOString().slice(0, 10)}`;
}

/**
 * Rotation prunes ONLY credentials this automation created (recognised by
 * its naming prefix), and never the one just added. Credentials created by
 * a human administrator are left alone.
 */
export function selectPasswordsToPrune(
  passwordCredentials: ReadonlyArray<{ keyId: string; displayName?: string | null }>,
  keepKeyId: string,
): string[] {
  return passwordCredentials
    .filter(
      credential =>
        credential.keyId !== keepKeyId &&
        (credential.displayName ?? "").startsWith(AUTOMATION_SECRET_PREFIX),
    )
    .map(credential => credential.keyId);
}

/**
 * Client-credentials token request using a federated (GitHub OIDC) client
 * assertion — no stored Microsoft secret anywhere in the flow.
 */
export function buildGraphTokenRequest(input: {
  tenantId: string;
  clientId: string;
  githubOidcToken: string;
}): { url: string; body: URLSearchParams } {
  return {
    url: `https://login.microsoftonline.com/${input.tenantId}/oauth2/v2.0/token`,
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: input.clientId,
      scope: "https://graph.microsoft.com/.default",
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: input.githubOidcToken,
    }),
  };
}

/** Railway variableCollectionUpsert for the four authorised variables; guards run first. */
export function buildRailwayVariablesMutation(variables: Record<string, string>): {
  query: string;
  variables: { input: Record<string, unknown> };
} {
  assertAuthorisedVariableNames(Object.keys(variables));
  return {
    query: `mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
  variableCollectionUpsert(input: $input)
}`,
    variables: {
      input: {
        ...RAILWAY_TARGET,
        variables,
        // replace defaults to false (must never be true: it would delete unrelated variables)
        // skipDeploys defaults to false: the write itself triggers the redeploy we then observe
      },
    },
  };
}

export type DeploymentStatus =
  | "WAITING"
  | "QUEUED"
  | "INITIALIZING"
  | "BUILDING"
  | "DEPLOYING"
  | "SUCCESS"
  | "FAILED"
  | "CRASHED"
  | "REMOVED"
  | "SKIPPED"
  | "SLEEPING"
  | "NEEDS_APPROVAL"
  | "REMOVING";

export interface DeploymentSnapshot {
  id: string;
  status: DeploymentStatus;
  createdAt: string;
}

/**
 * Classify the deployment resulting from a variable write. Only a
 * deployment created at/after the write counts; the previous deployment's
 * SUCCESS must never be mistaken for the new one.
 */
export function evaluateDeploymentAfterWrite(
  deployments: readonly DeploymentSnapshot[],
  writeStartedAt: Date,
): { state: "pending" } | { state: "success"; deploymentId: string } | { state: "failed"; deploymentId: string; status: DeploymentStatus } {
  // Allow a small clock skew between our clock and Railway's.
  const cutoff = writeStartedAt.getTime() - 60_000;
  const candidates = deployments
    .filter(deployment => new Date(deployment.createdAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (candidates.length === 0) return { state: "pending" };
  const latest = candidates[0];
  if (latest.status === "SUCCESS") return { state: "success", deploymentId: latest.id };
  if (latest.status === "FAILED" || latest.status === "CRASHED") {
    return { state: "failed", deploymentId: latest.id, status: latest.status };
  }
  return { state: "pending" };
}

export interface AuditEventInput {
  action: string;
  phase: "intent" | "result";
  targetSystem: "microsoft_entra" | "railway" | "staff_portal";
  targetResource: string;
  permissionDecision: "allowed" | "denied";
  permissionReason: string;
  success: number | null;
  errorCategory: string;
  deploymentId?: string | null;
  humanApprovalReference?: string | null;
  runReference: string;
}

/**
 * Shape a durable audit row, refusing anything secret-shaped in text
 * fields. This is a hard gate, not best-effort redaction: a violating
 * event throws and the orchestrator must stop.
 */
export function buildAuditEvent(input: AuditEventInput): AuditEventInput & { automationIdentity: string } {
  assertNoSecretLikeContent("targetResource", input.targetResource);
  assertNoSecretLikeContent("permissionReason", input.permissionReason);
  assertNoSecretLikeContent("errorCategory", input.errorCategory);
  if (input.humanApprovalReference) {
    assertNoSecretLikeContent("humanApprovalReference", input.humanApprovalReference);
  }
  return { ...input, automationIdentity: AUTOMATION_IDENTITY };
}
