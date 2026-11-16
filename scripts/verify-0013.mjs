import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0013 (the emailed link sets the
// password).
//
// Three jobs. Prove passwordHash on the pending table is now nullable, since
// no password is collected at signup and every insert would otherwise fail.
// Prove the purpose column exists and defaults to 'signup', which is what
// keeps a reset link from creating an account and a signup link from changing
// an existing password. And prove nothing else moved: the rest of the table,
// staff_users, and every table 0011 and 0012 left behind.
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

async function columnsOf(table) {
  const [rows] = await db.execute(sql`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}
    ORDER BY ORDINAL_POSITION
  `);
  return Object.fromEntries(rows.map(c => [String(c.COLUMN_NAME), c]));
}

try {
  const [migrations] = await db.execute(sql`SELECT COUNT(*) AS n FROM __drizzle_migrations`);
  console.log(`\n=== Migration ledger ===\n  applied rows: ${migrations[0].n}`);
  // 0000 to 0012 is thirteen rows, so 0013 is the fourteenth.
  if (Number(migrations[0].n) !== 14) fail(`expected 14 applied migrations, found ${migrations[0].n}`);
  else pass("fourteen migrations applied");

  console.log("\n=== staff_signup_requests, the two changes ===");
  const cols = await columnsOf("staff_signup_requests");
  if (Object.keys(cols).length === 0) {
    fail("staff_signup_requests does not exist");
  } else {
    for (const c of Object.values(cols)) console.log(`  ${c.COLUMN_NAME}: ${c.COLUMN_TYPE} (nullable ${c.IS_NULLABLE}, default ${c.COLUMN_DEFAULT})`);
    if (cols.passwordHash?.IS_NULLABLE === "YES") pass("passwordHash is now nullable, so a pending row needs no password");
    else fail("passwordHash must now be nullable");
    if (cols.purpose && cols.purpose.IS_NULLABLE === "NO" && String(cols.purpose.COLUMN_DEFAULT) === "signup") {
      pass("purpose present, NOT NULL, defaults to signup");
    } else fail(`purpose wrong: ${JSON.stringify(cols.purpose ?? null)}`);
    if (String(cols.purpose?.COLUMN_TYPE) === "varchar(16)") pass("purpose is varchar(16)");
    else fail(`purpose type is ${cols.purpose?.COLUMN_TYPE}`);

    console.log("\n=== The rest of the table is untouched ===");
    // The token being stored hashed and NOT NULL is the whole proof of
    // mailbox control, so it is re-checked after any change to this table.
    if (cols.verificationTokenHash?.IS_NULLABLE === "NO") pass("verificationTokenHash is still NOT NULL");
    else fail("verificationTokenHash must stay NOT NULL");
    if (cols.expiresAt?.IS_NULLABLE === "NO") pass("expiresAt is still NOT NULL, so no link is open ended");
    else fail("expiresAt must stay NOT NULL");
    if (cols.consumedAt?.IS_NULLABLE === "YES") pass("consumedAt is still nullable, null meaning unspent");
    else fail("consumedAt must stay nullable");
    if (cols.email?.IS_NULLABLE === "NO") pass("email is still NOT NULL");
    else fail("email must stay NOT NULL");

    const [rows] = await db.execute(sql`
      SELECT COUNT(*) AS n, SUM(purpose = 'signup') AS signups FROM staff_signup_requests
    `);
    console.log(`  rows: ${rows[0].n}, of which purpose='signup': ${rows[0].signups}`);
    if (Number(rows[0].n) === Number(rows[0].signups ?? 0)) pass("every existing row defaulted to purpose=signup");
    else console.log("  note: reset rows already present (fine on a re-verify after use)");
  }

  console.log("\n=== staff_users unchanged ===");
  const users = await columnsOf("staff_users");
  for (const required of ["passwordHash", "authProvider", "googleSubjectId", "entraObjectId", "email"]) {
    if (users[required]) pass(`${required} still present`); else fail(`${required} disappeared`);
  }
  if (users.passwordHash?.IS_NULLABLE === "YES") pass("staff_users.passwordHash is still nullable");
  else fail("staff_users.passwordHash must stay nullable");

  const [counts] = await db.execute(sql`
    SELECT COUNT(*) AS total, SUM(authProvider = 'password') AS password_accounts FROM staff_users
  `);
  console.log(`  staff_users total=${counts[0].total} password_accounts=${counts[0].password_accounts}`);

  console.log("\n=== Nothing else moved ===");
  const [tables] = await db.execute(sql`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`);
  const names = tables.map(t => String(t.TABLE_NAME));
  for (const required of ["staff_users", "staff_signup_requests", "staff_approved_emails", "staff_access_grants", "staff_access_changes", "workforce_audit_events", "worker_conversation_turns", "__drizzle_migrations"]) {
    if (names.includes(required)) pass(`${required} present`); else fail(`${required} is missing`);
  }

  console.log(`\n${failures === 0 ? "VERIFICATION PASSED" : `VERIFICATION FAILED: ${failures} problem(s)`}`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
