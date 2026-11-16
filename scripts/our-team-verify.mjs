/**
 * Read-only verification of the published OUR TEAM page on the live site.
 *
 * Checks the things the approved implementation direction of 14 September
 * 2026 asked to be confirmed after deployment: the page serves, /counsellors
 * still works through a single redirect, the six people render in the
 * approved order with no country headings, each profile opens, the British
 * Council badge appears only for certificate holders and opens a certificate
 * only where consent is evidenced, every team photograph actually loads and
 * decodes in the browser, and the page fits a phone.
 *
 * Read-only: it opens pages, opens profile dialogs and requests two PDFs by
 * HEAD. It submits no form and creates no lead. Uses no secrets.
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const ORIGIN = process.env.ORIGIN ?? "https://www.worldstudentadvisors.com";
const OUT_DIR = process.env.OUT_DIR ?? ".";
const EXPECTED_ORDER = [
  "Tim Hunt",
  "Tom Arrington",
  "Eldah Therone",
  "Glenice Owino",
  "Manet Khamayo",
  "Claudia Ingado",
];
/** WSA holds a current certificate for these four. */
const BADGE_HOLDERS = ["Tim Hunt", "Eldah Therone", "Glenice Owino", "Manet Khamayo"];
/** Public use of the certificate is evidenced only for these two. */
const PUBLISHED_CERTIFICATES = {
  "Tim Hunt": "/team/certificates/tim-hunt-british-council.pdf",
  "Eldah Therone": "/team/certificates/eldah-therone-british-council.pdf",
};

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const CARD_NAME = 'section.bg-wsa-cream button.text-left.text-base';
const DIALOG = '[data-slot="dialog-content"]';

async function main() {
  // 1. The route, the redirect and the certificate files, without a browser.
  const team = await fetch(`${ORIGIN}/our-team`, { redirect: "manual" });
  check("GET /our-team returns 200", team.status === 200, `HTTP ${team.status}`);
  const html = await team.text();
  check("the served HTML is indexable", !/noindex/i.test(html));

  const old = await fetch(`${ORIGIN}/counsellors`, { redirect: "manual" });
  const location = old.headers.get("location") ?? "";
  check(
    "/counsellors 301s to /our-team in one hop",
    old.status === 301 && location.replace(ORIGIN, "") === "/our-team",
    `HTTP ${old.status} -> ${location || "(none)"}`,
  );

  const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
  // Matched on the path so the same script works against a local build.
  check("sitemap lists /our-team", /<loc>[^<]*\/our-team<\/loc>/.test(sitemap));
  check("sitemap no longer lists /counsellors", !/<loc>[^<]*\/counsellors<\/loc>/.test(sitemap));

  for (const [person, path] of Object.entries(PUBLISHED_CERTIFICATES)) {
    const response = await fetch(`${ORIGIN}${path}`, { method: "HEAD" });
    check(`${person}'s certificate is served`, response.status === 200, `HTTP ${response.status}`);
  }
  for (const path of ["/team/certificates/glenice-owino-british-council.pdf", "/team/certificates/manet-khamayo-british-council.pdf"]) {
    const response = await fetch(`${ORIGIN}${path}`, { method: "HEAD" });
    check(`unconsented certificate is NOT published (${path.split("/").pop()})`, response.status === 404, `HTTP ${response.status}`);
  }

  // 2. The rendered page, at both widths.
  const browser = await chromium.launch();
  for (const [label, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    // Fail fast and visibly rather than sitting on Playwright's 30s default
    // for every locator: a stalled check should be obvious in the log.
    page.setDefaultTimeout(20_000);
    await page.goto(`${ORIGIN}/our-team`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 60_000 });

    // The cookie banner is fixed to the bottom of the viewport and covers the
    // lower cards, so a click on one would wait out its timeout. Accepting
    // only essential cookies dismisses it without enabling analytics.
    const essentialOnly = page.getByRole("button", { name: /essential only/i });
    if (await essentialOnly.count()) {
      await essentialOnly.first().click();
      await essentialOnly.first().waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
    }

    const heading = (await page.locator("h1").first().innerText()).trim();
    check(`${label}: heading is "The people behind WSA"`, heading === "The people behind WSA", heading);

    const order = (await page.locator(CARD_NAME).allInnerTexts()).map(t => t.trim());
    check(`${label}: the six people render in the approved order`, JSON.stringify(order) === JSON.stringify(EXPECTED_ORDER), order.join(" | "));

    const headings = (await page.locator("h2, h3").allInnerTexts()).map(t => t.trim());
    const countryHeading = headings.find(h => ["United Kingdom", "Kenya", "Nigeria", "Ghana", "Angola", "Malawi"].includes(h));
    check(`${label}: no country section headings`, countryHeading === undefined, countryHeading ?? "");

    const journey = (await page.locator("ol li h3").allInnerTexts()).map(t => t.trim());
    check(
      `${label}: How we support you runs enquiry to enrolment`,
      JSON.stringify(journey) === JSON.stringify(["Enquiry", "Claudia", "Named Student Counsellor", "Application", "Visa Preparation", "Enrolment"]),
      journey.join(" -> "),
    );

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    check(`${label}: no horizontal overflow`, overflow.scrollWidth <= overflow.clientWidth + 1, `${overflow.scrollWidth} vs ${overflow.clientWidth}`);

    // Every team photograph must actually load and decode in the browser.
    // A src that 404s, or a file that is truncated or not really an image,
    // still appears in the HTML and still matches a selector: what it does
    // not do is produce a non-zero naturalWidth or resolve decode(). So the
    // assertion is made on the decoded bitmap, never on the markup.
    //
    // The cards reveal on scroll, so the page is walked to the bottom first
    // to force any deferred load before anything is measured.
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 1200));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(300);

    for (const person of EXPECTED_ORDER) {
      const photo = page.locator(`img[alt="${person}"]`).first();
      const present = (await photo.count()) > 0;
      check(`${label}: ${person}'s photograph is present`, present, present ? "" : "no img with that alt text");
      if (!present) continue;

      const state = await photo.evaluate(async element => {
        const result = {
          src: element.currentSrc || element.src || "(no src)",
          naturalWidth: element.naturalWidth,
          naturalHeight: element.naturalHeight,
          complete: element.complete,
          decoded: false,
          error: null,
        };
        try {
          await element.decode();
          result.decoded = true;
        } catch (error) {
          result.error = String(error);
        }
        // Re-read after decode: a lazily-decoded image reports its intrinsic
        // size only once the decode has actually happened.
        result.naturalWidth = element.naturalWidth;
        result.naturalHeight = element.naturalHeight;
        return result;
      });

      const file = state.src.split("/").pop();
      check(
        `${label}: ${person}'s photograph loads and decodes`,
        state.decoded && state.complete && state.naturalWidth > 0 && state.naturalHeight > 0,
        `${file} ${state.naturalWidth}x${state.naturalHeight}${state.error ? ` — ${state.error}` : ""}`,
      );

      // 3:4 is the shape the card frame expects. A source of another shape is
      // not broken, but it is cropped by object-cover rather than fitted, so
      // it is worth failing on: that is how a wrong crop reaches the page.
      const ratio = state.naturalHeight > 0 ? state.naturalWidth / state.naturalHeight : 0;
      check(
        `${label}: ${person}'s photograph is 3:4`,
        Math.abs(ratio - 0.75) < 0.01,
        `${state.naturalWidth}x${state.naturalHeight} (ratio ${ratio.toFixed(3)})`,
      );
    }

    // Every profile opens, and the credential behaviour is per person.
    for (const person of EXPECTED_ORDER) {
      console.log(`      opening ${person}'s profile at ${label}...`);
      await page.locator(CARD_NAME, { hasText: person }).scrollIntoViewIfNeeded();
      await page.locator(CARD_NAME, { hasText: person }).click();
      await page.locator(DIALOG).waitFor({ state: "visible" });
      const dialog = page.locator(DIALOG);
      const text = await dialog.innerText();
      const hasBadge = /British Council UK knowledge-trained/.test(text);
      // Checked with count() first: asking a locator that matches nothing for
      // an attribute waits out the full timeout, which costs half an hour
      // across the people who correctly have no certificate link.
      const certLink = dialog.locator('a:has-text("View certificate")');
      const certHref = (await certLink.count()) > 0 ? await certLink.getAttribute("href") : null;
      check(`${label}: ${person}'s profile opens with their biography`, text.includes(person) && text.length > 400, `${text.length} chars`);
      check(`${label}: ${person} badge ${BADGE_HOLDERS.includes(person) ? "shown" : "absent"}`, hasBadge === BADGE_HOLDERS.includes(person));
      const expectedCert = PUBLISHED_CERTIFICATES[person] ?? null;
      check(`${label}: ${person} certificate link ${expectedCert ? "present" : "absent"}`, (certHref ?? null) === expectedCert, certHref ?? "(none)");
      await page.keyboard.press("Escape");
      await page.locator(DIALOG).waitFor({ state: "hidden" });
      await page.waitForTimeout(150);
    }

    await page.screenshot({ path: `${OUT_DIR}/our-team-${label}.png`, fullPage: true });
    await context.close();
  }
  await browser.close();

  const failed = results.filter(r => !r.pass);
  writeFileSync(`${OUT_DIR}/our-team-verify.json`, JSON.stringify(results, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.error(`FAILED: ${failed.map(f => f.name).join("; ")}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
