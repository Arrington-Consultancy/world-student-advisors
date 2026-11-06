import { readFileSync } from "fs";
import { createHash } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY pre-check for migration 0021 (Google Ads upload sources): the
// Enquiry conversion upload, Google Ads worker brief of 14 October 2026,
// approved by Tom Arrington.
//
// Proves from live production evidence that 0021 is the ONLY migration this
// run will apply, that its SQL is exactly the seven reviewed statements, and
// that the table is in the post-0020 shape it expects. The statements add
// three columns, backfill sourceId from dealId on existing rows, make dealId
// nullable and add one unique key. Nothing is dropped, deleted or renamed.
//
// No DDL, no writes, no row data beyond counts, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const TAG = "0021_google_ads_upload_sources";
const T = "`google_ads_conversion_uploads`";

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const local = journal.entries.map(entry => ({
  tag: entry.tag,
  hash: createHash("sha256").update(readFileSync(`drizzle/${entry.tag}.sql`, "utf8")).digest("hex"),
}));

const migrationSql = readFileSync(`drizzle/${TAG}.sql`, "utf8");
const body = migrationSql.replace(/^--.*$/gm, "");

// Destructive verbs are refused before anything is looked at closely.
if (/\b(DROP|DELETE|TRUNCATE|RENAME|INSERT)\b/i.test(body)) {
  console.error(`STOPPING: ${TAG}.sql contains a statement this run is not authorised to apply.`);
  process.exit(1);
}

const norm = s => s.replace(/\s+/g, " ").trim();
const statements = body.split(";").map(p => norm(p)).filter(p => p !== "");
const REVIEWED = [
  `ALTER TABLE ${T} ADD \`sourceType\` enum('deal','lead') NOT NULL DEFAULT 'deal'`,
  `ALTER TABLE ${T} ADD \`sourceId\` varchar(64)`,
  `ALTER TABLE ${T} ADD \`statusChecks\` int NOT NULL DEFAULT 0`,
  `UPDATE ${T} SET \`sourceId\` = CAST(\`dealId\` AS CHAR) WHERE \`sourceId\` IS NULL`,
  `ALTER TABLE ${T} MODIFY \`sourceId\` varchar(64) NOT NULL`,
  `ALTER TABLE ${T} MODIFY \`dealId\` int`,
  `CREATE UNIQUE INDEX \`google_ads_conversion_uploads_source_action\` ON ${T} (\`sourceType\`,\`sourceId\`,\`conversionActionId\`)`,
];
if (statements.length !== REVIEWED.length) {
  console.error(`STOPPING: ${TAG}.sql has ${statements.length} statement(s); the reviewed migration has ${REVIEWED.length}.`);
  process.exit(1);
}
statements.forEach((s, i) => {
  if (s !== REVIEWED[i]) {
    console.error(`STOPPING: statement ${i + 1} of ${TAG}.sql is not the reviewed statement:\n  ${s}\nexpected:\n  ${REVIEWED[i]}`);
    process.exit(1);
  }
});

const breakpoints = (migrationSql.match(/^--> statement-breakpoint$/gm) ?? []).length;
if (breakpoints !== statements.length - 1) {
  console.error(`STOPPING: ${TAG}.sql has ${statements.length} statement(s) but ${breakpoints} marker(s).`);
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
      `\nSTOPPING: this run is authorised to apply migration 0021 and nothing else. ` +
        (pending.length === 0 ? "Nothing is pending; 0021 may already be applied." : `Pending set is [${pending.join(", ")}].`),
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
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_ads_conversion_uploads'
  `);
  const names = new Set(cols.map(c => String(c.COLUMN_NAME)));
  if (!names.has("dealId") || !names.has("conversionActionId")) {
    console.error("\nSTOPPING: google_ads_conversion_uploads is missing or not in the post-0020 shape.");
    process.exit(1);
  }
  for (const added of ["sourceType", "sourceId", "statusChecks"]) {
    if (names.has(added)) {
      console.error(`\nSTOPPING: ${added} already exists, so 0021 has been applied in part.`);
      process.exit(1);
    }
  }
  const [counts] = await db.execute(sql`
    SELECT COUNT(*) AS total, SUM(status = 'uploaded') AS uploaded, SUM(dealId IS NULL) AS nullDeal
    FROM google_ads_conversion_uploads
  `);
  const c = counts[0];
  console.log(`\nRows now: ${c.total} (uploaded ${c.uploaded ?? 0}); rows with no dealId: ${c.nullDeal ?? 0}.`);
  if (Number(c.nullDeal ?? 0) !== 0) {
    console.error("STOPPING: a row has no dealId, so the backfill could not give it a sourceId.");
    process.exit(1);
  }
  console.log("Every existing row is a Deal row with a dealId, so the backfill covers all of them. OK.");

  console.log(`\n${TAG} is the only pending migration and matches the reviewed statements exactly. Safe to apply.`);
} catch (err) {
  console.error("Pre-check failed:", err.message);
  process.exit(1);
}

process.exit(0);
