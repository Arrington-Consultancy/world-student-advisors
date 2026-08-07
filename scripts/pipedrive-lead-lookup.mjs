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

const email = process.env.LOOKUP_EMAIL;
if (!email) {
  console.error("LOOKUP_EMAIL is not set.");
  process.exit(1);
}
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
  const search = await pipedriveGet(
    `/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true`
  );
  const items = search?.data?.items ?? [];
  const personId = items[0]?.item?.id;

  if (!personId) {
    console.log(`No Pipedrive Person found for ${email}.`);
    process.exit(0);
  }

  console.log(`Person found: id=${personId}`);

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
