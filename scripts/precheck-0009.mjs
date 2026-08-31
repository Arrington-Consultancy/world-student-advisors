import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// READ-ONLY guard, run immediately before `drizzle-kit migrate`.
//
// The point is narrow and specific: prove from live production evidence
// that 0009 is the ONLY migration this run will apply, so "apply migration
// 0009" cannot quietly become "apply whatever happens to be pending".
// It compares the applied migration hashes against the local journal the
// same way drizzle-kit does (sha256 of the SQL file contents), reports the
// difference, and exits non-zero on anything unexpected.
//
// It also asserts what 0009 is about to change, because this migration is
// the first in the series that is not purely additive at the table level:
// it MODIFIES two existing columns. Widening an ENUM is backward
// compatible and cannot lose a row, but a guard that only counted pending
// migrations would not notice if the file's contents had drifted into
// something that could.
//
// No DDL, no writes, no row data, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const TAG = "0009_executive_access_audit";

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const local = journal.entries.map(entry => ({
  tag: entry.tag,
  when: entry.when,
  hash: createHash("sha256").update(readFileSync(`drizzle/${entry.tag}.sql`, "utf8")).digest("hex"),
}));

// What 0009 is allowed to be. Anything else and this run stops.
const migrationSql = readFileSync(`drizzle/${TAG}.sql`, "utf8");
const forbidden = /\b(DROP|DELETE|TRUNCATE|RENAME|CREATE\s+TABLE)\b/i;
if (forbidden.test(migrationSql.replace(/^--.*$/gm, ""))) {
  console.error(`STOPPING: ${TAG}.sql contains a statement this run is not authorised to apply.`);
  process.exit(1);
}
const modifiesExpected =
  /ALTER TABLE `workforce_audit_events`[\s\S]*MODIFY COLUMN `authMethod`/i.test(migrationSql) &&
  /ALTER TABLE `staff_enquiries`[\s\S]*MODIFY COLUMN `authMethod`/i.test(migrationSql);
if (!modifiesExpected) {
  console.error(`STOPPING: ${TAG}.sql is not the reviewed enum widening.`);
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

try {
  const [applied] = await db.execute(sql`SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at ASC`);
  const appliedHashes = new Set(applied.map(row => String(row.hash)));

  console.log("=== Local migrations vs production ===");
  const pending = [];
  for (const migration of local) {
    const isApplied = appliedHashes.has(migration.hash);
    console.log(`  ${isApplied ? "applied " : "PENDING "} ${migration.tag}`);
    if (!isApplied) pending.push(migration.tag);
  }

  console.log(`\nApplied rows in production: ${applied.length}`);
  console.log(`Pending locally: ${pending.length === 0 ? "(none)" : pending.join(", ")}`);

  if (pending.length !== 1 || pending[0] !== TAG) {
    console.error(
      `\nSTOPPING: this run is authorised to apply migration 0009 and nothing else. ` +
        (pending.length === 0
          ? "Nothing is pending — 0009 may already be applied."
          : `Pending set is [${pending.join(", ")}].`),
    );
    process.exit(1);
  }

  // A hash in production that no local migration accounts for means the two
  // histories have diverged, and applying anything on top would be guessing.
  const localHashes = new Set(local.map(m => m.hash));
  const unknown = applied.filter(row => !localHashes.has(String(row.hash)));
  if (unknown.length > 0) {
    console.error(`\nSTOPPING: production has ${unknown.length} applied migration(s) not present in this repository.`);
    process.exit(1);
  }

  // Both target columns must exist and must currently be the narrow enum.
  // If either has already been widened, this migration has effectively been
  // applied by hand and the journal would be lying about the position.
  const [before] = await db.execute(sql`
    SELECT TABLE_NAME, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'authMethod'
      AND TABLE_NAME IN ('workforce_audit_events', 'staff_enquiries')
    ORDER BY TABLE_NAME
  `);

  console.log("\n=== authMethod columns before ===");
  for (const row of before) console.log(`  ${row.TABLE_NAME}: ${row.COLUMN_TYPE}`);

  if (before.length !== 2) {
    console.error(`\nSTOPPING: expected 2 authMethod columns, found ${before.length}.`);
    process.exit(1);
  }
  for (const row of before) {
    if (String(row.COLUMN_TYPE).includes("shared_executive")) {
      console.error(`\nSTOPPING: ${row.TABLE_NAME}.authMethod already accepts shared_executive.`);
      process.exit(1);
    }
  }

  // Row counts, so the verification afterwards can prove nothing was lost.
  const [counts] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM workforce_audit_events) AS audit_rows,
      (SELECT COUNT(*) FROM staff_enquiries) AS enquiry_rows
  `);
  console.log(`\nRows before: workforce_audit_events=${counts[0].audit_rows}, staff_enquiries=${counts[0].enquiry_rows}`);

  console.log(`\n${TAG} is the only pending migration. Safe to apply.`);
} catch (err) {
  console.error("Pre-check failed:", err.message);
  process.exit(1);
}

// mysql2 holds the connection open, which keeps Node's event loop alive, so
// this script must exit explicitly or it prints its verdict and then hangs
// forever, taking the workflow step with it.
process.exit(0);
