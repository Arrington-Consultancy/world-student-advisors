import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// Read-only. Migration 0004 pre-check (Interview Coach repositioning):
// answers whether interview_coach_sessions already exists, whether 0003's
// effect (portal_users.google_sub) is present, and — via
// __drizzle_migrations, drizzle-kit's own bookkeeping table — exactly
// which migrations drizzle-kit migrate would consider already applied vs.
// still pending. Never writes anything, never prints student/applicant row
// data — __drizzle_migrations rows are migration metadata (hash + applied
// timestamp), not personal data, so those are printed in full.
//
// DATABASE_URL (as the app itself uses, and as this script originally used)
// is Railway's private internal hostname, unreachable from a GitHub Actions
// runner outside Railway's network (confirmed via ENOTFOUND on an earlier
// run). MYSQL_PUBLIC_URL, on the MySQL service itself, is the public proxy
// equivalent — this is the same established fix already used successfully
// for a prior one-off audit on this same connectivity problem.

const connectionUrl = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;
if (!connectionUrl) {
  console.error("Neither MYSQL_PUBLIC_URL nor DATABASE_URL is set in this environment.");
  process.exit(1);
}

const db = drizzle(connectionUrl);

try {
  const [tables] = await db.execute(sql`SHOW TABLES`);
  const tableNames = tables.map((row) => Object.values(row)[0]);
  console.log("Tables:");
  for (const name of tableNames) {
    console.log(`  ${name}`);
  }

  const hasInterviewCoachSessions = tableNames.includes("interview_coach_sessions");
  console.log(`\ninterview_coach_sessions exists: ${hasInterviewCoachSessions}`);
  if (hasInterviewCoachSessions) {
    const [icsColumns] = await db.execute(sql`SHOW COLUMNS FROM interview_coach_sessions`);
    console.log("\ninterview_coach_sessions columns:");
    for (const row of icsColumns) {
      console.log(`  ${row.Field} | type=${row.Type} | null=${row.Null} | key=${row.Key} | default=${row.Default} | extra=${row.Extra}`);
    }
    const [icsIndexes] = await db.execute(sql`SHOW INDEX FROM interview_coach_sessions`);
    console.log("\ninterview_coach_sessions indexes:");
    for (const row of icsIndexes) {
      console.log(`  key_name=${row.Key_name} | column=${row.Column_name} | unique=${row.Non_unique === 0} | seq=${row.Seq_in_index}`);
    }
  }

  const [portalUserColumns] = await db.execute(sql`SHOW COLUMNS FROM portal_users`);
  console.log("\nportal_users columns:");
  for (const row of portalUserColumns) {
    console.log(`  ${row.Field} | type=${row.Type} | null=${row.Null} | key=${row.Key} | default=${row.Default}`);
  }
  const hasGoogleSub = portalUserColumns.some((row) => row.Field === "google_sub");
  console.log(`\nportal_users.google_sub exists (0003's schema effect): ${hasGoogleSub}`);

  // Verifies the just-created demo account only — a hardcoded literal, not a
  // parameter, so this can never be repurposed to look up a real applicant's
  // row. Prints only the fields relevant to confirming the approved demo
  // design (no broadened suppression pattern, no extra Pipedrive linkage).
  const DEMO_EMAIL = "portal-demo@worldstudentadvisors.com";
  const [demoRows] = await db.execute(
    sql`SELECT id, email, firstName, lastName, pipedrivePersonId, pipedriveObjectType, pipedriveObjectId, isActive FROM portal_users WHERE email = ${DEMO_EMAIL}`
  );
  console.log(`\nDemo account row (${DEMO_EMAIL}):`);
  if (demoRows.length === 0) {
    console.log("  Not found.");
  } else {
    for (const row of demoRows) {
      console.log(`  ${JSON.stringify(row)}`);
    }
  }

  const migrationsTable = tableNames.find((name) => name.toLowerCase().includes("drizzle_migrations"));
  if (migrationsTable) {
    console.log(`\nFound drizzle-kit bookkeeping table: ${migrationsTable}`);
    const [migrationRows] = await db.execute(sql.raw(`SELECT * FROM \`${migrationsTable}\` ORDER BY created_at`));
    console.log(`Applied migrations recorded (${migrationRows.length}):`);
    for (const row of migrationRows) {
      console.log(`  ${JSON.stringify(row)}`);
    }
  } else {
    console.log(
      "\nNo drizzle-kit bookkeeping table found (__drizzle_migrations or similar) — no migration has ever " +
        "been applied via `drizzle-kit migrate` against this database. Any prior schema changes (e.g. 0002, 0003) " +
        "were applied by hand-run SQL instead, meaning `drizzle-kit migrate` would attempt to apply every journal " +
        "entry from 0000 onward, not just the ones truly missing."
    );
  }
} catch (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

process.exit(0);
