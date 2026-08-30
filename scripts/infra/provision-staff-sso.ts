/**
 * WSA Infrastructure Automation — Staff Portal SSO provisioning run.
 *
 * Executed by .github/workflows/infrastructure-sso-provision.yml on a
 * GitHub-hosted runner, authenticated to Microsoft via workload identity
 * federation (no stored Microsoft secret) and to Railway via the existing
 * production-scoped project token. All authority boundaries live in
 * server/infrastructure/automation.ts; this file only wires I/O.
 *
 * Flow (idempotent, safe to rerun):
 *   1. Open the durable audit store and record the run's intent.
 *      If that record cannot be written, STOP before touching anything.
 *   2. Exchange the GitHub OIDC token for a Graph token (federated).
 *   3. Find the owned app "WSA Staff Portal Authentication";
 *      create it only if absent; add the production redirect if missing.
 *   4. Rotate its client secret (add new, prune only automation-named old
 *      ones). The secret value stays in process memory, is masked in the
 *      runner log, and goes only to the Railway API over TLS.
 *   5. Upsert the four STAFF_SSO_* variables (allowlist-enforced) on the
 *      exact authorised service; verify the names after the write.
 *   6. Wait for the resulting production deployment to reach SUCCESS.
 *   7. Run the existing identity acceptance checks against production.
 *   8. Record the final result durably. A material write with no durable
 *      result record fails the job loudly after retries.
 *
 * Secrets never appear in: stdout, audit rows, GitHub logs, or source.
 */
import { spawnSync } from "node:child_process";
import { drizzle } from "drizzle-orm/mysql2";
import { infrastructureAuditEvents } from "../../drizzle/schema";
import {
  GRAPH_BASE,
  MANAGED_SSO_APP_DISPLAY_NAME,
  PRODUCTION_REDIRECT_URI,
  RAILWAY_GRAPHQL_ENDPOINT,
  RAILWAY_TARGET,
  automationSecretDisplayName,
  buildApplicationCreatePayload,
  buildAuditEvent,
  buildGraphTokenRequest,
  buildRailwayVariablesMutation,
  buildRedirectPatchIfNeeded,
  evaluateDeploymentAfterWrite,
  selectManagedApplication,
  selectPasswordsToPrune,
  type AuditEventInput,
  type DeploymentSnapshot,
  type GraphApplication,
} from "../../server/infrastructure/automation";

const HUMAN_APPROVAL_REFERENCE =
  "WSA Infrastructure Automation controlled objective, approved by Tom Arrington, 2026-08-29";

function fail(message: string): never {
  console.error(`STOP | ${message}`);
  process.exit(1);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) fail(`${name} is not set. The workflow must provide it; refusing to continue.`);
  return value;
}

// ── configuration (identifiers only; the sole secret is the Railway token, used, never printed) ──
const tenantId = requireEnv("WSA_INFRA_TENANT_ID");
const automationClientId = requireEnv("WSA_INFRA_CLIENT_ID");
const railwayProjectToken = requireEnv("RAILWAY_PROJECT_TOKEN");
const runReference = process.env.GITHUB_RUN_URL ?? "manual-run";
if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL (audit store) is not set. Durable audit is mandatory; refusing to run.");
}

const db = drizzle(process.env.DATABASE_URL);

async function recordAudit(event: Omit<AuditEventInput, "runReference">): Promise<void> {
  const row = buildAuditEvent({ ...event, runReference });
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await db.insert(infrastructureAuditEvents).values(row);
      return;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw new Error(
    `Durable audit write failed after retries (action=${event.action}, phase=${event.phase}): ${String(
      (lastError as Error)?.message ?? lastError,
    )}`,
  );
}

async function graphRequest<T>(
  accessToken: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph ${method} ${path} failed: HTTP ${response.status} ${text.slice(0, 500)}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Ensures a service principal exists for the owned application, idempotently
 * and regardless of whether the application was just created or already
 * existed. Handles Microsoft Graph's documented eventual-consistency delay
 * between an application object being created and becoming visible to
 * POST /servicePrincipals (surfaces as Authorization_RequestDenied, "the
 * backing application ... must [be] in the local tenant") with a bounded
 * retry. A 409 (already exists) is treated as success, not an error.
 */
async function ensureServicePrincipal(graphToken: string, appId: string): Promise<void> {
  const existing = await graphRequest<{ value: unknown[] }>(
    graphToken,
    "GET",
    `/servicePrincipals?$filter=${encodeURIComponent(`appId eq '${appId}'`)}&$select=id`,
  );
  if (existing.value.length > 0) return;

  let lastError: unknown;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await graphRequest(graphToken, "POST", "/servicePrincipals", { appId });
      return;
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      if (message.includes("HTTP 409")) return; // created by a concurrent/prior attempt
      lastError = error;
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve, attempt * 3000));
    }
  }
  throw lastError;
}

async function railwayRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(RAILWAY_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Project-Access-Token": railwayProjectToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || payload.errors?.length) {
    throw new Error(
      `Railway API error: HTTP ${response.status} ${payload.errors?.map(e => e.message).join("; ") ?? ""}`,
    );
  }
  return payload.data as T;
}

async function main(): Promise<void> {
  // 1 ── durable intent record BEFORE any external action.
  await recordAudit({
    action: "provision_staff_sso",
    phase: "intent",
    targetSystem: "staff_portal",
    targetResource: `service world-student-advisors (production); app "${MANAGED_SSO_APP_DISPLAY_NAME}"`,
    permissionDecision: "allowed",
    permissionReason:
      "Approved initial use case for WSA Infrastructure Automation: provision Staff Portal SSO configuration.",
    success: null,
    errorCategory: "none",
    humanApprovalReference: HUMAN_APPROVAL_REFERENCE,
  });
  console.log("Durable audit store reachable; intent recorded.");

  // 2 ── GitHub OIDC → Microsoft Graph token (federated; no stored secret).
  const idTokenUrl = requireEnv("ACTIONS_ID_TOKEN_REQUEST_URL");
  const idTokenBearer = requireEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
  const oidcResponse = await fetch(
    `${idTokenUrl}&audience=${encodeURIComponent("api://AzureADTokenExchange")}`,
    { headers: { Authorization: `Bearer ${idTokenBearer}` } },
  );
  if (!oidcResponse.ok) fail(`Could not obtain the GitHub OIDC token: HTTP ${oidcResponse.status}`);
  const githubOidcToken = ((await oidcResponse.json()) as { value: string }).value;

  const tokenRequest = buildGraphTokenRequest({ tenantId, clientId: automationClientId, githubOidcToken });
  const tokenResponse = await fetch(tokenRequest.url, { method: "POST", body: tokenRequest.body });
  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    const aadsts = tokenPayload.error_description?.match(/AADSTS\d+/)?.[0] ?? tokenPayload.error ?? "unknown";
    await recordAudit({
      action: "graph_token_exchange",
      phase: "result",
      targetSystem: "microsoft_entra",
      targetResource: "federated token exchange for the automation identity",
      permissionDecision: "denied",
      permissionReason: `Microsoft refused the federated credential exchange (${aadsts}).`,
      success: 0,
      errorCategory: "identity_error",
    });
    fail(
      `Microsoft rejected the federated token exchange: ${aadsts}. ` +
        `Full description (no secrets): ${tokenPayload.error_description?.slice(0, 400) ?? "none"}. ` +
        "Not bypassing or relaxing; the bootstrap federated credential/consent likely needs attention.",
    );
  }
  const graphToken = tokenPayload.access_token;
  console.log("Federated Microsoft Graph token obtained (no stored secret used).");

  // 3 ── find or create the owned SSO application (idempotent, ambiguity stops).
  // Stable-ID pinning: a previous run persisted the app's client ID as
  // STAFF_SSO_CLIENT_ID on the authorised service; read it back (a
  // non-secret identifier, kept in memory, printed only as a prefix) so
  // repeated operation never rests on display-name matching alone.
  const preexisting = await railwayRequest<{ variables: Record<string, string> }>(
    `query variables($projectId: String!, $environmentId: String!, $serviceId: String, $unrendered: Boolean) {
  variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId, unrendered: $unrendered)
}`,
    { ...RAILWAY_TARGET, unrendered: true },
  );
  const pinnedAppId = preexisting.variables?.STAFF_SSO_CLIENT_ID || undefined;
  console.log(
    pinnedAppId
      ? `Pinned application client ID found on the service (prefix ${pinnedAppId.slice(0, 8)}…).`
      : "No pinned application client ID on the service yet (first run).",
  );
  const listed = await graphRequest<{ value: GraphApplication[] }>(
    graphToken,
    "GET",
    "/applications?$select=id,appId,displayName,signInAudience,web,passwordCredentials&$top=999",
  );
  const selection = selectManagedApplication(listed.value, pinnedAppId);
  let app: GraphApplication;
  if (selection.decision === "create") {
    await recordAudit({
      action: "entra_app_create",
      phase: "intent",
      targetSystem: "microsoft_entra",
      targetResource: `create "${MANAGED_SSO_APP_DISPLAY_NAME}" (single tenant, OIDC scopes only)`,
      permissionDecision: "allowed",
      permissionReason: "Owned application absent; creation is within Application.ReadWrite.OwnedBy.",
      success: null,
      errorCategory: "none",
    });
    app = await graphRequest<GraphApplication>(graphToken, "POST", "/applications", buildApplicationCreatePayload());
    await recordAudit({
      action: "entra_app_create",
      phase: "result",
      targetSystem: "microsoft_entra",
      targetResource: `created app, appId prefix ${app.appId.slice(0, 8)}…`,
      permissionDecision: "allowed",
      permissionReason: "Application created and owned by the automation identity.",
      success: 1,
      errorCategory: "none",
    });
    console.log(`Created owned application (appId prefix ${app.appId.slice(0, 8)}…).`);
  } else {
    app = selection.application;
    console.log(`Managing existing owned application (appId prefix ${app.appId.slice(0, 8)}…).`);
    const patch = buildRedirectPatchIfNeeded(app);
    if (patch) {
      await graphRequest(graphToken, "PATCH", `/applications/${app.id}`, patch);
      console.log("Added the production redirect URI (existing entries preserved).");
    }
  }

  // A service principal is required for sign-in in the tenant. Idempotent
  // and retried regardless of path: covers both a fresh app (Graph's
  // create-then-read replication delay) and an app from an earlier run
  // that created the application object but failed before this step.
  await ensureServicePrincipal(graphToken, app.appId);
  console.log("Service principal present for the application.");

  // 4 ── rotate the client secret. Value: memory → mask → Railway API only.
  await recordAudit({
    action: "entra_secret_rotate",
    phase: "intent",
    targetSystem: "microsoft_entra",
    targetResource: `addPassword on appId prefix ${app.appId.slice(0, 8)}…`,
    permissionDecision: "allowed",
    permissionReason: "Rotation of the owned application's credential; prunes only automation-named secrets.",
    success: null,
    errorCategory: "none",
  });
  const now = new Date();
  const added = await graphRequest<{ keyId: string; secretText: string }>(
    graphToken,
    "POST",
    `/applications/${app.id}/addPassword`,
    {
      passwordCredential: {
        displayName: automationSecretDisplayName(now),
        endDateTime: new Date(now.getTime() + 180 * 24 * 3600 * 1000).toISOString(),
      },
    },
  );
  // Instruct the Actions runner to mask the value everywhere, as defence in
  // depth: the runner consumes this workflow command; it is not echoed.
  console.log(`::add-mask::${added.secretText}`);
  await recordAudit({
    action: "entra_secret_rotate",
    phase: "result",
    targetSystem: "microsoft_entra",
    targetResource: `new credential keyId prefix ${added.keyId.slice(0, 8)}…; older automation credentials pruned only after deployment SUCCESS`,
    permissionDecision: "allowed",
    permissionReason: "Replacement credential created on the owned application.",
    success: 1,
    errorCategory: "none",
  });
  console.log("Replacement client secret created (value masked; never logged or stored outside Railway).");

  // 5 ── write the four variables to the exact authorised Railway service.
  const variableNames = ["STAFF_SSO_TENANT_ID", "STAFF_SSO_CLIENT_ID", "STAFF_SSO_CLIENT_SECRET", "STAFF_SSO_REDIRECT_URI"];
  await recordAudit({
    action: "railway_variables_write",
    phase: "intent",
    targetSystem: "railway",
    targetResource: `world-student-advisors (production): ${variableNames.join(", ")}`,
    permissionDecision: "allowed",
    permissionReason: "All four names are on the approved STAFF_SSO_* allowlist for the authorised service.",
    success: null,
    errorCategory: "none",
  });
  const writeStartedAt = new Date();
  const mutation = buildRailwayVariablesMutation({
    STAFF_SSO_TENANT_ID: tenantId,
    STAFF_SSO_CLIENT_ID: app.appId,
    STAFF_SSO_CLIENT_SECRET: added.secretText,
    STAFF_SSO_REDIRECT_URI: PRODUCTION_REDIRECT_URI,
  });
  await railwayRequest(mutation.query, mutation.variables);

  // Verify by NAME (values are never requested rendered, never printed).
  const verification = await railwayRequest<{ variables: Record<string, string> }>(
    `query variables($projectId: String!, $environmentId: String!, $serviceId: String, $unrendered: Boolean) {
  variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId, unrendered: $unrendered)
}`,
    { ...RAILWAY_TARGET, unrendered: true },
  );
  const presentNames = Object.keys(verification.variables ?? {});
  const missing = variableNames.filter(name => !presentNames.includes(name));
  if (missing.length > 0) {
    await recordAudit({
      action: "railway_variables_write",
      phase: "result",
      targetSystem: "railway",
      targetResource: `verification failed; missing: ${missing.join(", ")}`,
      permissionDecision: "allowed",
      permissionReason: "Upsert reported success but post-write name verification failed.",
      success: 0,
      errorCategory: "verification_failed",
    });
    fail(`Variable verification failed; missing names: ${missing.join(", ")}`);
  }
  await recordAudit({
    action: "railway_variables_write",
    phase: "result",
    targetSystem: "railway",
    targetResource: `verified present by name: ${variableNames.join(", ")}`,
    permissionDecision: "allowed",
    permissionReason: "Upsert applied and all four names verified on the service.",
    success: 1,
    errorCategory: "none",
  });
  console.log("All four STAFF_SSO_* variables written and verified by name.");

  // 6 ── wait for the resulting deployment to reach SUCCESS (20 min budget).
  let deploymentOutcome: { state: string; deploymentId?: string; status?: string } = { state: "pending" };
  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    const result = await railwayRequest<{
      deployments: { edges: Array<{ node: DeploymentSnapshot }> };
    }>(
      `query deployments($input: DeploymentListInput!, $first: Int) {
  deployments(input: $input, first: $first) { edges { node { id status createdAt } } }
}`,
      { input: { ...RAILWAY_TARGET }, first: 5 },
    );
    deploymentOutcome = evaluateDeploymentAfterWrite(
      result.deployments.edges.map(edge => edge.node),
      writeStartedAt,
    );
    if (deploymentOutcome.state !== "pending") break;
    await new Promise(resolve => setTimeout(resolve, 15_000));
  }
  await recordAudit({
    action: "deployment_observe",
    phase: "result",
    targetSystem: "railway",
    targetResource: "post-write production deployment of world-student-advisors",
    permissionDecision: "allowed",
    permissionReason:
      deploymentOutcome.state === "success"
        ? "Deployment triggered by the variable write reached SUCCESS."
        : `Deployment did not reach SUCCESS (state: ${deploymentOutcome.state}${"status" in deploymentOutcome && deploymentOutcome.status ? ", " + deploymentOutcome.status : ""}).`,
    success: deploymentOutcome.state === "success" ? 1 : 0,
    errorCategory: deploymentOutcome.state === "success" ? "none" : "deployment_failed",
    deploymentId: deploymentOutcome.deploymentId ?? null,
  });
  if (deploymentOutcome.state !== "success") {
    fail(
      `Production deployment after the variable write did not reach SUCCESS (${deploymentOutcome.state}). ` +
        "No credential has been pruned: the previous secret remains valid on both the application and Railway.",
    );
  }
  console.log(`Production deployment SUCCESS (id ${deploymentOutcome.deploymentId}).`);

  // Only now — with the new secret proven live in production — prune older
  // credentials, and only those this automation itself created. A failed
  // Railway write or deployment can therefore never leave the application
  // stripped of its one usable credential.
  const refreshed = await graphRequest<GraphApplication>(
    graphToken,
    "GET",
    `/applications/${app.id}?$select=id,appId,passwordCredentials`,
  );
  const pruned = selectPasswordsToPrune(refreshed.passwordCredentials ?? [], added.keyId);
  for (const keyId of pruned) {
    await graphRequest(graphToken, "POST", `/applications/${app.id}/removePassword`, { keyId });
  }
  if (pruned.length > 0) {
    await recordAudit({
      action: "entra_secret_prune",
      phase: "result",
      targetSystem: "microsoft_entra",
      targetResource: `${pruned.length} automation-named credential(s) removed after deployment SUCCESS`,
      permissionDecision: "allowed",
      permissionReason: "Superseded automation-created credentials pruned; human-created credentials untouched.",
      success: 1,
      errorCategory: "none",
    });
  }
  console.log(`Pruned ${pruned.length} superseded automation-named credential(s).`);

  // 7 ── existing identity acceptance checks against live production.
  const acceptance = spawnSync("node", ["scripts/identity-acceptance.mjs"], { stdio: "inherit" });
  await recordAudit({
    action: "acceptance_check",
    phase: "result",
    targetSystem: "staff_portal",
    targetResource: "scripts/identity-acceptance.mjs against production",
    permissionDecision: "allowed",
    permissionReason:
      acceptance.status === 0
        ? "Identity acceptance checks passed."
        : `Identity acceptance checks failed (exit ${acceptance.status}). See run log for the exact failing check.`,
    success: acceptance.status === 0 ? 1 : 0,
    errorCategory: acceptance.status === 0 ? "none" : "acceptance_failed",
  });
  if (acceptance.status !== 0) {
    fail("Identity acceptance checks failed. The exact failing check (including any AADSTS code) is in the log above.");
  }

  // 8 ── final durable result.
  await recordAudit({
    action: "provision_staff_sso",
    phase: "result",
    targetSystem: "staff_portal",
    targetResource: `service world-student-advisors (production); app "${MANAGED_SSO_APP_DISPLAY_NAME}"`,
    permissionDecision: "allowed",
    permissionReason: "Provisioning completed: app verified, credential rotated, variables written, deployment SUCCESS, acceptance passed.",
    success: 1,
    errorCategory: "none",
    deploymentId: deploymentOutcome.deploymentId ?? null,
    humanApprovalReference: HUMAN_APPROVAL_REFERENCE,
  });
  console.log("PROVISIONING COMPLETE — durable audit trail recorded.");
  process.exit(0);
}

main().catch(async error => {
  // Controlled failure handling: try hard to leave a durable failure record;
  // if even that fails, make the silence itself impossible to miss.
  const message = String(error?.message ?? error);
  try {
    await recordAudit({
      action: "provision_staff_sso",
      phase: "result",
      targetSystem: "staff_portal",
      targetResource: "run aborted",
      permissionDecision: "allowed",
      permissionReason: `Run failed: ${message.slice(0, 300)}`,
      success: 0,
      errorCategory: "run_failed",
    });
  } catch (auditError) {
    console.error(
      "CRITICAL: a material infrastructure run failed AND the durable failure record could not be written. " +
        "Treat production configuration state as unverified until the audit store is checked. " +
        `Audit error: ${String((auditError as Error)?.message ?? auditError)}`,
    );
  }
  fail(message);
});
