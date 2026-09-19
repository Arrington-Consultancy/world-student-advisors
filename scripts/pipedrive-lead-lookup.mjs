// Read-only. Looks up a Person by email, then their most recent Lead, and
// prints person id / lead id / lead title / owner_id (resolved to a known
// counsellor name where possible). No mutation, no writes, ever. Never
// prints the API token — it lives only in the request URL, built the same
// way server/pipedrive.ts does.

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

const KNOWN_OWNERS = {
  25629968: "Tim Hunt",
  25633444: "Eldah Therone",
  25633433: "Glenice Owino",
  25633422: "Manet Khamayo",
  25633455: "Sarafina Kihumbu",
};

const term = process.env.LOOKUP_EMAIL;
if (!term) {
  console.error("LOOKUP_EMAIL is not set.");
  process.exit(1);
}

// The same input accepts a phone number as well as an address, because the
// thing you have to hand after a form submission is not always the address.
// A UK national number is also tried in international form, since that is
// what the sign-up form stores.
const isEmail = term.includes("@");
const digits = term.replace(/[^0-9+]/g, "");
const candidates = isEmail
  ? [term]
  : [...new Set([
      digits,
      digits.startsWith("0") ? `+44${digits.slice(1)}` : "",
      digits.startsWith("0") ? `44${digits.slice(1)}` : "",
      digits.startsWith("+") ? digits.slice(1) : "",
    ].filter(Boolean))];
const field = isEmail ? "email" : "phone";
if (!process.env.PIPEDRIVE_API_TOKEN) {
  console.error("PIPEDRIVE_API_TOKEN is not set in this environment.");
  process.exit(1);
}

async function pipedriveGet(path) {
  const url = `${PIPEDRIVE_BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${process.env.PIPEDRIVE_API_TOKEN}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pipedrive API error (${response.status}) on ${path}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

try {
  let personId;
  let matched;
  for (const candidate of candidates) {
    const search = await pipedriveGet(
      `/persons/search?term=${encodeURIComponent(candidate)}&fields=${field}&exact_match=true`
    );
    const items = search?.data?.items ?? [];
    if (items[0]?.item?.id) {
      personId = items[0].item.id;
      matched = candidate;
      break;
    }
    console.log(`  no ${field} match for ${candidate}`);
  }

  if (!personId) {
    console.log(`No Pipedrive Person found for ${term}.`);
    process.exit(0);
  }

  console.log(`Person found: id=${personId} (matched ${field} ${matched})`);

  const leadsResult = await pipedriveGet(`/leads?person_id=${personId}&limit=10`);
  const leads = leadsResult?.data ?? [];

  if (!leads.length) {
    console.log("No Leads found for this Person.");
    process.exit(0);
  }

  console.log(`Found ${leads.length} Lead(s) for this Person:`);
  for (const lead of leads) {
    const ownerName = KNOWN_OWNERS[lead.owner_id] ?? "(unrecognised owner id)";
    console.log(
      `  - Lead ${lead.id} | title="${lead.title}" | owner_id=${lead.owner_id ?? "(none)"} (${ownerName}) | created=${lead.add_time ?? "?"} | is_archived=${lead.is_archived}`
    );
  }
} catch (error) {
  console.error("Lookup failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
