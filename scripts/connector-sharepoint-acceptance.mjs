// Production acceptance for the worker SharePoint connection. READ ONLY.
//
// Runs inside the Railway service with the dedicated SHAREPOINT_GRAPH_*
// credentials (never the Mail.Send app). Three things, in order:
//   1. Prove the application can obtain a Graph token and list the
//      application permissions it actually holds (names only).
//   2. Resolve the WSA site by hostname and path. If it resolves, print the
//      site id on a line the workflow captures and writes to
//      SHAREPOINT_GRAPH_SITE_ID, which is an identifier and not a secret.
//   3. For every designated worker location, list the folder (names of
//      immediate children withheld; count only) and print the HTTP status.
//      A 403 here means consent or the site grant is missing and says so.
// Never prints a token or secret. Writes nothing to SharePoint.
const tenant = process.env.SHAREPOINT_GRAPH_TENANT_ID;
const clientId = process.env.SHAREPOINT_GRAPH_CLIENT_ID;
const secret = process.env.SHAREPOINT_GRAPH_CLIENT_SECRET;
if (!tenant || !clientId || !secret) {
  console.error("SHAREPOINT_GRAPH_TENANT_ID, SHAREPOINT_GRAPH_CLIENT_ID and SHAREPOINT_GRAPH_CLIENT_SECRET must all be set. Run the provisioning workflow first.");
  process.exit(1);
}
const WSA_HOST = "worldstudentadvisors123.sharepoint.com";
const WSA_SITE_PATH = "/sites/WSASharePoint";
// Mirrors server/workforce/sharePointLocations.ts. Kept literal here so the
// acceptance does not import application code into a diagnostic. Being a
// copy, it can drift, and on 14 September 2026 it did: grace and maya were
// corrected in both places at once after this run reported 404 itemNotFound
// for a 17_Senior Management Team that is not at the drive root. A test in
// sharePointLocations.test.ts now fails if the two lists disagree.
const DESIGNATED = {
  amelia: ["08_PARTNERS- ORGANISATIONS"],
  grace: ["05_HUB/17_Senior Management Team/AI_Operating_System"],
  ethan: ["16_WEBSITE_Ai"],
  maya: ["01_ADMIN_&_GOVERNANCE", "05_HUB/17_Senior Management Team"],
  alex: ["07_MARKETING_IMAGES"],
  nia: ["11_SOCIAL_MEDIA", "07_MARKETING_IMAGES", "09_PODCASTS and WEBINARS"],
};
const FORBIDDEN_SAMPLE = ["03_FAMILY_&_PERSONAL", "04_FINANCE_&_BANKING", "000_Temp download", "Mary Obeng"];

const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
  method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_id: clientId, client_secret: secret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }).toString(),
});
if (!tokenResponse.ok) { console.error(`Token request failed: HTTP ${tokenResponse.status}.`); process.exit(1); }
const { access_token } = await tokenResponse.json();
const payload = JSON.parse(Buffer.from(access_token.split(".")[1], "base64url").toString("utf8"));
const roles = Array.isArray(payload.roles) ? payload.roles.sort() : [];
console.log("\n=== Application permissions held (roles claim) ===");
console.log(roles.length ? roles.map(r => `  ${r}`).join("\n") : "  (none) : admin consent has not been granted yet");
if (roles.some(r => /^(Sites\.Read\.All|Sites\.ReadWrite\.All|Sites\.FullControl\.All|Files\.)/.test(r))) {
  console.log("  WARNING: a tenant-wide Sites or Files permission is present. The approved design is Sites.Selected only.");
}
const graph = async (path) => {
  const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, { headers: { Authorization: `Bearer ${access_token}` } });
  let body = null; try { body = await r.json(); } catch { /* none */ }
  return { status: r.status, body };
};
console.log("\n=== Resolve the WSA site ===");
const site = await graph(`/sites/${WSA_HOST}:${WSA_SITE_PATH}`);
console.log(`  GET /sites/${WSA_HOST}:${WSA_SITE_PATH} -> HTTP ${site.status}`);
if (site.status !== 200) {
  console.log(`  ${site.body?.error?.code ?? ""} ${site.body?.error?.message ?? ""}`.trim());
  console.log("\nRESULT: the application cannot yet see the WSA site. Admin consent for Sites.Selected and a read grant on the site are required.");
  process.exit(2);
}
console.log(`  site id: ${site.body.id}`);
console.log(`SITE_ID=${site.body.id}`);
let failures = 0;
console.log("\n=== Designated locations, list only ===");
for (const [worker, locations] of Object.entries(DESIGNATED)) {
  for (const location of locations) {
    const enc = location.split("/").map(encodeURIComponent).join("/");
    const r = await graph(`/sites/${site.body.id}/drive/root:/${enc}:/children?$select=name&$top=50`);
    const ok = r.status === 200;
    if (!ok) failures += 1;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${worker.padEnd(7)} ${location}  -> HTTP ${r.status}${ok ? ` (${r.body.value?.length ?? 0} entries)` : ` ${r.body?.error?.code ?? ""}`}`);
  }
}
console.log("\n=== Forbidden areas: the CODE refuses these before any call; this shows what the credential alone could reach ===");
for (const location of FORBIDDEN_SAMPLE) {
  const r = await graph(`/sites/${site.body.id}/drive/root:/${encodeURIComponent(location)}?$select=name`);
  console.log(`  ${location}  -> HTTP ${r.status}  (credential reach only; the location gate denies every worker regardless)`);
}
console.log(`\nRESULT: ${failures === 0 ? "every designated location is readable by the dedicated application" : `${failures} designated location(s) not readable`}.`);
process.exit(failures === 0 ? 0 : 1);
