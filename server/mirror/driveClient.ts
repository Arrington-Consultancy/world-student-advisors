/**
 * The few Google Drive v3 calls the reporting mirror needs, with a Bearer
 * token from the mirror grant. Under drive.file every call below can only
 * touch files this application created; that is the whole point of the
 * scope and it is not re-checked here because Google enforces it.
 *
 * RETRIES. Drive answers a healthy request with a failure often enough
 * that a single attempt is not a fair test of the service. Two of its
 * answers cost the WSA mirror a run on 12 September 2026: a 403
 * "userRateLimitExceeded" partway through the backup's uploads, and a 500
 * "the operation was successful, but there was an error preparing the
 * response" on a folder create. Both are the ones Google tells callers to
 * retry with exponential backoff, so that is what happens here.
 *
 * The second of those is why creates are not simply re-sent. That message
 * means the write landed, so a blind retry of a create makes a second
 * folder or a second file. Every create below therefore looks again before
 * it tries again, and adopts whatever the failed attempt actually made.
 *
 * A 403 is also how Drive refuses a caller who may not do a thing at all.
 * Those are not retried: repeating them only delays the truth.
 */
export interface DriveFile { id: string; name: string; md5Checksum?: string; modifiedTime?: string; size?: string; mimeType?: string; parents?: string[] }

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

type FetchLike = typeof fetch;

/** The 403 reasons that mean "not so fast" rather than "you may not". */
export const RETRYABLE_403_REASONS: readonly string[] = ["ratelimitexceeded", "userratelimitexceeded", "userratelimitexceededsharedquota", "sharingratelimitexceeded", "backenderror", "internalerror"];

export function driveFailureIsTransient(status: number, body: string): boolean {
  if (status === 429 || status >= 500) return true;
  if (status !== 403) return false;
  const reasons = Array.from(body.matchAll(/"reason"\s*:\s*"([^"]+)"/g)).map(m => m[1].toLowerCase());
  return reasons.some(r => RETRYABLE_403_REASONS.includes(r));
}

interface DriveError extends Error { transient?: boolean }
const transient = (e: unknown): boolean => Boolean((e as DriveError)?.transient);

export interface DriveClientOptions {
  /** Total attempts per call, the first one included. */
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

/**
 * Seven attempts means six waits of 1, 2, 4, 8, 16 and 32 seconds, so a
 * call is given a full minute of retrying. Drive's per-user rate limit is
 * a sliding window of about that length, and giving up sooner turns a
 * pause into a failed backup.
 */
export const DEFAULT_MAX_ATTEMPTS = 7;

export function backoffMs(attempt: number, random: () => number = Math.random): number {
  // Google's own guidance: double each time, cap it, and add jitter so a
  // burst of uploads does not retry in lockstep.
  return Math.min(32_000, 1_000 * 2 ** attempt) + Math.floor(random() * 1_000);
}

export class DriveClient {
  private readonly maxAttempts: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  constructor(private readonly accessToken: string, private readonly fetchImpl: FetchLike = fetch, options: DriveClientOptions = {}) {
    this.maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    this.sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
    this.random = options.random ?? Math.random;
  }

  /** One attempt. Throws an error tagged with whether it is worth another. */
  private async attempt(url: string, init: RequestInit): Promise<Response> {
    const r = await this.fetchImpl(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${this.accessToken}` } });
    if (r.ok) return r;
    const text = await r.text();
    const error: DriveError = new Error(`Google Drive ${init.method ?? "GET"} ${new URL(url).pathname} failed: HTTP ${r.status} ${text.slice(0, 300)}`);
    error.transient = driveFailureIsTransient(r.status, text);
    throw error;
  }

  /**
   * Retry a whole operation, not just one request. `run` is re-entered from
   * the top, so an operation that looks before it writes looks again.
   */
  private async withRetries<T>(run: () => Promise<T>): Promise<T> {
    for (let i = 0; ; i += 1) {
      try {
        return await run();
      } catch (error) {
        if (i >= this.maxAttempts - 1 || !transient(error)) throw error;
        await this.sleep(backoffMs(i, this.random));
      }
    }
  }

  /** A request that can simply be sent again: reads, and content replacement. */
  private call(url: string, init: RequestInit = {}): Promise<Response> {
    return this.withRetries(() => this.attempt(url, init));
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
    return this.createFolderUnder(null, name);
  }

  async createFolderIn(parentId: string, name: string): Promise<DriveFile> {
    return this.createFolderUnder(parentId, name);
  }

  private createFolderUnder(parentId: string | null, name: string): Promise<DriveFile> {
    const look = () => (parentId ? this.findInFolder(parentId, name) : this.findFolder(name));
    let first = true;
    return this.withRetries(async () => {
      // From the second attempt on, the previous one may have made the
      // folder and only failed to say so. Adopt it rather than making another.
      if (!first) {
        const existing = await look();
        if (existing) return existing;
      }
      first = false;
      const body: Record<string, unknown> = { name, mimeType: "application/vnd.google-apps.folder" };
      if (parentId) body.parents = [parentId];
      const r = await this.attempt(`${API}/files?fields=id,name`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return (await r.json()) as DriveFile;
    });
  }

  /** Grant a reader permission on a file this application created. Used only for the mirror folder, never the backup. */
  async shareReader(fileId: string, emailAddress: string): Promise<void> {
    await this.withRetries(async () => {
      const existing = await this.attempt(`${API}/files/${fileId}/permissions?fields=permissions(id,emailAddress,role,type)`, {});
      const perms = ((await existing.json()) as { permissions?: Array<{ emailAddress?: string; role?: string }> }).permissions ?? [];
      if (perms.some(p => p.emailAddress?.toLowerCase() === emailAddress.toLowerCase() && p.role === "reader")) return;
      await this.attempt(`${API}/files/${fileId}/permissions?sendNotificationEmail=false&fields=id`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "reader", type: "user", emailAddress }) });
    });
  }

  async findInFolder(folderId: string, name: string): Promise<DriveFile | null> {
    const files = await this.listAll(`'${folderId}' in parents and name='${name.replace(/'/g, "\\'")}' and trashed=false`);
    return files[0] ?? null;
  }

  /** Create or replace a file's content. Returns the stored file with Google's own md5 of what it holds. */
  async putFile(folderId: string, name: string, content: string, mimeType: string): Promise<DriveFile> {
    const fields = "id,name,md5Checksum,modifiedTime,size";
    // The whole operation retries, so each attempt looks the file up again
    // and a create that landed without answering becomes a replace.
    return this.withRetries(async () => {
      const existing = await this.findInFolder(folderId, name);
      if (existing) {
        const r = await this.attempt(`${UPLOAD}/files/${existing.id}?uploadType=media&fields=${fields}`, { method: "PATCH", headers: { "Content-Type": mimeType }, body: content });
        return (await r.json()) as DriveFile;
      }
      const boundary = `wsa-mirror-${Date.now()}`;
      const meta = JSON.stringify({ name, parents: [folderId], mimeType });
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${content}\r\n--${boundary}--`;
      const r = await this.attempt(`${UPLOAD}/files?uploadType=multipart&fields=${fields}`, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body });
      return (await r.json()) as DriveFile;
    });
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
