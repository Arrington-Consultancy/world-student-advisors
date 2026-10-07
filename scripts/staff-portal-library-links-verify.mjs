/**
 * Staff Portal Student Support Library links: read-only production check.
 *
 * The Staff Portal is behind a sign-in, and this check signs in to
 * nothing. What it can prove from outside is that the deployed client
 * bundle carries the library links section that PR #187 added, with the
 * same resource record the public library is built from: the section's
 * card label, its Copy link buttons, its withdrawal line for the Word
 * lists, and the "library" section id in the addressable list. It then
 * confirms every permanent link the section would print resolves live
 * with a 200, so nothing the HUB team copies from it is dead.
 *
 * Run from a GitHub Actions runner (the implementation sandbox cannot reach
 * production). Node 20, no dependencies. Exits non-zero on any failure.
 */
import { readFileSync } from "node:fs";

const ORIGIN = process.env.SITE_ORIGIN ?? "https://www.worldstudentadvisors.com";
let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

async function text(url) {
  const r = await fetch(url, { redirect: "manual", headers: { "user-agent": "WSA-verify/1.0" } });
  return { status: r.status, body: r.ok ? await r.text() : "" };
}

// 1. The portal shell and its module scripts.
const shell = await text(`${ORIGIN}/staff-portal`);
check("/staff-portal responds 200", shell.status === 200, String(shell.status));
const entry = [...shell.body.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(m => m[1]);
check("the shell names at least one module script", entry.length > 0, entry.join(", "));

// 2. Follow every chunk the entry chunks name, one level deep, and pool the text.
const seen = new Set();
let pool = "";
async function pull(src) {
  const url = src.startsWith("http") ? src : `${ORIGIN}${src.startsWith("/") ? "" : "/"}${src}`;
  if (seen.has(url)) return;
  seen.add(url);
  const r = await text(url);
  if (r.status !== 200) { check(`chunk ${src} responds 200`, false, String(r.status)); return; }
  pool += `\n${r.body}`;
  for (const m of r.body.matchAll(/["'`](\.?\/?assets\/[A-Za-z0-9._-]+\.js)["'`]/g)) {
    await pull(m[1].replace(/^\.\//, "/"));
  }
}
for (const src of entry) await pull(src);
check("client bundle fetched", pool.length > 50_000, `${seen.size} chunks, ${pool.length} chars`);

// 3. The section is in the deployed bundle.
check('the Daily work card "Student Support Library links" is in the bundle', pool.includes("Student Support Library links"));
check('"library" is an addressable section id', /"interviews","library","social"/.test(pool));
check("the Copy link button's label is in the bundle", pool.includes("Copy link for "));
check("the Word-list withdrawal line is in the bundle", pool.includes("The Word lists of links are withdrawn."));
check("no YouTube URL is offered by the panel's own text", !pool.includes("Send the student the YouTube"));

// 4. Every permanent link the section prints resolves live.
const record = readFileSync(process.env.LIBRARY_RECORD ?? "shared/studentSupportLibrary.ts", "utf8");
const slugs = [...record.matchAll(/^\s*slug: "([a-z0-9-]+)",/gm)].map(m => m[1]);
check("the shared record lists the resources", slugs.length >= 30, `${slugs.length} slugs`);
let dead = [];
for (const slug of slugs) {
  const r = await fetch(`${ORIGIN}/student-support-library/${slug}`, { method: "HEAD", redirect: "manual" });
  if (r.status !== 200) dead.push(`${slug} ${r.status}`);
}
check("every permanent link the section prints responds 200", dead.length === 0, dead.join("; ") || `${slugs.length} checked`);

console.log(failures === 0 ? "\nEvery check passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
