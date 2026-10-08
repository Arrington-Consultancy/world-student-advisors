import { describe, expect, it, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "http";
import type { AddressInfo } from "net";
import fs from "fs";
import os from "os";
import path from "path";
import { legacyRedirects } from "./legacyRedirects";
import { serveStatic } from "./vite";

/**
 * Google Search Console ownership verification by HTML file.
 *
 * Tom Arrington, 8 October 2026: Google's "HTML file" method for the
 * URL-prefix property https://www.worldstudentadvisors.com/. Google issues
 * a file whose name is its token and whose one-line content repeats the
 * name, and checks that the file is served at the site root, byte for
 * byte. The file lives in client/public, which the build copies to
 * dist/public, where express.static serves it by exact filename ahead of
 * the SPA fallback. This pins the file's name and content and proves the
 * real static pipeline serves it as Google will request it.
 */
const FILE = "google375a70cbd269f483.html";
const CONTENT = "google-site-verification: google375a70cbd269f483.html";
const PUBLIC_FILE = path.resolve(import.meta.dirname, "../../client/public", FILE);

describe("Google Search Console verification file", () => {
  let server: Server;
  let baseUrl: string;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wsa-gsc-test-"));
    fs.writeFileSync(path.join(tmpDir, "index.html"), "<!doctype html><html><head><title>WSA</title></head><body>SPA shell</body></html>");
    fs.copyFileSync(PUBLIC_FILE, path.join(tmpDir, FILE));

    const app = express();
    legacyRedirects(app);
    serveStatic(app, tmpDir);
    await new Promise<void>(resolve => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("is in client/public with exactly Google's content, no trailing newline", () => {
    expect(fs.existsSync(PUBLIC_FILE)).toBe(true);
    expect(fs.readFileSync(PUBLIC_FILE, "utf8")).toBe(CONTENT);
  });

  it("is served at the site root, 200, byte for byte, not the SPA shell", async () => {
    const res = await fetch(`${baseUrl}/${FILE}`, { redirect: "manual" });
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toBe(CONTENT);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("is not listed in the sitemap", () => {
    const sitemap = fs.readFileSync(path.resolve(import.meta.dirname, "../../client/public/sitemap.xml"), "utf8");
    expect(sitemap).not.toContain(FILE);
  });
});
