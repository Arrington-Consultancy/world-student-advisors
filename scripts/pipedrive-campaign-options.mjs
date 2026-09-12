/**
 * Add the two Pipedrive options the Nigeria campaign needs, so every
 * programme type and destination it advertises can be measured.
 *
 * Tom Arrington, 12 September 2026: Taught Master's, MPhil, MRes and PhD
 * must stay four separate values, and UK, Germany and Canada three
 * separate destinations, all the way into the CRM. Pipedrive already has
 * options for Taught Master's, MPhil, PhD, UK and Canada. It has none for
 * MRes or Germany, so this adds exactly those two.
 *
 * ADDITIVE ONLY, AND IT PROVES IT. Existing options are re-sent verbatim
 * with their ids, so none is renamed, reordered or removed, and the script
 * refuses to write if the field it read back does not still contain every
 * option it started with. Idempotent: an option that already exists is
 * reported and not added again.
 *
 * Dry run unless --apply is passed. The token is never printed.
 */
const TOKEN = process.env.PIPEDRIVE_API_TOKEN;
if (!TOKEN) { console.error("PIPEDRIVE_API_TOKEN is not set in this environment."); process.exit(1); }

const APPLY = process.argv.includes("--apply");

/** field key -> the option label to ensure exists. */
const WANTED = [
  { fieldKey: "307e8c7f3a14e8f6a24839151f093ce0f9c93365", fieldName: "Desired Level of Study", label: "MRes research degree" },
  { fieldKey: "1f3f30e974eaf7b88d1cd95b43efffc129abd71c", fieldName: "Preferred Study Destination", label: "Germany" },
];

async function api(path, init) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`https://api.pipedrive.com/v1${path}${sep}api_token=${TOKEN}`, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.success === false) {
    throw new Error(`${init?.method ?? "GET"} ${path.split("?")[0]} failed: HTTP ${r.status} ${JSON.stringify(body.error ?? body).slice(0, 200)}`);
  }
  return body;
}

async function allPersonFields() {
  const out = [];
  for (let start = 0; start < 100 * 500; start += 500) {
    const j = await api(`/personFields?limit=500&start=${start}`);
    out.push(...(j.data ?? []));
    if (!j.additional_data?.pagination?.more_items_in_collection) break;
  }
  return out;
}

console.log(APPLY ? "\nMODE: APPLY (will write)\n" : "\nMODE: DRY RUN (writes nothing; pass --apply to write)\n");

const fields = await allPersonFields();
let changed = 0;

for (const want of WANTED) {
  const field = fields.find(f => f.key === want.fieldKey);
  if (!field) { console.error(`FAIL  field not found: ${want.fieldName} (${want.fieldKey})`); process.exitCode = 1; continue; }
  const options = field.options ?? [];
  console.log(`${want.fieldName}  id ${field.id}  ${options.length} option(s)`);

  const existing = options.find(o => String(o.label).trim().toLowerCase() === want.label.toLowerCase());
  if (existing) {
    console.log(`  ok    "${want.label}" already exists, option id ${existing.id}. Nothing to do.\n`);
    continue;
  }

  console.log(`  add   "${want.label}" is missing and would be appended.`);
  console.log(`        existing options kept exactly as they are: ${options.map(o => `${o.id}=${o.label}`).join(", ")}`);
  if (!APPLY) { console.log("        (dry run, nothing written)\n"); changed += 1; continue; }

  // Re-send every existing option with its id, then the new one by label.
  const payload = { options: [...options.map(o => ({ id: o.id, label: o.label })), { label: want.label }] };
  await api(`/personFields/${field.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Read back and prove nothing was lost.
  const after = (await api(`/personFields/${field.id}`)).data;
  const afterOptions = after.options ?? [];
  const lost = options.filter(o => !afterOptions.some(a => String(a.id) === String(o.id) && a.label === o.label));
  if (lost.length) {
    console.error(`  FAIL  ${lost.length} pre-existing option(s) changed or vanished: ${lost.map(o => `${o.id}=${o.label}`).join(", ")}`);
    process.exitCode = 1;
    continue;
  }
  const added = afterOptions.find(o => String(o.label).trim().toLowerCase() === want.label.toLowerCase());
  if (!added) { console.error(`  FAIL  "${want.label}" is still not present after the write.`); process.exitCode = 1; continue; }
  console.log(`  done  "${want.label}" added as option id ${added.id}; all ${options.length} previous options intact.\n`);
  changed += 1;
}

console.log(APPLY
  ? `RESULT: ${changed} option(s) added. Put the new ids into LEVEL_MAP / DESTINATION_MAP in server/pipedrive.ts.`
  : `RESULT: ${changed} option(s) would be added. Re-run with --apply to write.`);
