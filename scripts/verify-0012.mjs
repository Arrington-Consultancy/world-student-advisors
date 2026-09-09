import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0012 (Staff Portal password
// signup).
//
// Three jobs. Prove staff_signup_requests is exactly what the signup flow
// expects. Prove staff_users gained its one nullable column. And prove the
// rows that already existed were not touched: every Microsoft and Google
// account must still hold no password, because neither route sets one and
// signInWithPassword refuses any account whose authProvider is not
// 'password'.
//
// The column shapes are not ceremony. The unique index on
// staff_signup_requests.email is what makes "a second attempt replaces the
// first" true; without it a person who mistypes and starts again would leave
// two live verification links, and the older one would still create an
// account. verificationTokenHash being the stored form is the whole reason a
// leaked table cannot mint a working link.
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
async function indexesOf(table) {
  const [rows] = await db.execute(sql`
    SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}
  `);
  return rows.map(r => ({ name: String(r.INDEX_NAME), unique: Number(r.NON_UNIQUE) === 0, column: String(r.COLUMN_NAME) }));
}

try {
  const [migrations] = await db.execute(sql`SELECT COUNT(*) AS n FROM __drizzle_migrations`);
  console.log(`\n=== Migration ledger ===\n  applied rows: ${migrations[0].n}`);
  // 0000 to 0011 is twelve rows, so 0012 is the thirteenth.
  if (Number(migrations[0].n) !== 13) fail(`expected 13 applied migrations, found ${migrations[0].n}`);
  else pass("thirteen migrations applied");

  console.log("\n=== staff_signup_requests ===");
  const pendingCols = await columnsOf("staff_signup_requests");
  if (Object.keys(pendingCols).length === 0) {
    fail("staff_signup_requests does not exist");
  } else {
    for (const c of Object.values(pendingCols)) console.log(`  ${c.COLUMN_NAME}: ${c.COLUMN_TYPE} (nullable ${c.IS_NULLABLE})`);
    for (const required of ["id", "email", "passwordHash", "verificationTokenHash", "expiresAt", "createdAt", "consumedAt"]) {
      if (pendingCols[required]) pass(`${required} present`); else fail(`${required} is missing`);
    }
    if (pendingCols.email?.IS_NULLABLE === "NO") pass("email is NOT NULL"); else fail("email must be NOT NULL");
    if (pendingCols.passwordHash?.IS_NULLABLE === "NO") pass("passwordHash is NOT NULL, so no pending signup lacks one"); else fail("passwordHash must be NOT NULL");
    if (pendingCols.verificationTokenHash?.IS_NULLABLE === "NO") pass("verificationTokenHash is NOT NULL, so no link exists without a stored hash to match it"); else fail("verificationTokenHash must be NOT NULL");
    if (pendingCols.expiresAt?.IS_NULLABLE === "NO") pass("expiresAt is NOT NULL, so no link is open ended"); else fail("expiresAt must be NOT NULL");
    if (pendingCols.consumedAt?.IS_NULLABLE === "YES") pass("consumedAt is nullable, null meaning unspent"); else fail("consumedAt must be nullable");
    // 255 is bcrypt's stored form with room to spare. A narrower column would
    // truncate a hash and make every comparison fail closed but silently.
    if (String(pendingCols.verificationTokenHash?.COLUMN_TYPE) === "varchar(255)") pass("verificationTokenHash is varchar(255), wide enough for a bcrypt hash");
    else fail(`verificationTokenHash type is ${pendingCols.verificationTokenHash?.COLUMN_TYPE}`);

    const idx = await indexesOf("staff_signup_requests");
    const emailUnique = idx.find(i => i.name === "staff_signup_requests_email_unique");
    if (emailUnique && emailUnique.unique && emailUnique.column === "email") pass("email is UNIQUE, so a second attempt replaces the first rather than adding a live link");
    else fail("staff_signup_requests_email_unique must be a unique index on email");

    const [n] = await db.execute(sql`SELECT COUNT(*) AS n FROM staff_signup_requests`);
    console.log(`  rows: ${n[0].n} (0 expected on first apply: nobody has signed up yet)`);
  }

  console.log("\n=== staff_users, the one change ===");
  const users = await columnsOf("staff_users");
  if (users.passwordHash && users.passwordHash.IS_NULLABLE === "YES") pass("passwordHash present and nullable");
  else fail(`passwordHash must exist and be nullable: ${JSON.stringify(users.passwordHash ?? null)}`);
  if (String(users.passwordHash?.COLUMN_TYPE) === "varchar(255)") pass("passwordHash is varchar(255)");
  else fail(`passwordHash type is ${users.passwordHash?.COLUMN_TYPE}`);

  console.log("\n=== 0011 still intact ===");
  for (const required of ["authProvider", "googleSubjectId", "entraObjectId"]) {
    if (users[required]) pass(`${required} still present`); else fail(`${required} disappeared`);
  }

  console.log("\n=== Existing rows untouched ===");
  const [rows] = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      SUM(passwordHash IS NULL) AS without_password,
      SUM(authProvider = 'password') AS password_accounts,
      SUM(entraObjectId IS NOT NULL) AS with_entra
    FROM staff_users
  `);
  const r = rows[0];
  console.log(`  total=${r.total} without_password=${r.without_password} password_accounts=${r.password_accounts} with_entra=${r.with_entra}`);
  if (Number(r.total) === Number(r.without_password)) pass("no existing account gained a password");
  else fail("some existing rows already carry a passwordHash");
  if (Number(r.password_accounts) === 0) pass("no authProvider='password' account exists yet, as expected before the first signup");
  else console.log("  note: password accounts already exist (fine on a re-verify after signups)");

  console.log("\n=== Nothing else moved ===");
  const [tables] = await db.execute(sql`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`);
  const names = tables.map(t => String(t.TABLE_NAME));
  for (const required of ["staff_users", "staff_approved_emails", "staff_access_grants", "staff_access_changes", "workforce_audit_events", "worker_conversation_turns", "__drizzle_migrations"]) {
    if (names.includes(required)) pass(`${required} present`); else fail(`${required} is missing`);
  }

  console.log(`\n${failures === 0 ? "VERIFICATION PASSED" : `VERIFICATION FAILED: ${failures} problem(s)`}`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
