/**
 * Read-only evidence for one production sign-up.
 *
 * Finds the Leads created in a given window, prints when each was created,
 * who owns it, and the Source line of its pinned note. That Source line is
 * the decisive evidence about the campaign, because the sign-up procedure
 * derives BOTH the note's Source line AND the choice of notification from
 * the same validated value in the same request: if the note names the
 * campaign, the campaign notification went out and the general staff
 * notification was skipped; if it does not, the reverse.
 *
 * It also prints the recipient lists as the live service resolves them, so
 * configuration and outcome are read together.
 *
 * GET requests only. It sends no mail, creates nothing, changes nothing,
 * and never prints the API token.
 */
import { ENV } from "../server/_core/env";

const BASE = "https://api.pipedrive.com/v1";
const TOKEN = process.env.PIPEDRIVE_API_TOKEN;
if (!TOKEN) {
  console.error("PIPEDRIVE_API_TOKEN is not set in this environment.");
  process.exit(1);
}

const SINCE = new Date(process.env.SINCE ?? "2026-09-19T18:00:00Z").getTime();
const UNTIL = new Date(process.env.UNTIL ?? "2026-09-19T23:59:59Z").getTime();

async function get(path: string): Promise<any> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pipedrive ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const strip = (html: unknown) =>
  String(html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const at = (s: string | undefined) => new Date(`${(s ?? "").replace(" ", "T")}Z`).getTime();

console.log(`\n=== Leads created between ${new Date(SINCE).toISOString()} and ${new Date(UNTIL).toISOString()} ===`);

let start = 0;
const found: any[] = [];
for (let page = 0; page < 12; page++) {
  const res = await get(`/leads?limit=100&start=${start}&sort=add_time%20DESC`);
  const batch: any[] = res?.data ?? [];
  if (!batch.length) break;
  for (const lead of batch) {
    const t = at(lead.add_time);
    if (t >= SINCE && t <= UNTIL) found.push(lead);
  }
  if (at(batch[batch.length - 1].add_time) < SINCE) break;
  if (!res.additional_data?.pagination?.more_items_in_collection) break;
  start = res.additional_data.pagination.next_start ?? start + 100;
}

console.log(found.length ? `  ${found.length} lead(s).` : "  none found in that window.");

for (const lead of found) {
  console.log(`\n  --- Lead ${lead.id} ---`);
  console.log(`  title:      ${lead.title}`);
  console.log(`  created:    ${lead.add_time}`);
  console.log(`  owner_id:   ${lead.owner_id ?? "(none)"}`);
  console.log(`  archived:   ${lead.is_archived}`);

  const notes = await get(`/notes?lead_id=${lead.id}&limit=20`);
  for (const note of notes?.data ?? []) {
    const text = strip(note.content);
    const source = text.match(/\*\*Source:\*\*.{0,140}/)?.[0] ?? text.match(/Source:.{0,140}/)?.[0];
    console.log(`  SOURCE:     ${source ? source.trim() : "(no Source line found)"}`);
    console.log(`  campaign:   ${/Speak to Juliet/i.test(text) ? "YES, the note names Speak to Juliet" : "NO, the note names no campaign"}`);
  }

  if (lead.person_id) {
    const person = await get(`/persons/${lead.person_id}`);
    const emails = (person?.data?.email ?? []).map((e: any) => e.value).join(", ");
    const phones = (person?.data?.phone ?? []).map((p: any) => p.value).join(", ");
    console.log(`  person:     ${lead.person_id} | ${person?.data?.name} | ${emails} | ${phones}`);
  }
}

console.log("\n=== Who the live service notifies, read from its own configuration ===");
console.log(`  general staff list:   ${ENV.staffNotifyEmails.join(", ")}`);
console.log(`  speak-to-juliet list: ${(ENV.campaignNotifyEmails["speak-to-juliet"] ?? []).join(", ")}`);
console.log(`  send-as mailbox:      ${ENV.microsoftSendAsMailbox}`);
