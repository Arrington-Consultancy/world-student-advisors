import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY post-migration verification for 0011 (Staff Portal Google
// sign-in).
//
// Three jobs. Prove the new approval table is exactly what the sign-in gate
// expects. Prove the four changes to staff_users landed. And prove the rows
// that already existed were not touched: every pre-existing staff member is
// a Microsoft account with a non-null entraObjectId, and the widening to
// NULL must have left all of them exactly so.
//
// The column shapes are not ceremony. On the Google route, the unique index
// on staff_approved_emails.email is what makes "one address, one row" true,
// and a live row and a revoked row for the same person could otherwise
// disagree about whether they may sign in.
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
  // 0000 to 0010 is eleven rows, so 0011 is the twelfth.
  if (Number(migrations[0].n) !== 12) fail(`expected 12 applied migrations, found ${migrations[0].n}`);
  else pass("twelve migrations applied");

  console.log("\n=== staff_approved_emails ===");
  const approvals = await columnsOf("staff_approved_emails");
  if (Object.keys(approvals).length === 0) {
    fail("staff_approved_emails does not exist");
  } else {
    for (const c of Object.values(approvals)) console.log(`  ${c.COLUMN_NAME}: ${c.COLUMN_TYPE} (nullable ${c.IS_NULLABLE})`);
    for (const required of ["id", "email", "approvedByStaffUserId", "approvedAt", "reason", "revokedAt", "revokedByStaffUserId", "revocationReason"]) {
      if (approvals[required]) pass(`${required} present`); else fail(`${required} is missing`);
    }
    if (approvals.email?.IS_NULLABLE === "NO") pass("email is NOT NULL"); else fail("email must be NOT NULL");
    if (approvals.reason?.IS_NULLABLE === "NO") pass("reason is NOT NULL, so no approval is unaccounted for"); else fail("reason must be NOT NULL");
    if (approvals.revokedAt?.IS_NULLABLE === "YES") pass("revokedAt is nullable, null meaning live"); else fail("revokedAt must be nullable");

    const idx = await indexesOf("staff_approved_emails");
    const emailUnique = idx.find(i => i.name === "staff_approved_emails_email_unique");
    if (emailUnique && emailUnique.unique && emailUnique.column === "email") pass("email is UNIQUE, so one address has exactly one row");
    else fail("staff_approved_emails_email_unique must be a unique index on email");

    const [n] = await db.execute(sql`SELECT COUNT(*) AS n FROM staff_approved_emails`);
    console.log(`  rows: ${n[0].n} (0 expected on first apply: nobody is approved until Tom approves them)`);
  }

  console.log("\n=== staff_users, the four changes ===");
  const users = await columnsOf("staff_users");
  if (users.authProvider && users.authProvider.IS_NULLABLE === "NO" && String(users.authProvider.COLUMN_DEFAULT) === "microsoft") {
    pass("authProvider present, NOT NULL, defaults to microsoft");
  } else fail(`authProvider wrong: ${JSON.stringify(users.authProvider ?? null)}`);
  if (users.googleSubjectId && users.googleSubjectId.IS_NULLABLE === "YES") pass("googleSubjectId present and nullable");
  else fail("googleSubjectId must exist and be nullable");
  if (users.entraObjectId && users.entraObjectId.IS_NULLABLE === "YES") pass("entraObjectId is now nullable");
  else fail("entraObjectId must now be nullable");

  const uidx = await indexesOf("staff_users");
  const g = uidx.find(i => i.name === "staff_users_googleSubjectId_unique");
  if (g && g.unique && g.column === "googleSubjectId") pass("googleSubjectId is UNIQUE");
  else fail("staff_users_googleSubjectId_unique must be a unique index on googleSubjectId");
  const e = uidx.find(i => i.column === "entraObjectId" && i.unique);
  if (e) pass(`entraObjectId keeps its unique index (${e.name}) after the widening`);
  else fail("entraObjectId lost its unique index");

  console.log("\n=== Existing rows untouched ===");
  const [rows] = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      SUM(authProvider = 'microsoft') AS microsoft,
      SUM(entraObjectId IS NOT NULL) AS with_entra,
      SUM(googleSubjectId IS NOT NULL) AS with_google
    FROM staff_users
  `);
  const r = rows[0];
  console.log(`  total=${r.total} microsoft=${r.microsoft} with_entra=${r.with_entra} with_google=${r.with_google}`);
  if (Number(r.total) === Number(r.microsoft)) pass("every existing row defaulted to authProvider=microsoft");
  else fail("some existing rows are not marked microsoft");
  if (Number(r.total) === Number(r.with_entra)) pass("every existing row still has its entraObjectId");
  else fail("the widening lost an entraObjectId");
  if (Number(r.with_google) === 0) pass("no row has a googleSubjectId yet, as expected on first apply");
  else console.log("  note: googleSubjectId already populated on some rows (fine on a re-verify after sign-ins)");

  console.log("\n=== Nothing else moved ===");
  const [tables] = await db.execute(sql`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`);
  const names = tables.map(t => String(t.TABLE_NAME));
  for (const required of ["staff_users", "staff_access_grants", "staff_access_changes", "workforce_audit_events", "worker_conversation_turns", "__drizzle_migrations"]) {
    if (names.includes(required)) pass(`${required} present`); else fail(`${required} is missing`);
  }

  console.log(`\n${failures === 0 ? "VERIFICATION PASSED" : `VERIFICATION FAILED: ${failures} problem(s)`}`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
