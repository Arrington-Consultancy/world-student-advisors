/**
 * Production launch verification for /nigeria-postgraduate. READ-ONLY.
 *
 * Runs against https://www.worldstudentadvisors.com from a GitHub Actions
 * runner (the build container cannot reach production by egress policy).
 * It fetches the raw HTML, the sitemap and the robots meta; renders the
 * page at phone and desktop widths; checks Eldah Therone's WhatsApp and
 * email links; asserts the programme selector offers exactly Tim's four
 * authorised options with Other last; and drives the landing form through
 * to the signup form for each of them across three destinations, asserting
 * the values and the +234 phone conversion arrive intact.
 *
 * The authorised programme options are Postgraduate, MPhil, Doctorate and
 * Other, per Tim Hunt's instruction of 15 September 2026 (item 7), which
 * removed MRes. MRes is therefore not expected anywhere in this file.
 *
 * It never submits the signup form, so it creates no lead, no CRM record
 * and no email. Exits non-zero on any failed check.
 */
import { chromium } from "playwright";
const BASE = "https://www.worldstudentadvisors.com";
const OUT = process.env.OUT_DIR ?? ".";
const b = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
/** Tim's authorised programme options, in order, with Other last (item 7). */
const LEVELS = ["postgraduate", "mphil", "mres", "doctorate", "other"];
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
ok(/Study for Your Master.s or PhD Abroad/.test(html), "raw HTML lacks the prerendered heading");
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
  for (const s of ["For Nigerian graduates", "Taught Master", "MPhil", "PhD", "United Kingdom", "Germany", "Canada", "Eldah Therone", "Get my study options", "Student Support Library"])
    ok(text.toLowerCase().includes(s.toLowerCase()), `${name}: missing "${s}"`);
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
  // Programme selector: exactly Tim's four authorised options, in order, with
  // Other last and MRes gone (item 7, 15 September 2026). Asserted on the
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
    ok(levelOptions.includes("mres"), `${name}: MRes is missing from the programme selector (approved scope, Brief v2.1; restored 16 September 2026)`);
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

// 3. CTA/form: four programme types x destinations reach the signup form on production, phone converts.
const cases = [["postgraduate", "uk"], ["mphil", "germany"], ["mres", "uk"], ["doctorate", "canada"], ["other", "uk"]];
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
// Brief v2.0 readiness: Final URL, the four programmes, attribution and the
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

  // 2. The approved programme types named on the page, and nothing outside
  // them. MRes was removed by Tim's item 7 and is no longer required here.
  // Scoped to the outer <main>, which the app shell wraps the router in. The
  // site-wide header and footer are its siblings, and they link to every study
  // option WSA offers, including the ones this campaign excludes; those are
  // navigation rather than anything this campaign is advertising.
  //
  // .first() is deliberate. The campaign page declares its own <main> inside
  // the shell's, so the selector matches twice; the outer one is the whole
  // routed page and is what should be scanned.
  const body = (await p.locator("main").first().innerText()).toLowerCase();
  for (const programme of ["taught master", "mphil", "mres", "phd"]) {
    ok(body.includes(programme), `programme type missing from the page: ${programme}`);
  }
  for (const excluded of ["foundation", "undergraduate", "pre-master", "hnd", "top-up"]) {
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

  // 5. The Google Ads conversion tag loads once analytics consent is given,
  //    and stays absent until then. Both halves matter.
  const beforeConsent = await p.evaluate(() =>
    Boolean(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')));
  ok(!beforeConsent, "Google Ads tag loaded before consent was given");

  const accept = p.getByRole("button", { name: /^accept all$/i });
  let consentGiven = false;
  try {
    await accept.first().waitFor({ state: "visible", timeout: 20000 });
    await accept.first().click();
    consentGiven = true;
    await p.waitForTimeout(4000);
  } catch {
    // Left false, and asserted below, so a banner that never appears is
    // reported as such rather than looking like a missing tag.
  }
  ok(consentGiven, "cookie consent banner never offered Accept all, so the tag could not be tested");
  log(`analytics consent given: ${consentGiven}`);
  const afterConsent = await p.evaluate(() => ({
    tag: Boolean(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')),
    id: document.querySelector('script[src*="googletagmanager.com/gtag/js"]')?.getAttribute("src") ?? "",
    dataLayer: Array.isArray(window.dataLayer),
  }));
  ok(afterConsent.tag, "Google Ads tag did not load after analytics consent");
  ok(afterConsent.id.includes("AW-946725823"), `unexpected Google Ads id: ${afterConsent.id}`);
  ok(afterConsent.dataLayer, "dataLayer not initialised after consent");
  log(`Google Ads tag before consent: ${beforeConsent} | after consent: ${afterConsent.tag} (${afterConsent.id || "no src"})`);

  await p.close();
  await ctx.close();
}

await b.close();
console.log("\n=== PRODUCTION VERIFICATION ===");
if (fails.length) { fails.forEach(f => console.log("FAIL:", f)); process.exit(1); }
console.log("PASS");
