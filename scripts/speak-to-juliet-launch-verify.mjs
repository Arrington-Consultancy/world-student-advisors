/**
 * Speak to Juliet: read-only verification of the published page.
 *
 * Run against the live site after a deploy, from GitHub Actions, because the
 * production domain is not reachable from the build environment. It NEVER
 * submits the signup form, so it creates no lead, no portal account and no
 * notification to anybody.
 *
 * What it proves, in the order Tom Arrington asked for it on 19 September
 * 2026: the page loads, the short link redirects, WhatsApp opens Juliet with
 * the message already written, the fallback form carries the campaign marker
 * to the signup form, Glenice's photograph renders, neither width overflows
 * or logs an error, and the four pages that must not have moved are still
 * where they were.
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const SITE = process.env.SITE ?? "https://www.worldstudentadvisors.com";
const OUT = process.env.OUT_DIR ?? ".";
const EXPECTED_WHATSAPP = "2348035837934";
const EXPECTED_MESSAGE = "Hello Juliet, I saw the WSA page and I would like to ask about studying abroad.";

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();

/* 1. Routes ------------------------------------------------------------- */
console.log("\n=== 1. Routes ===");
for (const [path, expected] of [
  ["/speak-to-juliet", 200],
  ["/contact", 200],
  ["/nigeria-postgraduate", 200],
  ["/our-team", 200],
  ["/", 200],
]) {
  const res = await fetch(`${SITE}${path}`, { redirect: "manual" });
  check(res.status === expected, `${path} returns ${expected}`, `got ${res.status}`);
}

for (const alias of ["/LPJuliet", "/lpjuliet"]) {
  const res = await fetch(`${SITE}${alias}`, { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  check(res.status === 301, `${alias} is a permanent redirect`, `got ${res.status}`);
  check(location.endsWith("/speak-to-juliet"), `${alias} points at the canonical page`, location);
}

/* 2. The page, at both widths ------------------------------------------ */
for (const [label, width, height] of [["mobile", 390, 844], ["desktop", 1280, 900]]) {
  console.log(`\n=== 2. The page at ${width}px (${label}) ===`);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  const consoleErrors = [];
  page.on("pageerror", e => consoleErrors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });

  await page.goto(`${SITE}/speak-to-juliet`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  writeFileSync(`${OUT}/speak-to-juliet-${label}.png`, await page.screenshot({ fullPage: true }));

  const h1 = (await page.locator("h1").first().textContent())?.trim() ?? "";
  check(h1.includes("Speak to Juliet"), "the page leads with Speak to Juliet", h1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, "no horizontal overflow");
  check(consoleErrors.length === 0, "no console errors", consoleErrors.join(" | ").slice(0, 200));

  // Every image that reaches the page has actually loaded. Glenice's
  // portrait is the one that was blank in a capture before the fix.
  const images = await page.evaluate(() =>
    [...document.querySelectorAll("img")].map(i => ({ src: i.currentSrc.split("/").pop() ?? "", w: i.naturalWidth })));
  const broken = images.filter(i => i.w === 0);
  check(broken.length === 0, "every image renders", broken.map(b => b.src).join(", "));
  const glenice = images.find(i => i.src.includes("glenice"));
  check(Boolean(glenice && glenice.w > 0), "Glenice's photograph renders", glenice ? `${glenice.src} ${glenice.w}px` : "not found");
  const juliet = images.find(i => i.src.includes("juliet"));
  check(Boolean(juliet && juliet.w > 0), "Juliet's photograph renders", juliet ? `${juliet.src} ${juliet.w}px` : "not found");

  // WhatsApp, the primary action.
  const waHrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="wa.me"]')].map(a => a.getAttribute("href") ?? ""));
  const julietLink = waHrefs.find(h => h.includes(EXPECTED_WHATSAPP));
  check(Boolean(julietLink), "a WhatsApp link opens Juliet's number", EXPECTED_WHATSAPP);
  if (julietLink) {
    const text = decodeURIComponent((julietLink.split("?text=")[1] ?? "").replace(/\+/g, " "));
    check(text === EXPECTED_MESSAGE, "the first message is already written", text.slice(0, 80));
  }

  await page.close();
}

/* 3. The fallback form carries the campaign ----------------------------- */
console.log("\n=== 3. The fallback form (filled, never submitted to the CRM) ===");
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${SITE}/speak-to-juliet`, { waitUntil: "networkidle" });
  await page.fill("#juliet-form-first", "Verification");
  await page.fill("#juliet-form-phone", "803 583 7934");
  await page.fill("#juliet-form-email", "verification@example.com");
  await page.selectOption("#juliet-form-level", "doctorate");
  await page.selectOption("#juliet-form-destination", "uk");

  // This hop only prefills the signup form. It does NOT submit it, so no
  // lead, no portal account and no notification are created by this run.
  await Promise.all([
    page.waitForURL(/\/contact\?/, { timeout: 30000 }),
    page.click("#juliet-form-first ~ * button[type=submit], form button[type=submit]"),
  ]);
  const url = new URL(page.url());
  check(url.pathname === "/contact", "the form hands off to the controlled signup", url.pathname);
  check(url.searchParams.get("campaign") === "speak-to-juliet", "it carries campaign=speak-to-juliet", String(url.searchParams.get("campaign")));
  check(url.searchParams.get("phone") === "+2348035837934", "the Nigerian number is converted to international form", String(url.searchParams.get("phone")));
  check(url.searchParams.get("desiredLevel") === "doctorate", "the study choice is carried as a controlled value", String(url.searchParams.get("desiredLevel")));
  writeFileSync(`${OUT}/speak-to-juliet-handoff.png`, await page.screenshot({ fullPage: false }));
  await page.close();
}

/* 4. Metadata ------------------------------------------------------------ */
console.log("\n=== 4. Metadata ===");
{
  const page = await browser.newPage();
  await page.goto(`${SITE}/speak-to-juliet`, { waitUntil: "networkidle" });
  const canonical = await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "");
  check(canonical.endsWith("/speak-to-juliet"), "the canonical URL is the page itself", canonical);
  const robots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "");
  check(robots.includes("noindex"), "the page is noindex while the copy is provisional", robots || "(none)");
  await page.close();

  const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
  check(!sitemap.includes("/speak-to-juliet"), "it is absent from the sitemap, as a provisional page should be");
}

await browser.close();

console.log(`\nRESULT: ${failures === 0 ? "every check passed." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
