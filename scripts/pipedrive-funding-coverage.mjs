/**
 * Read-only: how well is funding recorded on WSA's people?
 *
 * Tom Arrington asked how many cold leads are self funded. Pipedrive has a
 * person field "Education Funding" whose first option is "I have my own
 * money (self-funding)", so the question is answerable in principle. Whether
 * it is answerable in practice depends on how many records carry a value,
 * and that is what this prints.
 *
 * Counts only. No name, no email, no record content, and the token is never
 * printed. Writes nothing to Pipedrive.
 */
const TOKEN = process.env.PIPEDRIVE_API_TOKEN;
if (!TOKEN) { console.error("PIPEDRIVE_API_TOKEN is not set in this environment."); process.exit(1); }

const EDUCATION_FUNDING = "147e0f451a4bd38bc35d7c1fe8c8631fee212160";
const FUNDING_SOURCE = "ccc2c853c22101435d6059306fcb644e2bf0a284";

async function get(path) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`https://api.pipedrive.com/v1${path}${sep}api_token=${TOKEN}`);
  if (!r.ok) throw new Error(`GET ${path.split("?")[0]} failed: HTTP ${r.status}`);
  return r.json();
}

async function listAll(path) {
  const out = [];
  for (let start = 0; start < 200 * 500; start += 500) {
    const sep = path.includes("?") ? "&" : "?";
    const j = await get(`${path}${sep}limit=500&start=${start}`);
    const batch = Array.isArray(j.data) ? j.data : [];
    out.push(...batch);
    if (!j.additional_data?.pagination?.more_items_in_collection) break;
  }
  return out;
}

const fields = await listAll("/personFields");
const funding = fields.find(f => f.key === EDUCATION_FUNDING);
const labelById = new Map((funding?.options ?? []).map(o => [String(o.id), o.label]));
console.log(`\nEducation Funding options: ${labelById.size}`);
for (const [id, label] of labelById) console.log(`  ${id}  ${label}`);

const persons = await listAll("/persons");
console.log(`\npersons read: ${persons.length}`);

const counts = new Map();
let blankEducation = 0;
let anyFundingSource = 0;
let recentWithValue = 0;
let recentTotal = 0;
const MAY = Date.parse("2026-05-01T00:00:00Z");

for (const p of persons) {
  const raw = p[EDUCATION_FUNDING];
  const key = raw === null || raw === undefined || raw === "" ? null : String(raw);
  if (key === null) blankEducation += 1;
  else counts.set(key, (counts.get(key) ?? 0) + 1);
  if (p[FUNDING_SOURCE]) anyFundingSource += 1;

  const added = Date.parse(String(p.add_time ?? "").replace(" ", "T") + "Z");
  if (Number.isFinite(added) && added >= MAY) {
    recentTotal += 1;
    if (key !== null) recentWithValue += 1;
  }
}

const withValue = persons.length - blankEducation;
const pct = n => `${((n / Math.max(1, persons.length)) * 100).toFixed(1)}%`;
console.log(`\nEducation Funding recorded on ${withValue} of ${persons.length} (${pct(withValue)}); blank on ${blankEducation}.`);
for (const [id, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${labelById.get(id) ?? `(unrecognised option ${id})`}`);
}
console.log(`\nFree-text "Funding Source" populated on ${anyFundingSource} of ${persons.length}.`);
console.log(`Since 1 May 2026, the period the mirror reports on reliably: ${recentWithValue} of ${recentTotal} people carry a funding value.`);
