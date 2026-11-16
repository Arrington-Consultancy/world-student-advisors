/**
 * One-off, read-only import of the controlled OUR TEAM assets from the WSA
 * SharePoint site into the repository, so the public page can serve them.
 *
 * Why this exists as a script rather than a manual download: the build
 * container holds no Graph credentials, and the Microsoft 365 tooling used
 * for document review returns rendered text and images, never file bytes.
 * The SHAREPOINT_GRAPH_* application already trusted for worker SharePoint
 * reads is the only credential that can fetch the bytes, and it only exists
 * inside the Railway service, so this runs under `railway run` from a
 * GitHub Actions job (.github/workflows/fetch-team-assets.yml).
 *
 * It reads. It never writes to SharePoint, never lists the site root, never
 * prints a token, and only ever touches the explicit item ids below - each
 * one a file in 16_WEBSITE_Ai/06 Counsellors, the controlled folder the
 * approved OUR TEAM implementation direction of 14 September 2026 names as
 * its source.
 *
 * Certificates: only the two individuals whose public use of their
 * certificate is evidenced are listed here. Glenice Owino and Manet Khamayo
 * hold current certificates and keep their British Council badge, but their
 * certificate files are deliberately NOT imported, because no specific
 * consent for publishing them exists yet (implementation direction, clause
 * 12).
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const GRAPH = "https://graph.microsoft.com/v1.0";
const DRIVE_ID = "b!ZS3Ci2sXE0q78H6V2FWhiZpqxaBHOYJPqecEsWyKWRFvB8iImKYDQL3lj9332phP";

/** driveItem id -> repository path, relative to the repo root. */
const ITEMS = [
  // Photographs: 16_WEBSITE_Ai/06 Counsellors/Photos
  ["01JQQ47XTAP3XZJXS4GRFI4HEVXGZHFQYB", "client/public/team/tim-hunt.png"],
  ["01JQQ47XTXFWUDJH6OHFEJH3PWFBDQ5YVO", "client/public/team/tom-arrington.png"],
  ["01JQQ47XSFYE2QDYQ6NFAYMDGVURTFUOW3", "client/public/team/eldah-therone.png"],
  ["01JQQ47XVO4IGGAUIEURHZFLNOG2M6ZT5Y", "client/public/team/glenice-owino.png"],
  ["01JQQ47XUVYJH2ZA6UXREJHFOIBE2OOTWF", "client/public/team/manet-khamayo.png"],
  ["01JQQ47XXYZHQFV3I4QVBLKBMHW52DLRZM", "client/public/team/claudia-ingado.png"],
  // Certificates: 16_WEBSITE_Ai/06 Counsellors/Certficates (consented only)
  ["01JQQ47XW6KDOMSY7FVVCI46U22THEID2D", "client/public/team/certificates/eldah-therone-british-council.pdf"],
  ["01JQQ47XRGPUWYEV24TRGJVJDTSSESRRU7", "client/public/team/certificates/tim-hunt-british-council.pdf"],
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Run this through \`railway run\` against the app service.`);
    process.exit(1);
  }
  return value;
}

async function accessToken() {
  const tenantId = requireEnv("SHAREPOINT_GRAPH_TENANT_ID");
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("SHAREPOINT_GRAPH_CLIENT_ID"),
      client_secret: requireEnv("SHAREPOINT_GRAPH_CLIENT_SECRET"),
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }).toString(),
  });
  // Status only: the response body is never worth logging.
  if (!response.ok) throw new Error(`Graph token request failed (HTTP ${response.status}).`);
  const data = await response.json();
  return data.access_token;
}

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

async function main() {
  const token = await accessToken();
  let failures = 0;
  for (const [itemId, relativePath] of ITEMS) {
    const response = await fetch(`${GRAPH}/drives/${DRIVE_ID}/items/${itemId}/content`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "follow",
    });
    if (!response.ok) {
      console.error(`FAIL ${relativePath} (HTTP ${response.status})`);
      failures += 1;
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const target = resolve(repoRoot, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    console.log(`OK   ${relativePath} (${bytes.length} bytes)`);
  }
  if (failures > 0) {
    console.error(`${failures} item(s) could not be read.`);
    process.exit(1);
  }
  console.log("All controlled OUR TEAM assets imported.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
