/**
 * An in-memory stand-in for the handful of Google Drive v3 calls the mirror
 * uses. Test helper only. Records every request so a test can prove what
 * was sent, and can be told to fail a named upload.
 *
 * Two kinds of failure, because the client treats them differently:
 * failUploadsNamed is Drive refusing outright (403, a permission reason),
 * which must not be retried; transientFailures is Drive asking the caller
 * to wait (403 userRateLimitExceeded), which must be. succeedThenFail
 * models the 500 that means the write landed anyway, so a retry that
 * created a second copy would show up as a duplicate here.
 */
import { createHash } from "crypto";

export interface FakeFile { id: string; name: string; mimeType: string; parents: string[]; content: string }

export class FakeDrive {
  files = new Map<string, FakeFile>();
  /** fileId -> reader emails granted. */
  permissions = new Map<string, string[]>();
  requests: Array<{ method: string; url: string; auth: string | null }> = [];
  failUploadsNamed = new Set<string>();
  /** name -> how many further attempts fail with a retryable rate limit. */
  transientFailures = new Map<string, number>();
  /** name -> how many further attempts store the object and then answer 500. */
  succeedThenFail = new Map<string, number>();
  private seq = 0;

  /** Decrements a counter and says whether this attempt should misbehave. */
  private takes(map: Map<string, number>, name: string): boolean {
    const left = map.get(name) ?? 0;
    if (left <= 0) return false;
    map.set(name, left - 1);
    return true;
  }

  private md5(s: string) { return createHash("md5").update(s, "utf8").digest("hex"); }
  private meta(f: FakeFile) { return { id: f.id, name: f.name, mimeType: f.mimeType, parents: f.parents, md5Checksum: f.mimeType.includes("folder") ? undefined : this.md5(f.content), size: String(f.content.length), modifiedTime: new Date().toISOString() }; }

  /** Overwrite a file's content behind the mirror's back, as a failed sync might leave it. */
  corrupt(name: string, content: string) { for (const f of Array.from(this.files.values())) if (f.name === name) f.content = content; }

  fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input));
    const method = (init.method ?? "GET").toUpperCase();
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization ?? null;
    this.requests.push({ method, url: url.toString(), auth });
    if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

    if (url.pathname === "/drive/v3/files" && method === "GET") {
      const q = url.searchParams.get("q") ?? "";
      let list = Array.from(this.files.values());
      const name = /name='([^']+)'/.exec(q)?.[1];
      const parent = /'([^']+)' in parents/.exec(q)?.[1];
      if (/mimeType='application\/vnd.google-apps.folder'/.test(q)) list = list.filter(f => f.mimeType === "application/vnd.google-apps.folder");
      if (name) list = list.filter(f => f.name === name);
      if (parent) list = list.filter(f => f.parents.includes(parent));
      return json({ files: list.map(f => this.meta(f)) });
    }
    const perm = /^\/drive\/v3\/files\/([^/]+)\/permissions$/.exec(url.pathname);
    if (perm && method === "GET") return json({ permissions: (this.permissions.get(perm[1]) ?? []).map(e => ({ id: e, emailAddress: e, role: "reader", type: "user" })) });
    if (perm && method === "POST") {
      const body = JSON.parse(String(init.body)) as { emailAddress: string; role: string };
      if (body.role !== "reader") return json({ error: "only reader expected in tests" }, 400);
      this.permissions.set(perm[1], [...(this.permissions.get(perm[1]) ?? []), body.emailAddress]);
      return json({ id: body.emailAddress });
    }
    if (url.pathname === "/drive/v3/files" && method === "POST") {
      const body = JSON.parse(String(init.body)) as { name: string; mimeType: string; parents?: string[] };
      if (this.takes(this.transientFailures, body.name)) return json({ error: { code: 403, errors: [{ reason: "userRateLimitExceeded" }] } }, 403);
      const f: FakeFile = { id: `folder-${++this.seq}`, name: body.name, mimeType: body.mimeType, parents: body.parents ?? [], content: "" };
      this.files.set(f.id, f);
      if (this.takes(this.succeedThenFail, body.name)) return json({ error: { code: 500, errors: [{ reason: "responsePreparationError" }] } }, 500);
      return json(this.meta(f));
    }
    if (url.pathname === "/upload/drive/v3/files" && method === "POST") {
      const raw = String(init.body);
      const parts = raw.split(/--wsa-mirror-\d+/).filter(p => p.trim() && !p.startsWith("--"));
      const metaJson = parts[0].split("\r\n\r\n")[1].trim();
      const meta = JSON.parse(metaJson) as { name: string; parents: string[]; mimeType: string };
      const content = parts[1].split("\r\n\r\n")[1].replace(/\r\n$/, "");
      if (this.failUploadsNamed.has(meta.name)) return json({ error: { code: 403, errors: [{ reason: "insufficientFilePermissions" }] } }, 403);
      if (this.takes(this.transientFailures, meta.name)) return json({ error: { code: 403, errors: [{ reason: "userRateLimitExceeded" }] } }, 403);
      const f: FakeFile = { id: `file-${++this.seq}`, name: meta.name, mimeType: meta.mimeType, parents: meta.parents, content };
      this.files.set(f.id, f);
      // The write lands and the response does not, exactly as Drive's
      // "operation was successful, but there was an error preparing the
      // response" does.
      if (this.takes(this.succeedThenFail, meta.name)) return json({ error: { code: 500, errors: [{ reason: "responsePreparationError" }] } }, 500);
      return json(this.meta(f));
    }
    const upload = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    if (upload && method === "PATCH") {
      const f = this.files.get(upload[1]);
      if (!f) return json({ error: "not found" }, 404);
      if (this.failUploadsNamed.has(f.name)) return json({ error: { code: 403, errors: [{ reason: "insufficientFilePermissions" }] } }, 403);
      if (this.takes(this.transientFailures, f.name)) return json({ error: { code: 403, errors: [{ reason: "userRateLimitExceeded" }] } }, 403);
      f.content = String(init.body);
      return json(this.meta(f));
    }
    const one = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    if (one && method === "GET") {
      const f = this.files.get(one[1]);
      if (!f) return json({ error: "not found" }, 404);
      if (url.searchParams.get("alt") === "media") return new Response(f.content, { status: 200 });
      return json(this.meta(f));
    }
    return json({ error: `unhandled ${method} ${url.pathname}` }, 404);
  };
}
