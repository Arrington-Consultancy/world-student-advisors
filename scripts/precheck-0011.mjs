import { readFileSync } from "fs";
import { createHash } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY pre-check for migration 0011 (Staff Portal Google sign-in).
//
// Proves from live production evidence that 0011 is the ONLY migration this
// run will apply, and that the SQL it will apply is exactly the five
// reviewed statements and nothing else.
//
// 0011 IS NOT PURELY ADDITIVE, and this check is written for that rather
// than copied from 0010's. It creates one table AND alters staff_users four
// times: two ADD COLUMN, one ADD UNIQUE KEY, and one MODIFY that widens
// entraObjectId from NOT NULL to NULL. Each of those is allowed here by
// exact shape. Anything else, including any other ALTER, stops the run.
// The widening cannot fail on existing rows and cannot lose data, which is
// why it is authorised; a narrowing in the other direction would not be.
//
// No DDL, no writes, no row data, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const TAG = "0011_staff_google_signin";
const NEW_TABLE = "staff_approved_emails";

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

// The whole file must be exactly these five statements, in this order.
// Whitespace is normalised so a reformat does not fail it, but a changed
// column, table, type or nullability does.
const norm = s => s.replace(/\s+/g, " ").trim();
const statements = body.split(";").map(p => norm(p)).filter(p => p !== "");
const allowed = [
  s => s.startsWith("CREATE TABLE IF NOT EXISTS `" + NEW_TABLE + "`") && s.includes("UNIQUE KEY `staff_approved_emails_email_unique` (`email`)"),
  s => s === "ALTER TABLE `staff_users` ADD COLUMN `authProvider` VARCHAR(20) NOT NULL DEFAULT 'microsoft'",
  s => s === "ALTER TABLE `staff_users` ADD COLUMN `googleSubjectId` VARCHAR(64) NULL DEFAULT NULL",
  s => s === "ALTER TABLE `staff_users` ADD UNIQUE KEY `staff_users_googleSubjectId_unique` (`googleSubjectId`)",
  s => s === "ALTER TABLE `staff_users` MODIFY COLUMN `entraObjectId` VARCHAR(64) NULL DEFAULT NULL",
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
      `\nSTOPPING: this run is authorised to apply migration 0011 and nothing else. ` +
        (pending.length === 0 ? "Nothing is pending; 0011 may already be applied." : `Pending set is [${pending.join(", ")}].`),
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

  // staff_users must be in exactly the pre-0011 shape: no authProvider, no
  // googleSubjectId, and entraObjectId still NOT NULL. If any of that is
  // already true, something ran by hand and the journal is not describing
  // the real position.
  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_users'
  `);
  const byName = Object.fromEntries(cols.map(c => [String(c.COLUMN_NAME), c]));
  if (!byName.entraObjectId) { console.error("\nSTOPPING: staff_users.entraObjectId is missing."); process.exit(1); }
  if (byName.entraObjectId.IS_NULLABLE !== "NO") { console.error("\nSTOPPING: entraObjectId is already nullable; 0011 has partially run."); process.exit(1); }
  if (byName.authProvider || byName.googleSubjectId) { console.error("\nSTOPPING: 0011 columns already exist on staff_users."); process.exit(1); }
  console.log("\nstaff_users is in the pre-0011 shape. OK.");

  const [counts] = await db.execute(sql`SELECT COUNT(*) AS n, SUM(entraObjectId IS NULL) AS nulls FROM staff_users`);
  console.log(`staff_users rows: ${counts[0].n}, with null entraObjectId: ${counts[0].nulls} (must be 0)`);
  if (Number(counts[0].nulls) !== 0) { console.error("\nSTOPPING: unexpected null entraObjectId before the widening."); process.exit(1); }

  console.log(`\n${TAG} is the only pending migration and matches the reviewed statements exactly. Safe to apply.`);
} catch (err) {
  console.error("Pre-check failed:", err.message);
  process.exit(1);
}

process.exit(0);
