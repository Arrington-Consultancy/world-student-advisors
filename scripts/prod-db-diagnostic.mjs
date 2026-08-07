import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// Read-only. Mirrors server/db.ts's exact connection method
// (drizzle(process.env.DATABASE_URL) via drizzle-orm/mysql2) so this
// reflects how the running app actually connects, not a hand-rolled
// alternative. Never prints DATABASE_URL or any row data — column
// metadata only.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

try {
  const [rows] = await db.execute(sql`SHOW COLUMNS FROM portal_users`);
  console.log("portal_users columns:");
  for (const row of rows) {
    console.log(`  ${row.Field} | type=${row.Type} | null=${row.Null} | key=${row.Key} | default=${row.Default}`);
  }
} catch (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

process.exit(0);
