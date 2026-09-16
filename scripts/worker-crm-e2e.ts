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
 * engine, the real router and the real model. It exercises the SAME modules
 * the deployed /api/trpc/workforce.ask path calls, in the same order.
 *
 * What it prints: booleans, counts, ids, stage labels and the routed worker.
 * Never the student's contact details and never the worker's full answer,
 * because CI logs are not a controlled record. What it writes: the audit
 * rows the real path writes (the staff lookup, the connector read, and the
 * worker execution). No conversation row is recorded and nothing in the CRM
 * is touched.
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
import { executeWorker } from "../server/execution/execute";
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
const [staff] = await db.select({ id: staffUsers.id, isActive: staffUsers.isActive }).from(staffUsers).where(eq(staffUsers.email, staffEmail)).limit(1);
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
check(crmBlocks.length === 1, "exactly one CRM record was read for the named student", `${crmBlocks.length} record(s)`);
const record = crmBlocks[0]?.data as { stageLabel?: string; counsellor?: string | null; fields?: Record<string, unknown> } | undefined;
check(Boolean(record?.stageLabel), "record carries a stage", record?.stageLabel ?? "none");
check(record?.counsellor !== undefined, "record carries a counsellor field", record?.counsellor ? "named" : "none");
check(Boolean(record?.fields && Object.keys(record.fields).length > 0), "record carries the worker's approved remit fields", record?.fields ? `${Object.keys(record.fields).length} field(s)` : "none");

console.log("\n=== 5. Worker execution (same path as workforce.ask) ===");
const result = await executeWorker({ staffUserId: staff.id, workerId, requestText: question, authMethod: "entra_sso" });
check(result.outcome === "answered", "worker answered", `${result.outcome}: ${result.reason.slice(0, 160)}`);
const text = result.visibleText ?? "";
check(text.length > 200, "answer has substance", `${text.length} characters`);
check(!/(don'?t|do not|cannot|can'?t|unable to) (have )?(any )?access/i.test(text) && !/no (live )?system access/i.test(text), "answer does not claim it lacks access");
check(!/paste|attach(ed)? (the )?(handover|case file)/i.test(text), "answer does not ask the staff member to paste the record");
if (record?.stageLabel) check(text.toLowerCase().includes(record.stageLabel.toLowerCase().replace(/^s\d+\s*-\s*/, "").split("/")[0].trim().toLowerCase()), "answer states the student's stage", record.stageLabel);
if (record?.counsellor) check(text.includes(record.counsellor.split(" ")[0]), "answer names the counsellor");
check(text.toLowerCase().includes("next"), "answer addresses what happens next");
console.log(`  brief: ${result.briefReference ?? "none"}; quality check: ${result.qualityCheck ? (result.qualityCheck.passed ? "passed" : "failed") : "n/a"}`);

console.log(`\nRESULT: ${failures === 0 ? "the worker found the student by name and answered from the live WSA record" : `${failures} check(s) failed`}.`);
process.exit(failures === 0 ? 0 : 1);
