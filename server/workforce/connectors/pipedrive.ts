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
 * WHICH CREDENTIAL, AND WHY. Tom, 11 September 2026: use what production
 * already holds. This module therefore reads through pipedrive-read.ts,
 * the same read-only module and the same credential that "Find a student"
 * uses for staff. It does not, and must never, import server/pipedrive.ts:
 * that is the write-capable client, and a test forbids the import. The
 * read-only boundary is a fact about which file is imported, visible at
 * the top of this file, rather than a convention.
 *
 * WHAT A WORKER GETS. Exactly the seven approved fields, through the same
 * projection the staff lookup uses. Nothing about notes, money, documents,
 * activity, custom fields, address, date of birth, nationality, passport
 * or visa. The projection happens here, before anything reaches the
 * connector result, so a raw Pipedrive record never leaves this module.
 *
 * THE GATE IS STILL SHUT. Every entry in crmScope.ts is null, so every
 * worker is refused at the permission gate before this module's read path
 * is reached. The credential is wired; the permission awaits the approved
 * connector matrix and the Governance and Assurance checkpoint. Those are
 * different problems with different owners, and this file is the fix for
 * only one of them.
 *
 * Only read paths are exposed. There is no create, update, delete or send
 * here, because no controlled record grants a worker the ability to change
 * a student's CRM record, and not providing the convenience means nothing
 * has to be refused in the first place.
 */
import { runConnectorAction, type ConnectorActionRequest, type ConnectorActionResult } from "./shared";
import type { ConnectorState } from "../types";
import {
  getOpenDealForPerson,
  getOpenLeadForPerson,
  getPerson,
  isPipedriveReadConfigured,
  searchPersonIds,
  type PersonSearchField,
} from "../../pipedrive-read";
import { resolveStageDisplay } from "../../portal-stages";
import type { CrmLookupResult } from "../../crm/staffLookup";

/** The pre-conversion Lead state, matching the student portal's wording. */
const LEAD_STAGE_LABEL = "Getting to know you";

function getPipedriveConnectorState(): ConnectorState {
  // Configured means the read module has a credential. Operational is not
  // a stronger claim than that here: the read path below is the same one
  // "Find a student" exercises for staff every day, so it is proven by use.
  return isPipedriveReadConfigured() ? "operational" : "unconfigured";
}

/** The seven approved fields and nothing else. Same shape as the staff lookup. */
async function projectPerson(personId: number): Promise<CrmLookupResult | null> {
  const person = await getPerson(personId);
  if (!person) return null;
  const deal = await getOpenDealForPerson(personId);
  let stageLabel: string;
  if (deal) {
    stageLabel = resolveStageDisplay(deal.stageId).label;
  } else {
    const lead = await getOpenLeadForPerson(personId);
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

async function pipedriveAttempt(request: ConnectorActionRequest): Promise<{ success: boolean; message: string; data?: unknown }> {
  const parsed = parseScope(request.resourceScope);
  if (!parsed) {
    return { success: false, message: `Unrecognised CRM scope "${request.resourceScope}". Expected person/<id> or person/search/<field>/<term>.` };
  }
  if (parsed.kind === "read") {
    const projected = await projectPerson(parsed.personId);
    if (!projected) return { success: false, message: `No CRM person ${parsed.personId}.` };
    return { success: true, message: `Read CRM person ${parsed.personId}, seven approved fields.`, data: projected };
  }
  const ids = (await searchPersonIds(parsed.term, parsed.field)).slice(0, MAX_SEARCH_RESULTS);
  const results: CrmLookupResult[] = [];
  for (const id of ids) {
    const projected = await projectPerson(id);
    if (projected) results.push(projected);
  }
  return {
    success: true,
    message: `Found ${results.length} CRM match${results.length === 1 ? "" : "es"} by ${parsed.field}, seven approved fields each.`,
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
export function searchPipedrive(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "pipedrive", operation: "search" }, getPipedriveConnectorState, pipedriveAttempt);
}

/** Read one CRM record. Same gates as search; read is not a lesser operation where student personal data is concerned. */
export function readPipedriveRecord(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "pipedrive", operation: "read" }, getPipedriveConnectorState, pipedriveAttempt);
}
