/**
 * Why did a worker not find a student the staff member asked about?
 *
 * Reads, for the acting staff member and worker, the recent stored
 * questions and replies and the crm:lookup audit rows around them, and
 * reports SHAPE only: how many name candidates the resolver would extract
 * from each question, whether the target surname appears and in what case,
 * whether the reply reads as a denial, and each lookup's decision and
 * redacted reason. Never prints a question, a reply, a name or an email.
 *
 * Inputs: E2E_STAFF_EMAIL (default ACCESS_BOOTSTRAP_EMAIL), E2E_WORKER
 * (default james), E2E_SURNAME (the surname to look for, default none),
 * E2E_HOURS (window, default 48).
 */
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../server/db";
import { staffUsers, workerConversationTurns, workforceAuditEvents } from "../drizzle/schema";
import { extractNameCandidates } from "../server/execution/studentContext";

const staffEmail = ((process.env.E2E_STAFF_EMAIL || "").trim() || (process.env.ACCESS_BOOTSTRAP_EMAIL || "").trim()).toLowerCase();
const workerId = (process.env.E2E_WORKER || "").trim() || "james";
const surname = (process.env.E2E_SURNAME || "").trim();
const hours = Math.max(1, Number(process.env.E2E_HOURS) || 48);
const db = await getDb();
if (!db || !staffEmail) { console.log("Database and a staff email are required."); process.exit(2); }
const [staff] = await db.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.email, staffEmail)).limit(1);
if (!staff) { console.log("Staff account not found."); process.exit(1); }
const since = new Date(Date.now() - hours * 3600 * 1000);

const redact = (s: string) =>
  s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "<email>")
   .replace(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, "<name>")
   .replace(/\b\d{7,}\b/g, "<number>");

console.log(`\n=== Questions to ${workerId} from staff_users.id ${staff.id} in the last ${hours}h (newest first) ===`);
const turns = await db.select().from(workerConversationTurns)
  .where(and(eq(workerConversationTurns.staffUserId, staff.id), eq(workerConversationTurns.workerId, workerId), gte(workerConversationTurns.createdAt, since)))
  .orderBy(desc(workerConversationTurns.id)).limit(40);
const byConversation = new Map<string, typeof turns>();
for (const t of turns) byConversation.set(t.conversationId, [...(byConversation.get(t.conversationId) ?? []), t]);
for (const t of turns.filter(t => t.role === "staff")) {
  const q = t.content;
  const candidates = extractNameCandidates(q);
  const lower = q.toLowerCase();
  const hasSurname = surname ? lower.includes(surname.toLowerCase()) : null;
  const surnameCapitalised = surname ? new RegExp(`\\b${surname[0].toUpperCase()}${surname.slice(1).toLowerCase()}\\b`).test(q) : null;
  const capitalisedRun = /\b[A-Z][A-Za-z'’-]*\s+[A-Z][A-Za-z'’-]*\b/.test(q);
  const reply = (byConversation.get(t.conversationId) ?? []).find(r => r.role === "worker" && r.id > t.id);
  const denial = reply ? /(don'?t|do not|cannot|can'?t|unable to|no) (have )?(any )?(live )?access to|no (case file|record)|not (able to )?(find|locate)/i.test(reply.content) : null;
  console.log(
    `  turn ${t.id} at ${t.createdAt.toISOString()}: ${q.length} chars; name candidates extracted: ${candidates.length} (${candidates.map(c => `${c.split(/\s+/).length} words`).join(", ") || "none"}); ` +
    `any capitalised two-word run: ${capitalisedRun}` +
    (surname ? `; surname present: ${hasSurname}; surname capitalised: ${surnameCapitalised}` : "") +
    `; reply: ${reply ? `${reply.content.length} chars, reads as denial: ${denial}` : "none stored"}`,
  );
}

console.log(`\n=== crm:lookup audit rows for staff_users.id ${staff.id} in the last ${hours}h (newest first, reasons redacted) ===`);
const lookups = await db.select().from(workforceAuditEvents)
  .where(and(eq(workforceAuditEvents.staffUserId, staff.id), eq(workforceAuditEvents.requestedCapability, "crm:lookup"), gte(workforceAuditEvents.createdAt, since)))
  .orderBy(desc(workforceAuditEvents.id)).limit(40);
for (const a of lookups) {
  console.log(`  ${a.createdAt.toISOString()} ${a.workerId} ${a.permissionDecision}: ${redact(a.permissionReason).slice(0, 220)}${a.targetResourceId ? ` [${a.targetResourceId.split(",").length} person(s)]` : ""}`);
}
if (lookups.length === 0) console.log("  (none: no student lookup was attempted for this staff member in the window)");

console.log(`\n=== Other audit rows for ${workerId} and this staff member in the window, by capability and decision ===`);
const others = await db.select().from(workforceAuditEvents)
  .where(and(eq(workforceAuditEvents.staffUserId, staff.id), eq(workforceAuditEvents.workerId, workerId), gte(workforceAuditEvents.createdAt, since)))
  .orderBy(desc(workforceAuditEvents.id)).limit(200);
const tally = new Map<string, number>();
for (const a of others) { const k = `${a.requestedCapability} ${a.permissionDecision}${a.connector ? ` via ${a.connector}` : ""}`; tally.set(k, (tally.get(k) ?? 0) + 1); }
for (const [k, n] of tally) console.log(`  ${n} x ${k}`);
process.exit(0);
