/**
 * Production end-to-end test: a staff member asks a worker a natural question
 * that names a real student, and the worker answers from the live WSA
 * Pipedrive record. Tom Arrington, 16 September 2026: "Unit tests are not
 * enough. Run an actual production end to end test using a real WSA student
 * record and a natural staff question."
 *
 * Runs inside the Railway service's variables with a public database URL
 * substituted, exactly as connector-pipedrive-acceptance does, so it uses
 * the real OAuth grant, the real staff access profile, the real permission
 * engine, the real router and the real model. Since 16 September 2026 the
 * question goes through the deployed tRPC procedure itself, workforce.ask,
 * called with a staff session token minted for the acting account: the
 * same code the browser reaches, including the conversation store. What
 * comes back is what the browser would receive, and the stored reply is
 * compared with it byte for byte.
 *
 * What it prints: booleans, counts, ids, stage labels and the routed worker.
 * Never the student's contact details and never the worker's full answer,
 * because CI logs are not a controlled record. What it writes: the audit
 * rows the real path writes (the staff lookup, the connector read, and the
 * worker execution) and one conversation exchange owned by the acting
 * staff member, exactly as a real Ask does. Nothing in the CRM is touched.
 *
 * Inputs (environment):
 *   E2E_STAFF_EMAIL  the staff account to act as; defaults to ACCESS_BOOTSTRAP_EMAIL.
 *   E2E_QUESTION     the natural question, naming the student.
 *   E2E_WORKER       optional worker id; default: whatever the router chooses.
 * Exit 0 only when the routed worker answers from a CRM record for exactly
 * one student and does not say it lacks access.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { staffUsers } from "../drizzle/schema";
import { describePipedriveGrant, isWsaCompany } from "../server/crm/pipedriveOAuth";
import { routeStaffRequest } from "../server/workforce/router";
import { gatherConnectorEvidence } from "../server/execution/evidence";
import { appRouter } from "../server/routers";
import { mintStaffIdentityToken } from "../server/staffIdentityAuth";
import { listConversation } from "../server/execution/conversation";
import { listWorkers } from "../server/workforce/registry";
import type { WorkerId } from "../server/workforce/types";

let failures = 0;
function check(ok: boolean, label: string, detail = ""): void {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
}

const question = (process.env.E2E_QUESTION ?? "").trim();
if (!question) { console.log("E2E_QUESTION is required."); process.exit(2); }
// An empty workflow input arrives as an empty string, not as unset.
const staffEmail = ((process.env.E2E_STAFF_EMAIL || "").trim() || (process.env.ACCESS_BOOTSTRAP_EMAIL || "").trim()).toLowerCase();
if (!staffEmail) { console.log("E2E_STAFF_EMAIL (or ACCESS_BOOTSTRAP_EMAIL) is required."); process.exit(2); }

console.log("\n=== 1. Grant ===");
const grant = await describePipedriveGrant();
check(grant.status === "operational", "WSA Pipedrive OAuth grant operational", grant.status);
check(Boolean(grant.apiDomainHost && isWsaCompany(`https://${grant.apiDomainHost}`)), "grant is for the WSA company", grant.apiDomainHost ?? "none");
if (grant.status !== "operational") { console.log("\nRESULT: no usable grant."); process.exit(1); }

console.log("\n=== 2. Staff identity ===");
const db = await getDb();
if (!db) { console.log("No database."); process.exit(1); }
const [staff] = await db.select().from(staffUsers).where(eq(staffUsers.email, staffEmail)).limit(1);
check(Boolean(staff && staff.isActive === 1), "staff account resolved and active", staff ? `staff_users.id ${staff.id}` : "not found");
if (!staff) process.exit(1);

console.log("\n=== 3. Routing ===");
const routed = routeStaffRequest(question);
const workerId = ((process.env.E2E_WORKER ?? "").trim() || routed.responsibleWorkerId || "") as WorkerId;
check(Boolean(routed.responsibleWorkerId), "router chose a specialist", routed.responsibleWorkerId ?? `none (${routed.status})`);
check(listWorkers().some(w => w.id === workerId), "worker to execute", workerId || "none");
if (!workerId) process.exit(1);

console.log("\n=== 4. Evidence gathered for the request (labels and counts only) ===");
const evidence = await gatherConnectorEvidence({ workerId, requestText: question, staffUserId: staff.id, authMethod: "entra_sso" });
for (const b of evidence.blocks) console.log(`  block: ${b.label}`);
for (const n of evidence.notes) console.log(`  note: ${n.note.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "<email>")}`);
const crmBlocks = evidence.blocks.filter(b => b.source === "pipedrive");
// A question that names several students at once ("are there any Toms on
// Pipedrive") is answered from a list, not a record: the resolver hands the
// worker every match with stage and counsellor and asks it to put the choice
// to the staff member. That is the correct evidence for such a question.
const listNote = evidence.notes.find(n => n.source === "pipedrive" && /are recorded with the name|closest matches are|CRM students match/.test(n.note));
const listedNames = listNote ? Array.from(listNote.note.matchAll(/(?:: |; )([^(;:]+?) \(/g)).map(m => m[1].trim()) : [];
const listMode = crmBlocks.length === 0 && listedNames.length >= 2;
if (listMode) {
  check(true, "several students were listed for the staff member to choose from", `${listedNames.length} listed`);
} else {
  check(crmBlocks.length === 1, "exactly one CRM record was read for the named student", `${crmBlocks.length} record(s)`);
}
const record = crmBlocks[0]?.data as { stageLabel?: string; counsellor?: string | null; fields?: Record<string, unknown> } | undefined;
if (!listMode) {
  check(Boolean(record?.stageLabel), "record carries a stage", record?.stageLabel ?? "none");
  check(record?.counsellor !== undefined, "record carries a counsellor field", record?.counsellor ? "named" : "none");
  check(Boolean(record?.fields && Object.keys(record.fields).length > 0), "record carries the worker's approved remit fields", record?.fields ? `${Object.keys(record.fields).length} field(s)` : "none");
}

console.log("\n=== 5. The deployed procedure: workforce.ask, as the browser calls it ===");
const token = await mintStaffIdentityToken(staff);
const caller = appRouter.createCaller({ req: {} as never, res: {} as never });
const result = await caller.workforce.ask({ token, workerId, request: question });
check(result.outcome === "answered", "worker answered", `${result.outcome}: ${result.reason.slice(0, 160)}`);
const text = result.visibleText ?? "";
check(text.length > 200, "answer has substance", `${text.length} characters`);
check(/[.!?)"']\s*$/.test(text), "answer ends with a finished sentence", JSON.stringify(text.trim().slice(-1)));
check(!/\*\*|__|^#{1,6}\s|`/m.test(text), "answer carries no Markdown markers (the panel renders text)");
check(!/stagePosition|stage position|position \d+ of|personId|pipeline position/i.test(text), "answer uses no internal field names or pipeline positions");
console.log(`  lines: ${text.split("\n").length}; paragraphs: ${text.split(/\n{2,}/).length}`);

console.log("\n=== 6. What was stored is what was returned ===");
check(Boolean(result.conversationId), "a conversation id came back", result.conversationId ?? "none");
const stored = result.conversationId ? await listConversation(result.conversationId, staff.id, workerId) : [];
check(stored.length === 2, "one exchange stored: the question and the reply", `${stored.length} turn(s)`);
check(stored[0]?.role === "staff" && stored[0]?.content === question, "stored question is the one asked");
check(stored[1]?.role === "worker" && stored[1]?.content === text, "stored reply is byte-identical to the reply returned to the browser", stored[1] ? `${stored[1].content.length} characters` : "none");
// James is told to say plainly that notes, activities, emails and documents are
// not available to him, so a sentence about those is correct, not a failure.
// What must never appear is a claim of no access to the student, the record or the CRM.
const deniesRecord =
  /(don'?t|do not|cannot|can'?t|unable to|no) (have )?(any )?(live )?access to (any |the |this |her |his |their )?(case file|crm|pipedrive|student record|student's record|record|application record|her application)/i.test(text)
  || /no (live )?system access/i.test(text)
  || /(cannot|can'?t|unable to) (find|locate|see|retrieve) (the |her |this )?(student|record|application)/i.test(text);
check(!deniesRecord, "answer does not claim it lacks access to the student record or the CRM");
check(!/paste|attach(ed)? (the )?(handover|case file)/i.test(text), "answer does not ask the staff member to paste the record");
if (record?.stageLabel) check(text.toLowerCase().includes(record.stageLabel.toLowerCase().replace(/^s\d+\s*-\s*/, "").split("/")[0].trim().toLowerCase()), "answer states the student's stage", record.stageLabel);
if (record?.counsellor) check(text.includes(record.counsellor.split(" ")[0]), "answer names the counsellor");
if (listMode) {
  const named = listedNames.filter(n => text.includes(n.split(" ")[0]) && text.includes(n.split(" ").pop() ?? n)).length;
  // Every listed student, not a sample: the execution layer completes the
  // list from the records if the model leaves anybody out (17 September 2026).
  check(named === listedNames.length, "answer names every student listed", `${named} of ${listedNames.length}`);
  // The list is put back to the staff member: a question, or an invitation
  // to say which one, or to confirm. The exact wording is the worker's.
  check(/\?|which|let me know|tell me|confirm|point me|say who/i.test(text), "answer puts the choice back to the staff member");
} else {
  check(text.toLowerCase().includes("next"), "answer addresses what happens next");
}
check(!/\u2014|&mdash;/i.test(text), "answer as shown to the staff member carries no em dash");
console.log(`  release: ${result.reason}`);
console.log(`  brief: ${result.briefReference ?? "none"}`);

console.log(`\nRESULT: ${failures === 0 ? (listMode ? "the worker listed the matching students from the live WSA records and asked which one is meant" : "the worker found the student by name and answered from the live WSA record") : `${failures} check(s) failed`}.`);
process.exit(failures === 0 ? 0 : 1);
