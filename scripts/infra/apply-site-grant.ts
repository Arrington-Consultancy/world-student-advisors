/**
 * WSA Infrastructure Automation: apply the Sites.Selected site grant, then
 * destroy the application that applied it.
 *
 * RUN B. Runs after Tom has granted admin consent to the temporary
 * application created by provision-site-grant-app.ts. In order:
 *
 *   1. Mint a client secret for the temporary application IN MEMORY,
 *      one hour of life, masked in the runner. It is never stored.
 *   2. Obtain a token with it and refuse to continue unless the roles
 *      claim is exactly ["Sites.FullControl.All"]: the consent happened,
 *      and nothing wider is present.
 *   3. Resolve the WSA site by hostname and path, and require the id to
 *      match SHAREPOINT_GRAPH_SITE_ID on the service. Two independent
 *      routes to the same identifier, or stop.
 *   4. POST the read grant for "WSA Worker SharePoint Access" on that
 *      site, unless an identical read grant already exists.
 *   5. Verify: the site's permission list holds exactly one entry for the
 *      worker application and it is read-only.
 *   6. Worker read test, with the worker's own SHAREPOINT_GRAPH_*
 *      credential: list one designated location, expect 200.
 *   7. Worker negative test: the tenant root site and a site that does
 *      not exist; expect refusal for both.
 *   8. DELETE the temporary application. That removes its service
 *      principal, its consent and its secret in one step. Confirm 404.
 *   9. Prove the worker application declares only Sites.Selected and its
 *      token carries only Sites.Selected.
 *  10. Durable audit rows throughout.
 *
 * If anything fails after step 1, step 8 still runs: the temporary
 * application is deleted on every exit path once a secret exists for it.
 * Arrington Consultancy systems are not addressed anywhere in this file.
 */
import { drizzle } from "drizzle-orm/mysql2";
import { infrastructureAuditEvents } from "../../drizzle/schema";
import {
  GRAPH_BASE,
  MANAGED_SHAREPOINT_APP_DISPLAY_NAME,
  MANAGED_SITE_GRANT_APP_DISPLAY_NAME,
  SITES_FULLCONTROL_APP_ROLE_ID,
  buildAuditEvent,
  buildGraphTokenRequest,
  buildSitePermissionGrantBody,
  declaresOnlySitesSelected,
  redactForAudit,
  evaluateSiteGrant,
  rolesClaimIsExactly,
  selectManagedApplication,
  type AuditEventInput,
  type GraphApplication,
  type SitePermissionEntry,
} from "../../server/infrastructure/automation";

const WSA_HOST = "worldstudentadvisors123.sharepoint.com";
const WSA_SITE_PATH = "/sites/WSASharePoint";
/** One designated location per the approved matrix, used for the worker read test. */
const READ_TEST_LOCATION = "16_WEBSITE_Ai";
const HUMAN_APPROVAL_REFERENCE =
  "Tom Arrington, 11 September 2026: temporary WSA-only grant application, consented by hand, used once, deleted immediately";

function fail(message: string): never { console.error(`STOP | ${message}`); process.exit(1); }
function requireEnv(name: string): string { const v = process.env[name]; if (!v) fail(`${name} is not set; refusing to continue.`); return v; }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const tenantId = requireEnv("WSA_INFRA_TENANT_ID");
const automationClientId = requireEnv("WSA_INFRA_CLIENT_ID");
const runReference = process.env.GITHUB_RUN_URL ?? "manual-run";
if (!process.env.DATABASE_URL) fail("DATABASE_URL (audit store) is not set. Durable audit is mandatory; refusing to run.");
const db = drizzle(process.env.DATABASE_URL);

async function recordAudit(event: Omit<AuditEventInput, "runReference">): Promise<void> {
  const row = buildAuditEvent({ ...event, runReference });
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try { await db.insert(infrastructureAuditEvents).values(row); return; } catch (error) { lastError = error; await sleep(attempt * 2000); }
  }
  throw new Error(`Durable audit write failed after retries (action=${event.action}): ${String((lastError as Error)?.message ?? lastError)}`);
}

interface GraphResult<T> { status: number; body: T | null; }
async function graph<T>(accessToken: string, method: string, path: string, body?: unknown): Promise<GraphResult<T>> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: T | null = null;
  try { parsed = (await response.json()) as T; } catch { parsed = null; }
  return { status: response.status, body: parsed };
}
async function graphOrThrow<T>(accessToken: string, method: string, path: string, body?: unknown): Promise<T> {
  const r = await graph<T>(accessToken, method, path, body);
  if (r.status < 200 || r.status >= 300) {
    const err = (r.body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new Error(`Graph ${method} ${path} failed: HTTP ${r.status} ${err?.code ?? ""} ${err?.message?.slice(0, 200) ?? ""}`.trim());
  }
  return r.body as T;
}

async function clientCredentialsToken(clientId: string, secret: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }).toString(),
  });
  const payload = (await response.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) return { ok: false, error: payload.error_description?.match(/AADSTS\d+/)?.[0] ?? payload.error ?? `HTTP ${response.status}` };
  return { ok: true, token: payload.access_token };
}

async function main(): Promise<void> {
  await recordAudit({
    action: "apply_site_grant", phase: "intent", targetSystem: "microsoft_entra",
    targetResource: `grant read on the WSA SharePoint site to "${MANAGED_SHAREPOINT_APP_DISPLAY_NAME}" via "${MANAGED_SITE_GRANT_APP_DISPLAY_NAME}", then delete the latter`,
    permissionDecision: "allowed",
    permissionReason: "Approved use: one read grant on the WSA site; the temporary FullControl application is deleted in this run whatever happens.",
    success: null, errorCategory: "none", humanApprovalReference: HUMAN_APPROVAL_REFERENCE,
  });
  console.log("Durable audit store reachable; intent recorded.");

  // Automation identity (federated), used to mint and later delete.
  const idTokenUrl = requireEnv("ACTIONS_ID_TOKEN_REQUEST_URL");
  const idTokenBearer = requireEnv("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
  const oidc = await fetch(`${idTokenUrl}&audience=${encodeURIComponent("api://AzureADTokenExchange")}`, { headers: { Authorization: `Bearer ${idTokenBearer}` } });
  if (!oidc.ok) fail(`Could not obtain the GitHub OIDC token: HTTP ${oidc.status}`);
  const githubOidcToken = ((await oidc.json()) as { value: string }).value;
  const tokenRequest = buildGraphTokenRequest({ tenantId, clientId: automationClientId, githubOidcToken });
  const tokenResponse = await fetch(tokenRequest.url, { method: "POST", body: tokenRequest.body });
  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!tokenResponse.ok || !tokenPayload.access_token) fail(`Microsoft rejected the federated token exchange: ${tokenPayload.error_description?.match(/AADSTS\d+/)?.[0] ?? tokenPayload.error ?? "unknown"}.`);
  const automationToken = tokenPayload.access_token;
  console.log("Federated Microsoft Graph token obtained (no stored secret used).");

  // Both applications, by controlled name, exactly one each.
  const listed = await graphOrThrow<{ value: GraphApplication[] }>(automationToken, "GET", "/applications?$select=id,appId,displayName,signInAudience,web,passwordCredentials,requiredResourceAccess&$top=999");
  const grantSel = selectManagedApplication(listed.value, undefined, MANAGED_SITE_GRANT_APP_DISPLAY_NAME);
  if (grantSel.decision !== "manage") fail(`"${MANAGED_SITE_GRANT_APP_DISPLAY_NAME}" does not exist. Run infrastructure-site-grant-provision.yml first and grant admin consent.`);
  const grantApp = grantSel.application;
  const workerPinned = process.env.SHAREPOINT_GRAPH_CLIENT_ID || undefined;
  const workerSel = selectManagedApplication(listed.value, workerPinned, MANAGED_SHAREPOINT_APP_DISPLAY_NAME);
  if (workerSel.decision !== "manage") fail(`"${MANAGED_SHAREPOINT_APP_DISPLAY_NAME}" not found among owned applications.`);
  const workerApp = workerSel.application;
  console.log(`Temporary app prefix ${grantApp.appId.slice(0, 8)}…; worker app prefix ${workerApp.appId.slice(0, 8)}….`);

  const expectedSiteId = requireEnv("SHAREPOINT_GRAPH_SITE_ID");
  const workerTenant = requireEnv("SHAREPOINT_GRAPH_TENANT_ID");
  const workerClientId = requireEnv("SHAREPOINT_GRAPH_CLIENT_ID");
  const workerSecret = requireEnv("SHAREPOINT_GRAPH_CLIENT_SECRET");
  if (workerTenant !== tenantId) fail("Worker tenant id and automation tenant id differ. Refusing: this run is WSA-only.");
  if (workerClientId !== workerApp.appId) fail("SHAREPOINT_GRAPH_CLIENT_ID on the service does not match the owned worker application. Stopping.");

  // From here on, a secret exists for the temporary app and it MUST be deleted on every path.
  let tempSecretMinted = false;
  let cleanupProven = false;
  const deleteTemporaryApp = async (): Promise<void> => {
    const del = await graph(automationToken, "DELETE", `/applications/${grantApp.id}`);
    // Deleted objects sit in the recycle bin for 30 days and could be restored. Purge them.
    const purge = await graph(automationToken, "DELETE", `/directory/deletedItems/${grantApp.id}`);
    // Proof, three ways, each read back from the tenant rather than inferred:
    //   the application object is gone;
    //   no service principal (Enterprise Application) carries its appId;
    //   no owned application still declares Sites.FullControl.All.
    let appGone = false, spGone = false, noFullControlDeclared = false, spCount = -1, declaring: string[] = [];
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const check = await graph(automationToken, "GET", `/applications/${grantApp.id}?$select=id`);
      appGone = check.status === 404;
      const sp = await graph<{ value: unknown[] }>(automationToken, "GET", `/servicePrincipals?$filter=${encodeURIComponent(`appId eq '${grantApp.appId}'`)}&$select=id`);
      spCount = sp.status === 200 ? (sp.body?.value?.length ?? -1) : -1;
      spGone = spCount === 0;
      const owned = await graph<{ value: Array<{ appId: string; displayName: string; requiredResourceAccess?: Array<{ resourceAccess: Array<{ id: string }> }> }> }>(
        automationToken, "GET", "/applications?$select=appId,displayName,requiredResourceAccess&$top=999",
      );
      declaring = (owned.body?.value ?? [])
        .filter(a => (a.requiredResourceAccess ?? []).some(r => r.resourceAccess.some(x => x.id === SITES_FULLCONTROL_APP_ROLE_ID)))
        .map(a => `${a.displayName} (${a.appId.slice(0, 8)}…)`);
      noFullControlDeclared = owned.status === 200 && declaring.length === 0;
      if (appGone && spGone && noFullControlDeclared) break;
      await sleep(5_000);
    }
    cleanupProven = appGone && spGone && noFullControlDeclared;
    await recordAudit({
      action: "entra_app_delete", phase: "result", targetSystem: "microsoft_entra",
      targetResource: `"${MANAGED_SITE_GRANT_APP_DISPLAY_NAME}" prefix ${grantApp.appId.slice(0, 8)}…: delete HTTP ${del.status}, purge HTTP ${purge.status}; app gone ${appGone}; service principals with its appId ${spCount}; owned apps declaring FullControl ${declaring.length}`,
      permissionDecision: "allowed",
      permissionReason: cleanupProven
        ? "Cleanup proven: application object gone, no service principal remains, no owned application declares Sites.FullControl.All."
        : "Cleanup NOT proven. The run is incomplete regardless of the grant result. Human follow-up required now.",
      success: cleanupProven ? 1 : 0, errorCategory: cleanupProven ? "none" : "cleanup_incomplete",
    });
    console.log(cleanupProven
      ? "Cleanup proven: temporary application gone, its service principal gone, no owned application declares Sites.FullControl.All."
      : `CLEANUP NOT PROVEN: app gone=${appGone}, service principals remaining=${spCount}, apps still declaring FullControl=${declaring.length}. Delete by hand now: Entra > App registrations and Enterprise applications > "${MANAGED_SITE_GRANT_APP_DISPLAY_NAME}".`);
    if (!cleanupProven) process.exitCode = 1;
  };

  try {
    // 1. Mint the secret in memory.
    const added = await graphOrThrow<{ keyId: string; secretText: string }>(automationToken, "POST", `/applications/${grantApp.id}/addPassword`, {
      passwordCredential: { displayName: "wsa-site-grant-single-use", endDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    });
    tempSecretMinted = true;
    // The secret is held in this variable and nowhere else. It is not echoed,
    // not masked-then-echoed, not written to an artefact and not placed in an
    // audit row. Tom Arrington, 11 September 2026: never print it.
    await recordAudit({ action: "entra_secret_mint", phase: "result", targetSystem: "microsoft_entra", targetResource: `single-use credential on appId prefix ${grantApp.appId.slice(0, 8)}…, one hour, in memory only`, permissionDecision: "allowed", permissionReason: "Minted for one grant call; the application is deleted before this run exits.", success: 1, errorCategory: "none" });

    // 2. Token with exactly Sites.FullControl.All (consent proven), retrying for propagation.
    let grantToken = "";
    let lastErr = "";
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const t = await clientCredentialsToken(grantApp.appId, added.secretText);
      if (t.ok) {
        const roles = rolesClaimIsExactly(t.token, ["Sites.FullControl.All"]);
        if (roles.ok) { grantToken = t.token; break; }
        lastErr = `roles claim is [${roles.held.join(", ")}]`;
        if (roles.held.length > 0) break; // wrong set, will not improve by waiting
      } else lastErr = t.error;
      await sleep(10_000);
    }
    if (!grantToken) fail(`Temporary application token unusable: ${lastErr}. Admin consent for Sites.FullControl.All may not be granted yet, or something wider is present. No grant was made.`);
    console.log("Temporary application token carries exactly Sites.FullControl.All.");

    // 3. Resolve the site two ways.
    const site = await graphOrThrow<{ id: string; displayName?: string; webUrl?: string }>(grantToken, "GET", `/sites/${WSA_HOST}:${WSA_SITE_PATH}`);
    if (site.id !== expectedSiteId) fail(`Resolved WSA site id does not match SHAREPOINT_GRAPH_SITE_ID on the service (resolved prefix ${site.id.slice(0, 40)}…). Stopping before any grant.`);
    console.log(`WSA site resolved by path and matches the configured id: "${site.displayName ?? ""}".`);

    // 4. Grant, idempotently.
    const before = await graphOrThrow<{ value: SitePermissionEntry[] }>(grantToken, "GET", `/sites/${site.id}/permissions`);
    const existing = evaluateSiteGrant(before.value, workerApp.appId);
    if (existing.ok) {
      console.log("A read grant for the worker application already exists on the site; not creating a second.");
    } else {
      if (before.value.some(p => (p.grantedToIdentitiesV2 ?? p.grantedToIdentities ?? []).some(g => g.application?.id === workerApp.appId))) {
        fail(`The worker application already holds a permission on the site that is not read-only: ${existing.reason}. Not widening or replacing automatically.`);
      }
      await recordAudit({ action: "site_permission_grant", phase: "intent", targetSystem: "microsoft_entra", targetResource: `POST /sites/{wsa}/permissions roles [read] for appId prefix ${workerApp.appId.slice(0, 8)}…`, permissionDecision: "allowed", permissionReason: "Read only, on the WSA site only, for the worker application only.", success: null, errorCategory: "none" });
      await graphOrThrow(grantToken, "POST", `/sites/${site.id}/permissions`, buildSitePermissionGrantBody(workerApp.appId));
      console.log("Read grant posted.");
    }

    // 5. Verify.
    const after = await graphOrThrow<{ value: SitePermissionEntry[] }>(grantToken, "GET", `/sites/${site.id}/permissions`);
    const verified = evaluateSiteGrant(after.value, workerApp.appId);
    if (!verified.ok) fail(`Grant verification failed: ${verified.reason}.`);
    await recordAudit({ action: "site_permission_grant", phase: "result", targetSystem: "microsoft_entra", targetResource: `WSA site permission entry for appId prefix ${workerApp.appId.slice(0, 8)}…, roles [read]`, permissionDecision: "allowed", permissionReason: "Verified: exactly one permission entry for the worker application on the WSA site, read only.", success: 1, errorCategory: "none" });
    console.log("Verified: exactly one entry for the worker application on the WSA site, roles [read].");

    // 6. Worker read test, with the worker's own credential, retrying for propagation.
    let workerToken = "";
    const wt = await clientCredentialsToken(workerClientId, workerSecret);
    if (!wt.ok) fail(`Worker application token failed: ${wt.error}`);
    workerToken = wt.token;
    const workerRoles = rolesClaimIsExactly(workerToken, ["Sites.Selected"]);
    if (!workerRoles.ok) fail(`Worker application token roles are [${workerRoles.held.join(", ")}]; expected exactly [Sites.Selected].`);
    let readStatus = 0;
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const r = await graph<{ value?: unknown[] }>(workerToken, "GET", `/sites/${site.id}/drive/root:/${encodeURIComponent(READ_TEST_LOCATION)}:/children?$select=name&$top=5`);
      readStatus = r.status;
      if (r.status === 200) { console.log(`Worker read test: ${READ_TEST_LOCATION} -> HTTP 200 (${r.body?.value?.length ?? 0} entries seen, names withheld).`); break; }
      await sleep(10_000);
    }
    if (readStatus !== 200) fail(`Worker read test failed: HTTP ${readStatus} on ${READ_TEST_LOCATION} after retries.`);

    // 7. Worker negative tests: tenant root site, and a site that does not exist. Both must be refused.
    const rootSite = await graph(workerToken, "GET", `/sites/root`);
    const otherSite = await graph(workerToken, "GET", `/sites/${WSA_HOST}:/sites/NotAWsaWorkerSite-${Date.now()}`);
    const rootRefused = rootSite.status === 403 || rootSite.status === 401;
    const otherRefused = otherSite.status === 403 || otherSite.status === 404 || otherSite.status === 401;
    console.log(`Worker negative tests: tenant root site -> HTTP ${rootSite.status}; non-existent site -> HTTP ${otherSite.status}.`);
    if (!rootRefused || !otherRefused) fail("The worker application reached a site other than the WSA site. Investigate before any worker uses this credential.");
    await recordAudit({ action: "worker_site_scope_test", phase: "result", targetSystem: "microsoft_entra", targetResource: `worker read ${READ_TEST_LOCATION} HTTP ${readStatus}; tenant root HTTP ${rootSite.status}; other site HTTP ${otherSite.status}`, permissionDecision: "allowed", permissionReason: "Worker credential reads its designated WSA location and is refused everywhere else tested.", success: 1, errorCategory: "none" });
  } finally {
    // 8. Delete the temporary application on every path once a secret exists for it.
    if (tempSecretMinted) await deleteTemporaryApp();
  }

  // 9. Prove the worker application still declares only Sites.Selected.
  const workerNow = await graphOrThrow<GraphApplication & { requiredResourceAccess?: Array<{ resourceAppId: string; resourceAccess: Array<{ id: string; type: string }> }> }>(automationToken, "GET", `/applications/${workerApp.id}?$select=id,appId,displayName,requiredResourceAccess`);
  const declared = declaresOnlySitesSelected(workerNow.requiredResourceAccess);
  if (!declared.ok) fail(`Worker application declares more than Sites.Selected: ${declared.declared.join("; ")}.`);
  console.log("Worker application declares exactly Sites.Selected and its token carries exactly Sites.Selected.");

  if (!cleanupProven) {
    await recordAudit({
      action: "apply_site_grant", phase: "result", targetSystem: "microsoft_entra",
      targetResource: `grant work done on WSA site for appId prefix ${workerApp.appId.slice(0, 8)}… but temporary application cleanup NOT proven`,
      permissionDecision: "allowed",
      permissionReason: "INCOMPLETE. The SharePoint grant and read test may have passed, and that does not count: the temporary FullControl application could not be proven gone. Human follow-up required.",
      success: 0, errorCategory: "cleanup_incomplete", humanApprovalReference: HUMAN_APPROVAL_REFERENCE,
    });
    fail("Run B INCOMPLETE: cleanup not proven. See the audit row and delete the temporary application by hand now.");
  }
  await recordAudit({
    action: "apply_site_grant", phase: "result", targetSystem: "microsoft_entra",
    targetResource: `read-only grant verified on the exact WSA SharePoint site (sites/WSASharePoint) for appId prefix ${workerApp.appId.slice(0, 8)}…; temporary application, service principal and consent gone; worker declares Sites.Selected only`,
    permissionDecision: "allowed",
    permissionReason: "Grant applied and verified as read only on the WSA site only; worker read test passed; worker refused on the tenant root and a different site; temporary FullControl application deleted, purged and proven absent; no secret recorded anywhere.",
    success: 1, errorCategory: "none", humanApprovalReference: HUMAN_APPROVAL_REFERENCE,
  });
  console.log("RUN B COMPLETE. Next: run connector-sharepoint-acceptance.yml for the full designated-location listing.");
  process.exit(0);
}

main().catch(async error => {
  const message = String(error?.message ?? error);
  try {
    await recordAudit({ action: "apply_site_grant", phase: "result", targetSystem: "microsoft_entra", targetResource: "run aborted", permissionDecision: "allowed", permissionReason: `Run failed: ${redactForAudit(message).slice(0, 300)}`, success: 0, errorCategory: "run_failed" });
  } catch (auditError) {
    console.error(`CRITICAL: run failed AND the durable failure record could not be written: ${String((auditError as Error)?.message ?? auditError)}`);
  }
  fail(message);
});
