/**
 * SharePoint connector for WSA workers, over Microsoft Graph.
 *
 * Four gates run before anything here executes, all in shared.ts: the
 * worker's controlled grant, the staff member's own access, the WSA site
 * boundary (SHAREPOINT_GRAPH_SITE_ID, an exact id), and the per-worker
 * location allowlist in sharePointLocations.ts. This module only ever sees
 * a request that has passed all four, and it still does the least it can:
 * resolve a path inside the WSA site, list or read it, and return metadata
 * and text. It never lists the site root, never follows a path outside the
 * one it was given, and never writes.
 *
 * WHICH CREDENTIAL. The SHAREPOINT_GRAPH_* variables, deliberately separate
 * names from the Mail.Send app's MICROSOFT_* variables. Mail credentials
 * are not file access and a test forbids treating them as such. If the
 * probe (scripts/probe-graph-site-access.mjs) shows the existing app can
 * already read the site, those names may be pointed at it by an explicit,
 * evidence-based decision; the code does not make that inference itself.
 *
 * "operational" here means the four variables are present. It is a claim
 * about configuration, not about consent: a Graph 403 is reported as what
 * it is, through the honest-failure path in shared.ts, and the audit row
 * says so.
 */
import { runConnectorAction, type ConnectorActionRequest, type ConnectorActionResult } from "./shared";
import type { ConnectorState } from "../types";

const GRAPH = "https://graph.microsoft.com/v1.0";
const TOKEN_URL = (tenant: string) => `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

type Cached = { token: string; expiresAt: number };
let cached: Cached | null = null;

function config() {
  return {
    clientId: process.env.SHAREPOINT_GRAPH_CLIENT_ID,
    clientSecret: process.env.SHAREPOINT_GRAPH_CLIENT_SECRET,
    tenantId: process.env.SHAREPOINT_GRAPH_TENANT_ID,
    siteId: process.env.SHAREPOINT_GRAPH_SITE_ID,
  };
}

function getSharePointConnectorState(): ConnectorState {
  const c = config();
  return c.clientId && c.clientSecret && c.tenantId && c.siteId ? "operational" : "unconfigured";
}

async function accessToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now + 30_000) return cached.token;
  const c = config();
  const response = await fetch(TOKEN_URL(c.tenantId!), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId!,
      client_secret: c.clientSecret!,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }).toString(),
  });
  if (!response.ok) {
    // Status only. The body can echo the client id and the secret is never
    // in it, but nothing from this response is worth logging beyond status.
    throw new Error(`Graph token request failed (HTTP ${response.status}).`);
  }
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return cached.token;
}

async function graphGet(path: string, accept: "json" | "text" = "json"): Promise<{ status: number; body: any }> {
  const token = await accessToken();
  const response = await fetch(`${GRAPH}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (accept === "text") {
    return { status: response.status, body: response.ok ? await response.text() : null };
  }
  let body: any = null;
  try { body = await response.json(); } catch { /* no body */ }
  return { status: response.status, body };
}

/** The path inside the site, with the site id prefix the scope gate required stripped off. */
function pathWithinSite(resourceScope: string, siteId: string): string {
  const stripped = resourceScope === siteId ? "" : resourceScope.startsWith(`${siteId}/`) ? resourceScope.slice(siteId.length + 1) : resourceScope;
  return stripped.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

export interface SharePointEntry {
  name: string;
  kind: "folder" | "file";
  path: string;
  lastModified: string | null;
  sizeBytes: number | null;
}

export interface SharePointRead {
  path: string;
  kind: "folder" | "file";
  entries?: SharePointEntry[];
  /** Text content, for text-like files small enough to hand to a worker. Never binary. */
  text?: string;
  textTruncated?: boolean;
  contentType?: string | null;
}

const MAX_TEXT_BYTES = 200_000;
const TEXT_TYPES = /^(text\/|application\/(json|xml|csv))/;

function describeHttp(status: number): string {
  if (status === 403) return "Graph refused (HTTP 403). The application is not consented to read this site.";
  if (status === 404) return "Not found in the WSA site (HTTP 404).";
  if (status === 401) return "Graph rejected the credential (HTTP 401).";
  return `Graph returned HTTP ${status}.`;
}

async function sharePointAttempt(request: ConnectorActionRequest): Promise<{ success: boolean; message: string; data?: unknown }> {
  const c = config();
  const rel = pathWithinSite(request.resourceScope, c.siteId!);
  // The site root is never read. The location gate already refuses it; this
  // is the connector refusing too, so a second gate cannot be argued around.
  if (rel === "") return { success: false, message: "The site root is not a readable location." };

  const item = await graphGet(`/sites/${c.siteId}/drive/root:/${rel}?$select=name,folder,file,lastModifiedDateTime,size`);
  if (item.status !== 200) return { success: false, message: describeHttp(item.status) };

  const decoded = decodeURIComponent(rel);
  if (item.body.folder) {
    const children = await graphGet(`/sites/${c.siteId}/drive/root:/${rel}:/children?$select=name,folder,file,lastModifiedDateTime,size&$top=200`);
    if (children.status !== 200) return { success: false, message: describeHttp(children.status) };
    const entries: SharePointEntry[] = (children.body.value ?? []).map((v: any) => ({
      name: v.name,
      kind: v.folder ? "folder" : "file",
      path: `${decoded}/${v.name}`,
      lastModified: v.lastModifiedDateTime ?? null,
      sizeBytes: typeof v.size === "number" ? v.size : null,
    }));
    const data: SharePointRead = { path: decoded, kind: "folder", entries };
    return { success: true, message: `Listed ${entries.length} entr${entries.length === 1 ? "y" : "ies"} in ${decoded}.`, data };
  }

  const contentType: string | null = item.body.file?.mimeType ?? null;
  const data: SharePointRead = { path: decoded, kind: "file", contentType };
  if (contentType && TEXT_TYPES.test(contentType) && (item.body.size ?? 0) <= MAX_TEXT_BYTES) {
    const content = await graphGet(`/sites/${c.siteId}/drive/root:/${rel}:/content`, "text");
    if (content.status === 200 && typeof content.body === "string") {
      data.text = content.body.slice(0, MAX_TEXT_BYTES);
      data.textTruncated = content.body.length > MAX_TEXT_BYTES;
    }
  }
  return { success: true, message: `Read ${decoded}${data.text !== undefined ? " with text content" : ", metadata only"}.`, data };
}

export function getSharePointStatus(): ConnectorState {
  return getSharePointConnectorState();
}

export function searchSharePoint(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "sharepoint", operation: "search" }, getSharePointConnectorState, sharePointAttempt);
}

export function readSharePointRecord(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "sharepoint", operation: "read" }, getSharePointConnectorState, sharePointAttempt);
}

/**
 * Kept for the interface. No worker holds a SharePoint write grant and this
 * connector implements none: the attempt refuses before any Graph call.
 */
export function writeSharePointHandoff(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction(
    { ...request, connector: "sharepoint", operation: "update" },
    getSharePointConnectorState,
    async () => ({ success: false, message: "SharePoint writes are not implemented. No worker holds a write grant." }),
  );
}
