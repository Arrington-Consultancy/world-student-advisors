/**
 * One-off, read-only fetch of a single controlled SharePoint document into
 * the working tree, so it can be amended and re-filed.
 *
 * Same constraint and same route as scripts/fetch-team-assets.mjs: the build
 * container holds no Graph credentials, and the document tooling used for
 * review returns rendered text rather than file bytes. Amending a controlled
 * .docx needs the real bytes, so this runs inside the Railway service under
 * the read-only SHAREPOINT_GRAPH_* application.
 *
 * It reads one item id and writes one file. It never writes to SharePoint:
 * the application deliberately holds `read` on the site and nothing more, so
 * the amended document is re-filed by a person, through delegated access.
 *
 * Usage: DOC_ITEM_ID=<id> DOC_OUT=<path> node scripts/fetch-controlled-doc.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const GRAPH = "https://graph.microsoft.com/v1.0";
const DRIVE_ID = "b!ZS3Ci2sXE0q78H6V2FWhiZpqxaBHOYJPqecEsWyKWRFvB8iImKYDQL3lj9332phP";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) { console.error(`Missing ${name}.`); process.exit(1); }
  return value;
}

const itemId = requireEnv("DOC_ITEM_ID");
const outPath = requireEnv("DOC_OUT");

const tenantId = requireEnv("SHAREPOINT_GRAPH_TENANT_ID");
const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: requireEnv("SHAREPOINT_GRAPH_CLIENT_ID"),
    client_secret: requireEnv("SHAREPOINT_GRAPH_CLIENT_SECRET"),
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  }).toString(),
});
if (!tokenResponse.ok) throw new Error(`Graph token request failed (HTTP ${tokenResponse.status}).`);
const { access_token } = await tokenResponse.json();

const file = await fetch(`${GRAPH}/drives/${DRIVE_ID}/items/${itemId}/content`, {
  headers: { Authorization: `Bearer ${access_token}` },
  redirect: "follow",
});
if (!file.ok) throw new Error(`Could not read item ${itemId} (HTTP ${file.status}).`);

const bytes = Buffer.from(await file.arrayBuffer());
const target = resolve(process.cwd(), outPath);
await mkdir(dirname(target), { recursive: true });
await writeFile(target, bytes);
console.log(`OK ${outPath} (${bytes.length} bytes)`);
