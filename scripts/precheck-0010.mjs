import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// READ-ONLY guard, run immediately before `drizzle-kit migrate`.
//
// Proves from live production evidence that 0010 is the ONLY migration
// this run will apply, so "apply migration 0010" cannot quietly become
// "apply whatever happens to be pending", and asserts that the file is
// still the purely additive change that was reviewed.
//
// No DDL, no writes, no row data, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const TAG = "0010_worker_conversation_turns";
const TABLE = "worker_conversation_turns";

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const local = journal.entries.map(entry => ({
  tag: entry.tag,
  hash: createHash("sha256").update(readFileSync(`drizzle/${entry.tag}.sql`, "utf8")).digest("hex"),
}));

const migrationSql = readFileSync(`drizzle/${TAG}.sql`, "utf8");
const body = migrationSql.replace(/^--.*$/gm, "");

// 0010 creates one table and its indexes. Anything that could touch data
// that already exists is outside what this run is authorised to apply.
if (/\b(DROP|DELETE|TRUNCATE|RENAME|ALTER\s+TABLE|UPDATE|INSERT)\b/i.test(body)) {
  console.error(`STOPPING: ${TAG}.sql contains a statement this run is not authorised to apply.`);
  process.exit(1);
}
if (!new RegExp("CREATE TABLE `" + TABLE + "`").test(body)) {
  console.error(`STOPPING: ${TAG}.sql is not the reviewed table creation.`);
  process.exit(1);
}

// The failure that cost migration 0009 a run: without a separator for each
// statement after the first, drizzle-kit sends the file as one query and
// mysql2 refuses it, printing no error at all. Checked here, before a
// connection is opened, because that is where a guard belongs.
const statements = body.split(";").map(p => p.trim()).filter(p => p !== "");
const breakpoints = (migrationSql.match(/^--> statement-breakpoint$/gm) ?? []).length;
if (breakpoints !== statements.length - 1) {
  console.error(
    `STOPPING: ${TAG}.sql has ${statements.length} statement(s) but ${breakpoints} ` +
      `statement-breakpoint marker(s). drizzle-kit would send more than one statement as a ` +
      `single query and fail without printing why.`,
  );
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
      `\nSTOPPING: this run is authorised to apply migration 0010 and nothing else. ` +
        (pending.length === 0
          ? "Nothing is pending — 0010 may already be applied."
          : `Pending set is [${pending.join(", ")}].`),
    );
    process.exit(1);
  }

  const localHashes = new Set(local.map(m => m.hash));
  const unknown = applied.filter(row => !localHashes.has(String(row.hash)));
  if (unknown.length > 0) {
    console.error(`\nSTOPPING: production has ${unknown.length} applied migration(s) not present in this repository.`);
    process.exit(1);
  }

  // The table must not already exist. If it does, something created it by
  // hand and the journal would be describing a position that is not real.
  const [existing] = await db.execute(sql`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${TABLE}
  `);
  if (existing.length > 0) {
    console.error(`\nSTOPPING: ${TABLE} already exists.`);
    process.exit(1);
  }

  const [before] = await db.execute(sql`
    SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()
  `);
  console.log(`\nTables before: ${before[0].n}`);
  console.log(`\n${TAG} is the only pending migration, and is purely additive. Safe to apply.`);
} catch (err) {
  console.error("Pre-check failed:", err.message);
  process.exit(1);
}

// mysql2 holds the connection open, which keeps Node's event loop alive,
// so this must exit explicitly or it prints its verdict and then hangs.
process.exit(0);
