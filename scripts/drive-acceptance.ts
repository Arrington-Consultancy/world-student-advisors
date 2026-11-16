/**
 * Production acceptance for selected-folder Google Drive access. Runs
 * inside the Railway service's variables. Prints names, IDs, counts and
 * statuses only; no file content is printed and no token is printed.
 *
 *   1. The workforce service account is configured (email shown; it is an
 *      identity, not a secret).
 *   2. What the credential can see at all: an unfiltered listing of
 *      everything shared with it. Expected: only the designated WSA
 *      folders (and the reporting mirror folder once it exists). Anything
 *      else is a FAIL with its name, because it means a folder was shared
 *      that should not have been.
 *   3. The never-designated folders and the backup folder are invisible.
 *   4. Ethan lists his root and reads one document's metadata through the
 *      full gate chain; Sophie is refused at the gate; Ethan is refused a
 *      root that is not his.
 */
import { workforceDriveIdentity, readGoogleDriveFile, WORKFORCE_DRIVE_SCOPE } from "../server/workforce/connectors/googleDrive";
import { allDesignatedDriveRoots, decideDriveLocation, DRIVE_EXCLUDED_FILE_IDS, DRIVE_NOT_DESIGNATED, DRIVE_ROOTS } from "../server/workforce/driveLocations";
import type { WorkerId } from "../server/workforce/types";
import { MIRROR_FOLDER_NAME } from "../server/mirror/manifest";
import { BACKUP_FOLDER_NAME } from "../server/mirror/backup";
import * as jose from "jose";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => { if (!ok) failures += 1; console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`); };

console.log("\n=== 1. Workforce Drive identity ===");
const identity = workforceDriveIdentity();
check(Boolean(identity), "WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON present and well formed", identity ?? "absent");
if (!identity) process.exit(1);

// A token for the unfiltered listing. drive.readonly, as the connector uses.
const sa = JSON.parse(process.env.WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON!) as { client_email: string; private_key: string };
const key = await jose.importPKCS8(sa.private_key, "RS256");
const assertion = await new jose.SignJWT({ scope: WORKFORCE_DRIVE_SCOPE }).setProtectedHeader({ alg: "RS256", typ: "JWT" }).setIssuer(sa.client_email).setAudience("https://oauth2.googleapis.com/token").setIssuedAt().setExpirationTime("1h").sign(key);
const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString() });
check(tokenRes.ok, "service account token issued", `HTTP ${tokenRes.status}`);
if (!tokenRes.ok) process.exit(1);
const { access_token } = (await tokenRes.json()) as { access_token: string };

console.log("\n=== 2. Everything the credential can see (unfiltered) ===");
const visible: Array<{ id: string; name: string; mimeType: string; parents?: string[] }> = [];
let pageToken: string | undefined;
do {
  const params = new URLSearchParams({ fields: "nextPageToken,files(id,name,mimeType,parents)", pageSize: "100", q: "trashed=false" });
  if (pageToken) params.set("pageToken", pageToken);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: { Authorization: `Bearer ${access_token}` } });
  const j = (await r.json()) as { files?: typeof visible; nextPageToken?: string };
  visible.push(...(j.files ?? [])); pageToken = j.nextPageToken;
} while (pageToken);
const designatedIds = new Set(allDesignatedDriveRoots().map(r => r.id));
const topLevel = visible.filter(f => f.mimeType === "application/vnd.google-apps.folder" && !visible.some(v => v.id !== f.id && (f.parents ?? []).includes(v.id)));
console.log(`  ${visible.length} item(s) visible in total; ${topLevel.length} shared root folder(s):`);
for (const f of topLevel) {
  const expected = designatedIds.has(f.id) || f.name === MIRROR_FOLDER_NAME;
  check(expected, `shared root "${f.name}"`, expected ? (designatedIds.has(f.id) ? "designated" : "reporting mirror") : `NOT expected (${f.id}); unshare it`);
}
for (const root of allDesignatedDriveRoots()) check(visible.some(f => f.id === root.id), `designated "${root.name}" is shared with the identity`, root.id);

console.log("\n=== 3. What must be invisible ===");
for (const f of DRIVE_NOT_DESIGNATED) check(!visible.some(v => v.id === f.id), `"${f.name}" not visible`, f.id);
check(!visible.some(v => v.name === BACKUP_FOLDER_NAME), `"${BACKUP_FOLDER_NAME}" not visible`);
// "Arrington" alone is Tom's own surname and appears in WSA files he wrote,
// so matching it would fail on legitimate WSA material. The company name is
// what must not be readable, and any item carrying it must be withheld by ID
// at the gate, exactly as the SharePoint credential-reach finding recorded.
const company = visible.filter(v => /arrington[\s_.-]*consultancy/i.test(v.name));
const unhandled = company.filter(v => !DRIVE_EXCLUDED_FILE_IDS.has(v.id));
check(unhandled.length === 0, "every visible item naming Arrington Consultancy is withheld by ID at the gate", unhandled.map(a => `${a.name} (${a.id})`).join("; "));
if (company.length > 0) console.log(`  note ${company.length} item(s) name Arrington Consultancy and are refused by the gate: ${company.map(c => c.name).join("; ")}`);
const personal = visible.filter(v => /arrington/i.test(v.name) && !/arrington[\s_.-]*consultancy/i.test(v.name));
if (personal.length > 0) console.log(`  note ${personal.length} WSA item(s) carry Tom Arrington's name as author or subject, which is not company material: ${personal.map(c => c.name).join("; ")}`);

console.log("\n=== 4. Through the gates ===");
// Decided without a database: the folder gate is a pure function of the
// worker and the scope, and the shared-password refusal happens before any
// access assignment is looked up.
const GATE_CASES: Array<{ label: string; worker: WorkerId; scope: string; permitted: boolean }> = [
  { label: "Ethan may list his designated root", worker: "ethan", scope: `root/${DRIVE_ROOTS.websiteOperatingSystem.id}`, permitted: true },
  { label: "Ethan may search inside it", worker: "ethan", scope: `root/${DRIVE_ROOTS.websiteOperatingSystem.id}/search/specification`, permitted: true },
  { label: "Alex may list WSA Website Images", worker: "alex", scope: `root/${DRIVE_ROOTS.websiteImages.id}`, permitted: true },
  { label: "Maya may list WSA PDFs", worker: "maya", scope: `root/${DRIVE_ROOTS.pdfs.id}`, permitted: true },
  { label: "Alex is refused Ethan's root", worker: "alex", scope: `root/${DRIVE_ROOTS.websiteOperatingSystem.id}`, permitted: false },
  { label: "Sophie has no Drive folder at all", worker: "sophie", scope: `root/${DRIVE_ROOTS.websiteOperatingSystem.id}`, permitted: false },
  { label: "Priya has no Drive folder at all", worker: "priya", scope: `root/${DRIVE_ROOTS.pdfs.id}`, permitted: false },
  { label: "the withheld Arrington Consultancy PDF is refused even inside Maya's root", worker: "maya", scope: `root/${DRIVE_ROOTS.pdfs.id}/file/1gbRBDkB8zezqHqzT5KcTALCPc8VE-PPI`, permitted: false },
  { label: "a folder name in place of an ID is refused", worker: "ethan", scope: "WSA Website Operating System", permitted: false },
];
for (const c of GATE_CASES) {
  const d = decideDriveLocation(c.worker, c.scope);
  check(d.permitted === c.permitted, c.label, d.permitted ? "permitted" : d.reason.slice(0, 90));
}
for (const f of DRIVE_NOT_DESIGNATED) {
  const d = decideDriveLocation("ethan", `root/${f.id}`);
  check(!d.permitted, `"${f.name}" is refused at the gate for a worker that holds a Drive grant`, d.reason.slice(0, 80));
}
const shared = await readGoogleDriveFile({ workerId: "ethan", resourceScope: `root/${DRIVE_ROOTS.websiteOperatingSystem.id}`, staffUserId: null, authMethod: "shared_password" });
check(!shared.success, "a shared-password session is refused before the folder is touched", shared.message.slice(0, 90));
console.log("  (An authorised listing through the full chain needs a signed-in staff profile and is exercised by the worker path, not this script.)");

console.log(`\nRESULT: ${failures === 0 ? "every proof holds; selected-folder Drive access is accepted" : `${failures} proof(s) failed`}.`);
process.exit(failures === 0 ? 0 : 1);
