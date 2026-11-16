import { readFileSync } from "fs";
import { createHash } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY pre-check for migration 0018 (Reporting mirror sync runs).
//
// Proves from live production evidence that 0018 is the ONLY migration this
// run will apply, and that the SQL it will apply is exactly one CREATE TABLE
// of a table that does not yet exist. Additive only: no existing table,
// column or row is touched. Anything else stops the run.
//
// No DDL, no writes, no row data, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const TAG = "0018_mirror_sync_runs";

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const local = journal.entries.map(entry => ({
  tag: entry.tag,
  hash: createHash("sha256").update(readFileSync(`drizzle/${entry.tag}.sql`, "utf8")).digest("hex"),
}));

const migrationSql = readFileSync(`drizzle/${TAG}.sql`, "utf8");
const body = migrationSql.replace(/^--.*$/gm, "");

// Destructive verbs are refused before anything is looked at closely.
if (/\b(DROP|DELETE|TRUNCATE|RENAME|UPDATE|INSERT|MODIFY|ALTER)\b/i.test(body)) {
  console.error(`STOPPING: ${TAG}.sql contains a statement this run is not authorised to apply.`);
  process.exit(1);
}

const norm = s => s.replace(/\s+/g, " ").trim();
const statements = body.split(";").map(p => norm(p)).filter(p => p !== "");
const allowed = [
  s => s.startsWith("CREATE TABLE `mirror_sync_runs` (") && s.includes("CONSTRAINT `mirror_sync_runs_id` PRIMARY KEY(`id`)"),
];
if (statements.length !== allowed.length) {
  console.error(`STOPPING: ${TAG}.sql has ${statements.length} statement(s); the reviewed migration has ${allowed.length}.`);
  process.exit(1);
}
statements.forEach((s, i) => {
  if (!allowed[i](s)) {
    console.error(`STOPPING: statement ${i + 1} of ${TAG}.sql is not the reviewed statement:\n  ${s}`);
    process.exit(1);
  }
});

// A single statement needs no breakpoint marker; more than one would.
const breakpoints = (migrationSql.match(/^--> statement-breakpoint$/gm) ?? []).length;
if (breakpoints !== statements.length - 1) {
  console.error(`STOPPING: ${TAG}.sql has ${statements.length} statement(s) but ${breakpoints} marker(s).`);
  process.exit(1);
}
console.log(`SQL shape: ${statements.length} reviewed statement, ${breakpoints} breakpoints. OK.`);

const db = drizzle(process.env.DATABASE_URL);

try {
  const [applied] = await db.execute(sql`SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at ASC`);
  const appliedHashes = new Set(applied.map(row => String(row.hash)));

  console.log("\n=== Local migrations vs production ===");
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
      `\nSTOPPING: this run is authorised to apply migration 0017 and nothing else. ` +
        (pending.length === 0 ? "Nothing is pending; 0017 may already be applied." : `Pending set is [${pending.join(", ")}].`),
    );
    process.exit(1);
  }

  const localHashes = new Set(local.map(m => m.hash));
  const unknown = applied.filter(row => !localHashes.has(String(row.hash)));
  if (unknown.length > 0) {
    console.error(`\nSTOPPING: production has ${unknown.length} applied migration(s) not present in this repository.`);
    process.exit(1);
  }

  const [tables] = await db.execute(sql`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()
  `);
  const names = new Set(tables.map(t => String(t.TABLE_NAME)));
  if (names.has("mirror_sync_runs")) {
    console.error("\nSTOPPING: mirror_sync_runs already exists.");
    process.exit(1);
  }
  // 0016 must be the real position, not just the journal's claim.
  if (!names.has("information_resolutions")) {
    console.error("\nSTOPPING: information_resolutions is missing, so 0016 is not applied as claimed.");
    process.exit(1);
  }
  console.log("\nDatabase is in the post-0016 shape with no mirror_sync_runs table. OK.");

  console.log(`\n${TAG} is the only pending migration and matches the reviewed statement exactly. Safe to apply.`);
} catch (err) {
  console.error("Pre-check failed:", err.message);
  process.exit(1);
}

process.exit(0);
