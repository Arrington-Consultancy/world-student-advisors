import { readFileSync } from "fs";
import { createHash } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY pre-check for migration 0014 (per-user session invalidation).
//
// Proves from live production evidence that 0014 is the ONLY migration this
// run will apply, and that the SQL it will apply is exactly the one reviewed
// statement and nothing else.
//
// 0014 IS A SINGLE ADDITIVE STATEMENT. It adds one NOT NULL column with a
// default, so every existing row is given a defined value by the ALTER
// itself and no row is left null. There is no MODIFY and nothing that can
// change an existing column's shape. Anything else stops the run.
//
// No DDL, no writes, no row data, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const TAG = "0014_staff_session_version";

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const local = journal.entries.map(entry => ({
  tag: entry.tag,
  hash: createHash("sha256").update(readFileSync(`drizzle/${entry.tag}.sql`, "utf8")).digest("hex"),
}));

const migrationSql = readFileSync(`drizzle/${TAG}.sql`, "utf8");
const body = migrationSql.replace(/^--.*$/gm, "");

// Destructive verbs are refused before anything is looked at closely.
if (/\b(DROP|DELETE|TRUNCATE|RENAME|UPDATE|INSERT|MODIFY)\b/i.test(body)) {
  console.error(`STOPPING: ${TAG}.sql contains a statement this run is not authorised to apply.`);
  process.exit(1);
}

const norm = s => s.replace(/\s+/g, " ").trim();
const statements = body.split(";").map(p => norm(p)).filter(p => p !== "");
const allowed = [
  // NOT NULL DEFAULT 1 is the whole backwards-safety story for the existing
  // accounts, so the default is matched rather than assumed.
  s => s === "ALTER TABLE `staff_users` ADD COLUMN `sessionVersion` INT NOT NULL DEFAULT 1",
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
      `\nSTOPPING: this run is authorised to apply migration 0014 and nothing else. ` +
        (pending.length === 0 ? "Nothing is pending; 0014 may already be applied." : `Pending set is [${pending.join(", ")}].`),
    );
    process.exit(1);
  }

  const localHashes = new Set(local.map(m => m.hash));
  const unknown = applied.filter(row => !localHashes.has(String(row.hash)));
  if (unknown.length > 0) {
    console.error(`\nSTOPPING: production has ${unknown.length} applied migration(s) not present in this repository.`);
    process.exit(1);
  }

  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_users'
  `);
  const names = new Set(cols.map(c => String(c.COLUMN_NAME)));
  if (names.has("sessionVersion")) {
    console.error("\nSTOPPING: staff_users.sessionVersion already exists.");
    process.exit(1);
  }
  // 0013 must be the real position, not just the journal's claim.
  for (const expected of ["passwordHash", "authProvider", "googleSubjectId"]) {
    if (!names.has(expected)) {
      console.error(`\nSTOPPING: staff_users.${expected} is missing, so earlier migrations are not applied as claimed.`);
      process.exit(1);
    }
  }
  console.log("\nstaff_users is in the post-0013 shape with no sessionVersion column. OK.");

  // The accounts this must be backwards-safe for. Count only.
  const [counts] = await db.execute(sql`SELECT COUNT(*) AS n FROM staff_users`);
  console.log(`staff_users rows that will receive the default: ${counts[0].n}`);

  console.log(`\n${TAG} is the only pending migration and matches the reviewed statement exactly. Safe to apply.`);
} catch (err) {
  console.error("Pre-check failed:", err.message);
  process.exit(1);
}

process.exit(0);
