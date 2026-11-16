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

/**
 * A page route that shares its name with a directory of static files.
 *
 * Found 7 October 2026 from Google Search Console ("Redirect error" on a
 * sitemap page) and Railway's request log: GET /partners answered 301 to
 * /partners/, and GET /partners/ answered 301 back to /partners, for every
 * visitor since client/public/partners/ (the partner logos) was added on
 * 25 September 2026. express.static's default `redirect: true` adds the
 * trailing slash for a directory; legacyRedirects strips it for a known
 * route. Together they looped, and the Partners page was unreachable.
 *
 * This runs the real middleware pipeline from server/_core/index.ts
 * against a temp build directory that reproduces the collision, with
 * redirect: "manual" so a 301 is seen rather than followed.
 */
describe("a page whose path is also a static directory", () => {
  let server: Server;
  let baseUrl: string;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wsa-static-dir-test-"));
    fs.writeFileSync(path.join(tmpDir, "index.html"), "<!doctype html><html><head><title>WSA</title></head><body>SPA shell</body></html>");
    // The collision as it exists in the real build: a directory named like
    // a page, holding real files.
    fs.mkdirSync(path.join(tmpDir, "partners"));
    fs.writeFileSync(path.join(tmpDir, "partners", "uclan-cyprus.jpg"), "not really a jpeg");

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

  it("GET /partners is the page, 200, not a redirect to /partners/", async () => {
    expect(VALID_CLIENT_ROUTES).toContain("/partners");
    const res = await fetch(`${baseUrl}/partners`, { redirect: "manual" });
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toContain("SPA shell");
  });

  it("GET /partners/ still 301s once to /partners, and that is the end of it", async () => {
    const res = await fetch(`${baseUrl}/partners/`, { redirect: "manual" });
    await res.text();
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/partners");
    // Following it lands on the page, not on another redirect.
    const followed = await fetch(`${baseUrl}/partners`, { redirect: "manual" });
    await followed.text();
    expect(followed.status).toBe(200);
  });

  it("the files inside the directory are still served", async () => {
    const res = await fetch(`${baseUrl}/partners/uclan-cyprus.jpg`);
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toBe("not really a jpeg");
  });

  it("no directory in client/public shares its name with a page route without this protection being needed", () => {
    // The guard that would have caught 25 September: list the collisions so
    // a future folder named like a page is a known, tested case rather than
    // a surprise. Today the only one is /partners.
    const publicDir = path.resolve(import.meta.dirname, "../../client/public");
    const dirs = fs.readdirSync(publicDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => `/${d.name}`);
    const collisions = dirs.filter(d => VALID_CLIENT_ROUTES.includes(d));
    expect(collisions).toEqual(["/partners"]);
  });
});
