import { describe, expect, it, vi, beforeEach } from "vitest";
import { enquirySyncConfigState, runEnquirySync, type EnquirySyncDeps } from "./enquirySync";
import { runQualifiedLeadSync, type SyncDeps } from "./qualifiedLeadSync";
import { buildEnquiryEvent, enquiryActionProblem, enquiryConfig, enquiryDestination, leadId, transactionIdForLead } from "./enquiry";
import { ATTRIBUTION_FIELD_KEYS, QUALIFIED_LEAD } from "./qualifiedLead";
import { memoryUploadStore } from "./uploadStore";
import { sha256Hex } from "./googleDataManager";

/**
 * The Enquiry conversion: every Pipedrive Lead from a Google click, uploaded
 * once to "WSA | Enquiry" (Google Ads worker brief, 14 October 2026). What
 * matters most is what must never happen: an upload while the switch is
 * off, an upload to the website-tag action or the Qualified Lead action, a
 * Lead sent twice, or a student's details sent for a Lead that did not come
 * from Google.
 */

const K = ATTRIBUTION_FIELD_KEYS;
const NOW = new Date("2026-10-14T12:00:00Z");
const ENQ_ACTION = "7800000001";
const ENV = {
  GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_ID: "cid", GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_SECRET: "sec", GOOGLE_ADS_DATAMANAGER_OAUTH_REFRESH_TOKEN: "rt",
  PIPEDRIVE_API_TOKEN: "pd-token", GOOGLE_ADS_ENQUIRY_CONVERSION_ACTION_ID: ENQ_ACTION, GOOGLE_ADS_ENQUIRY_SYNC_ENABLED: "true",
};

const L1 = "6f0e4c2a-1111-4b1b-9c9c-aaaaaaaaaaaa";
const L2 = "6f0e4c2a-2222-4b1b-9c9c-bbbbbbbbbbbb";
const L3 = "6f0e4c2a-3333-4b1b-9c9c-cccccccccccc";
const L4 = "6f0e4c2a-4444-4b1b-9c9c-dddddddddddd";

const PERSONS: Record<number, Record<string, unknown>> = {
  369: { id: 369, email: [{ value: "Student@Example.com", primary: true }], phone: [{ value: "+234 818 204 9068" }], [K.person.gdprConsent]: 105 },
  370: { id: 370, email: [{ value: "other@example.com" }], [K.person.gclid]: "gclid-on-person-370", [K.person.gdprConsent]: 106 },
  371: { id: 371, email: [{ value: "nogoogle@example.com" }], [K.person.gdprConsent]: 105 },
};
// Pipedrive's Leads API reports add_time as RFC 3339 and person_id as a number.
const LEADS = [
  { id: L1, title: "A", add_time: "2026-10-12T09:43:17.000Z", person_id: 369, [K.lead.gclid]: "gclid-on-lead-1" },
  { id: L2, title: "B", add_time: "2026-10-13T08:00:00.000Z", person_id: 370 },
  { id: L3, title: "C", add_time: "2026-10-13T09:00:00.000Z", person_id: 371 },
  { id: L4, title: "D", add_time: "2026-08-01T09:00:00.000Z", person_id: 369, [K.lead.gclid]: "gclid-too-old" },
  { id: 12345, title: "not a lead id", add_time: "2026-10-13T10:00:00.000Z", person_id: 369, [K.lead.gclid]: "gclid-x" },
];

function deps(overrides: Partial<EnquirySyncDeps> = {}): EnquirySyncDeps & { ingest: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const env = overrides.env ?? ENV;
  const ingest = vi.fn(async () => ({ requestId: "req-enq", fieldWarnings: [] }));
  const status = vi.fn(async () => ({ status: "SUCCESS" as const, recordCount: 1, errorCounts: [], warningCounts: [] }));
  return {
    listLeads: async () => LEADS,
    getPersonRaw: async id => PERSONS[id] ?? null,
    store: memoryUploadStore(),
    ingest, status,
    config: enquiryConfig(env),
    now: () => NOW,
    env,
    ...overrides,
  } as EnquirySyncDeps & { ingest: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> };
}

beforeEach(() => { vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {}); });

describe("the destination", () => {
  it("has no default: the action is Tom's to create, and the sync stands down until its id is set", async () => {
    const { GOOGLE_ADS_ENQUIRY_CONVERSION_ACTION_ID: _id, ...noAction } = ENV;
    expect(enquiryConfig(noAction).conversionActionId).toBeNull();
    expect(await enquirySyncConfigState(noAction, memoryUploadStore())).toBe("enquiry_conversion_action_missing");
    const d = deps({ env: noAction });
    expect(await runEnquirySync("schedule", d)).toMatchObject({ status: "skipped", reason: "enquiry_conversion_action_missing" });
    expect(await runEnquirySync("acceptance", d, { validateOnly: true })).toMatchObject({ status: "skipped", reason: "enquiry_conversion_action_missing" });
    expect(d.ingest).not.toHaveBeenCalled();
  });

  it("refuses the website-tag Submit lead form action and the Qualified Lead action", async () => {
    for (const [id, state] of [
      [QUALIFIED_LEAD.submitLeadFormConversionActionId, "enquiry_conversion_action_is_submit_lead_form_tag_action"],
      [QUALIFIED_LEAD.conversionActionId, "enquiry_conversion_action_is_qualified_lead_action"],
    ] as const) {
      const env = { ...ENV, GOOGLE_ADS_ENQUIRY_CONVERSION_ACTION_ID: id };
      expect(await enquirySyncConfigState(env, memoryUploadStore())).toBe(state);
      const d = deps({ env });
      expect((await runEnquirySync("schedule", d)).status).toBe("skipped");
      expect((await runEnquirySync("acceptance", d, { validateOnly: true })).status).toBe("skipped");
      expect(d.ingest).not.toHaveBeenCalled();
    }
    // A moved Qualified Lead action is refused too, not just the default id.
    const moved = { ...ENV, GOOGLE_ADS_QUALIFIED_LEAD_CONVERSION_ACTION_ID: "4242", GOOGLE_ADS_ENQUIRY_CONVERSION_ACTION_ID: "42-42" };
    expect(enquiryActionProblem(enquiryConfig(moved), moved)).toBe("is_qualified_lead_action");
  });

  it("targets the configured action in the live WSA account, digits only", () => {
    const c = enquiryConfig({ GOOGLE_ADS_ENQUIRY_CONVERSION_ACTION_ID: "7800-000-001" });
    expect(enquiryDestination(c)).toEqual({ operatingAccount: { accountType: "GOOGLE_ADS", accountId: "5165838785" }, productDestinationId: "7800000001" });
  });
});

describe("the switch", () => {
  it("sends nothing until GOOGLE_ADS_ENQUIRY_SYNC_ENABLED is exactly \"true\", and is independent of the Qualified Lead switch", async () => {
    const { GOOGLE_ADS_ENQUIRY_SYNC_ENABLED: _on, ...off } = ENV;
    for (const value of [undefined, "", "1", "yes", "TRUE", " true"]) {
      const env = value === undefined ? off : { ...off, GOOGLE_ADS_ENQUIRY_SYNC_ENABLED: value };
      expect(await enquirySyncConfigState({ ...env, GOOGLE_ADS_QUALIFIED_LEAD_SYNC_ENABLED: "true" }, memoryUploadStore())).toBe("sync_disabled");
      const d = deps({ env });
      expect(await runEnquirySync("schedule", d)).toMatchObject({ status: "skipped", reason: "sync_disabled", uploaded: 0 });
      expect(d.ingest).not.toHaveBeenCalled();
    }
  });
});

describe("the event", () => {
  it("is the Qualified Lead event with the Lead's id and time: click id from the Lead, hashed contact keys only with consent", () => {
    const r = buildEnquiryEvent(LEADS[0], PERSONS[369]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event).toEqual({
      transactionId: `wsa-enquiry-lead-${L1}`,
      eventTimestamp: "2026-10-12T09:43:17.000Z",
      adIdentifiers: { gclid: "gclid-on-lead-1" },
      eventSource: "WEB",
      userData: { userIdentifiers: [{ emailAddress: sha256Hex("student@example.com") }, { phoneNumber: sha256Hex("+2348182049068") }] },
      consent: { adUserData: "CONSENT_GRANTED", adPersonalization: "CONSENT_GRANTED" },
    });
  });

  it("falls back to the Person's click id, and sends no contact keys without consent option 105", () => {
    const r = buildEnquiryEvent(LEADS[1], PERSONS[370]);
    expect(r.ok && r.event.adIdentifiers).toEqual({ gclid: "gclid-on-person-370" });
    expect(r.ok && r.event.userData).toBeUndefined();
  });

  it("sends nothing for a Lead that did not come from a Google click, or has no Lead id", () => {
    expect(buildEnquiryEvent(LEADS[2], PERSONS[371])).toMatchObject({ ok: false, reason: "no_google_click_identifier" });
    expect(buildEnquiryEvent({ ...LEADS[0], id: 12345 }, PERSONS[369])).toMatchObject({ ok: false, reason: "lead_has_no_id" });
    expect(leadId({ id: L1 })).toBe(L1);
    expect(transactionIdForLead(L1).length).toBeLessThanOrEqual(80);
  });

  it("reads the Lead's click identifier from the keys the signup path writes on the Lead", () => {
    expect(K.lead).toBe(K.deal);
  });
});

describe("one run", () => {
  it("uploads each Google Lead in the window once to the Enquiry action, skips the rest with reasons, and records everything", async () => {
    const d = deps();
    const r = await runEnquirySync("manual", d);
    expect(r).toMatchObject({ status: "complete", validateOnly: false, considered: 3, uploaded: 2, skipped: 2, failed: 0, skipReasons: { no_google_click_identifier: 1, lead_has_no_id: 1 } });
    expect(d.ingest).toHaveBeenCalledTimes(2);
    const reqs = d.ingest.mock.calls.map(c => c[0] as { destinations: Array<{ productDestinationId: string }>; events: Array<{ transactionId: string }>; validateOnly: boolean });
    expect(reqs.every(q => q.validateOnly === false && q.destinations[0].productDestinationId === ENQ_ACTION)).toBe(true);
    expect(reqs.map(q => q.events[0].transactionId)).toEqual([`wsa-enquiry-lead-${L1}`, `wsa-enquiry-lead-${L2}`]);
    const rows = (d.store as ReturnType<typeof memoryUploadStore>).rows;
    expect(rows.map(x => [x.sourceType, x.sourceId, x.dealId, x.conversionActionId, x.status, x.reason])).toEqual([
      ["lead", L1, null, ENQ_ACTION, "uploaded", null],
      ["lead", L2, null, ENQ_ACTION, "uploaded", null],
      ["lead", L3, null, ENQ_ACTION, "skipped", "no_google_click_identifier"],
    ]);
    expect(JSON.stringify(rows)).not.toMatch(/example\.com|gclid-on|\+234/i);
  });

  it("a second run sends nothing", async () => {
    const d = deps();
    await runEnquirySync("manual", d);
    const r = await runEnquirySync("schedule", d);
    expect(r).toMatchObject({ considered: 0, uploaded: 0, alreadyRecorded: 3 });
    expect(d.ingest).toHaveBeenCalledTimes(2);
  });

  it("shares the record with the Qualified Lead sync without either seeing the other's rows", async () => {
    const store = memoryUploadStore();
    const enq = deps({ store });
    const ql: SyncDeps = {
      listDeals: async () => [{ id: 24, add_time: "2026-10-13 10:00:00", person_id: { value: 369 }, [K.deal.gclid]: "gclid-deal-24" }],
      getPersonRaw: async id => PERSONS[id] ?? null,
      store,
      ingest: vi.fn(async () => ({ requestId: "req-ql", fieldWarnings: [] })),
      status: vi.fn(async () => ({ status: "SUCCESS" as const, recordCount: 1, errorCounts: [], warningCounts: [] })),
      config: { customerId: "5165838785", loginCustomerId: null, conversionActionId: QUALIFIED_LEAD.conversionActionId },
      now: () => NOW,
      env: { ...ENV, GOOGLE_ADS_QUALIFIED_LEAD_SYNC_ENABLED: "true" },
    };
    await runQualifiedLeadSync("manual", ql);
    await runEnquirySync("manual", enq);
    expect(store.rows.map(r => [r.sourceType, r.conversionActionId])).toEqual([
      ["deal", QUALIFIED_LEAD.conversionActionId],
      ["lead", ENQ_ACTION], ["lead", ENQ_ACTION], ["lead", ENQ_ACTION],
    ]);
    // Each sync checks only its own action's uploads.
    for (const row of store.rows) row.createdAt = new Date(NOW.getTime() - 60 * 60 * 1000);
    const r = await runEnquirySync("schedule", enq);
    expect(r).toMatchObject({ statusAwaiting: 2, statusChecked: 2 });
    expect(store.rows.find(x => x.sourceType === "deal")!.googleStatus).toBeNull();
  });

  it("a Pipedrive read failure ends the run as partial before anything is sent", async () => {
    const d = deps({ listLeads: async () => { throw new Error("boom"); } });
    const r = await runEnquirySync("manual", d);
    expect(r.status).toBe("partial");
    expect(r.reason).toContain("Pipedrive leads could not be read");
    expect(d.ingest).not.toHaveBeenCalled();
  });
});

describe("the validateOnly dry run, made first and reported to Tom before the switch goes on", () => {
  it("runs with the switch off, sends every event with validateOnly, and records nothing", async () => {
    const { GOOGLE_ADS_ENQUIRY_SYNC_ENABLED: _on, ...off } = ENV;
    const d = deps({ env: off });
    const r = await runEnquirySync("acceptance", d, { validateOnly: true });
    expect(r).toMatchObject({ status: "complete", validateOnly: true, considered: 3, uploaded: 2, skipped: 2, statusAwaiting: 0 });
    expect(d.ingest.mock.calls.every(c => (c[0] as { validateOnly: boolean }).validateOnly === true)).toBe(true);
    expect((d.store as ReturnType<typeof memoryUploadStore>).rows).toEqual([]);
    expect(d.status).not.toHaveBeenCalled();
    // Recording nothing means a real run afterwards still sends everything.
    const real = await runEnquirySync("manual", deps({ store: d.store }));
    expect(real).toMatchObject({ uploaded: 2, alreadyRecorded: 0 });
  });
});
