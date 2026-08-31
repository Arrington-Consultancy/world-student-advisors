import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { runQualityCheck } from "./operating/qualityCheck";

/**
 * The site has to pass its own content check.
 *
 * The Staff Portal offers staff a tool that rejects em dashes, guarantee
 * language and corporate filler, and the same gate governs anything a
 * worker releases. A site that fails the standard it publishes is not
 * making an argument anybody will believe, and the first place a reader
 * looks for the tell is the page telling them about the tell.
 *
 * So this runs the real gate, the one in operating/qualityCheck.ts, over
 * the copy that actually reaches a browser. Not a second list of rules
 * that could drift from it: the same function, so tightening the gate
 * tightens this automatically.
 *
 * Comments are stripped before checking. They are not the site, and
 * holding internal notes to a public writing standard would only teach
 * people to write the rule around rather than to it.
 */

const USER_FACING_CODES = [
  "em_dash",
  "double_hyphen",
  "corporate_ai_language",
  "artificial_warmth",
  "formulaic_contrast",
  "guarantee_language",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/** Block comments (JSX comments included) and line comments are not shipped prose. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    // Trailing line comments too, but never the // inside a URL.
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Server modules whose strings are rendered to a person: worker
 * descriptions on the AI team page, routing and permission reasons,
 * channel copy, and the emails that leave the building.
 */
const SERVER_COPY = [
  "server/workforce/registry.ts",
  "server/workforce/router.ts",
  "server/workforce/permissions.ts",
  "server/communications/channels.ts",
  "server/communications/access.ts",
  "server/social/socialBrain.ts",
  "server/access/accessControl.ts",
  "server/_core/notification.ts",
  "server/interviewCoach.ts",
  "server/interviewQuestionBank.ts",
];

function findingsFor(file: string) {
  const result = runQualityCheck({
    text: stripComments(readFileSync(file, "utf8")),
    permissionChecked: true,
    hasUnresolvedDisagreement: false,
    disagreementVisibleInText: false,
    workerBoundaryBreaches: [],
    evidenceInsufficient: false,
  });
  return result.findings.filter(f => USER_FACING_CODES.includes(f.code));
}

describe("the site passes its own content check", () => {
  const files = [...walk("client/src"), ...SERVER_COPY];

  it("checks a real number of files, so a broken walk cannot pass vacuously", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  for (const file of files) {
    it(`${file} is clean`, () => {
      const found = findingsFor(file);
      expect(found.map(f => `${f.code}: ${f.detail}`)).toEqual([]);
    });
  }
});
