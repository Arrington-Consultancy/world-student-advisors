import { readFileSync } from "fs";
import { createHash } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY pre-check for migration 0013 (the emailed link sets the password).
//
// Proves from live production evidence that 0013 is the ONLY migration this
// run will apply, and that the SQL it will apply is exactly the two reviewed
// statements and nothing else.
//
// 0013 CHANGES AN EXISTING COLUMN, unlike 0012, so the allow-list is written
// for that specifically. The MODIFY widens passwordHash from NOT NULL to
// NULL, which cannot fail on existing rows and cannot lose data, and the ADD
// carries a default so no existing row is left undefined. Anything else,
// including any other ALTER, stops the run.
//
// No DDL, no writes, no row data, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const TAG = "0013_signup_link_sets_password";
const TABLE = "staff_signup_requests";

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const local = journal.entries.map(entry => ({
  tag: entry.tag,
  hash: createHash("sha256").update(readFileSync(`drizzle/${entry.tag}.sql`, "utf8")).digest("hex"),
}));

const migrationSql = readFileSync(`drizzle/${TAG}.sql`, "utf8");
const body = migrationSql.replace(/^--.*$/gm, "");

// Destructive verbs are refused before anything is looked at closely.
if (/\b(DROP|DELETE|TRUNCATE|RENAME|UPDATE|INSERT)\b/i.test(body)) {
  console.error(`STOPPING: ${TAG}.sql contains a destructive statement this run is not authorised to apply.`);
  process.exit(1);
}

// The whole file must be exactly these two statements, in this order.
// Whitespace is normalised so a reformat does not fail it, but a changed
// column, table, type or nullability does.
const norm = s => s.replace(/\s+/g, " ").trim();
const statements = body.split(";").map(p => norm(p)).filter(p => p !== "");
const allowed = [
  s => s === "ALTER TABLE `" + TABLE + "` MODIFY COLUMN `passwordHash` VARCHAR(255) NULL DEFAULT NULL",
  s => s === "ALTER TABLE `" + TABLE + "` ADD COLUMN `purpose` VARCHAR(16) NOT NULL DEFAULT 'signup'",
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

// The 0009 failure: every statement after the first needs a breakpoint
// marker, or drizzle-kit sends the file as one query and mysql2 refuses it
// silently. Checked here, before a connection is opened.
const breakpoints = (migrationSql.match(/^--> statement-breakpoint$/gm) ?? []).length;
if (breakpoints !== statements.length - 1) {
  console.error(
    `STOPPING: ${TAG}.sql has ${statements.length} statement(s) but ${breakpoints} ` +
      `statement-breakpoint marker(s).`,
  );
  process.exit(1);
}
console.log(`SQL shape: ${statements.length} reviewed statements, ${breakpoints} breakpoints. OK.`);

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
      `\nSTOPPING: this run is authorised to apply migration 0013 and nothing else. ` +
        (pending.length === 0 ? "Nothing is pending; 0013 may already be applied." : `Pending set is [${pending.join(", ")}].`),
    );
    process.exit(1);
  }

  const localHashes = new Set(local.map(m => m.hash));
  const unknown = applied.filter(row => !localHashes.has(String(row.hash)));
  if (unknown.length > 0) {
    console.error(`\nSTOPPING: production has ${unknown.length} applied migration(s) not present in this repository.`);
    process.exit(1);
  }

  // The table must be in exactly the post-0012 shape: passwordHash still NOT
  // NULL, and no purpose column yet. If either is already true, something ran
  // by hand and the journal is not describing the real position.
  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${TABLE}
  `);
  if (cols.length === 0) {
    console.error(`\nSTOPPING: ${TABLE} does not exist, so 0012 is not applied as the journal claims.`);
    process.exit(1);
  }
  const byName = Object.fromEntries(cols.map(c => [String(c.COLUMN_NAME), c]));
  if (!byName.passwordHash) { console.error(`\nSTOPPING: ${TABLE}.passwordHash is missing.`); process.exit(1); }
  if (byName.passwordHash.IS_NULLABLE !== "NO") { console.error("\nSTOPPING: passwordHash is already nullable; 0013 has partially run."); process.exit(1); }
  if (byName.purpose) { console.error("\nSTOPPING: the purpose column already exists."); process.exit(1); }
  console.log(`\n${TABLE} is in the post-0012 shape. OK.`);

  // The widening cannot lose data, but the count is recorded so the run is
  // against a known starting position. Row data itself is never read.
  const [counts] = await db.execute(sql`SELECT COUNT(*) AS n FROM staff_signup_requests`);
  console.log(`${TABLE} rows before the migration: ${counts[0].n}`);

  console.log(`\n${TAG} is the only pending migration and matches the reviewed statements exactly. Safe to apply.`);
} catch (err) {
  console.error("Pre-check failed:", err.message);
  process.exit(1);
}

process.exit(0);
