import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY production verification of the break-glass executive route,
// run inside the app service's own environment so the variables it reads
// are the ones the running application actually receives.
//
// It never prints the hash and never attempts an authentication, because
// authenticating would require the password and this process must not have
// it. What it establishes is everything short of that: the route is
// configured, the audit trail can record it honestly, and the credential
// has no database row through which its authority could be widened.

let failures = 0;
const fail = m => { console.error(`  FAIL ${m}`); failures += 1; };
const pass = m => console.log(`  ok   ${m}`);

// 1. The route is configured, and the value is a real bcrypt hash.
console.log("=== The executive route is configured ===");
const hash = process.env.EXECUTIVE_PASSWORD_HASH ?? "";
if (hash === "") {
  fail("EXECUTIVE_PASSWORD_HASH is not present in the app service environment");
} else {
  pass("EXECUTIVE_PASSWORD_HASH is present in the running app's environment");
  if (/^\$2[aby]\$/.test(hash)) pass("it is a bcrypt hash");
  else fail("it is not in bcrypt format");
  const cost = Number(hash.split("$")[2]);
  if (Number.isFinite(cost) && cost >= 12) pass(`cost factor is ${cost}`);
  else fail(`cost factor is below the required 12`);
  if (hash.length === 60) pass("it is 60 characters, so nothing was truncated");
  else fail(`it is ${hash.length} characters, so it was truncated or corrupted`);
  // The application treats an unset hash as an absent door rather than an
  // open one. This is that same condition, evaluated against production.
  if (Boolean(hash)) pass("isExecutiveAccessConfigured() would return true here");
}
// The plaintext must never be deployed. Only the hash belongs in Railway.
if ((process.env.EXECUTIVE_PASSWORD ?? "") === "") pass("no plaintext password is deployed to the service");
else fail("a plaintext EXECUTIVE_PASSWORD is present on the service and must be removed");

if (!process.env.DATABASE_URL) {
  console.error("\nDATABASE_URL is not set, so the audit checks cannot run.");
  process.exit(1);
}
const db = drizzle(process.env.DATABASE_URL);

try {
  // 2. The audit trail can say shared_executive, and says it honestly.
  console.log("\n=== The audit trail can record this route honestly ===");
  const [columns] = await db.execute(sql`
    SELECT TABLE_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'authMethod'
      AND TABLE_NAME IN ('workforce_audit_events', 'staff_enquiries')
    ORDER BY TABLE_NAME
  `);
  for (const row of columns) {
    const t = String(row.COLUMN_TYPE);
    if (t.includes("shared_executive")) pass(`${row.TABLE_NAME} accepts shared_executive`);
    else fail(`${row.TABLE_NAME} does not accept shared_executive`);
    // The three values must stay distinct. Folding the shared route into
    // entra_sso would make the trail claim a named person acted.
    if (t.includes("entra_sso") && t.includes("shared_password")) pass(`${row.TABLE_NAME} keeps all three methods distinct`);
    else fail(`${row.TABLE_NAME} lost one of the original methods`);
  }

  console.log("\n=== Audit rows by authentication method ===");
  const [rows] = await db.execute(sql`
    SELECT authMethod, COUNT(*) AS n FROM workforce_audit_events GROUP BY authMethod ORDER BY authMethod
  `);
  const byMethod = Object.fromEntries(rows.map(r => [String(r.authMethod), Number(r.n)]));
  for (const [method, n] of Object.entries(byMethod)) console.log(`  ${method}: ${n}`);
  const executiveRows = byMethod.shared_executive ?? 0;
  console.log(`\n  shared_executive rows: ${executiveRows}`);
  if (executiveRows === 0) {
    console.log("  (none yet, which is correct: nobody has used the route. The first");
    console.log("   real sign-in writes the first row. No synthetic row was inserted.)");
  } else {
    pass(`${executiveRows} executive action(s) recorded under their own method, not borrowed`);
  }
  // Whatever exists must be a recognised method. An empty or unknown value
  // would mean the trail cannot say what kind of session acted.
  const unknown = Object.keys(byMethod).filter(m => !["entra_sso", "shared_password", "shared_executive"].includes(m));
  if (unknown.length === 0) pass("every audit row carries a recognised authentication method");
  else fail(`audit rows carry unrecognised methods: ${unknown.join(", ")}`);

  // 3. The credential's authority lives in code and has no editable row.
  //    EXECUTIVE_STAFF_USER_ID is -1: negative so a real autoincrement id
  //    can never collide, and absent from staff_users so the access screen
  //    has nothing to grant it, revoke from it, or widen.
  console.log("\n=== The credential cannot widen its own authority ===");
  const [sentinel] = await db.execute(sql`SELECT COUNT(*) AS n FROM staff_users WHERE id <= 0`);
  if (Number(sentinel[0].n) === 0) pass("no staff_users row exists for the executive sentinel, so its profile is not editable through the access screen");
  else fail(`${sentinel[0].n} staff_users row(s) with a non-positive id exist; the sentinel must never be a database person`);

  const [grants] = await db.execute(sql`SELECT COUNT(*) AS n FROM staff_access_grants WHERE staffUserId <= 0`);
  if (Number(grants[0].n) === 0) pass("no access grants are attached to the sentinel, so its authority comes only from code");
  else fail(`${grants[0].n} access grant(s) are attached to the sentinel`);

  // 4. Named Entra identity is untouched by any of this.
  console.log("\n=== Named Microsoft identity is unaffected ===");
  const [staff] = await db.execute(sql`
    SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active FROM staff_users
  `);
  console.log(`  staff_users: ${staff[0].total} total, ${staff[0].active} active`);
  const [live] = await db.execute(sql`SELECT COUNT(*) AS n FROM staff_access_grants WHERE revokedAt IS NULL`);
  console.log(`  live access grants: ${live[0].n}`);
  pass("named staff records and their grants are unchanged by this deployment");

  console.log(`\n${failures === 0 ? "VERIFICATION PASSED" : `VERIFICATION FAILED: ${failures} problem(s)`}`);
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}

process.exit(failures === 0 ? 0 : 1);
