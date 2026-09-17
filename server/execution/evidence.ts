/**
 * Connector evidence for a worker's request.
 *
 * Tom Arrington, 11 September 2026: this approval gives existing workers
 * the information required to perform their existing jobs. So when a staff
 * member asks a CRM-granted worker about a student and names an email,
 * phone number or CRM person id, the worker is handed that person's
 * approved record before it answers, and when a SharePoint-granted worker
 * is asked about one of its designated locations, it is handed the listing.
 *
 * EVERYTHING GOES THROUGH runConnectorAction. That is the chokepoint with
 * the worker grant, the staff member's own access, the WSA boundary and the
 * location allowlist, and every call is audited whether it succeeds or is
 * refused. Nothing here opens a second path.
 *
 * WHAT REACHES THE MODEL. Only `data` from a successful connector result,
 * which is already the projected shape (WorkerCrmRecord, SharePointRead).
 * No raw Pipedrive or Graph object exists at this layer, and no token or
 * variable name is read here: the connectors hold their credentials and
 * this module holds none.
 *
 * A refused or failed retrieval is reported to the worker as a one-line
 * fact ("CRM lookup by email was refused: ...") so it can say so rather than
 * guess, which is what Universal Worker Instructions section 6 requires.
 */
import { readPipedriveRecord, searchPipedrive } from "../workforce/connectors/pipedrive";
import { extractNameCandidates, extractSingleNameCandidate, resolveStudentByName, type ListedStudent, type StudentResolution } from "./studentContext";
import { readSharePointRecord } from "../workforce/connectors/sharepoint";
import { WORKER_CRM_SCOPE } from "../workforce/crmScope";
import { WORKER_SHAREPOINT_LOCATIONS } from "../workforce/sharePointLocations";
import type { AuditAuthMethod } from "../workforce/audit";
import type { WorkerId } from "../workforce/types";

export interface EvidenceBlock {
  /** Where it came from, for the worker to cite and for the reader to check. */
  source: "pipedrive" | "sharepoint";
  label: string;
  /** Projected connector data, never raw. */
  data: unknown;
}

export interface EvidenceNote {
  source: "pipedrive" | "sharepoint";
  /** What was attempted and why it did not produce evidence. */
  note: string;
}

/** Several students matched one name: the list the worker must give in full. */
export interface StudentList {
  /** The name as the staff member typed it. */
  typed: string;
  students: ListedStudent[];
}

export interface GatheredEvidence {
  blocks: EvidenceBlock[];
  notes: EvidenceNote[];
  /**
   * Lists of matching students, structured, alongside the notes that
   * describe them in words. The execution layer checks the reply names
   * every student in each list and completes it when it does not.
   */
  studentLists?: StudentList[];
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** Phone-like runs of 9 to 15 digits allowing spaces, dashes and a leading +. */
const PHONE = /(?:\+?\d[\d\s-]{8,14}\d)/g;
const PERSON_ID = /\b(?:crm|pipedrive|person)\s*(?:id\s*)?#?\s*(\d{1,9})\b/gi;

export function extractIdentifiers(text: string): { emails: string[]; phones: string[]; personIds: number[] } {
  const emails = Array.from(new Set(text.match(EMAIL) ?? [])).slice(0, 3);
  const phones = Array.from(new Set((text.match(PHONE) ?? []).map(p => p.replace(/[\s-]/g, "")))).filter(p => p.replace("+", "").length >= 9).slice(0, 3);
  const personIds = Array.from(new Set(Array.from(text.matchAll(PERSON_ID)).map(m => Number(m[1])))).slice(0, 3);
  return { emails, phones, personIds };
}

/** Designated locations this request names, by their first path segment. */
export function mentionedLocations(text: string, workerId: WorkerId): string[] {
  const lower = text.toLowerCase();
  return WORKER_SHAREPOINT_LOCATIONS[workerId].filter(location => {
    const leaf = location.split("/").pop() ?? location;
    const stem = leaf.replace(/^\d+_/, "").replace(/[_&-]+/g, " ").toLowerCase().trim();
    return lower.includes(leaf.toLowerCase()) || (stem.length > 3 && lower.includes(stem));
  });
}

export async function gatherConnectorEvidence(input: {
  workerId: WorkerId;
  requestText: string;
  staffUserId: number | null;
  authMethod: AuditAuthMethod;
  caseId?: string;
  /** Test seam only; production uses the real staff lookup on the WSA OAuth grant. */
  resolveByName?: typeof resolveStudentByName;
}): Promise<GatheredEvidence> {
  const blocks: EvidenceBlock[] = [];
  const notes: EvidenceNote[] = [];
  const studentLists: StudentList[] = [];
  const base = { workerId: input.workerId, staffUserId: input.staffUserId, authMethod: input.authMethod, caseId: input.caseId };

  // CRM: only where the controlled record grants anything, and only for a
  // student the staff member actually named. An email, telephone number or
  // CRM id is used as typed. A name is not searched by the worker: it is
  // resolved under the STAFF MEMBER's own Find-a-student authority (Tom
  // Arrington, 9 September 2026), with their case scope applied, and only
  // when exactly one record matches is that record read under the worker's
  // grant. Several matches are put back to the person; none is stated.
  // Operational Standard v1.0 section 12: use the live record so staff do not
  // re-enter known history; never merge ambiguous identities silently.
  if (WORKER_CRM_SCOPE[input.workerId]) {
    const ids = extractIdentifiers(input.requestText);
    const personIds = new Set<number>(ids.personIds);
    const labels = new Map<number, string>();
    if (ids.personIds.length === 0 && ids.emails.length === 0 && ids.phones.length === 0) {
      const resolve = input.resolveByName ?? resolveStudentByName;
      // Capitalised names first; a message typed without capitals is read
      // leniently only when that finds nothing.
      const strict = extractNameCandidates(input.requestText);
      const runs = strict.length > 0 ? strict : extractNameCandidates(input.requestText, { lenient: true });
      // A lone first name ("any Toms on Pipedrive") only when no fuller name
      // was found; the resolver lists everybody of that name.
      const single = runs.length === 0 ? extractSingleNameCandidate(input.requestText) : null;
      const names = (runs.length > 0 ? runs : single ? [single] : []).slice(0, 2);
      for (const name of names) {
        const resolution: StudentResolution = await resolve({ name, workerId: input.workerId, staffUserId: input.staffUserId, authMethod: input.authMethod });
        if (resolution.kind === "one") {
          personIds.add(resolution.personId);
          labels.set(resolution.personId, `CRM person ${resolution.personId}, identified from the name "${name}" under the staff member's own student-lookup authority`);
        } else if (resolution.kind === "probable") {
          // A near match is evidence with a question attached, not a fact.
          personIds.add(resolution.personId);
          const explanation =
            `CRM person ${resolution.personId}, a PROBABLE match, not an exact one: the staff member wrote "${resolution.typed}" and the closest CRM record is recorded as "${resolution.name}"` +
            (resolution.alternatives.length > 0 ? ` (other, less likely matches: ${resolution.alternatives.join("; ")})` : "") +
            `. Say which record you used, quote the name as recorded, and ask the staff member to confirm it is the right student before they act on the answer`;
          labels.set(resolution.personId, explanation);
          // The question travels with the evidence even if the read below fails.
          notes.push({ source: "pipedrive", note: explanation });
        } else {
          notes.push({ source: "pipedrive", note: resolution.note });
          if (resolution.kind === "many" && resolution.students && resolution.students.length > 0) {
            studentLists.push({ typed: resolution.typed ?? name, students: resolution.students });
          }
        }
      }
    }
    for (const personId of Array.from(personIds)) {
      const r = await readPipedriveRecord({ ...base, resourceScope: `person/${personId}` });
      if (r.success && r.data !== undefined) blocks.push({ source: "pipedrive", label: labels.get(personId) ?? `CRM person ${personId}`, data: r.data });
      else notes.push({ source: "pipedrive", note: `CRM read of person ${personId} did not return a record: ${r.message}` });
    }
    for (const [field, values] of [["email", ids.emails], ["phone", ids.phones]] as const) {
      for (const value of values) {
        const r = await searchPipedrive({ ...base, resourceScope: `person/search/${field}/${encodeURIComponent(value)}` });
        if (r.success && r.data !== undefined) blocks.push({ source: "pipedrive", label: `CRM lookup by ${field}`, data: r.data });
        else notes.push({ source: "pipedrive", note: `CRM lookup by ${field} was not possible: ${r.message}` });
      }
    }
  }

  // SharePoint: a designated location the request names, listed.
  const siteId = process.env.SHAREPOINT_GRAPH_SITE_ID;
  if (siteId && WORKER_SHAREPOINT_LOCATIONS[input.workerId].length > 0) {
    for (const location of mentionedLocations(input.requestText, input.workerId).slice(0, 2)) {
      const r = await readSharePointRecord({ ...base, resourceScope: `${siteId}/${location}` });
      if (r.success && r.data !== undefined) blocks.push({ source: "sharepoint", label: `SharePoint ${location}`, data: r.data });
      else notes.push({ source: "sharepoint", note: `SharePoint ${location} could not be read: ${r.message}` });
    }
  }

  return { blocks, notes, studentLists };
}
