/**
 * Production launch verification for /nigeria-postgraduate. READ-ONLY.
 *
 * Runs against https://www.worldstudentadvisors.com from a GitHub Actions
 * runner (the build container cannot reach production by egress policy).
 * It fetches the raw HTML, the sitemap and the robots meta; renders the
 * page at phone and desktop widths; checks Eldah Therone's WhatsApp and
 * email links; and drives the landing form through to the signup form for
 * all four programme types and three destinations, asserting the values
 * and the +234 phone conversion arrive intact.
 *
 * It never submits the signup form, so it creates no lead, no CRM record
 * and no email. Exits non-zero on any failed check.
 */
import { chromium } from "playwright";
const BASE = "https://www.worldstudentadvisors.com";
const OUT = process.env.OUT_DIR ?? ".";
const b = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const log = m => console.log("  " + m);

// 1. HTTP + robots + sitemap, from the raw responses (no JS).
const r = await fetch(`${BASE}/nigeria-postgraduate`); const html = await r.text();
ok(r.status === 200, `HTTP ${r.status}`); log(`HTTP ${r.status}`);
const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? "(none)";
ok(!/noindex/i.test(robots), `robots meta: ${robots}`); log(`robots meta: ${robots}`);
ok(!/Working draft/i.test(html), "raw HTML still carries 'Working draft'");
ok(/Postgraduate study abroad, planned with one person/.test(html), "raw HTML lacks the prerendered heading");
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
  for (const s of ["For Nigerian graduates", "Taught Master", "MPhil", "MRes", "PhD", "United Kingdom", "Germany", "Canada", "Eldah Therone", "Get my study options", "Student Support Library"])
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
const cases = [["postgraduate", "uk"], ["mphil", "germany"], ["mres", "canada"], ["doctorate", "uk"]];
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
await b.close();
console.log("\n=== PRODUCTION VERIFICATION ===");
if (fails.length) { fails.forEach(f => console.log("FAIL:", f)); process.exit(1); }
console.log("PASS");
