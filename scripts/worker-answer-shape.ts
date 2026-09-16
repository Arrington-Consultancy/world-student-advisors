/**
 * Shape of the replies a staff member has actually received from a worker,
 * read from the conversation store the deployed workforce.ask path writes.
 *
 * Diagnostic for 16 September 2026: an answer reached the Staff Portal
 * cut off at "Her counsellor". This shows, for the most recent stored
 * replies to the acting staff member, whether the text stored by the
 * server was itself cut off (so the fault is upstream of the browser) or
 * whole (so the fault is in delivery or rendering). Prints lengths,
 * booleans and the final character only. Never the text. Reads only.
 *
 * Inputs: E2E_STAFF_EMAIL (default ACCESS_BOOTSTRAP_EMAIL), E2E_WORKER (default james).
 */
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { staffUsers, workerConversationTurns } from "../drizzle/schema";

const staffEmail = ((process.env.E2E_STAFF_EMAIL || "").trim() || (process.env.ACCESS_BOOTSTRAP_EMAIL || "").trim()).toLowerCase();
const workerId = (process.env.E2E_WORKER || "").trim() || "james";
const db = await getDb();
if (!db || !staffEmail) { console.log("Database and a staff email are required."); process.exit(2); }
const [staff] = await db.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.email, staffEmail)).limit(1);
if (!staff) { console.log("Staff account not found."); process.exit(1); }

const rows = await db
  .select()
  .from(workerConversationTurns)
  .where(and(eq(workerConversationTurns.staffUserId, staff.id), eq(workerConversationTurns.workerId, workerId), eq(workerConversationTurns.role, "worker")))
  .orderBy(desc(workerConversationTurns.id))
  .limit(8);

console.log(`\n${rows.length} most recent stored replies from ${workerId} to staff_users.id ${staff.id} (newest first):`);
for (const r of rows) {
  const t = r.content;
  const trimmed = t.trim();
  console.log(
    `  turn ${r.id} at ${r.createdAt.toISOString()}: ${t.length} chars, ${t.split("\n").length} lines; ` +
    `ends with ${JSON.stringify(trimmed.slice(-1))}; finished sentence: ${/[.!?)"']$/.test(trimmed)}; ` +
    `ends at "Her counsellor": ${/Her counsellor\W*$/i.test(trimmed)}; ` +
    `bold markers: ${(t.match(/\*\*/g) ?? []).length}; heading marks: ${(t.match(/^#{1,6}\s/gm) ?? []).length}; ` +
    `mentions a pipeline position: ${/position \d+|stagePosition/i.test(t)}; em dash: ${/\u2014/.test(t)}`,
  );
}

process.exit(0);
