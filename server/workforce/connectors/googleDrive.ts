/**
 * Google Drive connector for WSA workers: selected WSA folders in Tom
 * Arrington's Drive, read only, by folder ID.
 *
 * Tom Arrington, 11 September 2026: workers may read selected WSA folders
 * held in his Drive. Not the whole Drive, not Arrington Consultancy
 * material. Read only. No Drive-root search. No discovery of folders that
 * were not explicitly shared. SharePoint remains the WSA controlled source
 * of truth where a controlled record exists, and Drive is never silently
 * chosen over it. The source and freshness of evidence is recorded.
 *
 * HOW EACH RULE IS ENFORCED, not promised:
 *   Whole-Drive access: the credential is a dedicated service account. It
 *     sees only what Tom shares with it. It has no Drive of its own worth
 *     the name and no access to anything unshared.
 *   Per-worker boundary: driveLocations.ts names each worker's roots by
 *     ID; shared.ts refuses any scope outside them before this file runs.
 *   Root search and discovery: every listing and search here is
 *     constrained to "'<id>' in parents". There is no query without a
 *     parent, and a test reads this file to prove it.
 *   Ancestry: a file or subfolder named by ID is read only after its
 *     parent chain has been walked back to the designated root. An ID
 *     that is not inside the root is refused however it was obtained.
 *   Read only: the scope is drive.readonly and every call is a GET.
 *   Precedence and freshness: every result carries its source, the folder
 *     it came from, its modified time, when it was retrieved, and the
 *     statement that a SharePoint controlled record takes precedence.
 *   Never designated: the WSA Editable Docs folder (holds Arrington
 *     Consultancy documents), the parent World Student Advisors folder, the
 *     archives and any Arrington folder are refused by ID at the gate.
 */
import * as jose from "jose";
import { runConnectorAction, type ConnectorActionRequest, type ConnectorActionResult } from "./shared";
import type { ConnectorState } from "../types";
import { parseDriveScope, DRIVE_EXCLUDED_FILE_IDS, type DriveRoot, WORKER_DRIVE_ROOTS } from "../driveLocations";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
/** Read only. Not drive, not drive.file, not metadata-only either, because worker evidence needs content. */
export const WORKFORCE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const FIELDS = "id,name,mimeType,modifiedTime,size,parents,owners(emailAddress)";
const MAX_TEXT_BYTES = 200_000;
const MAX_SUBFOLDERS = 60;
const TEXT_TYPES = /^(text\/|application\/(json|xml|csv))/;
const GOOGLE_DOC_EXPORT: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

interface ServiceAccount { client_email: string; private_key: string }

export function parseServiceAccount(raw: string | undefined = process.env.WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON): ServiceAccount | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<ServiceAccount>;
    return typeof j.client_email === "string" && typeof j.private_key === "string" ? { client_email: j.client_email, private_key: j.private_key } : null;
  } catch { return null; }
}

/** The service account's email, for Tom to share folders with. Not a secret. */
export function workforceDriveIdentity(): string | null {
  return parseServiceAccount()?.client_email ?? null;
}

function getGoogleDriveConnectorState(): ConnectorState {
  return parseServiceAccount() ? "operational" : "unconfigured";
}

type Cached = { token: string; expiresAt: number };
let cached: Cached | null = null;
export function resetDriveTokenCache(): void { cached = null; }

async function accessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now + 30_000) return cached.token;
  const sa = parseServiceAccount();
  if (!sa) throw new Error("The workforce Drive service account is not configured.");
  const key = await jose.importPKCS8(sa.private_key, "RS256");
  const assertion = await new jose.SignJWT({ scope: WORKFORCE_DRIVE_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const response = await fetchImpl(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString() });
  if (!response.ok) throw new Error(`Google token request failed (HTTP ${response.status}).`);
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return cached.token;
}

interface DriveMeta { id: string; name: string; mimeType: string; modifiedTime?: string; size?: string; parents?: string[]; owners?: Array<{ emailAddress?: string }> }

async function driveGet(path: string, fetchImpl: typeof fetch = fetch): Promise<{ status: number; body: any }> {
  const token = await accessToken(fetchImpl);
  const r = await fetchImpl(`${DRIVE_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  let body: any = null;
  try { body = await r.json(); } catch { /* none */ }
  return { status: r.status, body };
}
async function driveText(path: string, fetchImpl: typeof fetch = fetch): Promise<{ status: number; text: string | null; contentType: string | null }> {
  const token = await accessToken(fetchImpl);
  const r = await fetchImpl(`${DRIVE_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, text: r.ok ? await r.text() : null, contentType: r.headers.get("content-type") };
}

/** Children of one folder. Always constrained by parent; never a bare listing. */
async function listChildren(folderId: string, fetchImpl: typeof fetch): Promise<DriveMeta[]> {
  const out: DriveMeta[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ q: `'${folderId}' in parents and trashed=false`, fields: `nextPageToken,files(${FIELDS})`, pageSize: "200", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
    if (pageToken) params.set("pageToken", pageToken);
    const r = await driveGet(`/files?${params.toString()}`, fetchImpl);
    if (r.status !== 200) throw new Error(describeHttp(r.status));
    out.push(...((r.body?.files ?? []) as DriveMeta[]));
    pageToken = r.body?.nextPageToken;
  } while (pageToken);
  return out;
}

/** Walks parents until the designated root is met. False if the chain ends elsewhere or runs too deep. */
async function isWithinRoot(item: DriveMeta, rootId: string, fetchImpl: typeof fetch): Promise<boolean> {
  if (item.id === rootId) return true;
  let current = item;
  for (let depth = 0; depth < 12; depth += 1) {
    const parents = current.parents ?? [];
    if (parents.includes(rootId)) return true;
    if (parents.length === 0) return false;
    const r = await driveGet(`/files/${encodeURIComponent(parents[0])}?fields=${encodeURIComponent("id,name,mimeType,parents")}&supportsAllDrives=true`, fetchImpl);
    if (r.status !== 200) return false;
    current = r.body as DriveMeta;
  }
  return false;
}

function describeHttp(status: number): string {
  if (status === 403) return "Google Drive refused (HTTP 403). The folder is not shared with the workforce service account.";
  if (status === 404) return "Not found among the folders shared with the workforce service account (HTTP 404).";
  if (status === 401) return "Google rejected the credential (HTTP 401).";
  return `Google Drive returned HTTP ${status}.`;
}

export const DRIVE_PRECEDENCE_NOTE = "Supporting evidence from a shared WSA Google Drive folder. Where a SharePoint controlled record exists on the same subject it takes precedence; a difference between the two is reported, not resolved by choosing Drive.";

export interface DriveEntry { id: string; name: string; kind: "folder" | "file"; mimeType: string; modifiedTime: string | null; sizeBytes: number | null }
export interface DriveEvidence {
  source: "google_drive";
  root: DriveRoot;
  retrievedAt: string;
  precedence: string;
  kind: "folder" | "file" | "search";
  entries?: DriveEntry[];
  file?: DriveEntry & { text?: string; textTruncated?: boolean; contentType: string | null };
  term?: string;
}

function entryOf(m: DriveMeta): DriveEntry {
  return { id: m.id, name: m.name, kind: m.mimeType === "application/vnd.google-apps.folder" ? "folder" : "file", mimeType: m.mimeType, modifiedTime: m.modifiedTime ?? null, sizeBytes: m.size ? Number(m.size) : null };
}

async function driveAttempt(request: ConnectorActionRequest, fetchImpl: typeof fetch = fetch): Promise<{ success: boolean; message: string; data?: unknown }> {
  const scope = parseDriveScope(request.resourceScope);
  if (!scope) return { success: false, message: "Google Drive requests must name a designated root folder by ID." };
  const root = (WORKER_DRIVE_ROOTS[request.workerId] ?? []).find(r => r.id === scope.rootId);
  // The gate already checked this; the connector refuses too, so a second code path cannot argue around it.
  if (!root) return { success: false, message: "That folder is not designated for this worker." };
  const base = { source: "google_drive" as const, root, retrievedAt: new Date().toISOString(), precedence: DRIVE_PRECEDENCE_NOTE };

  if (scope.kind === "list") {
    if (scope.folderId !== root.id) {
      const meta = await driveGet(`/files/${encodeURIComponent(scope.folderId)}?fields=${encodeURIComponent(FIELDS)}&supportsAllDrives=true`, fetchImpl);
      if (meta.status !== 200) return { success: false, message: describeHttp(meta.status) };
      if (!(await isWithinRoot(meta.body as DriveMeta, root.id, fetchImpl))) return { success: false, message: `That folder is not inside "${root.name}", so it was not listed.` };
    }
    const children = (await listChildren(scope.folderId, fetchImpl)).filter(c => !DRIVE_EXCLUDED_FILE_IDS.has(c.id));
    const data: DriveEvidence = { ...base, kind: "folder", entries: children.map(entryOf) };
    return { success: true, message: `Listed ${children.length} entr${children.length === 1 ? "y" : "ies"} in "${root.name}".`, data };
  }

  if (scope.kind === "search") {
    // Root and its subfolders, each named explicitly in the query. Never the Drive.
    const folderIds = [root.id];
    const queue = [root.id];
    while (queue.length && folderIds.length < MAX_SUBFOLDERS) {
      const id = queue.shift()!;
      for (const c of await listChildren(id, fetchImpl)) if (c.mimeType === "application/vnd.google-apps.folder" && !folderIds.includes(c.id)) { folderIds.push(c.id); queue.push(c.id); }
    }
    const term = scope.term.replace(/['\\]/g, " ").trim().slice(0, 100);
    if (!term) return { success: false, message: "A search needs a term." };
    const params = new URLSearchParams({ q: `(${folderIds.map(id => `'${id}' in parents`).join(" or ")}) and trashed=false and (name contains '${term}' or fullText contains '${term}')`, fields: `files(${FIELDS})`, pageSize: "50", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
    const r = await driveGet(`/files?${params.toString()}`, fetchImpl);
    if (r.status !== 200) return { success: false, message: describeHttp(r.status) };
    const hits = ((r.body?.files ?? []) as DriveMeta[]).filter(h => !DRIVE_EXCLUDED_FILE_IDS.has(h.id));
    const data: DriveEvidence = { ...base, kind: "search", term, entries: hits.map(entryOf) };
    return { success: true, message: `${hits.length} match${hits.length === 1 ? "" : "es"} for "${term}" in "${root.name}".`, data };
  }

  // read
  if (DRIVE_EXCLUDED_FILE_IDS.has(scope.fileId)) return { success: false, message: "That file is withheld pending identification." };
  const meta = await driveGet(`/files/${encodeURIComponent(scope.fileId)}?fields=${encodeURIComponent(FIELDS)}&supportsAllDrives=true`, fetchImpl);
  if (meta.status !== 200) return { success: false, message: describeHttp(meta.status) };
  const m = meta.body as DriveMeta;
  if (!(await isWithinRoot(m, root.id, fetchImpl))) return { success: false, message: `That file is not inside "${root.name}", so it was not read.` };
  const entry = entryOf(m);
  let text: string | undefined, textTruncated = false, contentType: string | null = m.mimeType;
  const exportAs = GOOGLE_DOC_EXPORT[m.mimeType];
  if (exportAs) {
    const t = await driveText(`/files/${encodeURIComponent(m.id)}/export?mimeType=${encodeURIComponent(exportAs)}`, fetchImpl);
    if (t.status !== 200) return { success: false, message: describeHttp(t.status) };
    text = t.text ?? ""; contentType = exportAs;
  } else if (TEXT_TYPES.test(m.mimeType) && (!m.size || Number(m.size) <= MAX_TEXT_BYTES * 4)) {
    const t = await driveText(`/files/${encodeURIComponent(m.id)}?alt=media&supportsAllDrives=true`, fetchImpl);
    if (t.status !== 200) return { success: false, message: describeHttp(t.status) };
    text = t.text ?? "";
  }
  if (text !== undefined && text.length > MAX_TEXT_BYTES) { text = text.slice(0, MAX_TEXT_BYTES); textTruncated = true; }
  const data: DriveEvidence = { ...base, kind: "file", file: { ...entry, text, textTruncated, contentType } };
  return { success: true, message: text === undefined ? `Read metadata for "${m.name}" (binary content is not handed to a worker).` : `Read "${m.name}" (${m.modifiedTime ? `modified ${m.modifiedTime}` : "modified time unknown"}).`, data };
}

export function getGoogleDriveStatus(): ConnectorState {
  return getGoogleDriveConnectorState();
}

export function searchGoogleDrive(request: Omit<ConnectorActionRequest, "connector" | "operation">, fetchImpl?: typeof fetch): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "google_drive", operation: "search" }, getGoogleDriveConnectorState, r => driveAttempt(r, fetchImpl));
}

export function readGoogleDriveFile(request: Omit<ConnectorActionRequest, "connector" | "operation">, fetchImpl?: typeof fetch): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "google_drive", operation: "read" }, getGoogleDriveConnectorState, r => driveAttempt(r, fetchImpl));
}
