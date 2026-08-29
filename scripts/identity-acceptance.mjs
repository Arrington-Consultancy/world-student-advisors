import * as jose from "jose";

// Production identity acceptance checks (server-side verifiable portion).
// Runs from a GitHub-hosted runner against the LIVE production site.
// Strictly non-destructive: read-only queries, one deliberately-invalid
// callback attempt, and deliberately-invalid tokens that must be REJECTED.
// Never prints secrets; tenant/client identifiers from the authorize URL
// are printed as short prefixes only.

const BASE = process.env.ACCEPTANCE_BASE_URL ?? "https://www.worldstudentadvisors.com";

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
  if (!ok) failures += 1;
}

async function trpcQuery(path, input) {
  const url = input === undefined
    ? `${BASE}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: null, meta: { values: ["undefined"] } } }))}`
    : `${BASE}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input } }))}`;
  const res = await fetch(url);
  const body = await res.json();
  return body[0];
}

async function trpcMutation(path, input) {
  const res = await fetch(`${BASE}/api/trpc/${path}?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 0: input === undefined ? { json: null, meta: { values: ["undefined"] } } : { json: input } }),
  });
  const body = await res.json();
  return body[0];
}

// ── 1. SSO configuration state as the running production process sees it ──
const status = await trpcQuery("staffPortal.microsoftSsoStatus");
const configured = status?.result?.data?.json?.configured;
check("microsoftSsoStatus reachable", status?.result !== undefined, JSON.stringify(status).slice(0, 200));
check("STAFF_SSO_* configured in the RUNNING process", configured === true, `configured=${configured}`);

if (configured !== true) {
  console.log("\nStopping HTTP acceptance early: the running deployment does not see the STAFF_SSO_* variables (a redeploy after setting them may be required). Remaining checks that depend on configuration were not attempted.");
  process.exit(failures > 0 ? 1 : 0);
}

// ── 2. Real authorize URL from production, then Microsoft's own acceptance of it ──
const loginUrlResult = await trpcMutation("staffPortal.microsoftLoginUrl");
const authorizeUrl = loginUrlResult?.result?.data?.json?.authorizeUrl;
check("microsoftLoginUrl returns an authorize URL", typeof authorizeUrl === "string", authorizeUrl ? "(URL received)" : JSON.stringify(loginUrlResult).slice(0, 300));

if (typeof authorizeUrl === "string") {
  const u = new URL(authorizeUrl);
  const tenantSeg = u.pathname.split("/")[1] ?? "";
  const clientId = u.searchParams.get("client_id") ?? "";
  check("authorize URL host is login.microsoftonline.com", u.hostname === "login.microsoftonline.com", u.hostname);
  check("scope is exactly 'openid profile email'", u.searchParams.get("scope") === "openid profile email", u.searchParams.get("scope"));
  check("state and nonce present", Boolean(u.searchParams.get("state") && u.searchParams.get("nonce")));
  check("redirect_uri is the production staff portal", u.searchParams.get("redirect_uri") === "https://www.worldstudentadvisors.com/staff-portal", u.searchParams.get("redirect_uri"));
  console.log(`INFO | tenant prefix=${tenantSeg.slice(0, 8)}… client prefix=${clientId.slice(0, 8)}… (identifiers, not secrets; truncated anyway)`);

  // Ask Microsoft itself whether tenant + client + redirect URI are a real,
  // correctly-registered application: loading the authorize URL renders the
  // sign-in page when everything is valid, or an AADSTS error page when the
  // tenant is unknown (90002), the app doesn't exist (700016), or the
  // redirect URI isn't registered (50011). No credentials are submitted.
  const msRes = await fetch(authorizeUrl, { redirect: "follow" });
  const msBody = await msRes.text();
  const aadsts = msBody.match(/AADSTS\d+/)?.[0] ?? null;
  check("Microsoft serves the sign-in page for this tenant/app/redirect (no AADSTS error)", msRes.ok && aadsts === null, aadsts ? `Microsoft returned ${aadsts}` : `HTTP ${msRes.status}`);
}

// ── 3. Negative controls against production ──
// 3a. Forged/invalid callback state is rejected as a structured failure.
const badCallback = await trpcMutation("staffPortal.microsoftCallback", { code: "invalid-test-code", state: "invalid-test-state" });
const cb = badCallback?.result?.data?.json;
check("forged callback state rejected (structured failure, no throw)", cb?.success === false && /invalid|expired/i.test(cb?.error ?? ""), JSON.stringify(cb).slice(0, 200));

// 3b. Garbage token cannot reach the workforce endpoints.
const garbageList = await trpcQuery("workforce.listWorkers", { token: "garbage-token" });
check("workforce.listWorkers rejects a garbage token", garbageList?.error !== undefined && garbageList?.result === undefined, JSON.stringify(garbageList?.error?.json?.message ?? "").slice(0, 120));

// 3c. A forged identity-shaped JWT signed with an attacker secret, claiming
// an arbitrary staffUserId, is rejected — client-supplied identity is
// impossible by construction (there is no staffUserId input anywhere; the
// only channel is the token, and an unsigned-by-us token dies here).
const forged = await new jose.SignJWT({ purpose: "staff_identity", staffUserId: 999999, email: "attacker@worldstudentadvisors.com", displayName: "Attacker" })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("12h")
  .sign(new TextEncoder().encode("attacker-guessed-secret"));
const forgedList = await trpcQuery("workforce.listWorkers", { token: forged });
check("forged staff-identity token (wrong signature, spoofed staffUserId) rejected", forgedList?.error !== undefined && forgedList?.result === undefined);

const forgedRoute = await trpcQuery("workforce.route", { token: forged, request: "visa check" });
check("workforce.route also rejects the forged token", forgedRoute?.error !== undefined && forgedRoute?.result === undefined);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
