import { describe, expect, it, vi, beforeEach } from "vitest";
import { isExplicitRealSyncSuccess, runQualifiedLeadSync, syncConfigState, type SyncDeps } from "./qualifiedLeadSync";
import { MAX_STATUS_CHECKS, emptyOutcome, outcomeLine } from "./conversionPass";
import { memoryUploadStore } from "./uploadStore";
import { ATTRIBUTION_FIELD_KEYS } from "./qualifiedLead";
import { DataManagerError } from "./googleDataManager";

const K = ATTRIBUTION_FIELD_KEYS;
const NOW = new Date("2026-09-16T12:00:00Z");
const ENV = { GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_ID: "cid", GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_SECRET: "sec", GOOGLE_ADS_DATAMANAGER_OAUTH_REFRESH_TOKEN: "rt", PIPEDRIVE_API_TOKEN: "pd-token", GOOGLE_ADS_QUALIFIED_LEAD_SYNC_ENABLED: "true" };

const PERSONS: Record<number, Record<string, unknown>> = {
  369: { id: 369, email: [{ value: "student@example.com" }], phone: [{ value: "+2348182049068" }], [K.person.gdprConsent]: 105 },
  370: { id: 370, email: [{ value: "other@example.com" }], [K.person.gdprConsent]: 105 },
};
const DEALS = [
  { id: 24, add_time: "2026-09-10 14:22:11", person_id: { value: 369 }, [K.deal.gclid]: "gclid-24" },
  { id: 25, add_time: "2026-09-11 09:00:00", person_id: { value: 370 } },
  { id: 26, add_time: "2026-06-01 09:00:00", person_id: { value: 369 }, [K.deal.gclid]: "gclid-old" },
  { id: 27, add_time: "2026-09-12 10:00:00", person_id: { value: 369 }, [K.deal.gbraid]: "gbraid-27" },
];

function deps(overrides: Partial<SyncDeps> = {}): SyncDeps & { ingest: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const ingest = vi.fn(async () => ({ requestId: "req-x", fieldWarnings: [] }));
  const status = vi.fn(async () => ({ status: "SUCCESS" as const, recordCount: 1, errorCounts: [], warningCounts: [] }));
  return {
    listDeals: async () => DEALS,
    getPersonRaw: async id => PERSONS[id] ?? null,
    store: memoryUploadStore(),
    ingest, status,
    config: { customerId: "5165838785", loginCustomerId: null, conversionActionId: "7726096949" },
    now: () => NOW,
    env: ENV,
    ...overrides,
  } as SyncDeps & { ingest: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> };
}

beforeEach(() => { vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {}); });

describe("configuration gate", () => {
  it("treats explicit real-sync acceptance as passed only when sync is enabled and the run completes for real", () => {
    expect(isExplicitRealSyncSuccess("ready", emptyOutcome("complete"))).toBe(true);
    expect(isExplicitRealSyncSuccess("ready", emptyOutcome("partial", "x"))).toBe(false);
    expect(isExplicitRealSyncSuccess("ready", emptyOutcome("complete", null, true))).toBe(false);
    expect(isExplicitRealSyncSuccess("sync_disabled", emptyOutcome("complete"))).toBe(false);
    expect(isExplicitRealSyncSuccess("sync_disabled", emptyOutcome("skipped", "sync_disabled"))).toBe(false);
  });

  it("stands down, touching nothing, until the Google credential, the Pipedrive token and the database are all present", async () => {
    expect(await syncConfigState({}, memoryUploadStore())).toBe("google_credential_unconfigured");
    expect(await syncConfigState({ GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_ID: "x" }, memoryUploadStore())).toBe("google_credential_malformed");
    expect(await syncConfigState({ ...ENV, PIPEDRIVE_API_TOKEN: "" }, memoryUploadStore())).toBe("pipedrive_token_missing");
    expect(await syncConfigState(ENV, null)).toBe("database_unavailable");
    expect(await syncConfigState(ENV, memoryUploadStore())).toBe("ready");
    const d = deps({ env: {} });
    const r = await runQualifiedLeadSync("manual", d);
    expect(r).toMatchObject({ status: "skipped", reason: "google_credential_unconfigured", uploaded: 0 });
    expect(d.ingest).not.toHaveBeenCalled();
  });

  it("stands down until GOOGLE_ADS_QUALIFIED_LEAD_SYNC_ENABLED is exactly \"true\", even with every credential present, whatever the trigger", async () => {
    const { GOOGLE_ADS_QUALIFIED_LEAD_SYNC_ENABLED: _on, ...off } = ENV;
    expect(await syncConfigState(off, memoryUploadStore())).toBe("sync_disabled");
    for (const value of ["", "1", "yes", "TRUE", " true"]) {
      expect(await syncConfigState({ ...off, GOOGLE_ADS_QUALIFIED_LEAD_SYNC_ENABLED: value }, memoryUploadStore())).toBe("sync_disabled");
    }
    for (const trigger of ["schedule", "manual", "acceptance"] as const) {
      const d = deps({ env: off });
      const r = await runQualifiedLeadSync(trigger, d);
      expect(r).toMatchObject({ status: "skipped", reason: "sync_disabled", uploaded: 0 });
      expect(d.ingest).not.toHaveBeenCalled();
    }
  });
});

describe("one run", () => {
  it("uploads each qualifying deal once, skips the rest with reasons, ignores deals outside the window, and records everything", async () => {
    const d = deps();
    const r = await runQualifiedLeadSync("manual", d);
    expect(r).toMatchObject({ status: "complete", considered: 3, uploaded: 2, skipped: 1, failed: 0, alreadyRecorded: 0, skipReasons: { no_google_click_identifier: 1 } });
    expect(d.ingest).toHaveBeenCalledTimes(2);
    const [req] = d.ingest.mock.calls[0] as unknown as [{ destinations: unknown[]; events: Array<{ transactionId: string; adIdentifiers: unknown; userData?: unknown }>; validateOnly: boolean; encoding: string }];
    expect(req.validateOnly).toBe(false);
    expect(req.encoding).toBe("HEX");
    expect(req.destinations).toEqual([{ operatingAccount: { accountType: "GOOGLE_ADS", accountId: "5165838785" }, productDestinationId: "7726096949" }]);
    expect(req.events[0].transactionId).toBe("wsa-qualified-lead-deal-24");
    expect(req.events[0].adIdentifiers).toEqual({ gclid: "gclid-24" });
    expect(req.events[0].userData).toBeDefined();
    const rows = (d.store as ReturnType<typeof memoryUploadStore>).rows;
    expect(rows.map(x => [x.dealId, x.status, x.identifiers, x.reason])).toEqual([
      [24, "uploaded", "gclid,email,phone", null],
      [25, "skipped", "email", "no_google_click_identifier"],
      [27, "uploaded", "gbraid,email,phone", null],
    ]);
    // Since migration 0021 a row names its source; a Deal row keeps its dealId too.
    expect(rows.map(x => [x.sourceType, x.sourceId])).toEqual([["deal", "24"], ["deal", "25"], ["deal", "27"]]);
    expect(rows.every(x => x.requestId === "req-x" || x.status === "skipped")).toBe(true);
    // Nothing personal in the store.
    expect(JSON.stringify(rows)).not.toMatch(/example\.com|gclid-24|\+234/);
  });

  it("a second run sends nothing: every deal already has a row, whatever the row says", async () => {
    const d = deps();
    await runQualifiedLeadSync("manual", d);
    const r = await runQualifiedLeadSync("schedule", d);
    expect(r).toMatchObject({ status: "complete", considered: 0, uploaded: 0, skipped: 0, alreadyRecorded: 3 });
    expect(d.ingest).toHaveBeenCalledTimes(2);
  });

  it("a Google refusal is recorded as failed with Google's reason, the run continues, and the deal is not retried blindly", async () => {
    const d = deps();
    d.ingest.mockImplementationOnce(async () => { throw new DataManagerError("Data Manager /events:ingest failed (HTTP 403 PERMISSION_DENIED): The caller does not have permission", 403, false, "PERMISSION_DENIED"); });
    const r = await runQualifiedLeadSync("manual", d);
    expect(r).toMatchObject({ status: "partial", uploaded: 1, failed: 1, skipped: 1 });
    expect(r.reason).toContain("deal 24");
    const row = (d.store as ReturnType<typeof memoryUploadStore>).rows.find(x => x.dealId === 24)!;
    expect(row.status).toBe("failed");
    expect(row.reason).toContain("PERMISSION_DENIED");
    const again = await runQualifiedLeadSync("manual", d);
    expect(again.alreadyRecorded).toBe(3);
    expect(d.ingest).toHaveBeenCalledTimes(2);
  });

  it("a Pipedrive read failure ends the run as partial before anything is sent", async () => {
    const d = deps({ listDeals: async () => { throw new Error("boom"); } });
    const r = await runQualifiedLeadSync("manual", d);
    expect(r.status).toBe("partial");
    expect(r.reason).toContain("Pipedrive deals could not be read");
    expect(d.ingest).not.toHaveBeenCalled();
  });

  it("reads Google's processing status for uploads older than the delay, and leaves PROCESSING alone", async () => {
    const store = memoryUploadStore();
    const d = deps({ store });
    await runQualifiedLeadSync("manual", d);
    // Fresh uploads: too soon to ask.
    expect(d.status).not.toHaveBeenCalled();
    for (const row of store.rows) row.createdAt = new Date(NOW.getTime() - 60 * 60 * 1000);
    d.status.mockImplementationOnce(async () => ({ status: "PROCESSING" as const, recordCount: null, errorCounts: [], warningCounts: [] }));
    const r = await runQualifiedLeadSync("schedule", d);
    expect(r.statusChecked).toBe(1);
    const statuses = store.rows.filter(x => x.status === "uploaded").map(x => x.googleStatus);
    expect(statuses.sort()).toEqual([null, "SUCCESS"].sort());
    expect(store.rows.find(x => x.googleStatus === "SUCCESS")!.googleDetail).toBe("records=1");
  });

  it("stops asking after five unsettled answers, marks the row UNRESOLVED with the last answer, and says so", async () => {
    const store = memoryUploadStore();
    const d = deps({ store });
    await runQualifiedLeadSync("manual", d);
    for (const row of store.rows) row.createdAt = new Date(NOW.getTime() - 60 * 60 * 1000);
    d.status.mockImplementation(async () => ({ status: "REQUEST_STATUS_UNKNOWN" as const, recordCount: null, errorCounts: [], warningCounts: [] }));
    for (let run = 1; run < MAX_STATUS_CHECKS; run += 1) {
      const r = await runQualifiedLeadSync("schedule", d);
      expect(r).toMatchObject({ statusAwaiting: 2, statusChecked: 0, statusUnresolved: 0 });
    }
    const last = await runQualifiedLeadSync("schedule", d);
    expect(last).toMatchObject({ statusAwaiting: 2, statusChecked: 0, statusUnresolved: 2 });
    const uploaded = store.rows.filter(x => x.status === "uploaded");
    expect(uploaded.every(x => x.googleStatus === "UNRESOLVED" && x.statusChecks === MAX_STATUS_CHECKS)).toBe(true);
    expect(uploaded[0].googleDetail).toBe("Google still answered REQUEST_STATUS_UNKNOWN after 5 checks");
    // Settled rows are not asked again.
    const calls = d.status.mock.calls.length;
    const after = await runQualifiedLeadSync("schedule", d);
    expect(after.statusAwaiting).toBe(0);
    expect(d.status.mock.calls.length).toBe(calls);
  });

  it("says how many uploads were awaiting a status check, so \"0 checked\" cannot be misread as \"never confirmed\"", async () => {
    const store = memoryUploadStore();
    const d = deps({ store });
    await runQualifiedLeadSync("manual", d);
    for (const row of store.rows) row.createdAt = new Date(NOW.getTime() - 60 * 60 * 1000);
    const r = await runQualifiedLeadSync("schedule", d);
    expect(r).toMatchObject({ statusAwaiting: 2, statusChecked: 2 });
    const quiet = await runQualifiedLeadSync("schedule", d);
    expect(quiet).toMatchObject({ statusAwaiting: 0, statusChecked: 0 });
    expect(outcomeLine("[Google Ads QL]", quiet)).toContain("status: 0 awaiting, 0 settled, 0 unresolved");
  });
});

describe("the scheduler's log line", () => {
  it("prints the skip reasons, which the outcome always carried and the log used to drop", () => {
    const line = outcomeLine("[Google Ads QL]", { ...emptyOutcome(), considered: 32, skipped: 32, skipReasons: { no_google_click_identifier: 30, deal_add_time_unreadable: 2 } });
    expect(line).toBe("[Google Ads QL] scheduled run: complete; considered 32, uploaded 0, skipped 32 (no_google_click_identifier 30, deal_add_time_unreadable 2), failed 0, status: 0 awaiting, 0 settled, 0 unresolved");
  });
});
