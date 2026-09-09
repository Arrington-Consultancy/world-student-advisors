import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY diagnosis of "no email came through" after a Staff Portal signup.
//
// Answers one question: did the signup reach the point of sending, or was it
// refused before anything was written? A refused signup writes no
// staff_signup_requests row and sends no email, and the form says the same
// words either way, so the row count is the only evidence of which happened.
//
// DATA MINIMISATION. No email addresses are printed. Counts, providers,
// purposes and timestamps only, which is everything the diagnosis needs.
// QA Records Access and Data Minimisation Standard v1.0 applies to this
// script as much as to anything a worker reads.
//
// No DDL, no writes, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

try {
  console.log("=== staff_users by sign-in route ===");
  const [byProvider] = await db.execute(sql`
    SELECT authProvider, COUNT(*) AS n, SUM(passwordHash IS NOT NULL) AS with_password
    FROM staff_users GROUP BY authProvider
  `);
  for (const row of byProvider) {
    console.log(`  ${row.authProvider}: ${row.n} account(s), ${row.with_password} with a local password`);
  }

  console.log("\n=== staff_signup_requests ===");
  const [requests] = await db.execute(sql`
    SELECT id, purpose, createdAt, expiresAt, consumedAt
    FROM staff_signup_requests ORDER BY createdAt DESC LIMIT 20
  `);
  if (requests.length === 0) {
    console.log("  NO ROWS.");
    console.log("  Meaning: no signup or reset request was ever recorded, so no email was ever");
    console.log("  attempted. The request was refused at the decision gate before any write.");
  } else {
    for (const r of requests) {
      const spent = r.consumedAt ? "spent" : "unspent";
      console.log(`  #${r.id} purpose=${r.purpose} created=${r.createdAt?.toISOString?.() ?? r.createdAt} ${spent}`);
    }
  }

  console.log("\n=== What a signup would decide for an existing account ===");
  // The decision is pure and lives in shared/staffSignup.ts. This restates
  // the two refusals that produce silence, so the log says plainly which
  // applies rather than leaving it to be inferred.
  const [existing] = await db.execute(sql`SELECT COUNT(*) AS n FROM staff_users`);
  console.log(`  staff_users rows: ${existing[0].n}`);
  console.log("  An address that already has an account is refused as already_registered,");
  console.log("  which shows the same 'check your email' message and sends nothing.");
  console.log("  A Microsoft or Google account is refused for reset as not_a_password_account,");
  console.log("  which shows the same 'check your email' message and sends nothing.");
} catch (err) {
  console.error("Diagnosis failed:", err.message);
  process.exit(1);
}

process.exit(0);
