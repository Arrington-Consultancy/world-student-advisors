import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// READ-ONLY migration pre-check for authorising migration 0005.
//
// Mirrors server/db.ts's exact connection method. Executes only SHOW/SELECT
// statements — no DDL, no writes, no business-table row data, and never
// prints DATABASE_URL or any secret. Reports:
//   1. Every table currently in the production schema.
//   2. The full contents of __drizzle_migrations (id, hash, created_at —
//      migration bookkeeping only, not business data).
//   3. Each local journal migration's tag, `when` value and content sha256,
//      mapped against the tracking rows (drizzle records created_at = the
//      journal `when`, hash = sha256 of the migration file's content).
//   4. Which journal migrations `drizzle-kit migrate` would apply today
//      (entries with `when` greater than the last applied created_at —
//      drizzle-orm/mysql applies strictly by that ordering).
//   5. Whether staff_users / workforce_audit_events already exist.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const localEntries = journal.entries.map(entry => {
  const content = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
  return { tag: entry.tag, when: entry.when, hash: createHash("sha256").update(content).digest("hex") };
});

try {
  const [tables] = await db.execute(sql`SHOW TABLES`);
  const tableNames = tables.map(row => String(Object.values(row)[0]));
  console.log("=== 1. Tables in production ===");
  for (const name of tableNames.sort()) console.log(`  ${name}`);

  console.log("\n=== 2. __drizzle_migrations contents ===");
  let trackingRows = [];
  if (!tableNames.includes("__drizzle_migrations")) {
    console.log("  TABLE DOES NOT EXIST — no migration has ever been applied via drizzle-kit migrate here.");
  } else {
    const [rows] = await db.execute(sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at ASC`);
    trackingRows = rows;
    for (const row of rows) {
      console.log(`  id=${row.id} created_at=${row.created_at} hash=${row.hash}`);
    }
    if (rows.length === 0) console.log("  (table exists but is empty)");
  }

  console.log("\n=== 3. Local journal vs tracking table ===");
  const lastApplied = trackingRows.length > 0 ? Number(trackingRows[trackingRows.length - 1].created_at) : -1;
  for (const entry of localEntries) {
    const byTimestamp = trackingRows.find(row => Number(row.created_at) === entry.when);
    let status;
    if (byTimestamp) {
      status = byTimestamp.hash === entry.hash ? "APPLIED, content hash MATCHES local file" : `APPLIED but hash MISMATCH (db=${byTimestamp.hash})`;
    } else if (entry.when <= lastApplied) {
      status = "no exact-timestamp row, but OLDER than last applied — migrator would treat as applied";
    } else {
      status = "PENDING — drizzle-kit migrate would apply this";
    }
    console.log(`  ${entry.tag} | when=${entry.when} | localHash=${entry.hash.slice(0, 16)}… | ${status}`);
  }

  const unmatched = trackingRows.filter(row => !localEntries.some(entry => entry.when === Number(row.created_at)));
  console.log("\n=== 4. Tracking rows with no matching local journal entry ===");
  if (unmatched.length === 0) console.log("  none — every applied migration corresponds to a local journal entry");
  else for (const row of unmatched) console.log(`  UNEXPECTED: id=${row.id} created_at=${row.created_at} hash=${row.hash}`);

  console.log("\n=== 5. Stage 3 target tables ===");
  console.log(`  interview_coach_sessions exists: ${tableNames.includes("interview_coach_sessions")}`);
  console.log(`  staff_users exists:              ${tableNames.includes("staff_users")}`);
  console.log(`  workforce_audit_events exists:   ${tableNames.includes("workforce_audit_events")}`);
} catch (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

process.exit(0);
