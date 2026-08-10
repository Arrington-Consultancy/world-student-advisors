import { ENV } from "./_core/env";

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

/**
 * Read-only Pipedrive access for the Student Portal. Every function in this
 * file issues a GET and nothing else — deliberately kept in its own module,
 * separate from server/pipedrive.ts's write-capable request helper, so the
 * portal's read-only boundary is visible at the file level, not just by
 * convention.
 */
async function pipedriveGet(endpoint: string): Promise<any> {
  const url = `${PIPEDRIVE_BASE}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_token=${ENV.pipedriveApiToken}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Pipedrive] Read API error (${response.status}) on GET ${endpoint}: ${errorText}`);
    throw new Error(`Pipedrive API error (${response.status}) on ${endpoint}`);
  }
  return response.json();
}

function resolveOwnerId(value: unknown): number | null {
  if (value && typeof value === "object" && "id" in value) return (value as { id: number }).id;
  if (typeof value === "number") return value;
  return null;
}

export interface PipedriveDealSummary {
  id: number;
  stageId: number;
  ownerId: number | null;
  updateTime: string;
}

/**
 * The most-recently-updated open Deal for a Person, or null if none.
 * Deals key their owner as `user_id`, not `owner_id` — confirmed live
 * 2026-08-09 against /dealFields (id=3 key=user_id name="Owner"). Leads and
 * Persons both use `owner_id`. Mixing these up silently breaks owner
 * resolution without erroring (the first cut of the ownership audit script
 * did exactly this — every Deal came back owner "(none)").
 */
export async function getOpenDealForPerson(personId: number): Promise<PipedriveDealSummary | null> {
  const result = await pipedriveGet(`/persons/${personId}/deals?status=open`);
  const deals: any[] = result?.data ?? [];
  if (!deals.length) return null;

  const [mostRecent] = [...deals].sort(
    (a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime()
  );

  return {
    id: mostRecent.id,
    stageId: mostRecent.stage_id,
    ownerId: resolveOwnerId(mostRecent.user_id),
    updateTime: mostRecent.update_time,
  };
}

export interface PipedriveLeadSummary {
  id: string;
  ownerId: number | null;
}

/** The most-recently-updated non-archived Lead for a Person, or null. */
export async function getOpenLeadForPerson(personId: number): Promise<PipedriveLeadSummary | null> {
  const result = await pipedriveGet(`/leads?person_id=${personId}&limit=10`);
  const leads: any[] = (result?.data ?? []).filter((lead: any) => !lead.is_archived);
  if (!leads.length) return null;

  const [mostRecent] = leads.sort(
    (a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime()
  );

  return { id: mostRecent.id, ownerId: resolveOwnerId(mostRecent.owner_id) };
}
