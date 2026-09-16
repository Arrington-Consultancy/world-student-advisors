/**
 * Which student a staff member means when they name one in a worker request.
 *
 * A worker such as James holds a CRM read of one person by id and no search
 * (Connector Access Matrix v0.3 section 2). Staff, on the other hand, do not
 * think in ids: they ask "where is Vivian in the process?". The gap between
 * the two is closed here without widening any worker: the typed name is
 * resolved by the STAFF MEMBER's own approved student lookup (Tom Arrington,
 * 9 September 2026; server/crm/staffLookup.ts), under the functional scope
 * that let them open this worker, with their case scope applied and the
 * lookup audited against their identity. Only when exactly one record
 * survives does the worker get to read it, through its own grant, in
 * evidence.ts. Several matches are put back to the person as a question;
 * no match is stated as a fact. Operational Standard v1.0 section 12:
 * ambiguous identities are never merged silently.
 *
 * The credential is the WSA Pipedrive OAuth grant (lookupDeps.oauthLookupDeps),
 * never the website's token: nothing on a worker path reads with that.
 */
import { lookupStudents, type LookupDeps } from "../crm/staffLookup";
import { oauthLookupDeps } from "../crm/lookupDeps";
import { WORKER_FUNCTIONAL_SCOPE } from "../access/workerScope";
import type { AuditAuthMethod } from "../workforce/audit";
import type { WorkerId } from "../workforce/types";

/** Words that begin a sentence or a clause and are never the start of a student's name. */
const NOT_A_NAME_START = new Set([
  "where", "what", "who", "whose", "whom", "when", "why", "how", "which", "is", "are", "was", "were", "can", "could", "should", "would", "will",
  "please", "tell", "give", "show", "find", "check", "look", "bring", "update", "does", "do", "did", "has", "have", "had", "the", "a", "an", "i",
  "we", "you", "my", "our", "your", "this", "that", "these", "those", "there", "here", "and", "or", "but", "in", "on", "for", "to", "of", "with",
  "about", "from", "at", "by", "as", "if", "then", "also", "her", "his", "their", "she", "he", "they", "it", "student", "students", "application",
  "applications", "counsellor", "counselor", "process", "stage", "next", "status", "record", "case", "offer", "visa", "cas", "crm", "wsa", "uk", "usa",
  "pipedrive", "university", "college", "master", "masters", "msc", "ma", "mba", "phd", "bsc", "ba", "ielts", "ucas", "ask", "help", "get", "send",
  "review", "prepare", "explain", "summarise", "summarize", "confirm", "advise", "draft", "write", "list", "compare", "assess",
]);
/** Capitalised words that appear inside a run but belong to WSA vocabulary, not a name. */
const NOT_A_NAME_WORD = new Set(["University", "College", "School", "Institute", "Academy", "Pipedrive", "CRM", "WSA", "UK", "USA", "CAS", "UKVI", "IELTS", "UCAS", "MSc", "MA", "MBA", "PhD", "BSc", "BA", "Status", "Stage", "Offer", "Visa", "Application", "September", "October", "November", "December", "January", "February", "March", "April", "May", "June", "July", "August", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);

const WORD = /^[A-Z][A-Za-z'’-]*$/;

/**
 * Runs of two to four capitalised words that could be a person's name, in
 * order of appearance, without duplicates. Purely lexical on purpose: it
 * proposes candidates and nothing else; the lookup decides what exists and
 * what this staff member may see.
 */
export function extractNameCandidates(text: string): string[] {
  const tokens = text.replace(/[“”"]/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    while (run.length > 0 && NOT_A_NAME_START.has(run[0].toLowerCase())) run.shift();
    while (run.length > 0 && NOT_A_NAME_START.has(run[run.length - 1].toLowerCase())) run.pop();
    if (run.length >= 2 && run.length <= 4 && !run.some(w => NOT_A_NAME_WORD.has(w))) {
      const name = run.join(" ");
      if (!out.includes(name)) out.push(name);
    }
    run = [];
  };
  for (const raw of tokens) {
    // Strip the punctuation that clings to a name in a sentence, and a possessive.
    const word = raw.replace(/^[(\[]+|[)\],.;:!?]+$/g, "").replace(/(['’]s)$/i, "");
    if (WORD.test(word)) run.push(word);
    else flush();
    if (/[,.;:!?]$/.test(raw)) flush();
  }
  flush();
  return out;
}

export type StudentResolution =
  | { kind: "one"; personId: number; name: string }
  | { kind: "many" | "none" | "refused"; note: string };

export interface ResolveInput {
  name: string;
  workerId: WorkerId;
  staffUserId: number | null;
  authMethod: AuditAuthMethod;
}

/**
 * The staff member's own lookup of the name, under the scope that opened
 * this worker. Returns one id only when exactly one record is both a match
 * and within their case scope; otherwise a plain note for the worker to
 * relay.
 */
export async function resolveStudentByName(input: ResolveInput, deps: LookupDeps = oauthLookupDeps): Promise<StudentResolution> {
  const scope = WORKER_FUNCTIONAL_SCOPE[input.workerId];
  let withheldTotal = 0;
  // A CRM record rarely carries every name a person is known by: the deal
  // may say "Vivian Ene Onuh" while the person record says "Vivian Onuh".
  // So the spellings are tried from the most specific to the least, and
  // the first that finds anything decides. Every attempt is audited by
  // the lookup itself.
  for (const term of searchTerms(input.name)) {
    const result = await lookupStudents(
      { staffUserId: input.staffUserId, authMethod: input.authMethod, term, by: "name", scope },
      deps,
    );
    if (result.refused) {
      return { kind: "refused", note: `The CRM could not be checked for "${input.name}" under the staff member's own access: ${result.reason}` };
    }
    withheldTotal += result.withheldCount;
    if (result.results.length === 1) {
      const one = result.results[0];
      return { kind: "one", personId: one.personId, name: one.name };
    }
    if (result.results.length > 1) {
      const options = result.results.map(r => `${r.name} (${r.stageLabel}${r.counsellor ? `, counsellor ${r.counsellor}` : ""})`).join("; ");
      return { kind: "many", note: `${result.results.length} CRM students match "${input.name}" (searched as "${term}"): ${options}. Ask the staff member which one they mean, by email address or telephone number, before using any record.` };
    }
  }
  const withheld = withheldTotal > 0
    ? ` ${withheldTotal} matching record${withheldTotal === 1 ? " is" : "s are"} outside the staff member's case scope and cannot be shown.`
    : "";
  return { kind: "none", note: `No CRM student matching "${input.name}" is within the staff member's access.${withheld} Ask for the student's email address or telephone number if the name may be spelt differently in the CRM.` };
}

/** The full name, then first and last, then the surname alone; never a first name alone. */
export function searchTerms(name: string): string[] {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const out = [parts.join(" ")];
  if (parts.length >= 3) out.push(`${parts[0]} ${parts[parts.length - 1]}`);
  if (parts.length >= 2) out.push(parts[parts.length - 1]);
  return Array.from(new Set(out));
}
