// Strictly read-only. Audits every portal_users row with no
// pipedrivePersonId (the "orphaned" state PR #49's self-repair targets),
// excluding tom@arringtonconsultancy.com (handled by a separate, already
// drafted one-time repair) and the WSA demo account (not a real student).
//
// For each orphaned row, searches Pipedrive by exact email match and
// reports every candidate Person found, their Leads/Deals, and whether
// repairing that row would be unambiguous and safe — never repairs
// anything itself. No db.update, no Pipedrive writes, anywhere in this
// file.

import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";
const EXCLUDED_EMAILS = new Set([
  "tom@arringtonconsultancy.com",
  "portal-demo@worldstudentadvisors.com",
]);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set in this environment.`);
    process.exit(1);
  }
  return value;
}

const pipedriveToken = requireEnv("PIPEDRIVE_API_TOKEN");
const databaseUrl = requireEnv("DATABASE_URL");

async function pipedriveGet(path) {
  const url = `${PIPEDRIVE_BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${pipedriveToken}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pipedrive GET ${path} failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return response.json();
}

async function searchPersonsByExactEmail(email) {
  const result = await pipedriveGet(`/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true`);
  const items = result?.data?.items ?? [];
  const ids = [...new Set(items.map(i => i.item?.id).filter(id => typeof id === "number"))];
  return ids;
}

async function getPerson(personId) {
  const result = await pipedriveGet(`/persons/${personId}`);
  const p = result?.data;
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    emails: (p.email ?? []).map(e => e.value?.toLowerCase()),
    addTime: p.add_time,
  };
}

async function getAllLeadsForPerson(personId) {
  const result = await pipedriveGet(`/leads?person_id=${personId}&limit=50`);
  return (result?.data ?? []).map(l => ({
    id: l.id,
    title: l.title,
    isArchived: Boolean(l.is_archived),
    addTime: l.add_time,
    updateTime: l.update_time,
  }));
}

async function getOpenDealsForPerson(personId) {
  const result = await pipedriveGet(`/persons/${personId}/deals?status=open`);
  return (result?.data ?? []).map(d => ({ id: d.id, title: d.title, stageId: d.stage_id, updateTime: d.update_time }));
}

// Minimal read-only mirror of drizzle/schema.ts's portalUsers columns.
const portalUsers = mysqlTable("portal_users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  pipedrivePersonId: int("pipedrivePersonId"),
  googleSub: varchar("googleSub", { length: 255 }).unique(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastLogin: timestamp("lastLogin"),
});

try {
  const db = drizzle(databaseUrl);
  const allRows = await db.select().from(portalUsers);

  console.log(`Total portal_users rows: ${allRows.length}`);

  // Every personId already linked to a live portal account, so a
  // candidate match can be checked against it — repairing an orphaned row
  // onto a Person another account already holds would create two portal
  // accounts pointing at the same student.
  const linkedPersonIdToAccounts = new Map();
  for (const row of allRows) {
    if (row.pipedrivePersonId !== null) {
      const list = linkedPersonIdToAccounts.get(row.pipedrivePersonId) ?? [];
      list.push({ id: row.id, email: row.email });
      linkedPersonIdToAccounts.set(row.pipedrivePersonId, list);
    }
  }

  const orphaned = allRows.filter(
    row => row.pipedrivePersonId === null && !EXCLUDED_EMAILS.has(row.email.toLowerCase())
  );

  const excludedButOrphaned = allRows.filter(
    row => row.pipedrivePersonId === null && EXCLUDED_EMAILS.has(row.email.toLowerCase())
  );
  for (const row of excludedButOrphaned) {
    console.log(`Excluded from this audit (handled separately): id=${row.id} email=${row.email}`);
  }

  console.log(`Orphaned rows in scope for this audit: ${orphaned.length}`);
  console.log("=".repeat(80));

  // Track which orphaned rows resolve to the same candidate Person, so a
  // sole exact-email match can still be flagged if a second orphaned
  // account in this same batch would collide with it.
  const candidatePersonIdToOrphanedEmails = new Map();
  const perRowResult = [];

  for (const row of orphaned) {
    const candidateIds = await searchPersonsByExactEmail(row.email);
    const candidates = [];
    for (const id of candidateIds) {
      const person = await getPerson(id);
      if (!person) continue;
      const leads = await getAllLeadsForPerson(id);
      const openDeals = await getOpenDealsForPerson(id);
      candidates.push({ person, leads, openDeals });
      const list = candidatePersonIdToOrphanedEmails.get(id) ?? [];
      list.push(row.email);
      candidatePersonIdToOrphanedEmails.set(id, list);
    }
    perRowResult.push({ row, candidates });
  }

  for (const { row, candidates } of perRowResult) {
    console.log("");
    console.log(`portal_users id=${row.id}  email=${row.email}`);
    console.log(`  name: ${row.firstName} ${row.lastName}`);
    console.log(`  isActive: ${row.isActive === 1 ? "yes" : "no"}`);
    console.log(`  hasGoogleSub: ${row.googleSub ? "yes" : "no"}`);
    console.log(`  createdAt: ${row.createdAt?.toISOString?.() ?? row.createdAt ?? "unknown"}`);
    console.log(`  lastLogin: ${row.lastLogin?.toISOString?.() ?? row.lastLogin ?? "never"}`);
    console.log(`  candidate Pipedrive Persons found (exact email match): ${candidates.length}`);

    let classification;
    let reason;

    if (candidates.length === 0) {
      classification = "NO MATCH FOUND";
      reason = "No Pipedrive Person has this exact email.";
    } else if (candidates.length > 1) {
      classification = "NEEDS MANUAL REVIEW";
      reason = `${candidates.length} different Pipedrive Persons share this exact email — ambiguous which one is the right match.`;
    } else {
      const only = candidates[0];
      const conflict = linkedPersonIdToAccounts.get(only.person.id);
      const collidesWithinBatch = (candidatePersonIdToOrphanedEmails.get(only.person.id) ?? []).length > 1;
      const activeLeads = only.leads.filter(l => !l.isArchived);

      if (conflict) {
        classification = "NEEDS MANUAL REVIEW";
        reason = `Pipedrive Person ${only.person.id} is already linked to another portal account: ${conflict.map(c => `id=${c.id} (${c.email})`).join(", ")}. Repairing this row would point two portal accounts at the same student.`;
      } else if (collidesWithinBatch) {
        classification = "NEEDS MANUAL REVIEW";
        reason = `More than one orphaned account in this audit matched the same Pipedrive Person ${only.person.id} (${candidatePersonIdToOrphanedEmails.get(only.person.id).join(", ")}) — needs a human decision on which (if any) is correct.`;
      } else if (activeLeads.length === 0 && only.openDeals.length === 0) {
        classification = "NEEDS MANUAL REVIEW";
        reason = `Pipedrive Person ${only.person.id} matched by exact email, but has no non-archived Lead and no open Deal — nothing to link the account to as evidence of a genuine application.`;
      } else if (activeLeads.length + only.openDeals.length > 1) {
        classification = "NEEDS MANUAL REVIEW";
        reason = `Pipedrive Person ${only.person.id} has more than one active Lead/Deal (${activeLeads.length} Lead(s), ${only.openDeals.length} open Deal(s)) — which one to record as the account's linked object isn't unambiguous.`;
      } else {
        classification = "SAFE TO REPAIR";
        reason = "Exactly one Pipedrive Person matched by exact email, not already linked to any other portal account, with exactly one active Lead/Deal as evidence of a genuine application.";
      }
    }

    for (const c of candidates) {
      console.log(`    - Person ${c.person.id} "${c.person.name}" (emails on file: ${c.person.emails.join(", ") || "none"}, added ${c.person.addTime ?? "unknown"})`);
      if (!c.leads.length) console.log("        Leads: none");
      for (const l of c.leads) {
        console.log(`        Lead ${l.id} | title="${l.title}" | archived=${l.isArchived} | created=${l.addTime} | updated=${l.updateTime}`);
      }
      if (!c.openDeals.length) console.log("        Open Deals: none");
      for (const d of c.openDeals) {
        console.log(`        Deal ${d.id} | title="${d.title}" | stageId=${d.stageId} | updated=${d.updateTime}`);
      }
      const conflict = linkedPersonIdToAccounts.get(c.person.id);
      if (conflict) {
        console.log(`        CONFLICT: already linked to portal_users ${conflict.map(x => `id=${x.id} (${x.email})`).join(", ")}`);
      }
    }

    console.log(`  CLASSIFICATION: ${classification}`);
    console.log(`  REASON: ${reason}`);
  }

  console.log("");
  console.log("=".repeat(80));
  console.log("Audit complete. No writes were made to Pipedrive or the database.");
  process.exit(0);
} catch (error) {
  console.error("Audit failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
