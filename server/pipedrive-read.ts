import { ENV } from "./_core/env";

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

/**
 * Read-only Pipedrive access for the Student Portal. Every function in this
 * file issues a GET and nothing else — deliberately kept in its own module,
 * separate from server/pipedrive.ts's write-capable request helper, so the
 * portal's read-only boundary is visible at the file level, not just by
 * convention.
 */
/**
 * Whether a CRM credential is present at all. Presence only; it says
 * nothing about what the credential may see, which the gates decide.
 */
export function isPipedriveReadConfigured(): boolean {
  return Boolean(ENV.pipedriveApiToken);
}

/**
 * The token used by the module-level functions below: the Student Portal's
 * own. A different credential can be bound with createPipedriveReader,
 * which is how the AI workforce reads with its dedicated token instead.
 */
let boundToken: () => string = () => ENV.pipedriveApiToken;

async function pipedriveGet(endpoint: string, tokenFor: () => string = boundToken): Promise<any> {
  const url = `${PIPEDRIVE_BASE}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_token=${tokenFor()}`;
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

// ── Staff Portal student lookup, 9 September 2026 ─────────────────────────
// Read-only person search and fetch for the staff-facing lookup. Kept in this
// module deliberately: every function here issues a GET and nothing else, so
// the lookup's read-only boundary is visible at the file level, alongside the
// student portal's. server/pipedrive.ts, the write-capable module, is not
// imported by the lookup at all.

export type PersonSearchField = "email" | "phone" | "name";

/**
 * Person IDs matching a term. Email and phone are exact, because a staff
 * member typing an address wants that address. Name is Pipedrive's ordinary
 * search, because nobody types a name exactly as it was entered. Whatever
 * comes back is a candidate list only: the case-scope filter in
 * server/crm/staffLookup.ts decides what the staff member may actually see.
 */
export async function searchPersonIds(term: string, field: PersonSearchField): Promise<number[]> {
  const exact = field === "name" ? "" : "&exact_match=true";
  const result = await pipedriveGet(
    `/persons/search?term=${encodeURIComponent(term)}&fields=${field}${exact}&limit=10`,
  );
  const items: any[] = result?.data?.items ?? [];
  return items.map(i => i?.item?.id).filter((id): id is number => typeof id === "number");
}

export interface PipedrivePersonSummary {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  /** The Pipedrive user who owns the record. Their email is what the lookup matches to a WSA staff account. */
  ownerEmail: string | null;
  ownerName: string | null;
  updateTime: string;
}

function primaryValue(list: unknown): string | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const primary = list.find(e => e && typeof e === "object" && (e as { primary?: boolean }).primary === true);
  const chosen = (primary ?? list[0]) as { value?: unknown };
  return typeof chosen?.value === "string" && chosen.value.trim() !== "" ? chosen.value : null;
}

/** One person, with only the fields the lookup needs. Null if Pipedrive has no such person. */
export async function getPerson(personId: number): Promise<PipedrivePersonSummary | null> {
  const result = await pipedriveGet(`/persons/${personId}`);
  const p = result?.data;
  if (!p || typeof p.id !== "number") return null;
  const owner = p.owner_id && typeof p.owner_id === "object" ? p.owner_id : null;
  return {
    id: p.id,
    name: typeof p.name === "string" ? p.name : "",
    email: primaryValue(p.email),
    phone: primaryValue(p.phone),
    ownerEmail: owner && typeof owner.email === "string" ? owner.email : null,
    ownerName: owner && typeof owner.name === "string" ? owner.name : null,
    updateTime: typeof p.update_time === "string" ? p.update_time : "",
  };
}


/**
 * A reader bound to a different credential.
 *
 * The AI workforce must not read with the Student Portal's token (Tom
 * Arrington, 11 September 2026: dedicated WSA worker connector credentials;
 * do not reuse the public contact-form Pipedrive token). This returns the
 * same GET-only functions bound to the token supplied, so the read logic
 * exists once and the credential boundary is the argument.
 *
 * Every call re-reads the token through the supplied function, so a
 * rotation takes effect without a restart. Nothing here can issue anything
 * but a GET: pipedriveGet has no method argument.
 */
export function createPipedriveReader(tokenFor: () => string) {
  const previous = boundToken;
  const withToken = async <T>(fn: () => Promise<T>): Promise<T> => {
    boundToken = tokenFor;
    try {
      return await fn();
    } finally {
      boundToken = previous;
    }
  };
  return {
    searchPersonIds: (term: string, field: PersonSearchField) => withToken(() => searchPersonIds(term, field)),
    getPerson: (personId: number) => withToken(() => getPerson(personId)),
    getOpenDealForPerson: (personId: number) => withToken(() => getOpenDealForPerson(personId)),
    getOpenLeadForPerson: (personId: number) => withToken(() => getOpenLeadForPerson(personId)),
    /**
     * Raw records, for the worker connector's per-remit field projection
     * and nothing else. Still GET only. The caller projects immediately and
     * the raw object goes no further; a test in connectors/ asserts that.
     */
    getPersonRaw: (personId: number) => withToken(async () => ((await pipedriveGet(`/persons/${personId}`))?.data ?? null) as Record<string, unknown> | null),
    getDealRaw: (dealId: number) => withToken(async () => ((await pipedriveGet(`/deals/${dealId}`))?.data ?? null) as Record<string, unknown> | null),
    /**
     * Whole-collection listings for management information. Still GET only,
     * paginated, capped so a runaway collection cannot hold a request open
     * indefinitely. Used by the resolution-first layer under the signed-in
     * staff member's own organisation-scope authorisation, never by a worker.
     */
    listLeadsRaw: () => withToken(() => listAll("/leads?archived_status=all", 500, 40)),
    listDealsRaw: () => withToken(() => listAll("/deals?status=all_not_deleted", 500, 40)),
    listPersonsRaw: () => withToken(() => listAll("/persons", 500, 40)),
  };
}

async function listAll(endpoint: string, pageSize: number, maxPages: number): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = [];
  let start = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await pipedriveGet(`${endpoint}&limit=${pageSize}&start=${start}`);
    const data: unknown = result?.data;
    if (!Array.isArray(data) || data.length === 0) break;
    out.push(...(data as Array<Record<string, unknown>>));
    const more = result?.additional_data?.pagination?.more_items_in_collection === true;
    if (!more) break;
    start = Number(result?.additional_data?.pagination?.next_start ?? start + pageSize);
  }
  return out;
}
