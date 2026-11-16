// One-off, controlled setup for the single WSA demo/test portal account —
// see the approved design in the PR this ships with. Creates a Pipedrive
// Person + Lead directly via the API (never through contact.submitStudent,
// so none of the real applicant notification/confirmation/setup emails
// fire), then creates or updates the matching portal_users row so the
// account behaves like a genuine linked student account on login.
//
// Idempotent: safe to re-run. If the demo Person/Lead already exist, they
// are reused, not duplicated. If the portal_users row already exists, only
// its password hash and Pipedrive link are refreshed.
//
// DRY_RUN=true (the default) prints exactly what would be created/changed
// without writing anything to Pipedrive or the database. Pass
// DRY_RUN=false to actually write.
//
// Never logs the plaintext password — only its presence/length is checked.

import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";

const DEMO_EMAIL = "portal-demo@worldstudentadvisors.com";
const DEMO_PERSON_NAME = "ZZZ DEMO - WSA Internal Test - Do Not Contact";
const DEMO_LEAD_TITLE = "[DEMO] WSA Internal Test Account";
const DEMO_NOTE = [
  "DEMO / TEST RECORD - NOT A REAL APPLICANT.",
  "",
  "Created for internal demonstration purposes only (Student Portal and",
  "AI Interview Coach demos for staff, partners, or other visitors).",
  "",
  "Do not contact this record. Do not process it as a genuine student",
  "enquiry or admissions case. Safe to ignore or archive.",
  "",
  "Created via a controlled internal script, not the public application form.",
].join("\n");

const DRY_RUN = process.env.DRY_RUN !== "false";

// Minimal local mirror of drizzle/schema.ts's portalUsers table — this
// script is standalone (run via `railway run`, no app build step), so it
// declares only the columns it touches rather than importing the app's
// TypeScript schema module.
const portalUsers = mysqlTable("portal_users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  pipedrivePersonId: int("pipedrivePersonId"),
  pipedriveObjectType: varchar("pipedriveObjectType", { length: 10 }),
  pipedriveObjectId: varchar("pipedriveObjectId", { length: 64 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set in this environment.`);
    process.exit(1);
  }
  return value;
}

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";
const pipedriveToken = requireEnv("PIPEDRIVE_API_TOKEN");
const databaseUrl = requireEnv("DATABASE_URL");
const demoPassword = requireEnv("DEMO_PORTAL_PASSWORD");

console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE (will write to Pipedrive and the database)"}`);
console.log(`Demo password: provided, length ${demoPassword.length} (never printed)`);

async function pipedriveGet(path) {
  const url = `${PIPEDRIVE_BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${pipedriveToken}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pipedrive GET ${path} failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return response.json();
}

async function pipedrivePost(path, body) {
  const url = `${PIPEDRIVE_BASE}${path}?api_token=${pipedriveToken}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pipedrive POST ${path} failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return response.json();
}

async function findDemoPerson() {
  const result = await pipedriveGet(
    `/persons/search?term=${encodeURIComponent(DEMO_EMAIL)}&fields=email&exact_match=true`
  );
  const items = result?.data?.items ?? [];
  const found = items.find(i => typeof i.item?.id === "number");
  return found?.item?.id ?? null;
}

async function findDemoLead(personId) {
  const result = await pipedriveGet(`/leads?person_id=${personId}&limit=50`);
  const leads = result?.data ?? [];
  return leads.find(l => l.title === DEMO_LEAD_TITLE) ?? null;
}

try {
  let personId = await findDemoPerson();

  if (personId) {
    console.log(`Existing demo Person found: id=${personId} — reusing, not creating a duplicate.`);
  } else {
    console.log(`No existing demo Person found for ${DEMO_EMAIL}.`);
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would create Person: name="${DEMO_PERSON_NAME}", email=${DEMO_EMAIL}`);
      personId = -1; // placeholder so the rest of the dry run can describe the Lead/note/db steps
    } else {
      const created = await pipedrivePost("/persons", {
        name: DEMO_PERSON_NAME,
        email: [{ value: DEMO_EMAIL, primary: true, label: "work" }],
      });
      personId = created.data.id;
      console.log(`Created Person: id=${personId}`);
    }
  }

  let leadId = null;
  if (personId !== -1) {
    const existingLead = await findDemoLead(personId);
    if (existingLead) {
      leadId = existingLead.id;
      console.log(`Existing demo Lead found: id=${leadId} — reusing, not creating a duplicate.`);
    }
  }

  if (!leadId) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would create Lead: title="${DEMO_LEAD_TITLE}", person_id=${personId}`);
      console.log(`[DRY RUN] Would add a pinned note to that Lead:\n---\n${DEMO_NOTE}\n---`);
      leadId = "dry-run-lead-id";
    } else {
      const leadResult = await pipedrivePost("/leads", { title: DEMO_LEAD_TITLE, person_id: personId });
      leadId = leadResult.data.id;
      console.log(`Created Lead: id=${leadId}`);

      await pipedrivePost("/notes", { lead_id: leadId, content: DEMO_NOTE, pinned_to_lead_flag: 1 });
      console.log("Added pinned demo note to the Lead.");
    }
  }

  // No addPersonFollower calls — deliberately, per the approved design.

  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const db = drizzle(databaseUrl);
  const existingRows = await db.select().from(portalUsers).where(eq(portalUsers.email, DEMO_EMAIL)).limit(1);

  if (existingRows.length) {
    const row = existingRows[0];
    console.log(`Existing portal_users row found: id=${row.id} — updating password hash and Pipedrive link only.`);
    if (!DRY_RUN) {
      await db
        .update(portalUsers)
        .set({
          passwordHash,
          pipedrivePersonId: personId,
          pipedriveObjectType: "lead",
          pipedriveObjectId: String(leadId),
          isActive: 1,
        })
        .where(eq(portalUsers.id, row.id));
      console.log(`Updated portal_users row id=${row.id}.`);
    } else {
      console.log("[DRY RUN] Would update that row's passwordHash, pipedrivePersonId, pipedriveObjectType, pipedriveObjectId, isActive.");
    }
  } else {
    console.log("No existing portal_users row for this email.");
    if (!DRY_RUN) {
      const result = await db.insert(portalUsers).values({
        email: DEMO_EMAIL,
        firstName: "Demo",
        lastName: "WSA Internal",
        passwordHash,
        pipedrivePersonId: personId,
        pipedriveObjectType: "lead",
        pipedriveObjectId: String(leadId),
        isActive: 1,
      });
      console.log(`Created portal_users row id=${result[0].insertId}.`);
    } else {
      console.log(
        `[DRY RUN] Would insert a portal_users row: email=${DEMO_EMAIL}, firstName=Demo, lastName="WSA Internal", pipedrivePersonId=${personId}, pipedriveObjectType=lead, pipedriveObjectId=${leadId}, isActive=1.`
      );
    }
  }

  console.log(DRY_RUN ? "Dry run complete — nothing was written." : "Done.");
  process.exit(0);
} catch (error) {
  console.error("Demo account setup failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
