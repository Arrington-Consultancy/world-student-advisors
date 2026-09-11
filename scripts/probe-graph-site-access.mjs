// READ-ONLY probe: can production's existing Microsoft Graph application
// see the WSA SharePoint site?
//
// Tom, 11 September 2026: do not treat the absence of worker permission as
// the absence of a platform connection. Production holds MICROSOFT_TENANT_ID,
// MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET for the Mail.Send app. The
// code refuses to ASSUME that app can read files. This script finds out,
// from evidence, so the decision is made on what the app actually holds.
//
// Runs inside the Railway service so the secret never travels. Prints the
// application permission NAMES from the token's roles claim, the WSA site id
// (an identifier, not a secret), and HTTP statuses. Never prints the token,
// the secret, or any file content. Makes no write of any kind.

const tenant = process.env.MICROSOFT_TENANT_ID;
const clientId = process.env.MICROSOFT_CLIENT_ID;
const secret = process.env.MICROSOFT_CLIENT_SECRET;
if (!tenant || !clientId || !secret) {
  console.error("MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must all be set in this environment.");
  process.exit(1);
}

const WSA_HOST = "worldstudentadvisors123.sharepoint.com";
const WSA_SITE_PATH = "/sites/WSASharePoint";

const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  }).toString(),
});
if (!tokenResponse.ok) {
  console.error(`Token request failed: HTTP ${tokenResponse.status}. The app credentials are not usable for Graph.`);
  process.exit(1);
}
const { access_token } = await tokenResponse.json();

// The roles claim lists the APPLICATION permissions actually consented to.
// Names only; nothing else from the token is decoded or printed.
const payload = JSON.parse(Buffer.from(access_token.split(".")[1], "base64url").toString("utf8"));
const roles = Array.isArray(payload.roles) ? payload.roles : [];
console.log("\n=== Application permissions consented to this app (roles claim) ===");
if (roles.length === 0) console.log("  (none)");
for (const role of roles.sort()) console.log(`  ${role}`);

const graph = async (path) => {
  const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, { headers: { Authorization: `Bearer ${access_token}` } });
  let body = null;
  try { body = await r.json(); } catch { /* no body */ }
  return { status: r.status, body };
};

console.log("\n=== Resolve the WSA site ===");
const site = await graph(`/sites/${WSA_HOST}:${WSA_SITE_PATH}`);
console.log(`  GET /sites/${WSA_HOST}:${WSA_SITE_PATH} -> HTTP ${site.status}`);
if (site.status === 200) {
  console.log(`  site id: ${site.body.id}`);
  console.log(`  display name: ${site.body.displayName}`);
} else {
  console.log(`  ${site.body?.error?.code ?? ""} ${site.body?.error?.message ?? ""}`.trim());
}

console.log("\n=== Can it list the site's default drive root (read test, no content) ===");
if (site.status === 200) {
  const root = await graph(`/sites/${site.body.id}/drive/root/children?$select=name,folder&$top=5`);
  console.log(`  -> HTTP ${root.status}`);
  if (root.status === 200) {
    console.log(`  top-level entries visible: ${root.body.value?.length ?? 0} (names withheld; this is a can-it-see test, not an inventory)`);
  } else {
    console.log(`  ${root.body?.error?.code ?? ""} ${root.body?.error?.message ?? ""}`.trim());
  }
}

console.log("\n=== Reading ===");
const hasSites = roles.some(r => /^Sites\./.test(r));
const hasFiles = roles.some(r => /^Files\./.test(r));
if (site.status === 200 && (hasSites || hasFiles)) {
  console.log("  This app CAN reach the WSA site. Note the breadth of the roles above: Sites.Read.All or Files.Read.All is tenant-wide and");
  console.log("  reaches Arrington Consultancy sites too. The code pins workers to SHAREPOINT_GRAPH_SITE_ID and per-worker locations,");
  console.log("  but the credential itself is broad. Sites.Selected on a dedicated app remains the right end state.");
} else if (site.status === 200) {
  console.log("  The site resolved but no Sites/Files application role is present; reads will fail. A grant is needed.");
} else {
  console.log("  This app cannot see the WSA site. A dedicated application with Sites.Selected, admin-consented, is needed.");
}
process.exit(0);
