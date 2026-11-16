/**
 * One-off, read-only import of website assets Tom Arrington uploaded to the
 * controlled SharePoint folder 16_WEBSITE_Ai/05 Landing Pages/Juliet/Website
 * Assets on 25 September 2026, into the repository so the Partners page can
 * serve them.
 *
 * Same shape and same reasons as scripts/fetch-team-assets.mjs: the build
 * container holds no Graph credentials, the Microsoft 365 review tooling
 * returns rendered images but never file bytes, and the SHAREPOINT_GRAPH_*
 * application already trusted for read-only SharePoint access exists only
 * inside the Railway service. So this runs under `railway run` from
 * .github/workflows/fetch-website-assets.yml.
 *
 * It reads. It never writes to SharePoint, never lists a folder, never
 * prints a token, and touches only the three explicit item ids below, each
 * read from the folder listing on 25 September 2026.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const GRAPH = "https://graph.microsoft.com/v1.0";
const DRIVE_ID = "b!ZS3Ci2sXE0q78H6V2FWhiZpqxaBHOYJPqecEsWyKWRFvB8iImKYDQL3lj9332phP";

/** driveItem id -> repository path, relative to the repo root. */
const ITEMS = [
  ["01JQQ47XSSL74V4T5XQBH2AOTSV6HMCYGL", "client/public/partners/study-group-logo.jpg"],
  ["01JQQ47XXLACUCB3VS45EKIZL7KFBPSP6O", "client/public/partners/uclan-cyprus-logo.jpg"],
  ["01JQQ47XTCIUQHK3SCQZEJLLTOJPZXK2HG", "client/public/partners/university-of-debrecen-campus-and-logo.jpg"],
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
    // A JPEG starts FF D8. Anything else is not the file we were promised.
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      console.error(`FAIL ${relativePath}: not a JPEG (${bytes.length} bytes)`);
      failures += 1;
      continue;
    }
    const target = resolve(repoRoot, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    console.log(`OK   ${relativePath} (${bytes.length} bytes)`);
  }
  if (failures > 0) {
    console.error(`${failures} item(s) could not be read.`);
    process.exit(1);
  }
  console.log("All website assets imported.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
