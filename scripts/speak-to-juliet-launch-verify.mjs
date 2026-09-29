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
const THANK_YOU_PATH = "/speak-to-juliet/thank-you";

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
  const gleniceWidths = await page.evaluate(() =>
    [...document.querySelectorAll("img")].filter(i => i.currentSrc.includes("glenice")).map(i => Math.round(i.getBoundingClientRect().width)));
  check(Math.max(0, ...gleniceWidths) >= 100, "Glenice's photograph is the larger size in her own card", gleniceWidths.join("/") + "px");
  // WSA as the source of authority, 27 September 2026: Glenice beside Juliet
  // in the hero, the trust line and the free badge, all in approved words.
  check(gleniceWidths.length === 2, "Glenice appears twice: beside Juliet in the hero and in her own card", String(gleniceWidths.length));
  // Read here rather than reusing `html`, which is declared further down.
  const authorityHtml = await page.content();
  for (const line of ["Backed by WSA UK Head Office", "British Council UK knowledge-trained counsellors", "With you from application to enrolment", "Free student support", "How we can help you", "Ready to start?"]) {
    check(authorityHtml.includes(line), `the page carries "${line}"`);
  }
  for (const banned of ["Personal Assistant", "Certified Counsellor", "Trusted by students", "No consultation fee"]) {
    check(!authorityHtml.includes(banned), `the concept artwork's "${banned}" is not on the page`);
  }
  // Version 4, 27 September 2026: Juliet's number and email in the hero, the
  // number opening WhatsApp and the email opening mail; the flag row with
  // eight flags served from this site; Glenice's number nowhere.
  const heroContacts = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const hero = h1?.closest("section");
    if (!hero) return null;
    const links = [...hero.querySelectorAll("a")].map(a => a.getAttribute("href") ?? "");
    return { wa: links.filter(h => h.includes("wa.me/2348035837934")).length, mail: links.filter(h => h.startsWith("mailto:juliet@worldstudentadvisors.com")).length, tel: links.filter(h => h.startsWith("tel:")).length, text: hero.textContent ?? "" };
  });
  check(heroContacts !== null && heroContacts.wa >= 2, "the hero has the WhatsApp button and the number card, both opening WhatsApp", String(heroContacts?.wa));
  check(heroContacts !== null && heroContacts.mail === 1, "the hero has Juliet's email card opening mail", String(heroContacts?.mail));
  check(heroContacts !== null && heroContacts.tel === 0, "no tel: link, the number opens WhatsApp as Tim asked", String(heroContacts?.tel));
  check(heroContacts !== null && heroContacts.text.includes("+234 803 583 7934") && heroContacts.text.includes("Call or WhatsApp"), "the number and its label are visible in the hero");
  check(!authorityHtml.includes("447459720726") && !authorityHtml.includes("7459 720726"), "Glenice's number is nowhere on the page");
  const flags = await page.evaluate(() => [...document.querySelectorAll('img[src^="/flags/"]')].map(i => ({ src: i.getAttribute("src"), w: i.naturalWidth, shown: Math.round(i.getBoundingClientRect().width) })));
  check(flags.length === 8, "eight destination flags", String(flags.length));
  check(flags.every(f => f.w > 0 && f.shown > 0), "every flag renders", flags.filter(f => !(f.w > 0 && f.shown > 0)).map(f => f.src).join(","));
  for (const name of ["UK", "USA", "Canada", "Australia", "Germany", "Cyprus", "Hungary", "Europe"]) check(authorityHtml.includes(`>${name}<`), `the flag row names ${name}`);
  // Tim Hunt's Australia line, 28 September 2026, under Where you could study.
  check(authorityHtml.includes("A popular international study destination offering a wide range of universities and undergraduate and postgraduate programmes."), "Where you could study carries Tim's Australia line");
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
  check((await secondary.count()) === 2, "two buttons lead to the form: the hero and the closing band", String(await secondary.count()));
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
  // Published on Tom Arrington's GO of 29 September 2026: indexable, in the
  // sitemap, prerendered. The thank-you page stays out of all three.
  check(robots.includes("index") && !robots.includes("noindex"), "the page is indexable (published 29 September 2026)", robots || "(none)");
  await page.close();

  const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
  check(sitemap.includes("<loc>https://www.worldstudentadvisors.com/speak-to-juliet</loc>"), "it is in the sitemap");
  check(!sitemap.includes(THANK_YOU_PATH), "the thank-you page is not in the sitemap");
  // Prerendered: the raw HTML, without running any script, already carries
  // the heading and the index directive a crawler needs.
  const raw = await (await fetch(`${SITE}/speak-to-juliet`)).text();
  check(raw.includes("Speak to Juliet"), "the served HTML carries the heading before any script runs");
  check(raw.includes('<meta name="robots" content="index, follow" />'), "the served HTML says index, follow");
  check(!raw.includes("noindex"), "no noindex anywhere in the served HTML");
}

/* 5. The thank-you page ------------------------------------------------- */
// Since 28 September 2026 Tim Hunt's Pipedrive form redirects, on success,
// to /speak-to-juliet/thank-you. That page is the only place the Juliet
// route reports the site's one Google Ads conversion, and it reports it
// once per arrival: not on a reload, not twice in a session, never on the
// landing page. Consent has not been given in this browser, so gtag.js is
// not loaded and the call queues on window.dataLayer, where it can be read.
console.log("\n=== 5. The thank-you page ===");
{
  const res = await fetch(`${SITE}${THANK_YOU_PATH}`, { redirect: "manual" });
  check(res.status === 200, `${THANK_YOU_PATH} returns 200`, `got ${res.status}`);
  const shell = await res.text();
  check(shell.includes('<meta name="robots" content="noindex'), "the server sends it noindex", "");
  check(!shell.includes("webforms.pipedrive.com"), "Pipedrive is nowhere in its HTML");

  const conversions = () => page.evaluate(() =>
    (window.dataLayer ?? []).filter(e => Array.isArray(e) && e[0] === "event" && e[1] === "conversion"
      && e[2] && e[2].send_to === "AW-946725823/hviLCPiHkOMcEL_Ht8MD").length);
  const waitForConversions = (n) => page.waitForFunction((want) =>
    ((window.dataLayer ?? []).filter(e => Array.isArray(e) && e[0] === "event" && e[1] === "conversion").length) === want,
    n, { timeout: 5000 }).then(() => true, () => false);

  let page;
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    page = await context.newPage();
    const consoleErrors = [];
    page.on("pageerror", e => consoleErrors.push(e.message));
    console.log(`  -- ${width}px --`);
    // The landing page reports nothing: a visit is not a submission.
    await page.goto(`${SITE}/speak-to-juliet`, { waitUntil: "networkidle" });
    check((await conversions()) === 0, "visiting the landing page reports no conversion", String(await conversions()));
    const landingLinks = await page.evaluate(() => [...document.querySelectorAll("a")].filter(a => (a.getAttribute("href") ?? "").includes("thank-you")).length);
    check(landingLinks === 0, "nothing on the landing page links to the thank-you page", String(landingLinks));

    // Arrival, as the form's redirect would land a student.
    await page.goto(`${SITE}${THANK_YOU_PATH}`, { waitUntil: "networkidle" });
    await waitForConversions(1);
    check((await conversions()) === 1, "arriving reports the conversion once", String(await conversions()));
    const h1 = await page.locator("h1").first().innerText();
    check(h1.trim() === "Thank you. Your details are with Juliet.", "the page thanks the student and confirms Juliet has the details", h1.trim());
    const html = await page.content();
    check(html.includes("email confirming"), "it points to the acknowledgement email Pipedrive sends");
    check(html.includes("The service is free."), "it carries the free-service line");
    const wa = await page.locator(`a[href*="wa.me/${EXPECTED_WHATSAPP}"]`).first();
    check((await wa.count()) >= 1, "it offers WhatsApp to Juliet's number", EXPECTED_WHATSAPP);
    const waHref = (await wa.getAttribute("href")) ?? "";
    check(decodeURIComponent(waHref).includes("I have just sent you my details"), "with a first message that says the details have been sent", decodeURIComponent(waHref).split("text=")[1]?.slice(0, 60) ?? "");
    check((await page.locator('a[href="mailto:juliet@worldstudentadvisors.com"]').count()) >= 1, "and email to Juliet");
    check((await page.locator('a[href="/speak-to-juliet"]').count()) >= 1, "it links back to Juliet's page");
    check((await page.locator('a[href="/student-support-library"]').count()) >= 1, "and to the Student Support Library");
    const controls = await page.evaluate(() => document.querySelectorAll("form, input, select, textarea, iframe").length);
    check(controls === 0, "it has no form, fields or iframe: no second data capture", String(controls));
    check(!html.includes("webforms.pipedrive.com"), "Pipedrive's loader is not on the page");
    check(!/portal|password/i.test(await page.locator("main main").innerText()), "it promises no portal account in its own copy");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check(!overflow, "no horizontal overflow");
    const broken = await page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src));
    check(broken.length === 0, "every image renders", broken.join(", "));
    check(consoleErrors.length === 0, "no page errors", consoleErrors.join(" | ").slice(0, 200));
    const robots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "");
    check(robots.includes("noindex"), "it is noindex", robots || "(none)");
    const canonical = await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "");
    check(canonical.endsWith(THANK_YOU_PATH), "its canonical URL is itself", canonical);
    writeFileSync(`${OUT}/speak-to-juliet-thank-you-${width}.png`, await page.screenshot({ fullPage: true }));

    // A refresh is not a second submission.
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    check((await conversions()) === 0, "reloading the page reports nothing", `${await conversions()} after reload`);
    // Nor is coming back to it within the same session.
    await page.goto(`${SITE}/speak-to-juliet`, { waitUntil: "networkidle" });
    await page.goto(`${SITE}${THANK_YOU_PATH}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    check((await conversions()) === 0, "returning to it in the same session reports nothing", String(await conversions()));
    await context.close();
  }

  const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
  check(!sitemap.includes(THANK_YOU_PATH), "it is absent from the sitemap");
}

await browser.close();

console.log(`\nRESULT: ${failures === 0 ? "every check passed." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
