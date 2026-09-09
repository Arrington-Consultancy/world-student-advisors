import { readFileSync } from "fs";
import { createHash } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY pre-check for migration 0012 (Staff Portal password signup).
//
// Proves from live production evidence that 0012 is the ONLY migration this
// run will apply, and that the SQL it will apply is exactly the two reviewed
// statements and nothing else.
//
// 0012 IS PURELY ADDITIVE, unlike 0011. It creates staff_signup_requests and
// adds one nullable column to staff_users. There is no MODIFY here, so
// nothing can change the shape of an existing column, and the allow-list
// below is written for those two statements specifically rather than
// inherited from 0011's five. Anything else stops the run.
//
// No DDL, no writes, no row data, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const TAG = "0012_staff_password_signup";
const NEW_TABLE = "staff_signup_requests";

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
  s =>
    s.startsWith("CREATE TABLE IF NOT EXISTS `" + NEW_TABLE + "`") &&
    s.includes("UNIQUE KEY `staff_signup_requests_email_unique` (`email`)") &&
    // The token must be stored hashed. If this column ever became something
    // that could hold a usable token, the emailed link would stop being proof
    // of anything, so its presence is checked here rather than assumed.
    s.includes("`verificationTokenHash` VARCHAR(255) NOT NULL"),
  s => s === "ALTER TABLE `staff_users` ADD COLUMN `passwordHash` VARCHAR(255) NULL DEFAULT NULL",
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
      `\nSTOPPING: this run is authorised to apply migration 0012 and nothing else. ` +
        (pending.length === 0 ? "Nothing is pending; 0012 may already be applied." : `Pending set is [${pending.join(", ")}].`),
    );
    process.exit(1);
  }

  const localHashes = new Set(local.map(m => m.hash));
  const unknown = applied.filter(row => !localHashes.has(String(row.hash)));
  if (unknown.length > 0) {
    console.error(`\nSTOPPING: production has ${unknown.length} applied migration(s) not present in this repository.`);
    process.exit(1);
  }

  // The new table must not exist yet.
  const [existing] = await db.execute(sql`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${NEW_TABLE}
  `);
  if (existing.length > 0) {
    console.error(`\nSTOPPING: ${NEW_TABLE} already exists.`);
    process.exit(1);
  }

  // staff_users must be in the post-0011 shape, and 0012's column must not be
  // there yet. 0011 is applied in production (run 34352888718), so the three
  // columns it produced are the evidence that the journal is describing the
  // real position rather than a database somebody has edited by hand.
  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_users'
  `);
  const byName = Object.fromEntries(cols.map(c => [String(c.COLUMN_NAME), c]));
  for (const expected of ["entraObjectId", "authProvider", "googleSubjectId", "email"]) {
    if (!byName[expected]) {
      console.error(`\nSTOPPING: staff_users.${expected} is missing, so 0011 is not applied as the journal claims.`);
      process.exit(1);
    }
  }
  if (byName.entraObjectId.IS_NULLABLE !== "YES") {
    console.error("\nSTOPPING: entraObjectId is still NOT NULL, so 0011 did not complete.");
    process.exit(1);
  }
  // The column 0012 adds. If it is already present, this migration has run
  // before or somebody added it by hand, and the journal is wrong either way.
  if (byName.passwordHash) {
    console.error("\nSTOPPING: staff_users.passwordHash already exists.");
    process.exit(1);
  }
  console.log("\nstaff_users is in the post-0011 shape with no passwordHash column. OK.");

  // Row counts only, so the run is recorded against a known starting position.
  // No addresses, no hashes, no row data of any kind.
  const [counts] = await db.execute(sql`SELECT COUNT(*) AS n FROM staff_users`);
  console.log(`staff_users rows before the migration: ${counts[0].n}`);

  console.log(`\n${TAG} is the only pending migration and matches the reviewed statements exactly. Safe to apply.`);
} catch (err) {
  console.error("Pre-check failed:", err.message);
  process.exit(1);
}

process.exit(0);
