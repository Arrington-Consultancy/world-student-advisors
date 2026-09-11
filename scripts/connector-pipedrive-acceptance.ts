/**
 * Production acceptance for the WSA Pipedrive OAuth connection. READ ONLY
 * on the CRM. Runs inside the Railway service's variables with a public
 * database URL substituted so the grant row can be read.
 *
 * Proves, in order, and prints identifiers and counts only, never a token:
 *   1. The three application variables are present (names only).
 *   2. A grant exists, is operational, was authorised by a named staff
 *      account, and its api_domain is a pipedrive.com company host.
 *   3. The scope string Pipedrive granted is inside the approved read set
 *      and contains nothing ending in :full or admin.
 *   4. Authorised reads work through the same reader the workforce and the
 *      resolution-first layer use: leads, deals and persons listings
 *      (counts only) and a person search for a sentinel address that
 *      should match nobody.
 *   5. Refresh works: the access token is refreshed against Pipedrive as
 *      if it were about to expire, the rotated tokens are stored sealed,
 *      and a read still succeeds afterwards.
 *   6. Denied access: a write attempt with the same credential is refused
 *      by Pipedrive (a PUT on a person id that cannot exist, so it could
 *      not succeed even if the scope were wrong); a worker without a CRM
 *      grant is refused at the gate; a shared-password session is refused
 *      at the gate. None of these touches the network beyond the refused
 *      PUT, and none writes anything.
 * Exit 0 only when every proof holds.
 */
import { describePipedriveGrant, getPipedriveOAuthAccess, oauthConfig, scopesOutsideApproved, resetPipedriveOAuthCache, PIPEDRIVE_OAUTH_SCOPES } from "../server/crm/pipedriveOAuth";
import { pipedriveOAuthAuth } from "../server/crm/pipedriveOAuthAuth";
import { createPipedriveReaderWithAuth } from "../server/pipedrive-read";
import { readPipedriveRecord } from "../server/workforce/connectors/pipedrive";

let failures = 0;
function check(ok: boolean, label: string, detail = ""): void {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
}

console.log("\n=== 1. Application configuration (presence only) ===");
for (const name of ["PIPEDRIVE_OAUTH_CLIENT_ID", "PIPEDRIVE_OAUTH_CLIENT_SECRET", "PIPEDRIVE_OAUTH_TOKEN_KEY"]) {
  check(Boolean(process.env[name]), name, process.env[name] ? "present" : "missing");
}
check(!process.env.WORKFORCE_PIPEDRIVE_API_TOKEN, "no retired WORKFORCE_PIPEDRIVE_API_TOKEN variable on the service");
if (!oauthConfig()) { console.log("\nRESULT: the application is not configured. Stopping before any request."); process.exit(1); }

console.log("\n=== 2. Grant ===");
const grant = await describePipedriveGrant();
check(grant.status === "operational", "grant status", grant.status);
check(typeof grant.authorisedByStaffUserId === "number", "authorised by a named staff account", grant.authorisedByStaffUserId === null ? "none" : `staff_users.id ${grant.authorisedByStaffUserId}`);
check(grant.authorisedAt !== null, "authorised at", grant.authorisedAt ? grant.authorisedAt.toISOString() : "none");
check(Boolean(grant.apiDomainHost && /^[a-z0-9-]+\.pipedrive\.com$/i.test(grant.apiDomainHost)), "api_domain is a pipedrive.com company host", grant.apiDomainHost ?? "none");
if (grant.status !== "operational") { console.log("\nRESULT: no usable grant. A WSA administrator must authorise the application from Staff access first."); process.exit(2); }

console.log("\n=== 3. Scopes granted are inside the approved read set ===");
const scopeString = grant.scopes ?? "";
const granted = scopeString.split(/[\s,]+/).filter(Boolean);
check(granted.length > 0, "Pipedrive returned a scope string", scopeString || "(empty)");
const wider = scopesOutsideApproved(scopeString);
check(wider.length === 0, "nothing outside the approved set", wider.length ? `outside: ${wider.join(", ")}` : `approved: ${PIPEDRIVE_OAUTH_SCOPES.join(", ")}`);
check(!granted.some(s => /:full$|admin|write/i.test(s)), "no :full, admin or write scope", granted.join(" "));

console.log("\n=== 4. Authorised reads (counts only) ===");
const reader = createPipedriveReaderWithAuth(pipedriveOAuthAuth);
async function counts(label: string) {
  try {
    const [leads, deals, persons] = await Promise.all([reader.listLeadsRaw(), reader.listDealsRaw(), reader.listPersonsRaw()]);
    check(true, `${label}: leads listed`, `${leads.length} records`);
    check(true, `${label}: deals listed`, `${deals.length} records`);
    check(true, `${label}: persons listed`, `${persons.length} records`);
    return true;
  } catch (error) {
    check(false, `${label}: listings`, String((error as Error)?.message ?? error).slice(0, 160));
    return false;
  }
}
await counts("before refresh");
try {
  const hits = await reader.searchPersonIds("acceptance-sentinel-no-such-person@example.invalid", "email");
  check(hits.length === 0, "person search by exact email works and the sentinel matches nobody", `${hits.length} matches`);
} catch (error) {
  check(false, "person search", String((error as Error)?.message ?? error).slice(0, 160));
}

console.log("\n=== 5. Refresh ===");
const before = await getPipedriveOAuthAccess();
if (before.ok) {
  // Ask for access as if the token were about to expire: forces the refresh
  // path against Pipedrive. The rotated refresh token is sealed and stored;
  // the running service re-reads the row when it next refreshes.
  const nearExpiry = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  const after = await getPipedriveOAuthAccess({ now: nearExpiry });
  check(after.ok, "refresh produced a usable access token", after.ok ? "" : `status ${after.status}`);
  check(after.ok && after.accessToken !== before.accessToken, "access token rotated");
  resetPipedriveOAuthCache();
  const stored = await describePipedriveGrant();
  check(stored.lastRefreshedAt !== null, "lastRefreshedAt recorded", stored.lastRefreshedAt ? stored.lastRefreshedAt.toISOString() : "none");
  check(stored.lastRefreshError === null, "no refresh error recorded", stored.lastRefreshError ?? "");
  check(stored.status === "operational", "grant still operational after refresh", stored.status);
  await counts("after refresh");
} else {
  check(false, "access before refresh", `status ${before.status}`);
}

console.log("\n=== 6. Denied access ===");
const access = await getPipedriveOAuthAccess();
if (access.ok) {
  // Person id 0 cannot exist, so this PUT could not change anything even
  // with a write scope. Read-only scopes make Pipedrive refuse it outright.
  const r = await fetch(`${access.apiDomain}/api/v1/persons/0`, { method: "PUT", headers: { Authorization: `Bearer ${access.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: "acceptance write probe" }) });
  check(r.status === 401 || r.status === 403, "a write with the workforce credential is refused by Pipedrive", `HTTP ${r.status}`);
}
const amelia = await readPipedriveRecord({ workerId: "amelia", resourceScope: "person/1", staffUserId: 1, authMethod: "entra_sso" });
check(!amelia.success, "a worker without a CRM grant is refused at the gate", amelia.message.slice(0, 120));
const shared = await readPipedriveRecord({ workerId: "sophie", resourceScope: "person/search/email/acceptance-sentinel-no-such-person%40example.invalid", staffUserId: null, authMethod: "shared_password" });
check(!shared.success, "a shared-password session is refused at the gate", shared.message.slice(0, 120));

console.log(`\nRESULT: ${failures === 0 ? "every proof holds; the WSA Pipedrive OAuth connection is accepted" : `${failures} proof(s) failed`}.`);
process.exit(failures === 0 ? 0 : 1);
