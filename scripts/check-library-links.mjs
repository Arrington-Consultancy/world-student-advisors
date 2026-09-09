/**
 * Checks every Student Support Library video link is still playable.
 *
 * WHY THIS EXISTS. On 9 September 2026 Tim replaced WSA 004's video because
 * the phone number in it had changed, and deleted the old one. A deleted
 * video leaves a link in the library that looks fine in the code and shows a
 * student "Video unavailable". Nothing in the build catches that, because a
 * dead YouTube link is still a valid string.
 *
 * Tim's standing instruction is that a failure should come with a copy of
 * the failure notice. This produces one: the code, the title, the URL and
 * what YouTube said.
 *
 * HOW IT DECIDES. YouTube's oEmbed endpoint answers 200 with the video's
 * real title for anything publicly playable, and 401, 403 or 404 for a
 * video that is deleted, private or removed. That is a cleaner signal than
 * fetching the watch page, which returns 200 with an error rendered inside
 * it.
 *
 * It prints the live title next to the resource title, because a link can
 * be alive and still be the wrong video. Only a person can judge that, so
 * the script shows both rather than guessing.
 *
 * Read-only. Touches nothing but YouTube's public oEmbed endpoint.
 */
import { readFileSync } from "fs";

const SOURCE = "client/src/lib/studentSupportLibrary.ts";
const src = readFileSync(SOURCE, "utf8");

const entries = [...src.matchAll(
  /"(WSA \d{3})": \{[\s\S]*?title: "([^"]+)"[\s\S]*?youtubeUrl: "([^"]+)"/g,
)].map(m => ({ code: m[1], title: m[2], url: m[3] }));

if (entries.length === 0) {
  console.error(`No resources parsed from ${SOURCE}. The file's shape has changed; fix this script rather than trusting a clean run.`);
  process.exit(1);
}

/** Every shape the library uses today: watch?v=, youtu.be/ and shorts/. */
function videoId(url) {
  const m = url.match(/(?:watch\?v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function check(entry) {
  const id = videoId(entry.url);
  if (!id) return { ...entry, ok: false, detail: "Could not parse a video id from the URL." };

  // Normalised to the canonical watch URL: oEmbed does not accept every
  // shorthand, and a shorts link would otherwise report a false failure.
  const target = `https://www.youtube.com/watch?v=${id}`;
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`;

  try {
    const response = await fetch(endpoint, { redirect: "follow" });
    if (response.status === 200) {
      const body = await response.json();
      return { ...entry, ok: true, liveTitle: body.title ?? "(no title returned)" };
    }
    return {
      ...entry,
      ok: false,
      detail: `YouTube returned HTTP ${response.status}. The video is deleted, private or otherwise unavailable.`,
    };
  } catch (error) {
    return { ...entry, ok: false, detail: `Could not reach YouTube: ${error instanceof Error ? error.message : String(error)}` };
  }
}

const results = [];
for (const entry of entries) {
  results.push(await check(entry));
}

const dead = results.filter(r => !r.ok);

console.log(`=== Student Support Library link check: ${entries.length} resources ===\n`);
for (const r of results) {
  if (r.ok) {
    console.log(`  OK    ${r.code}  ${r.title}`);
    console.log(`        plays as: "${r.liveTitle}"`);
  } else {
    console.log(`  DEAD  ${r.code}  ${r.title}`);
    console.log(`        ${r.url}`);
    console.log(`        ${r.detail}`);
  }
}

console.log(`\n=== ${results.length - dead.length} playable, ${dead.length} unavailable ===`);
if (dead.length > 0) {
  console.log("\nFailure notice, to send to whoever owns the recording:");
  for (const r of dead) console.log(`  ${r.code} "${r.title}" -> ${r.url}\n    ${r.detail}`);
  process.exit(1);
}

console.log("\nEvery link is playable. Check the 'plays as' titles above: a link can be");
console.log("alive and still point at the wrong video, and only a person can tell.");
process.exit(0);
