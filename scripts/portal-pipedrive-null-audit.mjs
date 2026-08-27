import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// Read-only, throwaway diagnostic for the pipedrivePersonId-repair
// investigation. Two queries only:
//   1. An aggregate count of portal_users rows with a null pipedrivePersonId
//      (no row data, no PII — a number only).
//   2. If AUDIT_EMAIL is set, the single named row's own linkage columns
//      (id, pipedrivePersonId, pipedriveObjectType/Id, whether a googleSub
//      is set, isActive) — explicitly scoped to one email the requester
//      already owns/named, never a general row dump.
// No writes, ever. Not part of any merged branch — created only to answer
// a one-off ops question, on a throwaway branch that won't be merged.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

try {
  const [countRows] = await db.execute(
    sql`SELECT COUNT(*) AS count FROM portal_users WHERE pipedrivePersonId IS NULL`
  );
  console.log(`portal_users rows with NULL pipedrivePersonId: ${countRows[0].count}`);

  const [totalRows] = await db.execute(sql`SELECT COUNT(*) AS count FROM portal_users`);
  console.log(`portal_users total rows: ${totalRows[0].count}`);

  const email = process.env.AUDIT_EMAIL;
  if (email) {
    const [rows] = await db.execute(
      sql`SELECT id, pipedrivePersonId, pipedriveObjectType, pipedriveObjectId, (googleSub IS NOT NULL) AS hasGoogleSub, isActive, createdAt, updatedAt FROM portal_users WHERE email = ${email.toLowerCase()}`
    );
    if (!rows.length) {
      console.log(`\nNo portal_users row found for ${email}.`);
    } else {
      console.log(`\nRow for ${email}:`);
      for (const row of rows) {
        console.log(`  id=${row.id} pipedrivePersonId=${row.pipedrivePersonId} pipedriveObjectType=${row.pipedriveObjectType} pipedriveObjectId=${row.pipedriveObjectId} hasGoogleSub=${row.hasGoogleSub} isActive=${row.isActive} createdAt=${row.createdAt} updatedAt=${row.updatedAt}`);
      }
    }
  }
} catch (error) {
  console.error("Query failed:", error.message);
  if (error.cause) console.error("Cause:", error.cause.message ?? error.cause);
  console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
  process.exit(1);
}

process.exit(0);
