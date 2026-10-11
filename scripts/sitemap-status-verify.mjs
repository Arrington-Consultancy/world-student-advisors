/**
 * Sitemap status: read-only production check.
 *
 * Google Search Console reported "Redirect error" on a sitemap page on
 * 7 October 2026. The cause was /partners looping between /partners and
 * /partners/ (server/_core/vite.ts). This check asks the live site, for
 * every URL in the live sitemap, for its first response without following
 * redirects, and fails on anything but 200: a sitemap must list final
 * URLs, so a 301 there is a defect even when it is not a loop. It then
 * follows each trailing-slash and code-form alias for up to five hops to
 * prove no loop exists anywhere a redirect is expected.
 *
 * Run from a GitHub Actions runner (the implementation sandbox cannot reach
 * production). Node 20, no dependencies. Exits non-zero on any failure.
 */
const ORIGIN = process.env.SITE_ORIGIN ?? "https://www.worldstudentadvisors.com";
let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}
const head = (url) => fetch(url, { method: "HEAD", redirect: "manual", headers: { "user-agent": "WSA-verify/1.0" } });

async function chain(url, max = 5) {
  const hops = [];
  let current = url;
  for (let i = 0; i < max; i++) {
    const r = await head(current);
    hops.push(`${r.status} ${new URL(current).pathname}`);
    if (r.status < 300 || r.status >= 400) return { final: r.status, hops };
    const loc = r.headers.get("location");
    if (!loc) return { final: r.status, hops: [...hops, "no Location header"] };
    current = new URL(loc, current).toString();
  }
  return { final: "loop", hops };
}

// 1. The sitemap itself.
const sm = await fetch(`${ORIGIN}/sitemap.xml`);
check("/sitemap.xml responds 200", sm.status === 200, String(sm.status));
// Each URL is re-rooted on ORIGIN, so the same check runs against a local
// copy of the pipeline when SITE_ORIGIN is set; in production the two are
// the same host.
const urls = [...(await sm.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => `${ORIGIN}${new URL(m[1]).pathname}`);
check("the sitemap lists pages", urls.length >= 60, `${urls.length} URLs`);
check("every sitemap URL is on the www host", [...(await (await fetch(`${ORIGIN}/sitemap.xml`)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].every(m => m[1].startsWith("https://www.worldstudentadvisors.com/")));

// 2. Every listed URL answers 200 on the first request: no redirect, no error.
const bad = [];
for (const u of urls) {
  const r = await head(u);
  if (r.status !== 200) bad.push(`${new URL(u).pathname} ${r.status}${r.headers.get("location") ? " -> " + r.headers.get("location") : ""}`);
}
check("every sitemap URL answers 200 without redirecting", bad.length === 0, bad.join("; ") || `${urls.length} checked`);

// 3. The page that looped, by name, and its slash form.
const partners = await chain(`${ORIGIN}/partners`);
check("/partners is the page (200 on the first hop)", partners.hops.length === 1 && partners.final === 200, partners.hops.join(" > "));
const partnersSlash = await chain(`${ORIGIN}/partners/`);
check("/partners/ redirects once to /partners and stops", partnersSlash.final === 200 && partnersSlash.hops.length === 2, partnersSlash.hops.join(" > "));

// 4. No loop behind any trailing-slash form of a sitemap page.
const loops = [];
for (const u of urls) {
  const p = new URL(u).pathname;
  if (p === "/") continue;
  const c = await chain(`${ORIGIN}${p}/`);
  if (c.final !== 200 || c.hops.length > 2) loops.push(`${p}/ : ${c.hops.join(" > ")}`);
}
check("every trailing-slash form resolves to its page in one hop", loops.length === 0, loops.join("; ") || `${urls.length - 1} checked`);

// 5. Google Search Console's ownership file (8 October 2026), served at the
// root byte for byte, as Google's "HTML file" verification requests it.
const gsc = await fetch(`${ORIGIN}/google375a70cbd269f483.html`, { redirect: "manual" });
const gscBody = await gsc.text();
check("Google verification file is served at the root with its exact content", gsc.status === 200 && gscBody === "google-site-verification: google375a70cbd269f483.html", `${gsc.status} ${JSON.stringify(gscBody.slice(0, 60))}`);

// 6. Draft pages for review (9 October 2026: the Sarkin Fulani Future Leaders
// Programme). A draft is a real page, so it answers 200 for its reviewers,
// but it carries noindex and is not in the sitemap. Both must hold together
// until the page is published on purpose, when this list is edited.
const DRAFT_PAGES = ["/sarkin-fulani-future-leaders"];
for (const p of DRAFT_PAGES) {
  const r = await fetch(`${ORIGIN}${p}`, { redirect: "manual", headers: { "user-agent": "WSA-verify/1.0" } });
  const body = await r.text();
  check(`${p} answers 200 for its reviewers`, r.status === 200, String(r.status));
  check(`${p} carries noindex while it is a draft`, body.includes('<meta name="robots" content="noindex, nofollow" />'));
  check(`${p} is not in the sitemap while it is a draft`, !urls.some(u => new URL(u).pathname === p));
}
// The draft page's own images, served from this site (9 October 2026: the
// seal, the Foundation logo and Maryam Lawal's photograph).
for (const img of ["/images/sarkin-fulani/seal-sarkin-fulani-of-lagos.jpg", "/images/sarkin-fulani/sarkin-fulanin-lagos-foundation.png", "/images/sarkin-fulani/maryam-lawal.jpg"]) {
  const r = await head(`${ORIGIN}${img}`);
  check(`${img} is served`, r.status === 200, `${r.status} ${r.headers.get("content-type") ?? ""}`);
}

// 7. No residential address (Tim Hunt, 10 October 2026). Every sitemap page,
// read in full, and the scripts the home page loads, must be free of the
// street and postcode; the pages that carried them must show the town and
// county wording instead.
const RESIDENTIAL = [/newport\s+close/i, /BS21\s*5DZ/i];
const leaks = [];
const pageBodies = new Map();
for (const u of urls) {
  const body = await (await fetch(u, { headers: { "user-agent": "WSA-verify/1.0" } })).text();
  pageBodies.set(new URL(u).pathname, body);
  if (RESIDENTIAL.some(re => re.test(body))) leaks.push(new URL(u).pathname);
}
const home = await (await fetch(`${ORIGIN}/`, { headers: { "user-agent": "WSA-verify/1.0" } })).text();
const scripts = [...home.matchAll(/<(?:script[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="([^"]+\.js)"/g)].map(m => m[1]);
for (const src of new Set(scripts)) {
  const js = await (await fetch(new URL(src, ORIGIN))).text();
  if (RESIDENTIAL.some(re => re.test(js))) leaks.push(src);
}
check("no page or script carries the residential street address or postcode", leaks.length === 0, leaks.join("; ") || `${urls.length} pages and ${new Set(scripts).size} scripts read`);
for (const p of ["/", "/about", "/privacy-policy"]) {
  const body = await (await fetch(`${ORIGIN}${p}`, { headers: { "user-agent": "WSA-verify/1.0" } })).text();
  check(`${p} shows "Clevedon, North Somerset"`, body.includes("Clevedon, North Somerset"));
}

// 9. The footer's developer credit (Tom Arrington, 11 October 2026):
// "Website by Arrington Consultancy", once per page, in the HTML as served
// (so a crawler sees it without running scripts), linking to the Arrington
// home page with no nofollow, sponsored or ugc, and on pages that are
// themselves index, follow.
const CREDIT = /Website by(?:<!-- -->)?\s*<a href="https:\/\/www\.arringtonconsultancy\.com\/"([^>]*)>Arrington Consultancy<\/a>/g;
const creditFaults = [];
for (const [p, body] of pageBodies) {
  const found = [...body.matchAll(CREDIT)];
  const mentions = (body.match(/arringtonconsultancy\.com/g) ?? []).length;
  if (found.length !== 1 || mentions !== 1) creditFaults.push(`${p}: ${found.length} credit, ${mentions} mentions`);
  else if (/nofollow|sponsored|ugc/.test(found[0][1])) creditFaults.push(`${p}: rel ${found[0][1].trim()}`);
}
check("every sitemap page carries the credit once, as a followed link to the Arrington home page", creditFaults.length === 0, creditFaults.join("; ") || `${pageBodies.size} pages read`);
check("the home page is index, follow, so its links are followed", (pageBodies.get("/") ?? "").includes('<meta name="robots" content="index, follow"'));
try {
  const arrington = await fetch("https://www.arringtonconsultancy.com/", { redirect: "follow", headers: { "user-agent": "WSA-verify/1.0" } });
  check("the credit's destination answers", arrington.status === 200, `${arrington.status} ${arrington.url}`);
} catch (err) {
  check("the credit's destination answers", false, String(err.cause?.code ?? err.message));
}

console.log(failures === 0 ? "\nEvery check passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
