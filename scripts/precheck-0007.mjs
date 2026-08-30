import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// READ-ONLY guard, run immediately before `drizzle-kit migrate`.
//
// The point is narrow and specific: prove from live production evidence
// that 0007 is the ONLY migration this run will apply, so "apply migration
// 0007" cannot quietly become "apply whatever happens to be pending".
// It compares the applied migration hashes against the local journal the
// same way drizzle-kit does (sha256 of the SQL file contents), reports the
// difference, and exits non-zero on anything unexpected.
//
// No DDL, no writes, no row data, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const local = journal.entries.map(entry => ({
  tag: entry.tag,
  when: entry.when,
  hash: createHash("sha256").update(readFileSync(`drizzle/${entry.tag}.sql`, "utf8")).digest("hex"),
}));

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

  if (pending.length !== 1 || pending[0] !== "0007_staff_access_control") {
    console.error(
      "\nSTOPPING: this run is authorised to apply migration 0007 and nothing else. " +
        (pending.length === 0
          ? "Nothing is pending — 0007 may already be applied."
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

  console.log("\n0007_staff_access_control is the only pending migration. Safe to apply.");
} catch (err) {
  console.error("Pre-check failed:", err.message);
  process.exit(1);
}
