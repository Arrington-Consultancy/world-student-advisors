/**
 * Production verification for the Student Support Library, after the
 * four-section rebuild of 29 September 2026 (Tim Hunt's structure of
 * 26 September, Tom Arrington's GO of 29 September).
 *
 * READ-ONLY. Fetches pages, PDFs and the sitemap from the live site and
 * renders two pages in a real browser at phone and desktop widths. Submits
 * nothing, signs in to nothing, creates nothing.
 *
 * WHAT IT PROVES, on the live site:
 *  1. The library page serves, prerendered, with Tim's four sections and
 *     exactly the 38 live resources, each once; the removed codes absent;
 *     WSA 039 under section 1.
 *  2. Every one of the 38 permanent resource pages returns 200 with its own
 *     title, canonical and index directive, and its code and summary links
 *     in the served HTML before any script runs.
 *  3. Every summary PDF serves and is a PDF; the removed WSA 033 summary is
 *     gone.
 *  4. The code-form aliases 301 to the slug form; a removed code and an
 *     unknown slug return 404.
 *  5. The sitemap lists all 38 resource pages and none of the removed ones.
 *  6. In a browser at 390 and 1280 px: the library page renders its four
 *     sections and 38 cards with no overflow; a search for "bank statement"
 *     finds WSA 025 and puts the query in the address bar; a resource page
 *     renders its heading, actions and section list, and pressing play opens
 *     the right recording in the privacy-enhanced player.
 *
 * Reads the resource list from shared/studentSupportLibrary.ts (path in
 * LIBRARY_SOURCE, default ./studentSupportLibrary.ts beside this script),
 * so the check is against the data that was deployed, not a second list.
 *
 * Usage: SITE=https://www.worldstudentadvisors.com OUT_DIR=./out node student-support-library-verify.mjs
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";

const SITE = process.env.SITE ?? "https://www.worldstudentadvisors.com";
const OUT = process.env.OUT_DIR ?? ".";
const SOURCE = process.env.LIBRARY_SOURCE ?? "./studentSupportLibrary.ts";
const LIBRARY = "/student-support-library";

const src = readFileSync(SOURCE, "utf8");
const resources = [...src.matchAll(
  /code: "(WSA \d{3})",\s*slug: "([^"]+)",\s*title: "([^"]+)",\s*description: "[^"]*",\s*youtubeUrl: "([^"]+)",\s*pdfFile: "([^"]+)",\s*section: "([^"]+)"/g,
)].map(m => ({ code: m[1], slug: m[2], title: m[3], url: m[4], pdf: m[5], section: m[6] }));
const sectionTitles = [...src.matchAll(/\{ id: "[^"]+", number: (\d), title: "([^"]+)" \}/g)].map(m => ({ number: Number(m[1]), title: m[2] }));
if (resources.length !== 38 || sectionTitles.length !== 4) {
  console.error(`Parsed ${resources.length} resources and ${sectionTitles.length} sections from ${SOURCE}; expected 38 and 4. Fix this script rather than trusting a clean run.`);
  process.exit(1);
}
const REMOVED = ["WSA 033", "WSA 040"];

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures += 1;
};
const decode = s => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');

/* 1. The library page, as served ------------------------------------------ */
console.log("\n=== 1. The library page, as served ===");
{
  const res = await fetch(`${SITE}${LIBRARY}`, { redirect: "manual" });
  check(res.status === 200, `${LIBRARY} returns 200`, `got ${res.status}`);
  const html = decode(await res.text());
  check(html.includes('data-prerendered="true"'), "the page is prerendered");
  check(html.includes('<meta name="robots" content="index, follow" />'), "it is indexable");
  for (const s of sectionTitles) check(html.includes(`${s.title}`), `section ${s.number} heading "${s.title}" is in the served HTML`);
  const codesInHtml = [...new Set([...html.matchAll(/WSA \d{3}/g)].map(m => m[0]))].sort();
  check(codesInHtml.length === 38, "exactly 38 distinct WSA codes on the page", `${codesInHtml.length}`);
  for (const code of REMOVED) check(!html.includes(code), `${code} is absent`);
  // Each code appears exactly once in the browse view: the card heading.
  const counts = Object.fromEntries(resources.map(r => [r.code, (html.match(new RegExp(`${r.code}<`, "g")) ?? []).length]));
  const dupes = Object.entries(counts).filter(([, n]) => n !== 1);
  check(dupes.length === 0, "every code appears once in the browse view", dupes.map(([c, n]) => `${c}x${n}`).join(" "));
  const s1 = html.indexOf(sectionTitles[0].title);
  const s2 = html.indexOf(sectionTitles[1].title, s1 + 1);
  const ten = html.indexOf("WSA 039<");
  check(s1 >= 0 && s2 > s1 && ten > s1 && ten < s2, "WSA 039 sits under section 1", `s1=${s1} 039=${ten} s2=${s2}`);
  for (const r of resources) check(html.includes(`href="${LIBRARY}/${r.slug}"`), `card links to ${LIBRARY}/${r.slug}`);
}

/* 2. Every permanent resource page ------------------------------------------ */
console.log("\n=== 2. The 38 permanent resource pages ===");
for (const r of resources) {
  const path = `${LIBRARY}/${r.slug}`;
  const res = await fetch(`${SITE}${path}`, { redirect: "manual" });
  const html = decode(await res.text());
  const ok =
    res.status === 200 &&
    html.includes(`<title>${r.title} | Student Support Library | World Student Advisors</title>`) &&
    html.includes(`<link rel="canonical" href="${SITE}${path}" />`) &&
    html.includes('<meta name="robots" content="index, follow" />') &&
    html.includes('data-prerendered="true"') &&
    html.includes(`${r.code}<`) &&
    html.includes(`href="/downloads/${r.pdf}"`) &&
    html.includes("Download Summary") &&
    html.includes(`href="${LIBRARY}"`);
  check(ok, `${r.code} ${path}`, ok ? "" : `status ${res.status}; title ${html.includes(`<title>${r.title}`)}; canonical ${html.includes(`href="${SITE}${path}"`)}; prerendered ${html.includes('data-prerendered="true"')}; pdf ${html.includes(`/downloads/${r.pdf}`)}`);
}

/* 3. Summaries --------------------------------------------------------------- */
console.log("\n=== 3. Summary PDFs ===");
for (const r of resources) {
  const res = await fetch(`${SITE}/downloads/${r.pdf}`);
  const body = Buffer.from(await res.arrayBuffer());
  check(res.status === 200 && body.subarray(0, 5).toString("latin1") === "%PDF-" && body.length > 1000, `${r.code} ${r.pdf}`, `status ${res.status}, ${body.length} bytes`);
}
{
  const res = await fetch(`${SITE}/downloads/wsa-033-summary.pdf`);
  await res.arrayBuffer();
  check(res.status === 404, "the removed WSA 033 summary is gone", `got ${res.status}`);
}

/* 4. Aliases and unknowns ---------------------------------------------------- */
console.log("\n=== 4. Code aliases and unknown paths ===");
for (const r of resources) {
  const alias = `${LIBRARY}/${r.code.toLowerCase().replace(" ", "-")}`;
  const res = await fetch(`${SITE}${alias}`, { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  check(res.status === 301 && location.endsWith(`${LIBRARY}/${r.slug}`), `${alias} 301s to the slug`, `${res.status} ${location}`);
}
for (const path of [`${LIBRARY}/wsa-033`, `${LIBRARY}/wsa-040`, `${LIBRARY}/uk-university-scholarships`, `${LIBRARY}/not-a-real-podcast`]) {
  const res = await fetch(`${SITE}${path}`, { redirect: "manual" });
  await res.text();
  check(res.status === 404, `${path} returns 404`, `got ${res.status}`);
}

/* 5. Sitemap ----------------------------------------------------------------- */
console.log("\n=== 5. Sitemap ===");
{
  const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
  check(sitemap.includes(`<loc>${SITE}${LIBRARY}</loc>`), "the library page is in the sitemap");
  const listed = resources.filter(r => sitemap.includes(`<loc>${SITE}${LIBRARY}/${r.slug}</loc>`)).length;
  check(listed === 38, "all 38 resource pages are in the sitemap", `${listed}`);
  check((sitemap.match(new RegExp(`${LIBRARY}/`, "g")) ?? []).length === 38, "and no other library sub-paths", String((sitemap.match(new RegExp(`${LIBRARY}/`, "g")) ?? []).length));
  check(!sitemap.includes("uk-university-scholarships") && !sitemap.includes("wsa-033"), "the removed resources are not in the sitemap");
}

/* 6. In a browser ------------------------------------------------------------- */
console.log("\n=== 6. In a browser ===");
const browser = await chromium.launch();
const sample = resources.find(r => r.slug === "cas-shield");
for (const [width, height] of [[390, 844], [1280, 900]]) {
  console.log(`  -- ${width}px --`);
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  await page.goto(`${SITE}${LIBRARY}`, { waitUntil: "networkidle" });
  const headings = await page.locator("h2").allInnerTexts();
  for (const s of sectionTitles) check(headings.some(h => h.includes(s.title)), `section heading "${s.title}" renders`);
  const cards = await page.locator("h3 a[href^='/student-support-library/']").count();
  check(cards === 38, "38 resource cards render", String(cards));
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), "no horizontal overflow on the library page");
  writeFileSync(`${OUT}/library-${width}.png`, await page.screenshot({ fullPage: false }));

  await page.fill("#library-search", "bank statement");
  await page.waitForTimeout(400);
  const resultCodes = await page.locator("h3 span.text-wsa-red").allInnerTexts();
  check(resultCodes.includes("WSA 025") && !resultCodes.includes("WSA 033"), 'searching "bank statement" finds WSA 025', resultCodes.join(","));
  check(page.url().includes("q=bank%20statement") || page.url().includes("q=bank+statement"), "the search is in the address bar", page.url());
  writeFileSync(`${OUT}/library-search-${width}.png`, await page.screenshot({ fullPage: false }));
  await page.fill("#library-search", "cyprus west");
  await page.waitForTimeout(400);
  const cwu = await page.locator("h3 span.text-wsa-red").allInnerTexts();
  check(cwu.join(",") === "WSA 017", 'searching "cyprus west" finds exactly WSA 017', cwu.join(","));

  // A shared search link opens with the results already showing.
  await page.goto(`${SITE}${LIBRARY}?q=CAS%20Shield`, { waitUntil: "networkidle" });
  const shared = await page.locator("h3 span.text-wsa-red").allInnerTexts();
  check(shared.includes("WSA 024"), "a shared search link opens on its results", shared.join(","));

  await page.goto(`${SITE}${LIBRARY}/${sample.slug}`, { waitUntil: "networkidle" });
  const h1 = (await page.locator("h1").first().innerText()).trim();
  check(h1 === sample.title, "the resource page leads with its title", h1);
  check((await page.locator(`a[href="/downloads/${sample.pdf}"]`).count()) === 2, "View Summary and Download Summary both point at the PDF");
  check((await page.locator("button:has-text('Copy link')").count()) === 1, "a Copy link button for staff");
  check((await page.locator(`a[href="${LIBRARY}"]`).count()) >= 1, "a route back into the library");
  const more = await page.locator("ul a[href^='/student-support-library/']").count();
  check(more === 8, "the other eight resources in its section are listed", String(more));
  check((await page.locator("iframe").count()) === 0, "no YouTube frame before play");
  await page.getByRole("button", { name: `Play: ${sample.title}` }).click();
  const frame = page.locator("iframe").first();
  await frame.waitFor({ state: "attached", timeout: 10000 });
  const srcAttr = (await frame.getAttribute("src")) ?? "";
  check(srcAttr.startsWith("https://www.youtube-nocookie.com/embed/ebDntBQEgsQ"), "play opens the CAS Shield recording in the no-cookie player", srcAttr);
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), "no horizontal overflow on the resource page");
  check(errors.length === 0, "no page errors", errors.join(" | ").slice(0, 200));
  writeFileSync(`${OUT}/resource-${width}.png`, await page.screenshot({ fullPage: true }));
  await context.close();
}
await browser.close();

console.log(`\nRESULT: ${failures === 0 ? "every check passed." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
