/**
 * Speak to Juliet: read-only verification of the published page.
 *
 * Run against the live site after a deploy, from GitHub Actions, because the
 * production domain is not reachable from the build environment. It NEVER
 * submits any form, so it creates no lead, no portal account and no
 * notification to anybody. It never types into Tim Hunt's Pipedrive form
 * either: that form is his, and this run only proves it arrived.
 *
 * What it proves: the page loads, the short link redirects, WhatsApp opens
 * Juliet with the message already written, Tim's Pipedrive form is embedded
 * from his loader and his form URL, no withdrawn recording is on the page,
 * the podcast is the third recording and YouTube reports it playable, its
 * player appears only when a visitor presses play, the hero offers Tim's two
 * clear routes with an outlined Send my details to Juliet button and the form
 * heading is Ask Juliet to contact you,
 * Glenice's photograph renders above How this works,
 * neither width overflows or logs an error, and the four pages that must not
 * have moved are still where they were.
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const SITE = process.env.SITE ?? "https://www.worldstudentadvisors.com";
const OUT = process.env.OUT_DIR ?? ".";
const EXPECTED_WHATSAPP = "2348035837934";
const EXPECTED_MESSAGE = "Hello Juliet, I saw the WSA page and I would like to ask about studying abroad.";
const EXPECTED_FORM_ID = "6q9NP6Qklnnpo5qbQ9NZiyPUfxG86g8tN4BJztkTp80lcM8G8dExsiKe6jTWJCzYwr";
const EXPECTED_FORM_URL = `https://webforms.pipedrive.com/f/${EXPECTED_FORM_ID}`;
const EXPECTED_LOADER = "https://webforms.pipedrive.com/f/loader";
const WITHDRAWN_PODCAST_IDS = ["SZjjr2T3qTU", "fR4j72Jbk5Y"];
// The third recording, supplied by Tom Arrington on 25 September 2026.
const EXPECTED_PODCAST_ID = "p4OX6muHnZM";

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

// The three partner assets Tom Arrington supplied on 25 September 2026 must
// serve from production as the exact files imported from SharePoint. Sizes
// are the imported files' byte counts, so a placeholder or a re-encode fails.
for (const [path, bytes] of [
  ["/partners/study-group-logo.jpg", 20395],
  ["/partners/uclan-cyprus-logo.jpg", 13050],
  ["/partners/university-of-debrecen-campus-and-logo.jpg", 102931],
]) {
  const res = await fetch(`${SITE}${path}`);
  const body = res.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
  check(res.status === 200, `${path} serves`, `got ${res.status}`);
  check(body.length === bytes, `${path} is the imported file`, `${body.length} bytes, expected ${bytes}`);
  check(body[0] === 0xff && body[1] === 0xd8, `${path} is a JPEG`);
}

for (const alias of ["/LPJuliet", "/lpjuliet"]) {
  const res = await fetch(`${SITE}${alias}`, { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  check(res.status === 301, `${alias} is a permanent redirect`, `got ${res.status}`);
  check(location.endsWith("/speak-to-juliet"), `${alias} points at the canonical page`, location);
}

// YouTube must report the third recording as publicly playable. oEmbed
// answers 200 with the title for a playable video and 401/403/404 for one
// that is private, deleted or not embeddable.
{
  const target = `https://www.youtube.com/watch?v=${EXPECTED_PODCAST_ID}`;
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`);
  const body = res.ok ? await res.json().catch(() => ({})) : {};
  check(res.status === 200, `YouTube reports ${EXPECTED_PODCAST_ID} playable`, `HTTP ${res.status}`);
  check(typeof body.title === "string" && body.title.length > 0, "the recording has a title on YouTube", body.title ?? "(none)");
  console.log(`  info  plays as: "${body.title ?? ""}" by ${body.author_name ?? "?"}`);
}

/* 2. The page, at both widths ------------------------------------------ */
for (const [label, width, height] of [["mobile", 390, 844], ["desktop", 1280, 900]]) {
  console.log(`\n=== 2. The page at ${width}px (${label}) ===`);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  // Console errors are attributed to the origin that raised them. Since 24
  // September 2026 the page carries Tim Hunt's Pipedrive form in an iframe,
  // and that iframe asks the browser for third-party storage access, which
  // an automated browser refuses ("requestStorageAccess: Permission
  // denied"). That is Pipedrive's code running in Pipedrive's frame; it is
  // reported, because a reader should see it, but it is not a fault in this
  // site and must not fail the run. Only an error raised by the page's own
  // origin, or by an unattributed script, counts.
  const consoleErrors = [];
  const thirdPartyErrors = [];
  const isThirdParty = url => {
    try { return url && new URL(url).origin !== new URL(SITE).origin; } catch { return false; }
  };
  page.on("pageerror", e => consoleErrors.push(String(e)));
  page.on("console", m => {
    if (m.type() !== "error") return;
    const from = m.location()?.url || m.page?.()?.url?.() || "";
    (isThirdParty(from) ? thirdPartyErrors : consoleErrors).push(`${m.text()}${from ? `  [${new URL(from).host}]` : ""}`);
  });

  await page.goto(`${SITE}/speak-to-juliet`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  writeFileSync(`${OUT}/speak-to-juliet-${label}.png`, await page.screenshot({ fullPage: true }));

  const h1 = (await page.locator("h1").first().textContent())?.trim() ?? "";
  check(h1.includes("Speak to Juliet"), "the page leads with Speak to Juliet", h1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, "no horizontal overflow");
  check(consoleErrors.length === 0, "no console errors from this site", consoleErrors.join(" | ").slice(0, 200));
  if (thirdPartyErrors.length) console.log(`  info third-party frames logged ${thirdPartyErrors.length} error(s), not counted: ${thirdPartyErrors.join(" | ").slice(0, 200)}`);

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
  // Tim Hunt's 24 September edits: caption under Juliet, Glenice above How
  // this works with a larger photograph, a larger flag, his new recording.
  const caption = (await page.locator("figure figcaption").first().textContent()) ?? "";
  for (const line of ["Juliet Nnajiofor-Uyi", "Higher Education Advisor", "WorldStudentAdvisors", "Lagos, Nigeria"]) {
    check(caption.includes(line), `the hero caption carries "${line}"`);
  }
  const order = await page.evaluate(() => {
    const glenice = [...document.querySelectorAll("h2")].find(h => h.textContent?.trim() === "Glenice Owino");
    const how = [...document.querySelectorAll("h2")].find(h => h.textContent?.trim() === "How this works");
    if (!glenice || !how) return "missing";
    return glenice.compareDocumentPosition(how) & Node.DOCUMENT_POSITION_FOLLOWING ? "glenice-first" : "how-first";
  });
  check(order === "glenice-first", "Glenice sits above How this works", order);
  const gleniceWidth = await page.evaluate(() =>
    Math.round(([...document.querySelectorAll("img")].find(i => i.currentSrc.includes("glenice"))?.getBoundingClientRect().width) ?? 0));
  check(gleniceWidth >= 100, "Glenice's photograph is the larger size", `${gleniceWidth}px`);
  const flag = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Flag of Nigeria"]');
    return el ? Math.round(el.getBoundingClientRect().width) : 0;
  });
  check(flag >= 40, "the Nigerian flag is the larger size", `${flag}px`);

  const html = await page.content();
  // Tim Hunt's two clear routes, 26 September 2026: WhatsApp, and a proper
  // outlined button to the form under his heading and line.
  check(!html.includes("Would rather not"), "the old afterthought wording is gone");
  const secondary = page.locator('main a[href="#send-details"]');
  check((await secondary.count()) === 1, "one button leads to the form", String(await secondary.count()));
  const secondaryInfo = await secondary.first().evaluate(a => {
    const cs = getComputedStyle(a);
    return { text: a.textContent?.trim() ?? "", h: Math.round(a.getBoundingClientRect().height), border: parseFloat(cs.borderTopWidth), bg: cs.backgroundColor };
  }).catch(() => ({ text: "", h: 0, border: 0, bg: "" }));
  check(secondaryInfo.text === "Send my details to Juliet", "it reads Send my details to Juliet", secondaryInfo.text);
  check(secondaryInfo.h >= 48, "it is a full-size button", `${secondaryInfo.h}px`);
  check(secondaryInfo.border >= 2 && !secondaryInfo.bg.includes("18, 140, 126"), "it is outlined, not solid WhatsApp green", `border ${secondaryInfo.border}px, bg ${secondaryInfo.bg}`);
  check(html.includes("Prefer Juliet to contact you?"), "the hero asks Prefer Juliet to contact you?");
  check(html.includes("Leave your details and Juliet will get in touch with you."), "with Tim's line beneath it");
  const formHeading = (await page.locator("#send-details #juliet-form-heading").textContent().catch(() => "")) ?? "";
  check(formHeading.trim() === "Ask Juliet to contact you", "the form heading is Ask Juliet to contact you", formHeading.trim());
  check(html.includes("Leave your details below and Juliet will get in touch with you."), "with Tim's line beneath it too");
  for (const id of WITHDRAWN_PODCAST_IDS) check(!html.includes(id), `withdrawn recording ${id} is nowhere on the page`);
  check(!html.includes("Juliet is recording a short introduction"), "the podcast slot is no longer held open");
  // The player is created only on request, so no YouTube frame before a click.
  const ytFrames = await page.locator('iframe[src*="youtube"]').count();
  check(ytFrames === 0, "no YouTube frame before the visitor presses play", String(ytFrames));
  const playButton = page.locator('button[aria-label="Play: Meet Juliet"]');
  check((await playButton.count()) === 1, "one play button, named for the recording", String(await playButton.count()));
  const posterWidth = await playButton.locator("img").first().evaluate(img => img.complete && img.naturalWidth > 0 ? Math.round(img.getBoundingClientRect().width) : 0).catch(() => 0);
  check(posterWidth > 200, "Juliet's photograph renders as the poster", `${posterWidth}px`);
  if (width === 1280) {
    await playButton.click();
    const player = page.locator('iframe[src*="youtube-nocookie.com/embed/"]');
    await player.first().waitFor({ state: "attached", timeout: 10000 }).catch(() => {});
    const src = (await player.first().getAttribute("src").catch(() => null)) ?? "";
    check(src.includes(`/embed/${EXPECTED_PODCAST_ID}?`), "pressing play opens the third recording in the no-cookie player", src || "(no player)");
    await page.waitForTimeout(4000);
    writeFileSync(`${OUT}/speak-to-juliet-podcast-playing.png`, await page.screenshot({ fullPage: false }));
  }

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

/* 3. Tim Hunt's Pipedrive form is on the page (never filled, never sent) -- */
console.log("\n=== 3. The Pipedrive form (embedded, never touched) ===");
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${SITE}/speak-to-juliet`, { waitUntil: "networkidle" });

  const placeholder = page.locator(`.pipedriveWebForms[data-pd-webforms="${EXPECTED_FORM_URL}"]`);
  check((await placeholder.count()) === 1, "exactly one placeholder carries Tim's form URL", String(await placeholder.count()));

  const loaderLoaded = await page.evaluate(src =>
    [...document.querySelectorAll("script")].some(s => s.src === src), EXPECTED_LOADER);
  check(loaderLoaded, "Pipedrive's loader script is on the page", EXPECTED_LOADER);

  // The loader replaces the placeholder's contents with an iframe. Give it
  // time on a slow connection; on failure the page keeps the fallback link.
  let iframeSrc = "";
  try {
    const frame = placeholder.locator("iframe").first();
    await frame.waitFor({ state: "attached", timeout: 30000 });
    iframeSrc = (await frame.getAttribute("src")) ?? "";
  } catch {
    iframeSrc = "";
  }
  check(iframeSrc.includes("webforms.pipedrive.com"), "the form iframe has arrived from Pipedrive", iframeSrc.slice(0, 90) || "(no iframe)");
  check(iframeSrc.includes(EXPECTED_FORM_ID), "the iframe is Tim's form, not another", EXPECTED_FORM_ID);

  const fallbackVisible = await page.locator(`a[href="${EXPECTED_FORM_URL}"]`).count();
  check(iframeSrc ? fallbackVisible === 0 : fallbackVisible === 1, "the fallback link shows only while the iframe is missing", `fallback links: ${fallbackVisible}`);

  // Nothing on this page hands off to the website signup any more.
  const contactHandoffs = await page.evaluate(() =>
    [...document.querySelectorAll("a")].filter(a => (a.getAttribute("href") ?? "").includes("/contact?")).length);
  check(contactHandoffs === 0, "no link hands off to the retired website form", String(contactHandoffs));
  const ownInputs = await page.evaluate(() => document.querySelectorAll("main input, main select, main textarea").length);
  check(ownInputs === 0, "the page has no form controls of its own outside the iframe", String(ownInputs));

  writeFileSync(`${OUT}/speak-to-juliet-form.png`, await page.locator("#send-details").screenshot());
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
  check(robots.includes("noindex"), "the page is noindex until Tom Arrington's GO to publish it", robots || "(none)");
  await page.close();

  const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
  check(!sitemap.includes("/speak-to-juliet"), "it is absent from the sitemap until that GO");
}

await browser.close();

console.log(`\nRESULT: ${failures === 0 ? "every check passed." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
