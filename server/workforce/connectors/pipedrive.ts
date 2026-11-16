/**
 * Pipedrive (CRM) connector for WSA workers.
 *
 * Different in kind from SharePoint and Drive: the CRM is already live.
 * The public contact form writes real student Persons and Leads through
 * server/pipedrive.ts, and the Staff Portal's "Find a student" already
 * READS the CRM for signed-in staff through server/pipedrive-read.ts,
 * projected to the seven fields Tom approved on 9 September 2026. So
 * permission logic is the only thing between a worker and genuine student
 * personal data, and this module is built around that.
 *
 * WHICH CREDENTIAL, AND WHY. Tom Arrington, 11 September 2026: dedicated
 * WSA worker connector credentials; do not reuse the public contact-form
 * Pipedrive token, and no paid service user either. So this module reads
 * with the WSA Pipedrive OAuth grant and nothing else. It borrows the
 * GET-only functions from pipedrive-read.ts through
 * createPipedriveReaderWithAuth, bound to the OAuth strategy, so the read
 * logic exists once and the credential boundary is an argument rather than
 * a copy. It does not, and must never, import server/pipedrive.ts: that is
 * the write-capable client, and a test forbids the import. It never reads
 * the Student Portal's token either, and a test forbids that name too.
 *
 * WHAT A WORKER GETS. Exactly the seven approved fields, through the same
 * projection the staff lookup uses. Nothing about notes, money, documents,
 * activity, custom fields, address, date of birth, nationality, passport
 * or visa. The projection happens here, before anything reaches the
 * connector result, so a raw Pipedrive record never leaves this module.
 *
 * THE GATE DECIDES. crmScope.ts carries the approved Connector Access
 * Matrix v0.3 grants with their provenance; a worker without a grant is
 * refused before this module's read path is reached, and one with a grant
 * still passes the staff member's own access, the WSA boundary and the
 * per-worker constraints below before a single GET is issued.
 *
 * Only read paths are exposed. There is no create, update, delete or send
 * here, because no controlled record grants a worker the ability to change
 * a student's CRM record, and not providing the convenience means nothing
 * has to be refused in the first place.
 */
import { runConnectorAction, type ConnectorActionRequest, type ConnectorActionResult } from "./shared";
import type { ConnectorState } from "../types";
import { createPipedriveReaderWithAuth, type PersonSearchField } from "../../pipedrive-read";
import { pipedriveOAuthAuth } from "../../crm/pipedriveOAuthAuth";
import { pipedriveOAuthStatusSync } from "../../crm/pipedriveOAuth";
import { resolveStageDisplay } from "../../portal-stages";
import type { CrmLookupResult } from "../../crm/staffLookup";
import { projectFieldsFor, type ProjectedValues } from "./crmProjection";

/** The pre-conversion Lead state, matching the student portal's wording. */
const LEAD_STAGE_LABEL = "Getting to know you";

/**
 * The workforce credential: the WSA Pipedrive OAuth application, Bearer
 * against the company API domain. The application's scopes may include
 * writes (Change Entry 100); this module still issues GETs only. Tom Arrington, 11 September
 * 2026: no paid service user, no reuse of the website's API token. The
 * strategy resolves a fresh access token on every call, refreshing when
 * needed, and fails closed with a plain message when no grant exists.
 */
const reader = createPipedriveReaderWithAuth(pipedriveOAuthAuth);

function getPipedriveConnectorState(): ConnectorState {
  // What was last established about the OAuth grant. "permission_missing"
  // is the honest name for a configured application nobody has authorised
  // yet, or whose grant can no longer be refreshed. The call itself is the
  // final arbiter and a refusal is reported through the honest-failure path
  // in shared.ts.
  switch (pipedriveOAuthStatusSync()) {
    case "operational": return "operational";
    case "unconfigured": return "unconfigured";
    default: return "permission_missing";
  }
}

/**
 * What a worker is handed: the seven staff-lookup fields plus the stage
 * position and a confirmed flag, which Olivia's condition and a worker's
 * own pipeline reasoning need. Nothing about notes, money, documents,
 * activity, custom fields, address, date of birth, nationality, passport or
 * visa; the raw Pipedrive object never leaves this function.
 */
export interface WorkerCrmRecord extends CrmLookupResult {
  stagePosition: number | null;
  confirmed: boolean;
  /** The worker's approved remit fields, by Pipedrive label. See crmProjection.ts. */
  fields: ProjectedValues;
}

async function projectPerson(personId: number, workerId: string): Promise<WorkerCrmRecord | null> {
  const person = await reader.getPerson(personId);
  if (!person) return null;
  const deal = await reader.getOpenDealForPerson(personId);
  // Raw records are fetched, projected and dropped inside this block.
  const rawPerson = await reader.getPersonRaw(personId);
  const rawDeal = deal ? await reader.getDealRaw(deal.id) : null;
  const fields = projectFieldsFor(workerId as never, { person: rawPerson, deal: rawDeal });
  let stageLabel: string;
  let stagePosition: number | null = null;
  if (deal) {
    const stage = resolveStageDisplay(deal.stageId);
    stageLabel = stage.label;
    stagePosition = stage.position ?? null;
  } else {
    const lead = await reader.getOpenLeadForPerson(personId);
    stageLabel = lead ? LEAD_STAGE_LABEL : "No open enquiry";
  }
  return {
    personId: person.id,
    name: person.name,
    email: person.email,
    phone: person.phone,
    counsellor: person.ownerName,
    stageLabel,
    lastUpdated: person.updateTime,
    stagePosition,
    confirmed: stagePosition !== null && stagePosition >= CONFIRMED_FROM_POSITION,
    fields,
  };
}

/**
 * resourceScope grammar, and it is a grammar rather than free text because
 * the WSA-scope gate in shared.ts reads the first segment as the entity:
 *   person/<id>                      read one person
 *   person/search/<field>/<term>     search persons by email, phone or name
 */
function parseScope(scope: string): { kind: "read"; personId: number } | { kind: "search"; field: PersonSearchField; term: string } | null {
  const parts = scope.split("/");
  if (parts[0] !== "person") return null;
  if (parts[1] === "search" && (parts[2] === "email" || parts[2] === "phone" || parts[2] === "name") && parts[3]) {
    return { kind: "search", field: parts[2], term: decodeURIComponent(parts.slice(3).join("/")) };
  }
  const id = Number(parts[1]);
  if (Number.isInteger(id) && id > 0) return { kind: "read", personId: id };
  return null;
}

const MAX_SEARCH_RESULTS = 5;

/**
 * What makes each grant least-privilege, per the approved matrix.
 *
 * The grant in crmScope.ts says WHICH operations; this says HOW FAR each
 * one reaches, and it is applied inside the connector so the only path a
 * grant opens is a constrained one.
 *
 *  - Sophie: lookup of an incoming person by the identifiers staff genuinely
 *    receive, email and telephone. Not by name: a name search is CRM
 *    browsing, and she is given one enquiry, not a list.
 *  - Grace: the one justified cross-case search, for audit sampling, by any
 *    identifier. Still capped, still logged, still one record at a time.
 *  - Olivia: her remit begins "once a student is confirmed". A read of a
 *    person whose open deal has not reached the CAS / Visa / Pre-Departure
 *    stage is refused, because that student is not yet hers.
 *  - Priya: the staff member must hold the visa_regulated overlay, checked
 *    by the shared gate, because the material is regulated.
 */
const SEARCH_FIELDS: Partial<Record<string, readonly PersonSearchField[]>> = {
  sophie: ["email", "phone"],
  grace: ["email", "phone", "name"],
};
/** Pipedrive stage position at which a student counts as confirmed for Olivia's remit. */
const CONFIRMED_FROM_POSITION = 6;
const CONFIRMED_ONLY = new Set<string>(["olivia"]);
const SENSITIVE_CATEGORY: Partial<Record<string, "visa_regulated">> = { priya: "visa_regulated" };

async function pipedriveAttempt(request: ConnectorActionRequest): Promise<{ success: boolean; message: string; data?: unknown }> {
  const parsed = parseScope(request.resourceScope);
  if (!parsed) {
    return { success: false, message: `Unrecognised CRM scope "${request.resourceScope}". Expected person/<id> or person/search/<field>/<term>.` };
  }
  if (parsed.kind === "read") {
    const projected = await projectPerson(parsed.personId, request.workerId);
    if (!projected) return { success: false, message: `No CRM person ${parsed.personId}.` };
    if (CONFIRMED_ONLY.has(request.workerId) && !projected.confirmed) {
      return { success: false, message: `CRM person ${parsed.personId} is not a confirmed student yet, so this is outside ${request.workerId}'s remit.` };
    }
    return { success: true, message: `Read CRM person ${parsed.personId}, approved fields only.`, data: projected };
  }
  const allowedFields = SEARCH_FIELDS[request.workerId];
  if (!allowedFields) return { success: false, message: `${request.workerId} may not search the CRM; a specific person must already be in context.` };
  if (!allowedFields.includes(parsed.field)) {
    return { success: false, message: `${request.workerId} may look up a person by ${allowedFields.join(" or ")}, not by ${parsed.field}.` };
  }
  const ids = (await reader.searchPersonIds(parsed.term, parsed.field)).slice(0, MAX_SEARCH_RESULTS);
  const results: WorkerCrmRecord[] = [];
  for (const id of ids) {
    const projected = await projectPerson(id, request.workerId);
    if (projected) results.push(projected);
  }
  return {
    success: true,
    message: `Found ${results.length} CRM match${results.length === 1 ? "" : "es"} by ${parsed.field}, approved fields only.`,
    data: results,
  };
}

export function getPipedriveStatus(): ConnectorState {
  return getPipedriveConnectorState();
}

/**
 * Look up CRM records matching a controlled scope. Which student records
 * are reachable is decided by the staff member's own case scope and the
 * worker's CRM grant in the gates before this, not here.
 */
export function searchPipedrive(request: Omit<ConnectorActionRequest, "connector" | "operation" | "sensitiveCategory">): Promise<ConnectorActionResult> {
  return runConnectorAction(
    { ...request, connector: "pipedrive", operation: "search", sensitiveCategory: SENSITIVE_CATEGORY[request.workerId] },
    getPipedriveConnectorState, pipedriveAttempt,
  );
}

/** Read one CRM record. Same gates as search; read is not a lesser operation where student personal data is concerned. */
export function readPipedriveRecord(request: Omit<ConnectorActionRequest, "connector" | "operation" | "sensitiveCategory">): Promise<ConnectorActionResult> {
  return runConnectorAction(
    { ...request, connector: "pipedrive", operation: "read", sensitiveCategory: SENSITIVE_CATEGORY[request.workerId] },
    getPipedriveConnectorState, pipedriveAttempt,
  );
}

/** Exposed for tests: the constraints are the point, so they are asserted directly. */
export const PIPEDRIVE_WORKER_CONSTRAINTS = Object.freeze({ SEARCH_FIELDS, CONFIRMED_ONLY, CONFIRMED_FROM_POSITION, SENSITIVE_CATEGORY });
