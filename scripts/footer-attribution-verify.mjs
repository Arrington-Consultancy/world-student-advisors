/**
 * Read-only verification of the footer's developer credit on the live site
 * (Tom Arrington, 11 October 2026: "Website by Arrington Consultancy",
 * once, in the footer, a normal crawlable link to
 * https://www.arringtonconsultancy.com/).
 *
 * At phone and desktop widths, on four representative pages: the credit is
 * in the footer exactly once with the approved words, its link goes to the
 * Arrington home page with no nofollow, sponsored or ugc, the footer's own
 * links are all still there, nothing overflows sideways, and the credit
 * line sits beneath the copyright line. A screenshot of each footer is kept.
 *
 * Read-only: opens pages and reads them, choosing "Essential only" on the
 * cookie banner so it does not cover the footer. Follows no link, submits
 * no form, uses no secrets.
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const ORIGIN = process.env.ORIGIN ?? "https://www.worldstudentadvisors.com";
const OUT_DIR = process.env.OUT_DIR ?? ".";
const CREDIT_URL = "https://www.arringtonconsultancy.com/";
const PAGES = ["/", "/about", "/contact", "/partners"];
const WIDTHS = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };
/** The footer's own links before the credit, which must all survive it. */
const FOOTER_LINKS = ["/about", "/study-options", "/our-team", "/partners", "/privacy-policy", "/compliance", "/staff-portal"];

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function main() {
  const browser = await chromium.launch();
  for (const [label, viewport] of Object.entries(WIDTHS)) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    for (const path of PAGES) {
      const at = `${label} ${path}`;
      const res = await page.goto(`${ORIGIN}${path}`, { waitUntil: "networkidle" });
      check(`${at}: page loads`, res?.status() === 200, `HTTP ${res?.status()}`);
      // The cookie banner is fixed over the foot of the page. "Essential
      // only" clears it without consenting to analytics.
      const essential = page.getByRole("button", { name: "Essential only" });
      if (await essential.isVisible().catch(() => false)) await essential.click();
      const footer = page.locator("footer");
      // On a phone the footer is taller than the screen: bring the credit
      // itself into view, or the covered check would be looking off-screen.
      await page.locator(`footer a[href="${CREDIT_URL}"]`).first().scrollIntoViewIfNeeded().catch(() => {});

      const facts = await page.evaluate(url => {
        const all = [...document.querySelectorAll(`a[href="${url}"]`)];
        const inFooter = all.filter(a => a.closest("footer"));
        const a = inFooter[0];
        const line = a?.closest("p");
        const copyright = [...document.querySelectorAll("footer p")].find(p => p.textContent.includes("All rights reserved"));
        const r = a?.getBoundingClientRect();
        return {
          total: all.length,
          inFooter: inFooter.length,
          text: a?.textContent.trim(),
          lineText: line?.textContent.replace(/\s+/g, " ").trim(),
          rel: a?.getAttribute("rel") ?? "",
          target: a?.getAttribute("target") ?? "",
          // Visible and on top: the point at its centre is the link itself,
          // not a banner or overlay sitting over it.
          visible: !!r && r.width > 0 && r.height > 0 && getComputedStyle(a).visibility !== "hidden" &&
            document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("a") === a,
          belowCopyright: !!(copyright && line) && line.getBoundingClientRect().top >= copyright.getBoundingClientRect().bottom - 1,
          sameSize: !!(copyright && line) && getComputedStyle(line).fontSize === getComputedStyle(copyright).fontSize,
          footerHrefs: [...document.querySelectorAll("footer a")].map(x => x.getAttribute("href")),
          creditMentions: (document.body.innerText.match(/Website by Arrington Consultancy/g) ?? []).length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      }, CREDIT_URL);

      check(`${at}: one credit link on the page, in the footer`, facts.total === 1 && facts.inFooter === 1, `${facts.total} on page, ${facts.inFooter} in footer`);
      check(`${at}: reads "Website by Arrington Consultancy"`, facts.lineText === "Website by Arrington Consultancy" && facts.text === "Arrington Consultancy" && facts.creditMentions === 1, JSON.stringify(facts.lineText));
      check(`${at}: followed link, no nofollow, sponsored or ugc`, !/nofollow|sponsored|ugc/.test(facts.rel), `rel="${facts.rel}" target="${facts.target}"`);
      check(`${at}: credit is visible and not covered`, facts.visible);
      check(`${at}: beneath the copyright line, same type size`, facts.belowCopyright && facts.sameSize);
      const missing = FOOTER_LINKS.filter(h => !facts.footerHrefs.includes(h));
      check(`${at}: footer links all still present`, missing.length === 0, missing.join(", ") || `${facts.footerHrefs.length} links`);
      check(`${at}: no horizontal overflow`, facts.scrollWidth <= facts.clientWidth + 1, `${facts.scrollWidth} vs ${facts.clientWidth}`);

      const name = `footer-${label}-${path === "/" ? "home" : path.slice(1)}.png`;
      await footer.screenshot({ path: `${OUT_DIR}/${name}` });
    }
    await context.close();
  }
  await browser.close();

  writeFileSync(`${OUT_DIR}/footer-attribution-verify.json`, JSON.stringify(results, null, 2));
  const failed = results.filter(r => !r.pass).length;
  console.log(failed === 0 ? `\nEvery check passed (${results.length}).` : `\n${failed} of ${results.length} checks failed.`);
  if (failed) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
