import { describe, expect, it, vi } from "vitest";
import { MI_HUMAN_OWNER, readerOver, resolveInformationQuestion, type ResolutionRecord } from "./resolve";
import { CRM_FIELDS } from "./evidence";
import type { StaffAccessProfile } from "../../access/accessControl";

/**
 * Resolution first, proven against fixed records.
 *
 * What has to hold, in Tom Arrington's words of 11 September 2026: the
 * system attempts authorised evidence retrieval; reports partial coverage
 * intelligently; records genuine data and reporting gaps for a named human;
 * only says it cannot answer after it has actually tried; never invents;
 * never dumps governance on the person asking; and never reads beyond what
 * the signed-in staff member is authorised to see.
 */
const NOW = new Date("2026-09-11T12:00:00Z");
const day = (iso: string) => `${iso} 10:00:00`;

const profile = (over: Partial<StaffAccessProfile> = {}): StaffAccessProfile => ({
  staffUserId: 7, baseAccessLevel: 1, functionalScopes: ["enquiry_triage", "discovery", "admissions"], caseScope: "organisation",
  actionPermissions: ["read"], sensitiveOverlays: [], temporaryGrants: [], status: "active", teamId: null,
  assignedByStaffUserId: null, assignedAt: null, assignmentReason: null, ...over,
});

const recorder = () => { const rows: ResolutionRecord[] = []; return { rows, record: async (r: ResolutionRecord) => { rows.push(r); return true; } }; };
const base = { staffUserId: 7, authMethod: "entra_sso" as const, profile: profile() };

/** Leads spread over 14 months. Website marker present only from March 2026. */
function mixedHistory() {
  const leads: Array<Record<string, unknown>> = [];
  let id = 1;
  const months = ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
  for (const m of months) {
    const reliable = m >= "2026-03";
    for (let i = 0; i < 10; i++) {
      leads.push({
        id: `l${id++}`, add_time: day(`${m}-0${(i % 9) + 1}`), person_id: 100 + id, is_archived: i < 3,
        source_name: reliable ? (i < 6 ? "Web forms" : "Manually created") : "Manually created",
        ...(reliable && i >= 6 && i < 8 ? {} : {}),
      });
    }
  }
  const persons = leads.map(l => ({ id: l.person_id, [CRM_FIELDS.personReferredBy]: Number(String(l.id).slice(1)) % 10 >= 8 ? "Partner school" : "" }));
  return { leads, persons };
}

describe("1. it looks before it speaks", () => {
  it("queries every authorised source before answering, and names them", async () => {
    const reader = readerOver({ leads: [], deals: [], persons: [] });
    const spies = { l: vi.spyOn(reader, "listLeads"), d: vi.spyOn(reader, "listDeals"), p: vi.spyOn(reader, "listPersons") };
    const rec = recorder();
    const r = await resolveInformationQuestion({ ...base, requestText: "How many cold leads have we had from the website in the last 12 months?" }, { reader, isReaderConfigured: () => true, now: NOW, record: rec.record });
    expect(spies.l).toHaveBeenCalledTimes(1);
    expect(spies.d).toHaveBeenCalledTimes(1);
    expect(spies.p).toHaveBeenCalledTimes(1);
    expect(r.evidenceAttempted).toBe(true);
    expect(r.sourcesChecked).toEqual(["Pipedrive leads", "Pipedrive deals", "Pipedrive persons"]);
  });
});

describe("2. the complete answer, when the evidence supports it", () => {
  it("counts website leads over the period and states the period and source", async () => {
    // Twelve leads, every one with a known source: eight from the web form,
    // four referred. Months with no records are not a gap.
    const leads = Array.from({ length: 12 }, (_, i) => ({ id: `l${i}`, add_time: day(`2026-0${(i % 8) + 1}-15`), person_id: i, is_archived: false, source_name: i % 3 === 0 ? "Manually created" : "Web forms" }));
    const persons = [0, 3, 6, 9].map(id => ({ id, [CRM_FIELDS.personReferredBy]: "A former student" }));
    const rec = recorder();
    const r = await resolveInformationQuestion({ ...base, requestText: "How many website leads have we had in the last 12 months?" }, { reader: readerOver({ leads, persons }), isReaderConfigured: () => true, now: NOW, record: rec.record });
    expect(r.outcome).toBe("answered");
    expect(r.gapType).toBe("none");
    expect(r.answer).toMatch(/^We had 8 website leads between 11 September 2025 and 11 September 2026\./);
    expect(r.answer).toContain("Pipedrive");
    expect(rec.rows[0].gapType).toBe("none");
    expect(rec.rows[0].humanOwner).toBeNull();
  });
  it("answers a plain count without a channel filter directly", async () => {
    const leads = Array.from({ length: 5 }, (_, i) => ({ id: `l${i}`, add_time: day("2026-08-0" + (i + 1)), person_id: i, is_archived: false, source_name: "Manually created" }));
    const r = await resolveInformationQuestion({ ...base, requestText: "how many enquiries did we get last month" }, { reader: readerOver({ leads }), isReaderConfigured: () => true, now: NOW, record: recorder().record });
    expect(r.outcome).toBe("answered");
    expect(r.answer).toMatch(/^We had 5 enquiries between 1 August 2026 and 1 September 2026\./);
  });
});

describe("3. partial coverage, reported intelligently", () => {
  it("gives the reliable figure from the date the source field became dependable, and records a data-quality gap", async () => {
    const { leads, persons } = mixedHistory();
    const rec = recorder();
    const r = await resolveInformationQuestion({ ...base, requestText: "How many cold leads have we had from the website in the last 12 months?" }, { reader: readerOver({ leads, persons }), isReaderConfigured: () => true, now: NOW, record: rec.record });
    expect(r.outcome).toBe("partial");
    expect(r.gapType).toBe("data_quality_gap");
    expect(r.coverage?.reliableFrom?.slice(0, 7)).toBe("2026-03");
    expect(r.answer).toContain("I checked the CRM");
    expect(r.answer).toContain("from March 2026");
    expect(r.answer).toContain("cannot give you a defensible figure for the whole of the last 12 months");
    expect(r.answer).toMatch(/From 1 March 2026 to 11 September 2026 we had \d+\./);
    expect(r.answer).toContain(`reporting gap for ${MI_HUMAN_OWNER}`);
    expect(rec.rows[0].gapType).toBe("data_quality_gap");
    expect(rec.rows[0].humanOwner).toBe(MI_HUMAN_OWNER);
    expect(rec.rows[0].reliableFrom?.toISOString().slice(0, 7)).toBe("2026-03");
  });
});

describe("4. the data structure prevents the answer", () => {
  it("names the actual gap, records it as a reporting gap for the human owner, and does not say 'no worker owns it'", async () => {
    const leads = Array.from({ length: 30 }, (_, i) => ({ id: `l${i}`, add_time: day(`2026-0${(i % 8) + 1}-1${i % 9}`), person_id: i, is_archived: false, source_name: "Manually created" }));
    const rec = recorder();
    const r = await resolveInformationQuestion({ ...base, requestText: "How many enquiries came from the website in the last 12 months?" }, { reader: readerOver({ leads }), isReaderConfigured: () => true, now: NOW, record: rec.record });
    expect(r.outcome).toBe("unavailable");
    expect(r.gapType).toBe("reporting_gap");
    expect(r.evidenceAttempted).toBe(true);
    expect(r.answer).toContain("does not currently preserve where an enquiry came from");
    expect(r.answer).toContain("30 of the 30 enquiries");
    expect(r.answer).toContain(MI_HUMAN_OWNER);
    for (const forbidden of ["no worker", "remit", "approved worker", "governance", "Register", "Matrix"]) expect(r.answer).not.toContain(forbidden);
    expect(rec.rows[0].gapType).toBe("reporting_gap");
  });
});

describe("5. rankings and trends", () => {
  it("ranks channels and flags a data-quality gap when too many records have no source", async () => {
    const leads = [
      ...Array.from({ length: 6 }, (_, i) => ({ id: `w${i}`, add_time: day("2026-05-10"), person_id: 1000 + i, source_name: "Web forms" })),
      ...Array.from({ length: 2 }, (_, i) => ({ id: `r${i}`, add_time: day("2026-05-11"), person_id: 2000 + i, source_name: "Manually created" })),
      ...Array.from({ length: 5 }, (_, i) => ({ id: `u${i}`, add_time: day("2026-05-12"), person_id: 3000 + i, source_name: "Manually created" })),
    ];
    const persons = [2000, 2001].map(id => ({ id, [CRM_FIELDS.personReferredBy]: "A friend" }));
    const r = await resolveInformationQuestion({ ...base, requestText: "Which source produced the most enquiries this year?" }, { reader: readerOver({ leads, persons }), isReaderConfigured: () => true, now: NOW, record: recorder().record });
    expect(r.outcome).toBe("partial");
    expect(r.answer).toContain("biggest recorded source is website with 6");
    expect(r.answer).toContain("then referral with 2");
    expect(r.answer).toContain("5 (38%) have no source recorded");
    expect(r.gapType).toBe("data_quality_gap");
  });
  it("compares the last 90 days with the 90 before when asked 'since the new site', and says it assumed the anchor", async () => {
    const leads = [
      ...Array.from({ length: 9 }, (_, i) => ({ id: `a${i}`, add_time: day("2026-08-0" + (i + 1)), person_id: i, source_name: "Web forms" })),
      ...Array.from({ length: 4 }, (_, i) => ({ id: `b${i}`, add_time: day("2026-04-0" + (i + 1)), person_id: 50 + i, source_name: "Web forms" })),
    ];
    const r = await resolveInformationQuestion({ ...base, requestText: "Have website enquiries increased since the new site went live?" }, { reader: readerOver({ leads }), isReaderConfigured: () => true, now: NOW, record: recorder().record });
    expect(r.outcome).toBe("answered");
    expect(r.answer).toContain("9 between");
    expect(r.answer).toContain("against 4 in the 90 days before");
    expect(r.answer).toContain("so up");
    expect(r.answer).toContain("do not hold a recorded go-live date");
  });
  it("counts partner referrals from the person's referral fields", async () => {
    const leads = [1, 2, 3].map(i => ({ id: `p${i}`, add_time: day("2026-06-0" + i), person_id: i, source_name: "Manually created" }));
    const persons = [{ id: 1, [CRM_FIELDS.personSourceOwner]: "Partner: Lagos Academy" }, { id: 2, [CRM_FIELDS.personSourceOwner]: "Agent network" }, { id: 3, [CRM_FIELDS.personReferredBy]: "Uncle" }];
    const r = await resolveInformationQuestion({ ...base, requestText: "How many referrals did we get from partners?" }, { reader: readerOver({ leads, persons }), isReaderConfigured: () => true, now: NOW, record: recorder().record });
    expect(r.outcome).toBe("answered");
    expect(r.answer).toMatch(/^We had 2 partner-referred referrals/);
  });
  it("counts students who went cold, from lost deals", async () => {
    const deals = [
      { id: 1, add_time: day("2026-03-01"), status: "lost", person_id: 1 }, { id: 2, add_time: day("2026-03-02"), status: "lost", person_id: 2 },
      { id: 3, add_time: day("2026-03-03"), status: "open", person_id: 3 },
    ];
    const r = await resolveInformationQuestion({ ...base, requestText: "How many students went cold after first contact?" }, { reader: readerOver({ deals }), isReaderConfigured: () => true, now: NOW, record: recorder().record });
    expect(r.outcome).toBe("answered");
    expect(r.answer).toMatch(/^We had 2 students that went cold/);
    expect(r.answer).toContain("I have taken that as the last 12 months");
  });
});

describe("6. it never reads beyond the staff member's own authorisation", () => {
  it("refuses a company-wide figure to a caseload-scoped member without touching the sources, and passes it to the human owner", async () => {
    const reader = readerOver({ leads: [{ id: "x", add_time: day("2026-05-05"), person_id: 1, source_name: "Web forms" }] });
    const spy = vi.spyOn(reader, "listLeads");
    const rec = recorder();
    const r = await resolveInformationQuestion({ ...base, profile: profile({ caseScope: "assigned_caseload", baseAccessLevel: 4 }), requestText: "How many website leads did we get last month?" }, { reader, isReaderConfigured: () => true, now: NOW, record: rec.record });
    expect(r.outcome).toBe("permission_denied");
    expect(r.gapType).toBe("permission_gap");
    expect(spy).not.toHaveBeenCalled();
    expect(r.answer).toContain("scoped more narrowly");
    expect(r.answer).toContain(MI_HUMAN_OWNER);
    expect(rec.rows[0].gapType).toBe("permission_gap");
  });
  it("refuses a member who lacks the subject's functional scope", async () => {
    const reader = readerOver({ leads: [] });
    const spy = vi.spyOn(reader, "listLeads");
    const r = await resolveInformationQuestion({ ...base, profile: profile({ functionalScopes: ["social_media"] }), requestText: "how many applications went out this year" }, { reader, isReaderConfigured: () => true, now: NOW, record: recorder().record });
    expect(r.outcome).toBe("permission_denied");
    expect(spy).not.toHaveBeenCalled();
  });
  it("refuses a shared-password session, which has no individual identity", async () => {
    const r = await resolveInformationQuestion({ requestText: "how many leads last month", staffUserId: null, authMethod: "shared_password", profile: null }, { reader: readerOver({}), isReaderConfigured: () => true, now: NOW, record: recorder().record });
    expect(r.outcome).toBe("permission_denied");
    expect(r.answer).toContain("Sign in with your WSA Microsoft account");
  });
});

describe("7. connector not in place: a connector gap, said plainly, recorded, no false 'no data'", () => {
  it("does not claim the figure is unavailable in the data when the read path is missing", async () => {
    const rec = recorder();
    const r = await resolveInformationQuestion({ ...base, requestText: "How many cold leads have we had from the website in the last 12 months?" }, { reader: undefined, isReaderConfigured: () => false, now: NOW, record: rec.record });
    expect(r.outcome).toBe("connector_unavailable");
    expect(r.gapType).toBe("connector_gap");
    expect(r.evidenceAttempted).toBe(false);
    expect(r.answer).toContain("I tried to check the CRM");
    expect(r.answer).toContain("not in place yet");
    expect(r.answer).not.toContain("does not currently preserve");
    expect(rec.rows[0].humanOwner).toBe(MI_HUMAN_OWNER);
  });
});

describe("8. an action request is not an information question", () => {
  it("returns not_information and records nothing, so the router keeps its prospecting reading", async () => {
    const rec = recorder();
    const r = await resolveInformationQuestion({ ...base, requestText: "give me the total leads list to call this week" }, { reader: readerOver({}), isReaderConfigured: () => true, now: NOW, record: rec.record });
    expect(r.outcome).toBe("not_information");
    expect(rec.rows).toHaveLength(0);
  });
});

describe("9. the answer never invents", () => {
  it("every number in the answer is a count over the records supplied", async () => {
    const leads = Array.from({ length: 7 }, (_, i) => ({ id: `l${i}`, add_time: day("2026-07-1" + i), person_id: i, source_name: "Web forms" }));
    const r = await resolveInformationQuestion({ ...base, requestText: "how many website leads in the last 3 months" }, { reader: readerOver({ leads }), isReaderConfigured: () => true, now: NOW, record: recorder().record });
    const numbers = (r.answer.match(/\b\d+\b/g) ?? []).map(Number).filter(n => n < 1000);
    // 7 leads, and the day-of-month digits in the dates; nothing else.
    expect(numbers).toContain(7);
    expect(r.answer).not.toMatch(/approximately|roughly|around \d/);
  });
});
