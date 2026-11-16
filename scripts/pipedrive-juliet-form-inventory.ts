/**
 * Read-only inventory of Tim Hunt's Speak to Juliet Pipedrive form.
 *
 * Purpose: establish everything the API can tell us about that form before
 * anyone considers replacing the website's own enquiry route with it. The
 * question is not "does it work" but "what would we lose", so this reports
 * the form's own configuration AND the capabilities the website path
 * currently provides, so the two can be compared honestly.
 *
 * GET requests only. It creates nothing, edits nothing, publishes nothing,
 * disables nothing and sends nothing. The API token is never printed.
 *
 * Endpoints that do not exist are reported as such rather than skipped: a
 * 404 from /webForms is itself a finding, because it tells us the embed
 * code can only come from Pipedrive's own interface.
 */
const BASE = "https://api.pipedrive.com/v1";
const TOKEN = process.env.PIPEDRIVE_API_TOKEN;
if (!TOKEN) {
  console.error("PIPEDRIVE_API_TOKEN is not set in this environment.");
  process.exit(1);
}

/** A GET that never throws, so one missing endpoint cannot end the inventory. */
async function probe(path: string): Promise<{ ok: boolean; status: number; body: any }> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${TOKEN}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    let body: any = text;
    try { body = JSON.parse(text); } catch { /* keep the raw text */ }
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: String(error) };
  }
}

const line = (s: string) => console.log(s);
const head = (s: string) => console.log(`\n=== ${s} ===`);
const strip = (html: unknown) =>
  String(html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/* 1. Does the API expose web forms at all? ------------------------------ */
head("1. Web form endpoints");
for (const path of ["/webForms", "/webforms", "/leadBooster/webForms", "/forms"]) {
  const r = await probe(`${path}?limit=50`);
  if (r.ok) {
    const rows = r.body?.data ?? [];
    line(`  ${path}: HTTP ${r.status}, ${Array.isArray(rows) ? rows.length : "?"} item(s)`);
    line(`  ${JSON.stringify(r.body).slice(0, 2000)}`);
  } else {
    const msg = typeof r.body === "object" ? (r.body?.error ?? JSON.stringify(r.body).slice(0, 160)) : String(r.body).slice(0, 160);
    line(`  ${path}: HTTP ${r.status} — ${msg}`);
  }
}

/* 2. Lead sources and channels ------------------------------------------ */
head("2. Lead sources and channels");
for (const path of ["/leadSources", "/leadLabels", "/dealFields?start=0&limit=500"]) {
  const r = await probe(path);
  if (!r.ok) { line(`  ${path}: HTTP ${r.status}`); continue; }
  const rows: any[] = r.body?.data ?? [];
  if (path === "/leadSources") {
    line(`  lead sources: ${rows.map(s => s.name).join(", ")}`);
  } else if (path === "/leadLabels") {
    line(`  lead labels: ${rows.map(s => `${s.name} (${s.id})`).join(", ")}`);
  } else {
    const interesting = rows.filter(f =>
      /source|owner|counsellor|juliet|spoke|campaign|channel|form/i.test(String(f.name)));
    line(`  fields whose name mentions source/owner/counsellor/campaign/form:`);
    for (const f of interesting) {
      const opts = (f.options ?? []).map((o: any) => `${o.label}=${o.id}`).join(", ");
      line(`    "${f.name}" [${f.field_type}] key=${f.key}${opts ? ` options: ${opts}` : ""}`);
    }
  }
}

/* 3. Who exists as a Pipedrive user ------------------------------------- */
head("3. Pipedrive users, for owner and source attribution");
{
  const r = await probe("/users");
  const rows: any[] = r.body?.data ?? [];
  for (const u of rows) {
    line(`  id=${u.id} ${u.name} <${u.email}> active=${u.active_flag}`);
  }
  const juliet = rows.find(u => /juliet/i.test(`${u.name} ${u.email}`));
  line(`  Juliet as a Pipedrive user: ${juliet ? `YES, id=${juliet.id}` : "NO — she is not a user, so she cannot be a Lead Owner"}`);
}

/* 4. The form's own leads ----------------------------------------------- */
head("4. Leads the form has actually created");
{
  // Tim's own test on 19 September came through his address.
  const search = await probe(`/persons/search?term=${encodeURIComponent("tim.hunt@worldstudentadvisors.com")}&fields=email&exact_match=true`);
  const personId = search.body?.data?.items?.[0]?.item?.id;
  line(`  Tim's Person id: ${personId ?? "(none found)"}`);
  if (personId) {
    const leads = await probe(`/leads?person_id=${personId}&limit=50&archived_status=all`);
    const rows: any[] = leads.body?.data ?? [];
    line(`  ${rows.length} lead(s) on that Person`);
    for (const lead of rows) {
      line(`\n  --- Lead ${lead.id} ---`);
      line(`  title:        ${lead.title}`);
      line(`  created:      ${lead.add_time ?? lead.created_at}`);
      line(`  owner_id:     ${lead.owner_id ?? "(none)"}`);
      line(`  creator_id:   ${lead.creator_id ?? "(none)"}`);
      line(`  source_name:  ${lead.source_name ?? "(none)"}`);
      line(`  channel:      ${lead.channel ?? "(none)"} / channel_id: ${lead.channel_id ?? "(none)"}`);
      line(`  label_ids:    ${JSON.stringify(lead.label_ids ?? [])}`);
      line(`  origin:       ${lead.origin ?? "(none)"} / origin_id: ${lead.origin_id ?? "(none)"}`);
      line(`  is_archived:  ${lead.is_archived}`);
      // Any custom keys carried on the lead, which is where a Student Source would live.
      const known = new Set(["id","title","owner_id","creator_id","label_ids","person_id","organization_id","source_name","origin","origin_id","channel","channel_id","is_archived","was_seen","value","expected_close_date","next_activity_id","add_time","update_time","visible_to","cc_email","creator","person_name","organization_name"]);
      const custom = Object.entries(lead).filter(([k]) => !known.has(k));
      if (custom.length) line(`  other keys:   ${custom.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" | ")}`);
      const notes = await probe(`/notes?lead_id=${lead.id}&limit=10`);
      for (const note of notes.body?.data ?? []) {
        line(`  NOTE: ${strip(note.content).slice(0, 400)}`);
      }
    }
  }
}

/* 5. What the website path provides, for honest comparison --------------- */
head("5. What the current website enquiry path provides");
line("  Read from the repository, not from Pipedrive, and listed so that");
line("  anything Tim's form does not do is a conscious trade rather than a");
line("  surprise after the swap:");
line("    - Cloudflare Turnstile bot verification before anything is written");
line("    - server-side validation of every field against the controlled");
line("      enquiry vocabulary in shared/studentEnquiryOptions.ts");
line("    - Person deduplication by email or phone before a Lead is created");
line("    - Google Ads click identifiers (gclid / gbraid / wbraid) and all");
line("      five UTM parameters written to the Lead's custom fields");
line("    - the Submit lead conversion reported to Google Ads, carrying a");
line("      SHA-256 hash of the student's email and phone");
line("    - a Student Portal account created and the setup link emailed");
line("    - an applicant acknowledgement email");
line("    - the campaign notification to the four authorised recipients");
line("    - a durable record of any submission that failed to save");

/* 6. Webhooks, which would reveal any onward automation ------------------ */
head("6. Webhooks configured on the account");
{
  const r = await probe("/webhooks");
  if (!r.ok) { line(`  /webhooks: HTTP ${r.status}`); }
  else {
    const rows: any[] = r.body?.data ?? [];
    line(`  ${rows.length} webhook(s)`);
    for (const w of rows) {
      line(`    ${w.event_action}.${w.event_object} -> ${w.subscription_url} (owner ${w.owner_id}, active ${w.active_flag})`);
    }
  }
}

console.log("\nInventory complete. Nothing was created, edited or sent.");
