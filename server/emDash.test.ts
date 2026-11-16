import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

/**
 * No em dash reaches a person. Checked by scanning for the character
 * itself, not by asking whether a list of known strings is clean.
 *
 * This exists because the previous check produced a false pass. It ran
 * the quality gate over client/src plus a hand-written list of ten server
 * files, and reported that every em dash a person could read was gone.
 * It could not have known that. Server strings reach staff over tRPC
 * without ever appearing in the client bundle, so any server file absent
 * from that list was invisible: server/routers.ts, server/pipedrive.ts,
 * server/workforce/caseModel.ts and the connector modules were never
 * scanned, and several of them were carrying em dashes into case status
 * text, connector refusals, Pipedrive notes and a results email.
 *
 * An allowlist cannot establish absence. It can only confirm the things
 * on it, and it silently stops covering anything added afterwards. So
 * there is no list here. Every source file is walked, and a new file is
 * covered the moment it exists.
 *
 * There is also no exception for the em-dash detector in
 * operating/qualityCheck.ts. It matches by code point (—) rather
 * than by the literal character, so it needs no carve-out. That is
 * deliberate: an exception list is the thing a real occurrence hides in.
 */

const EM_DASH = "—";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/**
 * Comments are not shipped prose, so they are removed before the source
 * scan. Trailing comments are stripped too, but never the // inside a
 * URL. Anything left is a string, JSX text or an identifier.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function occurrences(text: string, file: string): string[] {
  const found: string[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(EM_DASH)) found.push(`${file}:${i + 1}: ${lines[i].trim().slice(0, 160)}`);
  }
  return found;
}

describe("no em dash in anything that can reach a person", () => {
  const sourceFiles = [...walk("client/src"), ...walk("server"), ...walk("shared")].filter(
    p => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p),
  );

  it("walks the whole tree, so a broken walk cannot pass vacuously", () => {
    // The previous check scanned ten server files. If this number ever
    // collapses, the scan has stopped covering the codebase.
    expect(sourceFiles.length).toBeGreaterThan(150);
    expect(sourceFiles.some(p => p.includes("routers.ts"))).toBe(true);
    expect(sourceFiles.some(p => p.includes("pipedrive.ts"))).toBe(true);
  });

  it("finds none in any source file, outside comments", () => {
    const found: string[] = [];
    for (const f of sourceFiles) {
      found.push(...occurrences(stripComments(readFileSync(f, "utf8")), f));
    }
    expect(found).toEqual([]);
  });

  it("finds none in the HTML shell, including its comments", () => {
    // Every byte of this file is served to every visitor.
    const html = readFileSync("client/index.html", "utf8");
    expect(occurrences(html, "client/index.html")).toEqual([]);
  });
});

/**
 * The built artefact, which is what production actually serves. Source
 * being clean is an argument; the bundle being clean is the evidence.
 *
 * Only the client assets and HTML are scanned in full, comments included,
 * because every byte of those is sent to a browser. The server bundle is
 * scanned with comments stripped, since its comments stay on the server
 * but its strings travel to staff over tRPC.
 */
describe("no em dash in the built output", () => {
  const built = existsSync("dist/public");

  it("scans the build when one exists", () => {
    if (!built) {
      // Not a silent skip: say so, so a green run is never mistaken for
      // a build having been checked.
      console.warn("[em-dash] dist/public absent, build-output scan not run. Run npm run build first.");
      expect(built).toBe(false);
      return;
    }

    const clientFiles = walk("dist/public").filter(p => /\.(js|mjs|css|html)$/.test(p));
    expect(clientFiles.length).toBeGreaterThan(0);

    const found: string[] = [];
    for (const f of clientFiles) {
      found.push(...occurrences(readFileSync(f, "utf8"), f));
    }
    if (existsSync("dist/index.js")) {
      found.push(...occurrences(stripComments(readFileSync("dist/index.js", "utf8")), "dist/index.js"));
    }
    expect(found).toEqual([]);
  });
});
