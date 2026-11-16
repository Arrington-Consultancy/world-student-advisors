import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * The developer credit in the footer, approved by Tom Arrington on 11
 * October 2026: "Website by Arrington Consultancy", once, in the footer,
 * linking to https://www.arringtonconsultancy.com/ as a normal crawlable
 * link. The approval covers that one link and nothing wider, so these hold
 * the wording, the address, the rel and the count.
 */

const CREDIT_URL = "https://www.arringtonconsultancy.com/";
const footer = readFileSync("client/src/components/Footer.tsx", "utf8");
const footerCode = footer.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe("footer developer credit", () => {
  it("reads exactly as approved", () => {
    expect(footerCode).toMatch(/Website by\{" "\}\s*<a [^>]*>\s*Arrington Consultancy\s*<\/a>/);
  });

  it("links to the Arrington Consultancy home page, once", () => {
    expect(footerCode.split(`href="${CREDIT_URL}"`).length - 1).toBe(1);
  });

  it("is a followed link: no nofollow, sponsored or ugc", () => {
    const link = footerCode.match(new RegExp(`<a href="${CREDIT_URL}"[^>]*>`))![0];
    expect(link).not.toMatch(/nofollow|sponsored|ugc/);
    expect(link).toContain('rel="noopener"');
  });

  it("sits in the footer's own small type, not a style of its own", () => {
    const line = footerCode.slice(footerCode.lastIndexOf("<p", footerCode.indexOf("Website by")), footerCode.indexOf("Website by"));
    expect(line).toContain('className="mt-1 text-xs text-white/40"');
  });

  it("appears nowhere else on the site", () => {
    const files = walk("client/src").filter(f => /\.(ts|tsx)$/.test(f) && !f.endsWith("Footer.tsx"));
    const elsewhere = files.filter(f => /arringtonconsultancy\.com|Website by Arrington/i.test(readFileSync(f, "utf8")));
    expect(elsewhere).toEqual([]);
  });
});
