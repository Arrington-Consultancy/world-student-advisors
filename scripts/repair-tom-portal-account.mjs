// One-off, targeted repair for a single known orphaned portal account:
// tom@arringtonconsultancy.com (portal_users id=2 as of the diagnostic that
// found it), created via "Sign in with Google" before that flow was
// changed to find-only, so it never got a pipedrivePersonId. Root cause and
// evidence: PR #49. This script does the exact one-time link that account
// still needs — see the exact SQL below — and touches no other row.
//
// Explicitly scoped to this one email only. The other five orphaned
// accounts identified in the same diagnostic are deliberately not touched
// here — each needs its own reviewed decision, not a bulk pass.
//
// DRY_RUN=true (the default) prints exactly what would change without
// writing anything. Pass DRY_RUN=false to actually write.
//
// Equivalent to:
//   UPDATE portal_users
//   SET pipedrivePersonId = <TARGET_PIPEDRIVE_PERSON_ID>,
//       pipedriveObjectType = 'lead',
//       pipedriveObjectId = '<TARGET_LEAD_ID>'
//   WHERE email = 'tom@arringtonconsultancy.com' AND pipedrivePersonId IS NULL;

import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, isNull } from "drizzle-orm";
import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";

const TARGET_EMAIL = "tom@arringtonconsultancy.com";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set in this environment.`);
    process.exit(1);
  }
  return value;
}

const databaseUrl = requireEnv("DATABASE_URL");
const targetPersonId = Number(requireEnv("TARGET_PIPEDRIVE_PERSON_ID"));
const targetLeadId = requireEnv("TARGET_PIPEDRIVE_LEAD_ID");
const DRY_RUN = process.env.DRY_RUN !== "false";

if (!Number.isInteger(targetPersonId) || targetPersonId <= 0) {
  console.error(`TARGET_PIPEDRIVE_PERSON_ID must be a positive integer, got: ${process.env.TARGET_PIPEDRIVE_PERSON_ID}`);
  process.exit(1);
}

console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE (will write to the database)"}`);
console.log(`Target: email=${TARGET_EMAIL}, pipedrivePersonId=${targetPersonId}, pipedriveObjectId=${targetLeadId}`);

// Minimal local mirror of drizzle/schema.ts's portalUsers table — same
// approach as scripts/create-demo-portal-account.mjs, only the columns
// this script actually touches.
const portalUsers = mysqlTable("portal_users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  pipedrivePersonId: int("pipedrivePersonId"),
  pipedriveObjectType: varchar("pipedriveObjectType", { length: 10 }),
  pipedriveObjectId: varchar("pipedriveObjectId", { length: 64 }),
  googleSub: varchar("googleSub", { length: 255 }).unique(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

try {
  const db = drizzle(databaseUrl);
  const rows = await db.select().from(portalUsers).where(eq(portalUsers.email, TARGET_EMAIL)).limit(1);

  if (!rows.length) {
    console.log(`No portal_users row found for ${TARGET_EMAIL}. Nothing to repair.`);
    process.exit(0);
  }

  const row = rows[0];
  console.log(`Found portal_users row: id=${row.id}, hasGoogleSub=${row.googleSub ? "yes" : "no"}, current pipedrivePersonId=${row.pipedrivePersonId ?? "null"}`);

  if (row.pipedrivePersonId !== null) {
    console.log(`Already linked to pipedrivePersonId=${row.pipedrivePersonId} — refusing to overwrite. No change made.`);
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log(
      `[DRY RUN] Would run: UPDATE portal_users SET pipedrivePersonId=${targetPersonId}, pipedriveObjectType='lead', pipedriveObjectId='${targetLeadId}' WHERE id=${row.id} AND pipedrivePersonId IS NULL;`
    );
    console.log("Dry run complete — nothing was written.");
    process.exit(0);
  }

  const result = await db
    .update(portalUsers)
    .set({ pipedrivePersonId: targetPersonId, pipedriveObjectType: "lead", pipedriveObjectId: targetLeadId })
    .where(and(eq(portalUsers.id, row.id), isNull(portalUsers.pipedrivePersonId)));

  console.log(`Update applied to portal_users id=${row.id}. Rows affected: ${result[0]?.affectedRows ?? "unknown"}.`);
  process.exit(0);
} catch (error) {
  console.error("Repair failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
