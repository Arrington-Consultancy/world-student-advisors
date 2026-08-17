import { describe, expect, it, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "http";
import type { AddressInfo } from "net";
import fs from "fs";
import os from "os";
import path from "path";
import { legacyRedirects } from "./legacyRedirects";
import { serveStatic } from "./vite";
import { VALID_CLIENT_ROUTES } from "../../shared/routes";
import { CANONICAL_PATHS } from "../../shared/seo";

// Real Express app, real HTTP server, real fetch() requests, `redirect:
// "manual"` so we can inspect the 301 itself instead of following it —
// exactly the pipeline server/_core/index.ts wires together in production.
describe("legacyRedirects — evidenced Squarespace-slug 301s ahead of the SPA fallback", () => {
  let server: Server;
  let baseUrl: string;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wsa-redirect-test-"));
    fs.writeFileSync(path.join(tmpDir, "index.html"), "<!doctype html><html><body>SPA shell</body></html>");

    const app = express();
    legacyRedirects(app);
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

  const cases: Array<[string, string]> = [
    ["/about-us", "/about"],
    ["/who-we-are", "/about"],
    ["/AboutUS", "/about"],
    ["/meet-our-counsellors", "/counsellors"],
  ];
  const canonicalCases = Object.entries(CANONICAL_PATHS);

  it.each(cases)("redirects %s to %s with a 301 and no chain", async (from, to) => {
    const res = await fetch(`${baseUrl}${from}`, { redirect: "manual" });
    await res.text();
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(to);
  });

  it.each(canonicalCases)("redirects duplicate/case alias %s to canonical %s with a 301", async (from, to) => {
    const res = await fetch(`${baseUrl}${from}`, { redirect: "manual" });
    await res.text();
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(to);
  });

  it("redirects a trailing slash on a known route to the canonical no-slash URL", async () => {
    const res = await fetch(`${baseUrl}/a-levels/`, { redirect: "manual" });
    await res.text();
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/a-levels");
  });

  it.each(cases)("%s's destination %s is itself a real, valid route (single hop lands on 200)", async (_from, to) => {
    expect(VALID_CLIENT_ROUTES).toContain(to);
    const res = await fetch(`${baseUrl}${to}`);
    await res.text();
    expect(res.status).toBe(200);
  });

  it("preserves a query string across the redirect", async () => {
    const res = await fetch(`${baseUrl}/about-us?utm_source=old-campaign`, { redirect: "manual" });
    await res.text();
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/about?utm_source=old-campaign");
  });

  it("returns a genuine 404, not a redirect, for /the-student-journey (no current equivalent)", async () => {
    const res = await fetch(`${baseUrl}/the-student-journey`, { redirect: "manual" });
    await res.text();
    expect(res.status).toBe(404);
  });

  it("returns a genuine 404, not a redirect, for /ghana---postgraduate-uk-scholarships (no current equivalent)", async () => {
    const res = await fetch(`${baseUrl}/ghana---postgraduate-uk-scholarships`, { redirect: "manual" });
    await res.text();
    expect(res.status).toBe(404);
  });

  it("still returns 404 for an unrelated unknown path", async () => {
    const res = await fetch(`${baseUrl}/this-path-does-not-exist-seo-check-xyz`, { redirect: "manual" });
    await res.text();
    expect(res.status).toBe(404);
  });

  it("every non-alias route still returns 200 with the redirect middleware installed ahead of it", async () => {
    const canonicalAliases = new Set(Object.keys(CANONICAL_PATHS));
    for (const route of VALID_CLIENT_ROUTES) {
      if (canonicalAliases.has(route)) continue;
      const res = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
      await res.text();
      expect(res.status, `expected 200 for ${route}, got ${res.status}`).toBe(200);
    }
  });
});
