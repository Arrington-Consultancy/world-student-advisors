// READ-ONLY inventory of the WSA Pipedrive schema: field KEYS, names and
// types for persons, deals and leads, plus pipeline stages. No record data
// is fetched. No token is printed. Runs inside the Railway service.
//
// Tom Arrington, 11 September 2026: inspect the actual WSA Pipedrive schema
// and create the minimum useful field projection for each worker from its
// approved remit. This is the inspection.
const token = process.env.PIPEDRIVE_API_TOKEN;
if (!token) { console.error("PIPEDRIVE_API_TOKEN is not set."); process.exit(1); }
const get = async (path) => {
  const r = await fetch(`https://api.pipedrive.com/v1${path}${path.includes("?") ? "&" : "?"}api_token=${token}`);
  if (!r.ok) { console.error(`GET ${path} -> HTTP ${r.status}`); return null; }
  return (await r.json()).data ?? [];
};
for (const [label, path] of [["PERSON FIELDS", "/personFields"], ["DEAL FIELDS", "/dealFields"], ["LEAD LABELS", "/leadLabels"]]) {
  const data = await get(path);
  if (!data) continue;
  console.log(`\n=== ${label} (${data.length}) ===`);
  for (const f of data) {
    const opts = Array.isArray(f.options) ? ` options=[${f.options.map(o => o.label).join(" | ")}]` : "";
    console.log(`  ${f.key}  "${f.name}"  ${f.field_type}${f.edit_flag === false ? " (system)" : ""}${opts}`);
  }
}
const stages = await get("/stages");
if (stages) {
  console.log(`\n=== STAGES (${stages.length}) ===`);
  for (const s of stages) console.log(`  pipeline ${s.pipeline_id} stage ${s.id} order ${s.order_nr}: "${s.name}"`);
}
const pipelines = await get("/pipelines");
if (pipelines) {
  console.log(`\n=== PIPELINES (${pipelines.length}) ===`);
  for (const p of pipelines) console.log(`  ${p.id}: "${p.name}"`);
}
process.exit(0);
