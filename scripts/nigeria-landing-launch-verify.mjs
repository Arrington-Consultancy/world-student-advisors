/**
 * Production launch verification for /nigeria-postgraduate. READ-ONLY.
 *
 * Runs against https://www.worldstudentadvisors.com from a GitHub Actions
 * runner (the build container cannot reach production by egress policy).
 * It fetches the raw HTML, the sitemap and the robots meta; renders the
 * page at phone and desktop widths; checks Eldah Therone's WhatsApp and
 * email links; asserts the programme selector offers exactly the authorised
 * options with Other last; and drives the landing form through to the
 * signup form for each of them, asserting the values and the +234 phone
 * conversion arrive intact.
 *
 * The authorised programme options are Taught Master's ("postgraduate") and
 * Other, per Tim Hunt's instruction of 2 October 2026 ("don't promote
 * research postgraduate MRes, MPhil and PhD. Concentrate on taught
 * masters"), approved by Tom Arrington the same day. MPhil, MRes and PhD
 * must therefore NOT appear in the selector or the campaign copy.
 *
 * It never submits the signup form, so it creates no lead, no CRM record
 * and no email. Exits non-zero on any failed check.
 */
import { chromium } from "playwright";
const BASE = "https://www.worldstudentadvisors.com";
const OUT = process.env.OUT_DIR ?? ".";
const b = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
/** The authorised programme options, in order, with Other last (2 October 2026). */
const LEVELS = ["postgraduate", "other"];
const RESEARCH_LEVELS = ["mphil", "mres", "doctorate"];
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const log = m => console.log("  " + m);

// 1. HTTP + robots + sitemap, from the raw responses (no JS).
const r = await fetch(`${BASE}/nigeria-postgraduate`); const html = await r.text();
ok(r.status === 200, `HTTP ${r.status}`); log(`HTTP ${r.status}`);
const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? "(none)";
ok(!/noindex/i.test(robots), `robots meta: ${robots}`); log(`robots meta: ${robots}`);
ok(!/Working draft/i.test(html), "raw HTML still carries 'Working draft'");
// The prerendered <h1>, which proves the route is served as real HTML rather
// than an empty SPA shell. The wording this previously looked for -
// "Postgraduate study abroad, planned with one person who knows your case" -
// was removed by the 14 September review (a02d7d3), and
// server/campaign/nigeriaLanding.test.ts asserts the page must NOT contain it,
// so requiring it here contradicted the suite. The apostrophe is matched
// loosely because it is a curly one in the source.
ok(/Study for Your Master.s Abroad/.test(html), "raw HTML lacks the prerendered heading");
ok(!/or PhD Abroad/.test(html), "raw HTML still carries the PhD headline (scope narrowed 2 October 2026)");
const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
ok(sm.includes(`${BASE}/nigeria-postgraduate</loc>`), "route absent from live sitemap"); log(`sitemap has route: ${sm.includes("nigeria-postgraduate")}`);
const xrobots = r.headers.get("x-robots-tag"); ok(!xrobots || !/noindex/i.test(xrobots), `X-Robots-Tag: ${xrobots}`); log(`X-Robots-Tag header: ${xrobots ?? "(none)"}`);

// 2. Rendered page, mobile and desktop.
for (const [name, vp] of [["mobile", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 900 }]]) {
  const p = await b.newPage({ viewport: vp });
  const errors = []; p.on("pageerror", e => errors.push(String(e)));
  await p.goto(`${BASE}/nigeria-postgraduate`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /accept all/i }).click().catch(() => {});
  const text = await p.evaluate(() => document.body.innerText);
  const live = await p.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "(none)");
  ok(!/noindex/i.test(live), `${name}: live robots meta ${live}`);
  ok(!/Working draft|Not published for paid traffic|pending approval/i.test(text), `${name}: draft wording visible`);
  for (const s of ["For Nigerian graduates", "Taught Master", "United Kingdom", "Germany", "Canada", "Eldah Therone", "Get my study options", "Student Support Library"])
    ok(text.toLowerCase().includes(s.toLowerCase()), `${name}: missing "${s}"`);
  for (const s of ["MPhil", "MRes", "PhD"])
    ok(!text.includes(s), `${name}: research programme "${s}" is still on the page (removed 2 October 2026)`);
  ok(!/British Council (Certified|Accredited|Recognised)/i.test(text), `${name}: forbidden British Council wording`);
  const title = await p.title(); ok(/Nigerian/.test(title), `${name}: title is "${title}"`); log(`${name}: title "${title}"`);
  // every visible image loaded
  await p.evaluate(async () => { window.scrollTo(0, document.body.scrollHeight); await new Promise(r => setTimeout(r, 1200)); window.scrollTo(0, 0); });
  const broken = await p.evaluate(() => Array.from(document.images).filter(i => getComputedStyle(i).display !== "none" && i.complete && i.naturalWidth === 0).map(i => i.getAttribute("src")));
  ok(broken.length === 0, `${name}: broken images ${JSON.stringify(broken)}`);
  // Horizontal overflow: measure at the top of the page, and when it is
  // present name the elements responsible so the finding is actionable.
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
  const over = await p.evaluate(() => {
    const vw = window.innerWidth, out = [];
    for (const el of document.querySelectorAll("body *")) {
      const rc = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (rc.width > 0 && rc.right > vw + 1 && cs.position !== "fixed" && cs.visibility !== "hidden")
        out.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().trim().split(/\s+/).slice(0, 4).join(".")} right=${Math.round(rc.right)} w=${Math.round(rc.width)} "${(el.textContent || "").trim().slice(0, 30)}"`);
    }
    return { vw, sw: document.documentElement.scrollWidth, bsw: document.body.scrollWidth, out: out.slice(0, 15), n: out.length };
  });
  log(`${name}: innerWidth=${over.vw} scrollWidth=${over.sw} bodyScrollWidth=${over.bsw} overflowing=${over.n}`);
  for (const o of over.out) log(`${name}:   ${o}`);
  ok(over.sw <= over.vw + 1, `${name}: horizontal overflow (scrollWidth ${over.sw} > ${over.vw})`);
  ok(errors.length === 0, `${name}: JS errors ${JSON.stringify(errors)}`);
  // Programme selector: exactly the authorised options, in order, with Other
  // last and the research programmes gone (2 October 2026). Asserted on the
  // select element rather than page copy, because the copy is a separate
  // decision and the selector is what a student can actually choose.
  const levelOptions = await p.evaluate(() => {
    const sel = document.querySelector("#hero-form-level");
    return sel ? Array.from(sel.options).filter(o => o.value).map(o => o.value) : null;
  });
  ok(levelOptions !== null, `${name}: #hero-form-level not found`);
  if (levelOptions) {
    ok(JSON.stringify(levelOptions) === JSON.stringify(LEVELS),
      `${name}: programme options are ${JSON.stringify(levelOptions)}, expected ${JSON.stringify(LEVELS)}`);
    ok(levelOptions[levelOptions.length - 1] === "other",
      `${name}: "Other" is not the last programme option (${JSON.stringify(levelOptions)})`);
    for (const r of RESEARCH_LEVELS) ok(!levelOptions.includes(r), `${name}: research option "${r}" is still in the programme selector (removed 2 October 2026)`);
    log(`${name}: programme options ${levelOptions.join(" -> ")}`);
  }
  // Eldah contact: WhatsApp link + mailto present and correct
  const wa = await p.evaluate(() => Array.from(document.querySelectorAll('a[href^="https://wa.me/"]')).map(a => a.getAttribute("href")));
  const mail = await p.evaluate(() => Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.getAttribute("href")));
  ok(wa.some(h => h.includes("447470689849")), `${name}: Eldah WhatsApp link missing (${JSON.stringify(wa)})`);
  ok(mail.some(h => /Eldah@WorldStudentAdvisors\.com/i.test(h)), `${name}: Eldah mailto missing (${JSON.stringify(mail)})`);
  log(`${name}: WhatsApp ${wa.length} link(s), mailto ${mail.length}, images ok=${broken.length === 0}, JS errors=${errors.length}`);
  await p.screenshot({ path: `${OUT}/live-${name}.png`, fullPage: true });
  await p.close();
}
// WhatsApp target resolves (HEAD on wa.me may 302/405; anything < 500 and not 404 is fine)
try { const w = await fetch("https://wa.me/447470689849", { method: "GET", redirect: "manual" }); log(`wa.me/447470689849 -> ${w.status}`); ok(w.status !== 404 && w.status < 500, `wa.me returned ${w.status}`); } catch (e) { log(`wa.me fetch blocked from this network: ${e.message} (link href verified above)`); }

// 3. CTA/form: both programme options x destinations reach the signup form on production, phone converts.
const cases = [["postgraduate", "uk"], ["postgraduate", "germany"], ["other", "canada"], ["other", "uk"]];
for (const [level, dest] of cases) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(`${BASE}/nigeria-postgraduate`, { waitUntil: "domcontentloaded" });
  await p.getByRole("button", { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
  try { await p.locator("#hero-form-first").waitFor({ state: "visible", timeout: 60000 }); }
  catch { ok(false, `${level}/${dest}: landing form did not render within 60s on visit ${cases.indexOf([level, dest]) + 1}`); await p.close(); continue; }
  await p.locator("#hero-form-first").fill("Chidi");
  await p.locator("#hero-form-email").fill("chidi@example.com");
  await p.locator("#hero-form-phone").fill("08012345678");
  await p.locator("#hero-form-level").selectOption(level);
  await p.locator("#hero-form-destination").selectOption(dest);
  await Promise.all([p.waitForURL("**/contact*", { timeout: 30000 }), p.getByRole("button", { name: /get my study options/i }).first().click()]);
  await p.waitForLoadState("networkidle");
  await p.waitForFunction(() => { const s = document.querySelectorAll("select"); return s.length > 5 && Array.from(s).some(x => x.value); }, { timeout: 30000 }).catch(() => {});
  const sel = await p.evaluate(() => { const o = {}; for (const s of document.querySelectorAll("select")) if (s.value) o[s.value] = s.options[s.selectedIndex]?.text; return o; });
  const phone = await p.evaluate(() => Array.from(document.querySelectorAll("input")).find(i => i.type === "tel")?.value ?? "");
  ok(level in sel, `${level}: programme not in signup form (${JSON.stringify(sel)})`);
  ok(dest in sel, `${dest}: destination not in signup form (${JSON.stringify(sel)})`);
  ok(phone.replace(/\s/g, "").startsWith("+234"), `${level}: phone "${phone}"`);
  log(`${level.padEnd(12)} ${dest.padEnd(8)} -> ${JSON.stringify(sel)} phone=${phone}`);
  await p.close();
  await new Promise(r => setTimeout(r, 1500));
}

// ---------------------------------------------------------------------------
// Brief readiness: Final URL, the programme scope, attribution and the
// Google Ads conversion tag. Added 14 September 2026 for the Ads readiness
// decision. Everything here reads; nothing is submitted.
// ---------------------------------------------------------------------------
console.log("\n=== Brief v2.0 readiness ===");
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();

  // Land exactly as a Google Ads click would, with a click id and all five UTMs.
  const attribution = {
    gclid: "wsaVerify_gclid_000",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "nigeria_postgraduate_v2",
    utm_term: "phd_uk_nigeria",
    utm_content: "readiness_check",
  };
  const query = new URLSearchParams(attribution).toString();
  await p.goto(`${BASE}/nigeria-postgraduate?${query}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.locator("h1").first().waitFor({ state: "visible", timeout: 60000 });

  // 1. The call to action the brief names, in sections 19 and 30.
  const cta = await p.getByRole("button", { name: /get my study options/i }).count()
    + await p.getByRole("link", { name: /get my study options/i }).count();
  ok(cta > 0, 'call to action "Get my study options" not found on the page');
  log(`CTA "Get my study options" present: ${cta > 0}`);

  // 2. The approved programme type named on the page, and nothing outside
  // it. MPhil, MRes and PhD left the scope on 2 October 2026 and are
  // treated as out of scope here.
  // Scoped to the outer <main>, which the app shell wraps the router in. The
  // site-wide header and footer are its siblings, and they link to every study
  // option WSA offers, including the ones this campaign excludes; those are
  // navigation rather than anything this campaign is advertising.
  //
  // .first() is deliberate. The campaign page declares its own <main> inside
  // the shell's, so the selector matches twice; the outer one is the whole
  // routed page and is what should be scanned.
  const body = (await p.locator("main").first().innerText()).toLowerCase();
  ok(body.includes("taught master"), "programme type missing from the page: taught master");
  for (const excluded of ["foundation", "undergraduate", "pre-master", "hnd", "top-up", "mphil", "mres", "phd", "doctorate"]) {
    ok(!body.includes(excluded), `campaign page content names an out-of-scope programme: ${excluded}`);
  }
  log("approved programme types present in <main>; no out-of-scope programme named there");

  // 3. Attribution captured from the landing URL and persisted.
  const stored = await p.evaluate(() => {
    try { return JSON.parse(window.localStorage.getItem("wsa_ad_click_ids") ?? "{}"); }
    catch { return {}; }
  });
  for (const [key, value] of Object.entries(attribution)) {
    ok(stored[key] === value, `attribution ${key} not captured (got ${JSON.stringify(stored[key])})`);
  }
  log(`attribution captured: ${Object.keys(stored).sort().join(", ") || "(none)"}`);

  // 4. Attribution survives the hop to the signup form, which is where the
  //    lead is actually created and where the conversion fires.
  await p.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const afterHop = await p.evaluate(() => {
    try { return JSON.parse(window.localStorage.getItem("wsa_ad_click_ids") ?? "{}"); }
    catch { return {}; }
  });
  ok(afterHop.gclid === attribution.gclid, "gclid did not survive the hop to the signup form");
  ok(afterHop.utm_campaign === attribution.utm_campaign, "utm_campaign did not survive the hop");
  log(`attribution after hop to /contact: gclid=${afterHop.gclid ?? "(lost)"} campaign=${afterHop.utm_campaign ?? "(lost)"}`);

  // 5. Google Consent Mode v2 (since 30 September 2026): the Google Ads tag
  //    loads on every page view with all four consent types denied and no
  //    Google cookie set; "Accept all" pushes a consent update to granted.
  const beforeConsent = await p.evaluate(() => {
    const dl = window.dataLayer ?? [];
    const dflt = dl.find(e => Array.isArray(e) && e[0] === "consent" && e[1] === "default");
    const cfgIndex = dl.findIndex(e => Array.isArray(e) && e[0] === "config" && e[1] === "AW-946725823");
    const dfltIndex = dl.findIndex(e => Array.isArray(e) && e[0] === "consent" && e[1] === "default");
    return {
      tag: Boolean(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')),
      id: document.querySelector('script[src*="googletagmanager.com/gtag/js"]')?.getAttribute("src") ?? "",
      defaultDenied: Boolean(dflt) && ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"].every(k => dflt[2]?.[k] === "denied"),
      defaultBeforeConfig: dfltIndex >= 0 && cfgIndex > dfltIndex,
      updateBefore: dl.some(e => Array.isArray(e) && e[0] === "consent" && e[1] === "update"),
      googleCookie: /(^|; )_gcl_|(^|; )_ga/.test(document.cookie),
    };
  });
  ok(beforeConsent.tag, "Google Ads tag did not load before consent (Consent Mode v2 expects it present, denied)");
  ok(beforeConsent.id.includes("AW-946725823"), `unexpected Google Ads id: ${beforeConsent.id}`);
  ok(beforeConsent.defaultDenied, "consent default is not denied for all four types");
  ok(beforeConsent.defaultBeforeConfig, "consent default was not pushed before the config call");
  ok(!beforeConsent.updateBefore, "a consent update was pushed before the visitor chose");
  ok(!beforeConsent.googleCookie, "a Google advertising or analytics cookie was set before consent");

  // 5b. Meta Pixel (since 2 October 2026): present on every page view with
  //     Meta's consent revoked, so no _fbp/_fbc cookie before "Accept all".
  const metaBefore = await p.evaluate(() => ({
    script: Boolean(document.getElementById("wsa-meta-pixel")),
    src: document.getElementById("wsa-meta-pixel")?.getAttribute("src") ?? "",
    fbq: typeof window.fbq === "function",
    metaCookie: /(^|; )_fbp=|(^|; )_fbc=/.test(document.cookie),
    noscriptBeacon: Boolean(document.querySelector('img[src*="facebook.com/tr"]')),
  }));
  ok(metaBefore.script, "Meta Pixel script tag did not load before consent (expected present, revoked)");
  ok(metaBefore.src.includes("connect.facebook.net/en_US/fbevents.js"), `unexpected Meta Pixel source: ${metaBefore.src}`);
  ok(metaBefore.fbq, "window.fbq is not installed");
  ok(!metaBefore.metaCookie, "a Meta _fbp/_fbc cookie was set before consent");
  ok(!metaBefore.noscriptBeacon, "the ungateable Meta noscript beacon is on the page");

  const accept = p.getByRole("button", { name: /^accept all$/i });
  let consentGiven = false;
  try {
    await accept.first().waitFor({ state: "visible", timeout: 20000 });
    await accept.first().click();
    consentGiven = true;
    await p.waitForTimeout(4000);
  } catch {
    // Left false, and asserted below, so a banner that never appears is
    // reported as such rather than looking like a missing update.
  }
  ok(consentGiven, "cookie consent banner never offered Accept all, so the consent update could not be tested");
  log(`analytics consent given: ${consentGiven}`);
  const afterConsent = await p.evaluate(() => {
    const dl = window.dataLayer ?? [];
    const upd = dl.filter(e => Array.isArray(e) && e[0] === "consent" && e[1] === "update").pop();
    return {
      updateGranted: Boolean(upd) && ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"].every(k => upd[2]?.[k] === "granted"),
      scripts: document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length,
    };
  });
  ok(afterConsent.updateGranted, "Accept all did not push a consent update granting all four types");
  ok(afterConsent.scripts === 1, `expected one gtag.js script after consent, found ${afterConsent.scripts}`);
  log(`Consent Mode: tag present before consent: ${beforeConsent.tag}, default denied: ${beforeConsent.defaultDenied}, no Google cookie: ${!beforeConsent.googleCookie} | after Accept all: update granted ${afterConsent.updateGranted}`);
  const metaAfter = await p.evaluate(() => ({
    metaCookie: /(^|; )_fbp=/.test(document.cookie),
    // fbevents.js itself injects a second connect.facebook.net script (the
    // pixel's signals/config), seen on the first live run (37072347549), so
    // count only the base script this site injects.
    scripts: document.querySelectorAll('script[src*="connect.facebook.net/en_US/fbevents.js"]').length,
  }));
  ok(metaAfter.scripts === 1, `expected one fbevents.js script after consent, found ${metaAfter.scripts}`);
  // Once granted, a loaded pixel sets its _fbp cookie; this is the one
  // observable sign on the live site that the grant reached Meta's code.
  ok(metaAfter.metaCookie, "Accept all did not result in Meta's _fbp cookie (grant may not have reached the pixel)");
  log(`Meta Pixel: present before consent: ${metaBefore.script}, no Meta cookie before: ${!metaBefore.metaCookie} | after Accept all: _fbp set ${metaAfter.metaCookie}`);
  // A returning accepted visitor: on a fresh page load the pixel must
  // initialise and fire without waiting for a click. Until 3 October 2026 it
  // did not: Meta's script held the replayed grant behind the queued revoke,
  // so an accepted visitor fired nothing on any later page (found on the
  // Juliet thank-you page). Initialisation is visible as the pre-load queue
  // drained and the pixel's signals/config script loaded.
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(3000);
  const metaReturning = await p.evaluate(() => ({
    queue: (window.fbq?.queue ?? []).length,
    initialised: performance.getEntriesByType("resource").some(e => /connect\.facebook\.net\/signals\/config\//.test(e.name)),
  }));
  ok(metaReturning.queue === 0, `returning accepted visitor: ${metaReturning.queue} Meta call(s) still queued after reload (pixel held behind a revoke)`);
  ok(metaReturning.initialised, "returning accepted visitor: the pixel did not initialise on reload (no signals/config load)");
  log(`Meta Pixel on reload as an accepted visitor: queue ${metaReturning.queue}, initialised ${metaReturning.initialised}`);

  await p.close();
  await ctx.close();
}

await b.close();
console.log("\n=== PRODUCTION VERIFICATION ===");
if (fails.length) { fails.forEach(f => console.log("FAIL:", f)); process.exit(1); }
console.log("PASS");
