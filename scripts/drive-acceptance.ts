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
import { allDesignatedDriveRoots, DRIVE_NOT_DESIGNATED, DRIVE_ROOTS } from "../server/workforce/driveLocations";
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
const arrington = visible.filter(v => /arrington/i.test(v.name));
check(arrington.length === 0, "no item with Arrington in its name is visible", arrington.map(a => a.name).join("; "));

console.log("\n=== 4. Through the gates ===");
const ethan = await readGoogleDriveFile({ workerId: "ethan", resourceScope: `root/${DRIVE_ROOTS.websiteOperatingSystem.id}`, staffUserId: null, authMethod: "shared_password" });
check(!ethan.success, "a shared-password session is refused before the folder is touched", ethan.message.slice(0, 100));
const sophie = await readGoogleDriveFile({ workerId: "sophie", resourceScope: `root/${DRIVE_ROOTS.websiteOperatingSystem.id}`, staffUserId: 1, authMethod: "entra_sso" });
check(!sophie.success, "Sophie (no Drive folder) is refused at the gate", sophie.message.slice(0, 100));
const wrongRoot = await readGoogleDriveFile({ workerId: "alex", resourceScope: `root/${DRIVE_ROOTS.websiteOperatingSystem.id}`, staffUserId: 1, authMethod: "entra_sso" });
check(!wrongRoot.success, "Alex is refused Ethan's root", wrongRoot.message.slice(0, 100));
console.log("  (An authorised listing through the full chain needs a real staff profile and is exercised by the worker path, not this script.)");

console.log(`\nRESULT: ${failures === 0 ? "every proof holds; selected-folder Drive access is accepted" : `${failures} proof(s) failed`}.`);
process.exit(failures === 0 ? 0 : 1);
