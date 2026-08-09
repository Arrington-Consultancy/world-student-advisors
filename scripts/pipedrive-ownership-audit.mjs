// Read-only. No writes, no reassignment, ever — every call in this file is
// a GET. Investigates, against the real production Pipedrive account:
//   1. Lead owner_id on Leads that have genuinely been allocated away from
//      Tim (the default owner), to see what "allocated" looks like live.
//   2. Deal owner_id on real Deals, and whether it matches the Lead owner
//      for the same Person (does ownership carry over on conversion).
//   3. Full personFields / dealFields definitions, to find any field that
//      represents "Student Counsellor", "Source Owner", or
//      "Referrer/Student Source" beyond what server/pipedrive.ts already
//      knows about (PF.recommendedCounsellor, PF.referredBy).
//   4. Live pipeline stages (id + name), so a future stage_id-keyed config
//      layer can be built against real IDs instead of guessed ones.
//   5. Whether STAFF_NOTIFY_EMAILS (the list notifyStaff() emails on every
//      enquiry) currently includes Eldah in this real environment.
// Never prints the API token.

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

const KNOWN_OWNERS = {
  25629968: "Tim Hunt",
  25633444: "Eldah Therone",
  25633433: "Glenice Owino",
  25633422: "Manet Khamayo",
  25633455: "Sarafina Kihumbu",
};
const TIM_ID = 25629968;

// What this codebase already knows about (server/pipedrive.ts PF map),
// used to label matches instead of just printing raw hash keys.
const KNOWN_PERSON_FIELD_KEYS = {
  "91cce905e99d4d7ad6a8e2b4db41b89f8a5a72cf": "recommendedCounsellor (existing PF.recommendedCounsellor)",
  "a08cf6343f3d302fdf15306c24d01e004ab47724": "referredBy (existing PF.referredBy)",
};

if (!process.env.PIPEDRIVE_API_TOKEN) {
  console.error("PIPEDRIVE_API_TOKEN is not set in this environment.");
  process.exit(1);
}

async function pipedriveGet(path) {
  const url = `${PIPEDRIVE_BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${process.env.PIPEDRIVE_API_TOKEN}`;
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Pipedrive API error (${response.status}) on ${path}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

function ownerName(id) {
  if (!id) return "(none)";
  return KNOWN_OWNERS[id] ?? `(unrecognised owner id ${id})`;
}

// Custom field values live as top-level keys on the record, named by a long
// hex-ish hash. Pull out only those, with a non-null value, and label them
// with the human name from the matching field-definitions list.
function customFieldEntries(record, fieldDefsByKey, knownLabels = {}) {
  const HASH_KEY = /^[0-9a-f]{15,}$/i;
  return Object.entries(record)
    .filter(([key, value]) => HASH_KEY.test(key) && value !== null && value !== undefined && value !== "")
    .map(([key, value]) => {
      const label = knownLabels[key] ?? fieldDefsByKey.get(key)?.name ?? "(no matching field definition found)";
      const printedValue = typeof value === "object" ? JSON.stringify(value) : value;
      return `      - ${label} [${key}]: ${printedValue}`;
    });
}

function section(title) {
  console.log(`\n${"=".repeat(80)}\n${title}\n${"=".repeat(80)}`);
}

try {
  section("0. STAFF_NOTIFY_EMAILS — resolved live in this environment");
  const raw = process.env.STAFF_NOTIFY_EMAILS;
  if (raw) {
    console.log(`STAFF_NOTIFY_EMAILS is explicitly set in this environment:`);
    console.log(`  ${raw}`);
  } else {
    console.log(`STAFF_NOTIFY_EMAILS is NOT set — server/_core/env.ts DEFAULT_STAFF_NOTIFY_EMAILS applies:`);
    console.log(
      `  tim.hunt@worldstudentadvisors.com, eldah@worldstudentadvisors.com, sarafina@worldstudentadvisors.com, glenice@worldstudentadvisors.com, manet@worldstudentadvisors.com, tom@arringtonconsultancy.com, pipedrive@worldstudentadvisors.com`
    );
  }
  console.log(`(This is the list notifyStaff() emails on every successful sign-up, independent of Pipedrive followers.)`);

  section("1. Person custom field definitions (/personFields)");
  const personFields = (await pipedriveGet("/personFields")).data ?? [];
  const personFieldsByKey = new Map(personFields.map(f => [f.key, f]));
  for (const f of personFields) {
    console.log(`  id=${f.id} key=${f.key} name="${f.name}"`);
  }

  section("2. Deal custom field definitions (/dealFields)");
  const dealFields = (await pipedriveGet("/dealFields")).data ?? [];
  const dealFieldsByKey = new Map(dealFields.map(f => [f.key, f]));
  for (const f of dealFields) {
    console.log(`  id=${f.id} key=${f.key} name="${f.name}"`);
  }

  section("3. Live pipeline stages (/stages)");
  const stages = (await pipedriveGet("/stages")).data ?? [];
  for (const s of stages) {
    console.log(`  pipeline_id=${s.pipeline_id} stage_id=${s.id} order_nr=${s.order_nr} name="${s.name}"`);
  }

  section("4. Recent Leads with owner_id != Tim (genuinely allocated, not default)");
  const leadsResult = (await pipedriveGet("/leads?limit=100")).data ?? [];
  const allocatedLeads = leadsResult.filter(l => l.owner_id && l.owner_id.id !== TIM_ID);
  console.log(`Fetched ${leadsResult.length} recent Lead(s); ${allocatedLeads.length} have an owner other than Tim.`);

  const samplePersonIds = [];
  for (const lead of allocatedLeads.slice(0, 8)) {
    const ownerId = typeof lead.owner_id === "object" ? lead.owner_id.id : lead.owner_id;
    const personId = typeof lead.person_id === "object" ? lead.person_id.value : lead.person_id;
    console.log(`\n  Lead ${lead.id} | title="${lead.title}"`);
    console.log(`    owner_id=${ownerId} (${ownerName(ownerId)})`);
    console.log(`    person_id=${personId} | is_archived=${lead.is_archived} | add_time=${lead.add_time} | update_time=${lead.update_time}`);
    const leadCustom = customFieldEntries(lead, dealFieldsByKey);
    if (leadCustom.length) {
      console.log(`    Lead-level custom fields present:`);
      leadCustom.forEach(line => console.log(line));
    }
    if (personId) samplePersonIds.push({ personId, leadOwnerId: ownerId, leadId: lead.id });
  }

  section("5. Person records for the allocated Leads above (recommendedCounsellor / referredBy / any other custom field)");
  for (const { personId, leadOwnerId, leadId } of samplePersonIds) {
    try {
      const person = (await pipedriveGet(`/persons/${personId}`)).data;
      console.log(`\n  Person ${personId} (from Lead ${leadId}, Lead owner=${ownerName(leadOwnerId)})`);
      const personCustom = customFieldEntries(person, personFieldsByKey, KNOWN_PERSON_FIELD_KEYS);
      if (personCustom.length) {
        personCustom.forEach(line => console.log(line));
      } else {
        console.log(`      (no non-null custom fields found on this Person)`);
      }
    } catch (e) {
      console.log(`  Person ${personId}: lookup failed — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  section("6. Recent Deals (/deals) — owner_id, stage_id, custom fields");
  const deals = (await pipedriveGet("/deals?limit=50&sort=update_time%20DESC")).data ?? [];
  console.log(`Fetched ${deals.length} recent Deal(s).`);
  const dealPersonIds = new Set();
  for (const deal of deals) {
    // Deals use `user_id` as the owner field key (confirmed live against
    // /dealFields: id=3 key=user_id name="Owner") — NOT `owner_id`, unlike
    // Leads and Persons. Reading deal.owner_id here would silently look up
    // a field that doesn't exist on a Deal object.
    const ownerId = typeof deal.user_id === "object" ? deal.user_id.id : deal.user_id;
    const personId = typeof deal.person_id === "object" ? deal.person_id.value : deal.person_id;
    dealPersonIds.add(personId);
    console.log(`\n  Deal ${deal.id} | title="${deal.title}"`);
    console.log(`    owner (user_id)=${ownerId} (${ownerName(ownerId)}) | stage_id=${deal.stage_id} | status=${deal.status}`);
    console.log(`    person_id=${personId} | add_time=${deal.add_time} | update_time=${deal.update_time}`);
    const dealCustom = customFieldEntries(deal, dealFieldsByKey);
    if (dealCustom.length) {
      console.log(`    Deal-level custom fields present:`);
      dealCustom.forEach(line => console.log(line));
    }
  }

  section("7. Cross-reference — does any sampled allocated-Lead Person also have a Deal?");
  const overlap = samplePersonIds.filter(({ personId }) => dealPersonIds.has(personId));
  if (overlap.length === 0) {
    console.log("  No overlap found between the sampled allocated-Lead Persons and the recent Deals list.");
    console.log("  (Not proof no such case exists — only that none appeared in this Lead/Deal sample window.)");
  } else {
    for (const { personId, leadOwnerId, leadId } of overlap) {
      const matchingDeals = deals.filter(d => (typeof d.person_id === "object" ? d.person_id.value : d.person_id) === personId);
      for (const deal of matchingDeals) {
        const dealOwnerId = typeof deal.user_id === "object" ? deal.user_id.id : deal.user_id;
        console.log(
          `  Person ${personId}: Lead ${leadId} owner=${ownerName(leadOwnerId)} -> Deal ${deal.id} owner=${ownerName(dealOwnerId)} (${leadOwnerId === dealOwnerId ? "SAME" : "DIFFERENT"})`
        );
      }
    }
  }

  console.log("\nDone. Read-only — no records were modified.");
} catch (error) {
  console.error("Audit failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
