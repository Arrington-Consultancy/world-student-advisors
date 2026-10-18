// READ-ONLY probe for the Speak to Pedro (Angola) page, Tom Arrington's brief
// of 18 October 2026: "Check the real Pipedrive configuration. The
// recommended counsellor field is not sufficient proof of ownership."
//
// Answers three questions and prints nothing about any student:
//   1. Which lead/deal custom fields could carry a source owner or referrer
//      (key, name, type only).
//   2. Which Pipedrive users exist (id and name only, no email), and whether
//      Pedro Bezerra, Madalitso Dube and Eldah Therone are among them.
//   3. For leads created by Pipedrive web forms since 1 October 2026: the
//      form (channel id), the native Lead Owner and creator, and the value of
//      any source-owner/referrer field, resolved to a staff user's name. No
//      lead title, person, organisation, note or contact detail is read.
//
// GET requests only. Creates, edits and sends nothing. No token is printed.
const token = process.env.PIPEDRIVE_API_TOKEN;
if (!token) { console.error("PIPEDRIVE_API_TOKEN is not set."); process.exit(1); }
const get = async (path) => {
  const r = await fetch(`https://api.pipedrive.com/v1${path}${path.includes("?") ? "&" : "?"}api_token=${token}`);
  if (!r.ok) { console.error(`GET ${path.split("?")[0]} -> HTTP ${r.status}`); return null; }
  return await r.json();
};

const SOURCEISH = /source|owner|refer|agent|rep\b|representative|introduc|country director/i;

console.log("\n=== 1. Lead/deal fields that could carry a source owner or referrer ===");
const dealFields = (await get("/dealFields?limit=500"))?.data ?? [];
const candidates = dealFields.filter(f => SOURCEISH.test(f.name));
for (const f of candidates) console.log(`  ${f.key}  "${f.name}"  ${f.field_type}${f.edit_flag === false ? " (system)" : ""}`);
const userTypeCustom = candidates.filter(f => f.field_type === "user" && f.edit_flag !== false);
console.log(`  custom user-type fields among them: ${userTypeCustom.map(f => `"${f.name}"`).join(", ") || "none"}`);

console.log("\n=== 2. Pipedrive users (id and name only) ===");
const users = (await get("/users"))?.data ?? [];
const nameOf = new Map(users.map(u => [u.id, u.name]));
for (const u of users) console.log(`  id=${u.id}  ${u.name}  active=${u.active_flag}`);
for (const who of ["Pedro", "Madalitso", "Eldah"]) {
  const hit = users.find(u => new RegExp(who, "i").test(u.name));
  console.log(`  ${who} is a Pipedrive user: ${hit ? `YES (id=${hit.id}, active=${hit.active_flag})` : "NO"}`);
}

console.log("\n=== 3. Web-form leads since 2026-10-01: form, owner and source fields ===");
const since = Date.parse("2026-10-01T00:00:00Z");
let start = 0, scanned = 0;
const rows = [];
for (;;) {
  const page = await get(`/leads?limit=500&start=${start}&archived_status=all`);
  const data = page?.data ?? [];
  scanned += data.length;
  for (const l of data) {
    const created = Date.parse(l.add_time ?? "");
    if (!(created >= since)) continue;
    if (l.origin !== "WebForms" && l.source_name !== "Web forms") continue;
    rows.push(l);
  }
  const more = page?.additional_data?.pagination?.more_items_in_collection;
  if (!more || data.length === 0) break;
  start += data.length;
}
console.log(`  scanned ${scanned} lead(s); ${rows.length} web-form lead(s) since 1 October`);
const label = (v) => {
  if (v == null || v === "") return "(empty)";
  const id = typeof v === "object" ? (v.id ?? v.value) : v;
  return nameOf.has(Number(id)) ? `${nameOf.get(Number(id))} (user ${id})` : `"${String(typeof v === "object" ? JSON.stringify(v) : v).slice(0, 40)}"`;
};
const byForm = new Map();
for (const l of rows) {
  const form = l.channel_id ?? "(no channel id)";
  if (!byForm.has(form)) byForm.set(form, []);
  byForm.get(form).push(l);
}
for (const [form, leads] of byForm) {
  console.log(`\n  form "${form}": ${leads.length} lead(s)`);
  for (const l of leads.slice(-3)) {
    const ownerId = typeof l.owner_id === "object" ? l.owner_id?.id : l.owner_id;
    const creatorId = typeof l.creator_id === "object" ? l.creator_id?.id : l.creator_id;
    console.log(`    created ${l.add_time}  owner_id=${label(ownerId)}  creator=${label(creatorId)}`);
    for (const f of candidates.filter(f => f.edit_flag !== false)) {
      if (f.key in l) console.log(`      ${f.name}: ${label(l[f.key])}`);
    }
  }
}
console.log("\nProbe complete. Nothing was created, edited or sent.");
process.exit(0);
