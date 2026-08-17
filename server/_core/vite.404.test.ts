import { describe, expect, it, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "http";
import type { AddressInfo } from "net";
import fs from "fs";
import os from "os";
import path from "path";
import { serveStatic } from "./vite";
import { VALID_CLIENT_ROUTES } from "../../shared/routes";
import { CANONICAL_PATHS } from "../../shared/seo";

// Real Express app, real HTTP server, real fetch() requests — this is the
// exact code path Railway serves in production. A fake index.html in a
// temp dir stands in for the real build output so this never touches (or
// depends on) an actual `pnpm run build`.
describe("serveStatic — real HTTP status codes for known vs unknown routes", () => {
  let server: Server;
  let baseUrl: string;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wsa-static-test-"));
    fs.writeFileSync(
      path.join(tmpDir, "index.html"),
      `<!doctype html><html><head>
        <title>World Student Advisors</title>
        <meta name="description" content="Default description" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.worldstudentadvisors.com/" />
        <meta property="og:title" content="World Student Advisors" />
        <meta property="og:description" content="Default description" />
        <meta name="twitter:title" content="World Student Advisors" />
        <meta name="twitter:description" content="Default description" />
      </head><body>SPA shell</body></html>`
    );

    const app = express();
    serveStatic(app, tmpDir);

    await new Promise<void>(resolve => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns 200 for every valid client route, including the homepage", async () => {
    const canonicalAliases = new Set(Object.keys(CANONICAL_PATHS));
    for (const route of VALID_CLIENT_ROUTES) {
      if (canonicalAliases.has(route)) continue;
      const res = await fetch(`${baseUrl}${route}`);
      await res.text(); // drain the body — an unread keep-alive response can desync the next request
      expect(res.status, `expected 200 for ${route}, got ${res.status}`).toBe(200);
    }
  });

  it("injects route-specific metadata, canonical URL and robots directives into the HTML shell", async () => {
    const masters = await fetch(`${baseUrl}/masters-doctoral-degrees`);
    const mastersHtml = await masters.text();
    expect(mastersHtml).toContain("<title>Master's &amp; Doctoral Degrees | World Student Advisors</title>");
    expect(mastersHtml).toContain('<link rel="canonical" href="https://www.worldstudentadvisors.com/masters-doctoral-degrees" />');
    expect(mastersHtml).toContain('<meta name="robots" content="index, follow" />');

    const portal = await fetch(`${baseUrl}/portal/login`);
    const portalHtml = await portal.text();
    expect(portalHtml).toContain('<meta name="robots" content="noindex, nofollow" />');
  });

  it("returns 404 for a fake/unknown path", async () => {
    const res = await fetch(`${baseUrl}/this-path-does-not-exist-seo-check-xyz`);
    await res.text();
    expect(res.status).toBe(404);
  });

  it("still serves the SPA shell body on a 404, so the client-side NotFound UI can render", async () => {
    const res = await fetch(`${baseUrl}/this-path-does-not-exist-seo-check-xyz`);
    const body = await res.text();
    expect(body).toContain("SPA shell");
  });

  it("returns 404 for an old-style legacy path with no known equivalent (no redirect exists yet)", async () => {
    const res = await fetch(`${baseUrl}/some-old-squarespace-blog-post-slug`);
    await res.text();
    expect(res.status).toBe(404);
  });

  it("ignores query strings when matching a valid route", async () => {
    const res = await fetch(`${baseUrl}/contact?utm_source=test`);
    await res.text();
    expect(res.status).toBe(200);
  });
});
