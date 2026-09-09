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
} from "../pipedrive-read";
import type { CrmCandidate, LookupBy, LookupDeps } from "./staffLookup";

/** The pre-conversion Lead state, matching the student portal's wording. */
const LEAD_STAGE_LABEL = "Getting to know you";

async function searchPipedrive(term: string, by: LookupBy): Promise<CrmCandidate[]> {
  const ids = await searchPersonIds(term, by);
  const candidates: CrmCandidate[] = [];
  for (const id of ids) {
    const person = await getPerson(id);
    if (!person) continue;
    const deal = await getOpenDealForPerson(id);
    let stageLabel: string;
    if (deal) {
      stageLabel = resolveStageDisplay(deal.stageId).label;
    } else {
      const lead = await getOpenLeadForPerson(id);
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
async function resolveOwnerByEmail(ownerEmail: string | null): Promise<number | null> {
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
  search: searchPipedrive,
  resolveOwner: resolveOwnerByEmail,
  audit: recordAuditEvent,
};
