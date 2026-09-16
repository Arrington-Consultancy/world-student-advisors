/**
 * The production wiring for server/crm/staffLookup.ts: the real Pipedrive
 * read module, the real staff table, the real access profile, the real
 * audit log. staffLookup.ts is pure and takes these as dependencies so its
 * security properties can be proved in tests; this is the one place the real
 * things are plugged in.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { staffUsers } from "../../drizzle/schema";
import { resolveStaffAccessProfile } from "../access/identity";
import { recordAuditEvent } from "../workforce/audit";
import { resolveStageDisplay } from "../portal-stages";
import {
  searchPersonIds,
  getPerson,
  getOpenDealForPerson,
  getOpenLeadForPerson,
  createPipedriveReaderWithAuth,
} from "../pipedrive-read";
import { pipedriveOAuthAuth } from "./pipedriveOAuthAuth";
import type { CrmCandidate, LookupBy, LookupDeps } from "./staffLookup";

/** The GET-only functions the search needs, so the same logic can run on either credential. */
type LookupReader = {
  searchPersonIds: (term: string, field: LookupBy) => Promise<number[]>;
  getPerson: typeof getPerson;
  getOpenDealForPerson: typeof getOpenDealForPerson;
  getOpenLeadForPerson: typeof getOpenLeadForPerson;
};
const websiteReader: LookupReader = { searchPersonIds, getPerson, getOpenDealForPerson, getOpenLeadForPerson };

/** The pre-conversion Lead state, matching the student portal's wording. */
const LEAD_STAGE_LABEL = "Getting to know you";

/** The search, bound to a reader. Candidates only; the caller filters by case scope before anything is projected. */
export function makeSearch(reader: LookupReader): (term: string, by: LookupBy) => Promise<CrmCandidate[]> {
  return async (term, by) => searchWith(reader, term, by);
}

async function searchWith(reader: LookupReader, term: string, by: LookupBy): Promise<CrmCandidate[]> {
  const ids = await reader.searchPersonIds(term, by);
  const candidates: CrmCandidate[] = [];
  for (const id of ids) {
    const person = await reader.getPerson(id);
    if (!person) continue;
    const deal = await reader.getOpenDealForPerson(id);
    let stageLabel: string;
    if (deal) {
      stageLabel = resolveStageDisplay(deal.stageId).label;
    } else {
      const lead = await reader.getOpenLeadForPerson(id);
      stageLabel = lead ? LEAD_STAGE_LABEL : "No open enquiry";
    }
    candidates.push({
      personId: person.id,
      name: person.name,
      email: person.email,
      phone: person.phone,
      ownerEmail: person.ownerEmail,
      ownerName: person.ownerName,
      stageLabel,
      updateTime: person.updateTime,
    });
  }
  return candidates;
}

/**
 * Pipedrive owner email -> staff_users.id. Exact, lowercased match against
 * the staff account's email, and null on anything else. Tom's decision of 9
 * September 2026: no manual owner map unless email matching proves
 * unreliable, and fail closed when there is no exact authorised match.
 */
export async function resolveOwnerByEmail(ownerEmail: string | null): Promise<number | null> {
  if (!ownerEmail) return null;
  const db = await getDb();
  if (!db) return null;
  const email = ownerEmail.trim().toLowerCase();
  const rows = await db
    .select({ id: staffUsers.id, isActive: staffUsers.isActive })
    .from(staffUsers)
    .where(eq(staffUsers.email, email))
    .limit(1);
  const row = rows[0];
  // A deactivated staff account is not an authorised owner, so a record they
  // own is treated as unowned for scope purposes rather than as theirs.
  if (!row || row.isActive !== 1) return null;
  return row.id;
}

export const productionLookupDeps: LookupDeps = {
  resolveProfile: resolveStaffAccessProfile,
  search: makeSearch(websiteReader),
  resolveOwner: resolveOwnerByEmail,
  audit: recordAuditEvent,
};

/**
 * The same approved lookup on the WSA Pipedrive OAuth grant instead of the
 * website's token. Used when a worker conversation names a student and
 * the staff member's own authority is used to identify which record is
 * meant (execution/studentContext.ts). Tom Arrington, 11 September 2026:
 * nothing on a worker path reads with the website's token, so this is the
 * credential that path uses. Same gates, same audit actor, same projection.
 */
export const oauthLookupDeps: LookupDeps = {
  resolveProfile: resolveStaffAccessProfile,
  search: makeSearch(createPipedriveReaderWithAuth(pipedriveOAuthAuth)),
  resolveOwner: resolveOwnerByEmail,
  audit: recordAuditEvent,
};
