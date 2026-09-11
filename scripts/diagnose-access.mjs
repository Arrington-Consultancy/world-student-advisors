import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

// READ-ONLY check of the live staff access position.
//
// Exists because a routing conclusion was drawn from Worker Register v0.45
// (31 August) after Change Entry 086 (3 September) had already superseded
// it. A controlled record is only current until the next one, and the only
// way to be sure is to read production.
//
// DATA MINIMISATION. No email addresses and no display names are printed.
// Level, scopes, actions, overlays and counts are what the question needs.
// QA Records Access and Data Minimisation Standard v1.0 applies here.
//
// No DDL, no writes, no secrets.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);

try {
  const [users] = await db.execute(sql`
    SELECT id, baseAccessLevel, caseScope, accessStatus, isActive FROM staff_users ORDER BY id
  `);
  console.log(`=== staff_users: ${users.length} account(s) ===`);
  for (const u of users) {
    console.log(`  account #${u.id}: level=${u.baseAccessLevel ?? "none"} caseScope=${u.caseScope ?? "none"} status=${u.accessStatus ?? "none"} active=${u.isActive}`);
  }

  const [grants] = await db.execute(sql`
    SELECT staffUserId, grantType, value, revokedAt FROM staff_access_grants ORDER BY staffUserId, grantType, value
  `);
  const live = grants.filter(g => g.revokedAt === null);
  console.log(`\n=== grants: ${grants.length} rows, ${live.length} live ===`);

  const byUser = new Map();
  for (const g of live) {
    if (!byUser.has(g.staffUserId)) byUser.set(g.staffUserId, {});
    const bucket = byUser.get(g.staffUserId);
    (bucket[g.grantType] ??= []).push(String(g.value));
  }
  for (const [uid, bucket] of byUser) {
    console.log(`\n  account #${uid}`);
    for (const [type, values] of Object.entries(bucket)) {
      const unique = [...new Set(values)];
      const dupNote = unique.length === values.length ? "" : `  (WARNING: ${values.length - unique.length} duplicate row(s))`;
      console.log(`    ${type} (${unique.length}): ${unique.sort().join(", ")}${dupNote}`);
    }
  }

  console.log("\n=== The question this was run to answer ===");
  const WORKER_SCOPES = [
    "admissions", "discovery", "education_research", "enquiry_triage", "marketing_seo",
    "paid_media", "pre_arrival_student_success", "quality_assurance", "records_control",
    "scholarships_funding", "social_media", "suitability", "visa_compliance",
  ];
  for (const [uid, bucket] of byUser) {
    const held = new Set(bucket.functional_scope ?? []);
    const have = WORKER_SCOPES.filter(s => held.has(s));
    const missing = WORKER_SCOPES.filter(s => !held.has(s));
    console.log(`  account #${uid}: holds ${have.length} of the 13 worker scopes${missing.length ? `, missing ${missing.join(", ")}` : ", so every worker is reachable by scope"}`);
  }
} catch (err) {
  console.error("Diagnosis failed:", err.message);
  process.exit(1);
}

process.exit(0);
