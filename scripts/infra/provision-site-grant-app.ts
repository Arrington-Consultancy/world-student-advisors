/**
 * WSA Infrastructure Automation: create the TEMPORARY site-grant application.
 *
 * Tom Arrington, 11 September 2026, phone-only and unable to use Graph
 * Explorer: create a temporary WSA-only application whose sole purpose is
 * to grant Sites.Selected read on the WSA site to "WSA Worker SharePoint
 * Access"; he consents to it in Entra from his phone; the automation then
 * uses it once and deletes it.
 *
 * THIS RUN (A) creates the application and its service principal, declaring
 * exactly one application permission, Sites.FullControl.All, and stops.
 * It creates NO secret and writes NO Railway variable: a FullControl
 * credential is never stored anywhere. The run that uses the application
 * (apply-site-grant.ts) mints a secret in memory and deletes the whole
 * application before it exits.
 *
 * Authority: Application.ReadWrite.OwnedBy through the federated automation
 * identity, same as every other provisioning flow here. The worker
 * application is not touched by this run.
 */
import { drizzle } from "drizzle-orm/mysql2";
import { infrastructureAuditEvents } from "../../drizzle/schema";
import {
  GRAPH_BASE,
  MANAGED_SITE_GRANT_APP_DISPLAY_NAME,
  buildAuditEvent,
  buildGraphTokenRequest,
  buildSiteGrantApplicationCreatePayload,
  selectManagedApplication,
  type AuditEventInput,
  type GraphApplication,
} from "../../server/infrastructure/automation";

const HUMAN_APPROVAL_REFERENCE =
  "Tom Arrington, 11 September 2026: temporary WSA-only grant application, Sites.FullControl.All only, consented by hand, used once, deleted immediately";

function fail(message: string): never {
  console.error(`STOP | ${message}`);
  process.exit(1);
}
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) fail(`${name} is not set. The workflow must provide it; refusing to continue.`);
  return value;
}

const tenantId = requireEnv("WSA_INFRA_TENANT_ID");
const automationClientId = requireEnv("WSA_INFRA_CLIENT_ID");
const runReference = process.env.GITHUB_RUN_URL ?? "manual-run";
if (!process.env.DATABASE_URL) fail("DATABASE_URL (audit store) is not set. Durable audit is mandatory; refusing to run.");
const db = drizzle(process.env.DATABASE_URL);

async function recordAudit(event: Omit<AuditEventInput, "runReference">): Promise<void> {
  const row = buildAuditEvent({ ...event, runReference });
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try { await db.insert(infrastructureAuditEvents).values(row); return; } catch (error) { lastError = error; await new Promise(r => setTimeout(r, attempt * 2000)); }
  }
  throw new Error(`Durable audit write failed after retries (action=${event.action}): ${String((lastError as Error)?.message ?? lastError)}`);
}

async function graphRequest<T>(accessToken: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) { const text = await response.text(); throw new Error(`Graph ${method} ${path} failed: HTTP ${response.status} ${text.slice(0, 500)}`); }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function ensureServicePrincipal(graphToken: string, appId: string): Promise<void> {
  const existing = await graphRequest<{ value: unknown[] }>(graphToken, "GET", `/servicePrincipals?$filter=${encodeURIComponent(`appId eq '${appId}'`)}&$select=id`);
  if (existing.value.length > 0) return;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try { await graphRequest(graphToken, "POST", "/servicePrincipals", { appId }); return; } catch (error) {
      if (String((error as Error)?.message ?? error).includes("HTTP 409")) return;
      lastError = error; if (attempt < 5) await new Promise(r => setTimeout(r, attempt * 3000));
    }
  }
  throw lastError;
}

async function main(): Promise<void> {
  await recordAudit({
    action: "provision_site_grant_app", phase: "intent", targetSystem: "microsoft_entra",
    targetResource: `create "${MANAGED_SITE_GRANT_APP_DISPLAY_NAME}" declaring Sites.FullControl.All; no secret, no Railway variable`,
    permissionDecision: "allowed",
    permissionReason: "Approved use: a temporary application that will perform the one-off Sites.Selected site grant and then be deleted. Consent is a human action.",
    success: null, errorCategory: "none", humanApprovalReference: HUMAN_APPROVAL_REFERENCE,
  });
  console.log("Durable audit store reachable; intent recorded.");

  const idTokenUrl = requireEnv("ACTIONS_ID_TOKEN_REQUEST_URL");
  const idTokenBearer = requireEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
  const oidc = await fetch(`${idTokenUrl}&audience=${encodeURIComponent("api://AzureADTokenExchange")}`, { headers: { Authorization: `Bearer ${idTokenBearer}` } });
  if (!oidc.ok) fail(`Could not obtain the GitHub OIDC token: HTTP ${oidc.status}`);
  const githubOidcToken = ((await oidc.json()) as { value: string }).value;
  const tokenRequest = buildGraphTokenRequest({ tenantId, clientId: automationClientId, githubOidcToken });
  const tokenResponse = await fetch(tokenRequest.url, { method: "POST", body: tokenRequest.body });
  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    const aadsts = tokenPayload.error_description?.match(/AADSTS\d+/)?.[0] ?? tokenPayload.error ?? "unknown";
    fail(`Microsoft rejected the federated token exchange: ${aadsts}.`);
  }
  const graphToken = tokenPayload.access_token;
  console.log("Federated Microsoft Graph token obtained (no stored secret used).");

  const listed = await graphRequest<{ value: GraphApplication[] }>(graphToken, "GET", "/applications?$select=id,appId,displayName,signInAudience,web,passwordCredentials&$top=999");
  const selection = selectManagedApplication(listed.value, undefined, MANAGED_SITE_GRANT_APP_DISPLAY_NAME);
  let app: GraphApplication;
  if (selection.decision === "create") {
    app = await graphRequest<GraphApplication>(graphToken, "POST", "/applications", buildSiteGrantApplicationCreatePayload());
    await recordAudit({
      action: "entra_app_create", phase: "result", targetSystem: "microsoft_entra",
      targetResource: `created "${MANAGED_SITE_GRANT_APP_DISPLAY_NAME}", appId prefix ${app.appId.slice(0, 8)}…, no credential`,
      permissionDecision: "allowed", permissionReason: "Temporary application created and owned by the automation identity. It holds no secret.",
      success: 1, errorCategory: "none",
    });
    console.log(`Created temporary application (appId prefix ${app.appId.slice(0, 8)}…). No secret exists for it.`);
  } else {
    app = selection.application;
    if ((app.passwordCredentials ?? []).length > 0) {
      fail(`The existing temporary application carries ${app.passwordCredentials!.length} credential(s). It must hold none between runs. Run apply-site-grant to finish and delete it, or delete it by hand.`);
    }
    console.log(`Temporary application already exists (appId prefix ${app.appId.slice(0, 8)}…), no credential. Reusing.`);
  }
  await ensureServicePrincipal(graphToken, app.appId);
  console.log("Service principal present for the temporary application.");

  console.log(
    `\nNEXT (human, from a phone is fine): Entra admin centre > Applications > App registrations > All applications > "${MANAGED_SITE_GRANT_APP_DISPLAY_NAME}" > API permissions > Grant admin consent. ` +
    "Then run infrastructure-site-grant-apply.yml, which uses it once and deletes it.",
  );
  await recordAudit({
    action: "provision_site_grant_app", phase: "result", targetSystem: "microsoft_entra",
    targetResource: `"${MANAGED_SITE_GRANT_APP_DISPLAY_NAME}" appId prefix ${app.appId.slice(0, 8)}…; service principal present; awaiting admin consent`,
    permissionDecision: "allowed",
    permissionReason: "Temporary application ready for consent. No secret minted. Nothing granted on any site yet.",
    success: 1, errorCategory: "none", humanApprovalReference: HUMAN_APPROVAL_REFERENCE,
  });
  console.log("RUN A COMPLETE. Awaiting admin consent.");
  process.exit(0);
}

main().catch(async error => {
  const message = String(error?.message ?? error);
  try {
    await recordAudit({ action: "provision_site_grant_app", phase: "result", targetSystem: "microsoft_entra", targetResource: "run aborted", permissionDecision: "allowed", permissionReason: `Run failed: ${message.slice(0, 300)}`, success: 0, errorCategory: "run_failed" });
  } catch (auditError) {
    console.error(`CRITICAL: run failed AND the durable failure record could not be written: ${String((auditError as Error)?.message ?? auditError)}`);
  }
  fail(message);
});
