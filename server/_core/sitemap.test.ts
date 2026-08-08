import { describe, expect, it, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "http";
import type { AddressInfo } from "net";
import fs from "fs";
import os from "os";
import path from "path";
import { legacyRedirects } from "./legacyRedirects";
import { serveStatic } from "./vite";

// Parses the real client/public/sitemap.xml (not the VALID_CLIENT_ROUTES
// constant) so this test fails if the sitemap itself ever lists a URL that
// doesn't actually resolve — independent evidence from routes-sync.test.ts.
describe("every URL listed in sitemap.xml resolves to a real 200", () => {
  let server: Server;
  let baseUrl: string;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wsa-sitemap-test-"));
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

  it("returns 200 for every <loc> path in client/public/sitemap.xml", async () => {
    const sitemapPath = path.resolve(import.meta.dirname, "../../client/public/sitemap.xml");
    const xml = fs.readFileSync(sitemapPath, "utf-8");
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname);

    expect(locs.length).toBeGreaterThan(0);

    for (const route of locs) {
      const res = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
      await res.text();
      expect(res.status, `expected 200 for ${route}, got ${res.status}`).toBe(200);
    }
  });
});
