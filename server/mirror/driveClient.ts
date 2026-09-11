/**
 * The few Google Drive v3 calls the reporting mirror needs, with a Bearer
 * token from the mirror grant. Under drive.file every call below can only
 * touch files this application created; that is the whole point of the
 * scope and it is not re-checked here because Google enforces it.
 */
export interface DriveFile { id: string; name: string; md5Checksum?: string; modifiedTime?: string; size?: string; mimeType?: string; parents?: string[] }

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

type FetchLike = typeof fetch;

export class DriveClient {
  constructor(private readonly accessToken: string, private readonly fetchImpl: FetchLike = fetch) {}

  private async call(url: string, init: RequestInit = {}): Promise<Response> {
    const r = await this.fetchImpl(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${this.accessToken}` } });
    if (!r.ok) {
      const text = (await r.text()).slice(0, 300);
      throw new Error(`Google Drive ${init.method ?? "GET"} ${new URL(url).pathname} failed: HTTP ${r.status} ${text}`);
    }
    return r;
  }

  /** Every file the credential can see. Under drive.file that is only what this application created. */
  async listAll(q?: string): Promise<DriveFile[]> {
    const out: DriveFile[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ fields: "nextPageToken,files(id,name,md5Checksum,modifiedTime,size,mimeType,parents)", pageSize: "100", spaces: "drive" });
      if (q) params.set("q", q);
      if (pageToken) params.set("pageToken", pageToken);
      const r = await this.call(`${API}/files?${params.toString()}`);
      const j = (await r.json()) as { files?: DriveFile[]; nextPageToken?: string };
      out.push(...(j.files ?? []));
      pageToken = j.nextPageToken;
    } while (pageToken);
    return out;
  }

  async findFolder(name: string): Promise<DriveFile | null> {
    const files = await this.listAll(`mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`);
    return files[0] ?? null;
  }

  async createFolder(name: string): Promise<DriveFile> {
    const r = await this.call(`${API}/files?fields=id,name`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }) });
    return (await r.json()) as DriveFile;
  }

  async createFolderIn(parentId: string, name: string): Promise<DriveFile> {
    const r = await this.call(`${API}/files?fields=id,name`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }) });
    return (await r.json()) as DriveFile;
  }

  /** Grant a reader permission on a file this application created. Used only for the mirror folder, never the backup. */
  async shareReader(fileId: string, emailAddress: string): Promise<void> {
    const existing = await this.call(`${API}/files/${fileId}/permissions?fields=permissions(id,emailAddress,role,type)`);
    const perms = ((await existing.json()) as { permissions?: Array<{ emailAddress?: string; role?: string }> }).permissions ?? [];
    if (perms.some(p => p.emailAddress?.toLowerCase() === emailAddress.toLowerCase() && p.role === "reader")) return;
    await this.call(`${API}/files/${fileId}/permissions?sendNotificationEmail=false&fields=id`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "reader", type: "user", emailAddress }) });
  }

  async findInFolder(folderId: string, name: string): Promise<DriveFile | null> {
    const files = await this.listAll(`'${folderId}' in parents and name='${name.replace(/'/g, "\\'")}' and trashed=false`);
    return files[0] ?? null;
  }

  /** Create or replace a file's content. Returns the stored file with Google's own md5 of what it holds. */
  async putFile(folderId: string, name: string, content: string, mimeType: string): Promise<DriveFile> {
    const existing = await this.findInFolder(folderId, name);
    const fields = "id,name,md5Checksum,modifiedTime,size";
    if (existing) {
      const r = await this.call(`${UPLOAD}/files/${existing.id}?uploadType=media&fields=${fields}`, { method: "PATCH", headers: { "Content-Type": mimeType }, body: content });
      return (await r.json()) as DriveFile;
    }
    const boundary = `wsa-mirror-${Date.now()}`;
    const meta = JSON.stringify({ name, parents: [folderId], mimeType });
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${content}\r\n--${boundary}--`;
    const r = await this.call(`${UPLOAD}/files?uploadType=multipart&fields=${fields}`, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body });
    return (await r.json()) as DriveFile;
  }

  async getMeta(fileId: string): Promise<DriveFile> {
    const r = await this.call(`${API}/files/${fileId}?fields=id,name,md5Checksum,modifiedTime,size,parents`);
    return (await r.json()) as DriveFile;
  }

  async download(fileId: string): Promise<string> {
    const r = await this.call(`${API}/files/${fileId}?alt=media`);
    return r.text();
  }
}
