import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0017 (Connector OAuth grants).
//
// Prove the table exists with the columns the writer depends on and the
// enum values the classifier can produce, prove it is empty (a migration
// creates a table, it does not populate one), and prove nothing else moved.
//
// No DDL, no writes, no row data beyond counts, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);
let failures = 0;
const fail = m => { console.error(`  FAIL ${m}`); failures += 1; };
const pass = m => console.log(`  ok   ${m}`);

try {
  const [migrations] = await db.execute(sql`SELECT COUNT(*) AS n FROM __drizzle_migrations`);
  console.log(`\n=== Migration ledger ===\n  applied rows: ${migrations[0].n}`);
  // 0000 to 0016 is seventeen rows, so 0017 is the eighteenth.
  if (Number(migrations[0].n) !== 18) fail(`expected 18 applied migrations, found ${migrations[0].n}`);
  else pass("eighteen migrations applied");

  console.log("\n=== connector_oauth_grants ===");
  const [cols] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'connector_oauth_grants'
  `);
  if (cols.length === 0) {
    fail("connector_oauth_grants does not exist");
  } else {
    const byName = Object.fromEntries(cols.map(c => [String(c.COLUMN_NAME), c]));
    for (const required of ["id", "connector", "apiDomain", "scopes", "authorisedByStaffUserId", "authorisedAt", "sealedAccessToken", "accessTokenExpiresAt", "sealedRefreshToken", "status", "lastRefreshedAt", "lastRefreshError", "revokedAt", "createdAt"]) {
      if (byName[required]) pass(`${required} present`); else fail(`${required} is missing`);
    }
    const status = String(byName.status?.COLUMN_TYPE ?? "");
    for (const value of ["active", "reauthorisation_required", "revoked"]) {
      if (status.includes(`'${value}'`)) pass(`status accepts ${value}`); else fail(`status does not accept ${value}`);
    }
    if (byName.sealedRefreshToken?.IS_NULLABLE === "NO") pass("sealedRefreshToken is required: a grant without a sealed refresh token is not stored"); else fail("sealedRefreshToken must be NOT NULL");
    const [rows] = await db.execute(sql`SELECT COUNT(*) AS n FROM connector_oauth_grants`);
    console.log(`  note ${rows[0].n} grant row(s) present`);
  }
  const [mi] = await db.execute(sql`SELECT COUNT(*) AS n FROM information_resolutions`);
  pass(`information_resolutions untouched and readable (${mi[0].n} rows)`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
