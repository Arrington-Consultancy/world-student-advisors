// Strictly read-only. Reproduces exactly what server/portal-resolver.ts's
// resolvePortalDashboard() computes for a given Pipedrive Person id, by
// calling the same two read-only endpoints server/pipedrive-read.ts uses
// (getOpenDealForPerson, getOpenLeadForPerson) with identical logic, and
// printing every intermediate value — not just the final answer — so the
// exact reasoning is visible, not inferred.
//
// No writes anywhere in this file.

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set in this environment.`);
    process.exit(1);
  }
  return value;
}

const pipedriveToken = requireEnv("PIPEDRIVE_API_TOKEN");
const personId = Number(requireEnv("TRACE_PERSON_ID"));

if (!Number.isInteger(personId) || personId <= 0) {
  console.error(`TRACE_PERSON_ID must be a positive integer, got: ${process.env.TRACE_PERSON_ID}`);
  process.exit(1);
}

async function pipedriveGet(path) {
  const url = `${PIPEDRIVE_BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${pipedriveToken}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pipedrive GET ${path} failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return response.json();
}

function resolveOwnerId(value) {
  if (value && typeof value === "object" && "id" in value) return value.id;
  if (typeof value === "number") return value;
  return null;
}

try {
  console.log(`Tracing resolvePortalDashboard(${personId}) exactly as server/portal-resolver.ts would run it.`);
  console.log("=".repeat(80));

  // Step 1: getOpenDealForPerson — GET /persons/{id}/deals?status=open
  console.log(`\nStep 1: GET /persons/${personId}/deals?status=open`);
  const dealsResult = await pipedriveGet(`/persons/${personId}/deals?status=open`);
  const deals = dealsResult?.data ?? [];
  console.log(`  Open Deals returned: ${deals.length}`);
  for (const d of deals) {
    console.log(`    Deal ${d.id} | title="${d.title}" | stage_id=${d.stage_id} | update_time=${d.update_time}`);
  }

  let openDeal = null;
  if (deals.length) {
    const [mostRecent] = [...deals].sort((a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime());
    openDeal = { id: mostRecent.id, stageId: mostRecent.stage_id, ownerId: resolveOwnerId(mostRecent.user_id), updateTime: mostRecent.update_time };
  }

  if (openDeal) {
    console.log(`\n  getOpenDealForPerson(${personId}) => Deal ${openDeal.id} (stageId=${openDeal.stageId}) — this WINS. getOpenLeadForPerson is never called.`);
    console.log(`  resolvePortalDashboard would return: state="resolved" (from the Deal branch), driven by stageId=${openDeal.stageId}.`);
    console.log("\nAudit complete. No writes were made.");
    process.exit(0);
  }

  console.log(`\n  getOpenDealForPerson(${personId}) => null (no open Deals). Falling through to getOpenLeadForPerson.`);

  // Step 2: getOpenLeadForPerson — GET /leads?person_id={id}&limit=10
  console.log(`\nStep 2: GET /leads?person_id=${personId}&limit=10`);
  const leadsResult = await pipedriveGet(`/leads?person_id=${personId}&limit=10`);
  const rawLeads = leadsResult?.data ?? [];
  console.log(`  Total Leads returned (before archived filter): ${rawLeads.length}`);
  for (const l of rawLeads) {
    console.log(`    Lead ${l.id} | title="${l.title}" | is_archived=${l.is_archived} | update_time=${l.update_time} | owner_id=${l.owner_id ?? "none"}`);
  }

  const nonArchived = rawLeads.filter(l => !l.is_archived);
  console.log(`  Non-archived Leads after filter: ${nonArchived.length}`);

  if (!nonArchived.length) {
    console.log(`\n  getOpenLeadForPerson(${personId}) => null.`);
    console.log(`  resolvePortalDashboard would return: state="no_record".`);
    console.log("\nTrace complete. No writes were made.");
    process.exit(0);
  }

  const [mostRecentLead] = [...nonArchived].sort((a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime());
  console.log(`\n  getOpenLeadForPerson(${personId}) => Lead ${mostRecentLead.id} "${mostRecentLead.title}" (most recently updated of the ${nonArchived.length} non-archived Lead(s)).`);
  console.log(`  resolvePortalDashboard would return: state="resolved", stageLabel="Getting to know you" (hardcoded for the Lead branch — no stage/status/pipeline/title of the Lead itself is read).`);
  console.log(`  portal.dashboard would therefore return status="ok" with this progress — NOT status="no_application".`);

  console.log("\nTrace complete. No writes were made.");
  process.exit(0);
} catch (error) {
  console.error("Trace failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
