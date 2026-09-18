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
 *   E2E_FOLLOW_UP    optional short second message ("yes", "go ahead", "no thanks") sent
 *                    into the same conversation after the first answer, to prove a
 *                    follow-up is read against the worker's own offer (18 September 2026).
 * Exit 0 only when the routed worker answers from a CRM record for exactly
 * one student and does not say it lacks access.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { staffUsers } from "../drizzle/schema";
import { describePipedriveGrant, isWsaCompany } from "../server/crm/pipedriveOAuth";
import { routeStaffRequest } from "../server/workforce/router";
import { gatherConnectorEvidence, studentRecordIntent } from "../server/execution/evidence";
import { getWorker } from "../server/workforce/registry";
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
// Tom Arrington, 18 September 2026: a generic or routing question ("which
// specialist should handle a student who ...") carries no intent to reach a
// record. The correct evidence for it is none: no CRM call, so no unrelated
// student can be surfaced. The harness checks that, and that the answer
// names the specialist from the Worker Register.
const intent = studentRecordIntent(question);
const routingMode = !intent.intent;
if (routingMode) console.log(`  no record intent (${intent.reason}): a generic or routing question, answered without a CRM search`);
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
const listMode = !routingMode && crmBlocks.length === 0 && listedNames.length >= 2;
if (routingMode) {
  check(crmBlocks.length === 0, "no CRM record was read for a question that names nobody", `${crmBlocks.length} record(s)`);
  check(!evidence.notes.some(n => n.source === "pipedrive"), "no CRM search note, so no unrelated student was surfaced", `${evidence.notes.filter(n => n.source === "pipedrive").length} note(s)`);
} else if (listMode) {
  check(true, "several students were listed for the staff member to choose from", `${listedNames.length} listed`);
} else {
  check(crmBlocks.length === 1, "exactly one CRM record was read for the named student", `${crmBlocks.length} record(s)`);
}
const record = crmBlocks[0]?.data as { stageLabel?: string; counsellor?: string | null; fields?: Record<string, unknown> } | undefined;
if (!listMode && !routingMode) {
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
  const present = (n: string) => text.includes(n.split(" ")[0]) && text.includes(n.split(" ").pop() ?? n);
  const named = listedNames.filter(present).length;
  // Every listed student, not a sample: the execution layer completes the
  // list from the records if the model leaves anybody out (17 September 2026).
  // The names already appear in the evidence note above, so naming a missing
  // one here reveals nothing new.
  const missingNames = listedNames.filter(n => !present(n));
  check(named === listedNames.length, "answer names every student listed", `${named} of ${listedNames.length}${missingNames.length ? `; not found: ${missingNames.join("; ")}` : ""}`);
  // The list is put back to the staff member: a question, or an invitation
  // to say which one, or to confirm. The exact wording is the worker's.
  check(/\?|which|let me know|tell me|confirm|point me|say who/i.test(text), "answer puts the choice back to the staff member");
} else if (routingMode) {
  // The question asks who owns the work: the answer names that specialist
  // from the Worker Register (the worker the router chose), and says what
  // they do first.
  const specialist = getWorker(workerId).canonicalName;
  check(new RegExp(`\\b${specialist}\\b`).test(text), "answer names the specialist from the Worker Register", specialist);
  check(/\bfirst\b|\bnext\b|\bstep\b|\bstart\b|\bbegin\b|\bshould\b/i.test(text), "answer says what the specialist does first");
} else {
  // The wording is the worker's: "next", "the next step", "what should happen now", "then".
  check(/\bnext\b|\bstep\b|\bshould\b|\bneeds? to\b|\bthen\b|\bnow\b|\bfollow(ing|-up)?\b/i.test(text), "answer addresses what happens next");
}
check(!/\u2014|&mdash;/i.test(text), "answer as shown to the staff member carries no em dash");
console.log(`  release: ${result.reason}`);
console.log(`  brief: ${result.briefReference ?? "none"}`);

// 7. A follow-up in the same conversation. Tom Arrington, 18 September 2026:
// the worker offered a handover note, the staff member said "yes", and the
// worker asked what they meant and said the note already existed. The second
// message goes through the same deployed procedure with the conversation id.
// Printed: booleans and counts only; never the answer.
const followUpText = (process.env.E2E_FOLLOW_UP ?? "").trim();
if (followUpText && result.conversationId) {
  console.log(`\n=== 7. Follow-up in the same conversation (${followUpText.split(/\s+/).length} word(s)) ===`);
  const { readFollowUp, claimsPriorCompletion } = await import("../server/execution/followUp");
  const reading = readFollowUp(followUpText, [{ role: "staff", content: question }, { role: "worker", content: text }]);
  // Whether the first answer offered anything is the model's choice, not the
  // platform's; when it did not, the acceptance checks below do not apply and
  // the follow-up is still checked for a false completion claim.
  if (reading) check(true, "the first answer ended with an offer or question the follow-up answers", `${reading.offers.length} offer(s)${reading.alternatives ? ", put as alternatives" : ""}; reading ${reading.polarity}`);
  else console.log("  note the first answer made no offer, so the follow-up is a plain short message here; acceptance checks not applicable");
  const second = await caller.workforce.ask({ token, workerId, request: followUpText, conversationId: result.conversationId });
  check(second.outcome === "answered", "worker answered the follow-up", `${second.outcome}: ${second.reason.slice(0, 200)}`);
  const t2 = second.visibleText ?? "";
  const claim = claimsPriorCompletion(t2);
  check(claim === null, "follow-up answer does not claim the work already existed", claim ? `claimed: "${claim}"` : "");
  if (reading?.polarity === "accepts") {
    // Where some offers were put as alternatives, the worker does them
    // together if it can and asks which only if they exclude one another:
    // substance, or one question naming them, is right; a bare deferral is not.
    if (reading.alternatives) check(t2.length > 300 || /\?/.test(t2), "alternatives were offered: the follow-up answer does the work or asks which", `${t2.length} characters`);
    else check(t2.length > 300, "an accepted offer is done in full, not deferred", `${t2.length} characters`);
    const sentences = t2.split(/(?<=[.!?])\s+/).filter(Boolean);
    const questions = sentences.filter(x => x.trim().endsWith("?")).length;
    check(questions < sentences.length, "the follow-up answer is not only a question back", `${questions} of ${sentences.length} sentences are questions`);
    // The matched phrase is the worker's own words about what the staff
    // member wants, never the record; it is printed so a failure can be read.
    const restate = /what (would you like|do you mean|exactly|specifically)|could you clarify|which (one|part|of these) (do you|would you|did you)|let me know which/i.exec(t2);
    check(restate === null, "the follow-up answer does not ask the staff member to say again what they want", restate ? `asked: "${restate[0]}"` : "");
  }
  if (reading?.polarity === "declines") {
    check(t2.length < 600, "a declined offer is acknowledged briefly", `${t2.length} characters`);
  }
  check(!/\*\*|__|^#{1,6}\s|`/m.test(t2), "follow-up answer carries no Markdown markers");
  check(!/\u2014|&mdash;/i.test(t2), "follow-up answer carries no em dash");
  const stored2 = await listConversation(result.conversationId, staff.id, workerId);
  check(stored2.length === 4, "two exchanges stored in one conversation", `${stored2.length} turn(s)`);
  check(stored2[2]?.content === followUpText && stored2[3]?.content === t2, "the follow-up and its reply are stored as typed and as shown");
  console.log(`  release: ${second.reason}`);
}

console.log(`\nRESULT: ${failures === 0 ? (routingMode ? "the question named nobody, no CRM search was made, and the specialist was named from the Worker Register" : listMode ? "the worker listed the matching students from the live WSA records and asked which one is meant" : "the worker found the student by name and answered from the live WSA record") : `${failures} check(s) failed`}.`);
process.exit(failures === 0 ? 0 : 1);
