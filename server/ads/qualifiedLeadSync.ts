/**
 * One run of the Qualified Lead conversion sync: Pipedrive Deals in, Google
 * Data Manager events out, every decision recorded once.
 *
 * This replaces the third-party Zapier automation that used to carry
 * Pipedrive outcomes to Google. WSA now owns the path: the website's own
 * Pipedrive credential reads the Deals, this module decides and records,
 * and the Google credential WSA controls performs the upload.
 *
 * ORDER, AND WHY IT IS SAFE.
 *   1. Configuration is checked; anything missing means the run stands down
 *      with a reason and touches nothing.
 *   2. Deals created inside the look-back window are read from Pipedrive.
 *      Reads only. The window is bounded because Google will not attribute a
 *      conversion to a click older than its conversion window anyway.
 *   3. For each Deal not already recorded, the event is built and sent, and
 *      the outcome (uploaded, skipped with reason, failed with reason) is
 *      written to the store. The store row is what stops a repeat: a Deal
 *      with a row is never sent again, whatever the row says, so a failure is
 *      retried only by a person who has read the reason and cleared it.
 *   4. Uploaded rows whose Google-side status has not yet been read are
 *      checked after Google's processing delay, so "uploaded" becomes
 *      SUCCESS, PARTIAL_SUCCESS or FAILED with Google's own reason.
 *
 * Nothing here prints or stores a name, email, phone number, click
 * identifier or token. Counts, ids, flags and reasons only.
 */
import { ENV } from "../_core/env";
import { createPipedriveReader } from "../pipedrive-read";
import { credentialState, ingestEvents, retrieveRequestStatus, DataManagerError, type ClientOptions, type IngestEventsRequest, type RequestStatusSummary } from "./googleDataManager";
import { buildQualifiedLeadEvent, dealPersonId, identifierSummary, pipedriveTimeToIso, qualifiedLeadConfig, qualifiedLeadDestination, transactionIdForDeal, type QualifiedLeadConfig } from "./qualifiedLead";
import { databaseUploadStore, type UploadStore } from "./uploadStore";

/** Deals created inside this many days are considered. */
export const LOOKBACK_DAYS = 30;
/** Google processes ingestion asynchronously; status is read after this. */
export const STATUS_CHECK_AFTER_MINUTES = 30;
export const STATUS_CHECKS_PER_RUN = 20;

export type SyncTrigger = "schedule" | "manual" | "acceptance";

export interface SyncDeps {
  listDeals(): Promise<Array<Record<string, unknown>>>;
  getPersonRaw(personId: number): Promise<Record<string, unknown> | null>;
  store: UploadStore | null;
  ingest: (request: IngestEventsRequest, opts?: ClientOptions) => Promise<{ requestId: string; fieldWarnings: unknown[] }>;
  status: (requestId: string, opts?: ClientOptions) => Promise<RequestStatusSummary>;
  clientOptions?: ClientOptions;
  config: QualifiedLeadConfig;
  now(): Date;
  env: NodeJS.ProcessEnv;
}

export interface SyncOutcome {
  status: "complete" | "partial" | "skipped";
  reason: string | null;
  considered: number;
  uploaded: number;
  skipped: number;
  failed: number;
  alreadyRecorded: number;
  statusChecked: number;
  skipReasons: Record<string, number>;
}

export type SyncConfigState = "ready" | "google_credential_unconfigured" | "google_credential_malformed" | "pipedrive_token_missing" | "database_unavailable";

export async function syncConfigState(env: NodeJS.ProcessEnv = process.env, store: UploadStore | null | undefined = undefined): Promise<SyncConfigState> {
  const cred = credentialState(env);
  if (cred === "unconfigured") return "google_credential_unconfigured";
  if (cred === "malformed") return "google_credential_malformed";
  if (!(env.PIPEDRIVE_API_TOKEN ?? "").trim()) return "pipedrive_token_missing";
  const s = store === undefined ? await databaseUploadStore() : store;
  if (!s) return "database_unavailable";
  return "ready";
}

export async function productionDeps(): Promise<SyncDeps> {
  const reader = createPipedriveReader(() => ENV.pipedriveApiToken);
  return {
    listDeals: () => reader.listDealsRaw(),
    getPersonRaw: personId => reader.getPersonRaw(personId),
    store: await databaseUploadStore(),
    ingest: ingestEvents,
    status: retrieveRequestStatus,
    config: qualifiedLeadConfig(),
    now: () => new Date(),
    env: process.env,
  };
}

let running = false;

export async function runQualifiedLeadSync(trigger: SyncTrigger, deps?: SyncDeps): Promise<SyncOutcome> {
  const d = deps ?? (await productionDeps());
  const empty = (status: SyncOutcome["status"], reason: string | null): SyncOutcome =>
    ({ status, reason, considered: 0, uploaded: 0, skipped: 0, failed: 0, alreadyRecorded: 0, statusChecked: 0, skipReasons: {} });

  const state = await syncConfigState(d.env, d.store);
  if (state !== "ready") return empty("skipped", state);
  if (running) return empty("skipped", "a sync is already running");
  running = true;
  try {
    return await runInner(trigger, d, d.store as UploadStore);
  } finally {
    running = false;
  }
}

async function runInner(trigger: SyncTrigger, d: SyncDeps, store: UploadStore): Promise<SyncOutcome> {
  const now = d.now();
  const since = now.getTime() - LOOKBACK_DAYS * 24 * 3600 * 1000;
  const outcome: SyncOutcome = { status: "complete", reason: null, considered: 0, uploaded: 0, skipped: 0, failed: 0, alreadyRecorded: 0, statusChecked: 0, skipReasons: {} };

  let deals: Array<Record<string, unknown>>;
  try {
    deals = await d.listDeals();
  } catch (error) {
    return { ...outcome, status: "partial", reason: `Pipedrive deals could not be read: ${String((error as Error)?.message ?? error).slice(0, 160)}` };
  }

  const recent = deals
    .filter(deal => typeof deal.id === "number")
    .filter(deal => {
      const iso = pipedriveTimeToIso(deal.add_time);
      return iso !== null && Date.parse(iso) >= since;
    })
    .sort((a, b) => String(a.add_time).localeCompare(String(b.add_time)));

  const destination = qualifiedLeadDestination(d.config);
  const problems: string[] = [];

  for (const deal of recent) {
    const dealId = deal.id as number;
    const existing = await store.find(dealId, d.config.conversionActionId);
    if (existing) { outcome.alreadyRecorded += 1; continue; }
    outcome.considered += 1;

    let person: Record<string, unknown> | null = null;
    const personId = dealPersonId(deal);
    if (personId !== null) {
      try { person = await d.getPersonRaw(personId); } catch { person = null; }
    }

    const built = buildQualifiedLeadEvent(deal, person);
    const base = {
      dealId,
      personId: built.personId,
      conversionActionId: d.config.conversionActionId,
      transactionId: transactionIdForDeal(dealId),
      eventTimestamp: pipedriveTimeToIso(deal.add_time) ? new Date(pipedriveTimeToIso(deal.add_time) as string) : null,
      identifiers: identifierSummary(built.identifiers),
      requestId: null,
      googleStatus: null,
      googleDetail: null,
      attempts: 1,
    };

    if (!built.ok) {
      await store.record({ ...base, status: "skipped", reason: built.reason });
      outcome.skipped += 1;
      outcome.skipReasons[built.reason] = (outcome.skipReasons[built.reason] ?? 0) + 1;
      continue;
    }

    try {
      const response = await d.ingest({ destinations: [destination], events: [built.event], encoding: "HEX", validateOnly: false }, d.clientOptions);
      await store.record({
        ...base,
        status: "uploaded",
        requestId: response.requestId || null,
        reason: response.fieldWarnings.length > 0 ? `${response.fieldWarnings.length} field warning(s) from Google` : null,
      });
      outcome.uploaded += 1;
      console.log(`[Google Ads QL] ${trigger}: deal ${dealId} uploaded (${base.identifiers}); request ${response.requestId || "no id"}`);
    } catch (error) {
      const message = error instanceof DataManagerError
        ? `${error.message}`.slice(0, 380)
        : `Upload threw: ${String((error as Error)?.message ?? error).slice(0, 300)}`;
      await store.record({ ...base, status: "failed", reason: message });
      outcome.failed += 1;
      problems.push(`deal ${dealId}: ${message}`);
      console.warn(`[Google Ads QL] ${trigger}: deal ${dealId} upload failed (${base.identifiers}): ${message}`);
    }
  }

  // Google-side status for earlier uploads, once Google has had time to process.
  const before = new Date(now.getTime() - STATUS_CHECK_AFTER_MINUTES * 60 * 1000);
  const awaiting = await store.awaitingStatus(before, STATUS_CHECKS_PER_RUN);
  for (const row of awaiting) {
    if (!row.requestId) { await store.update(row.id, { googleStatus: "NO_REQUEST_ID" }); continue; }
    try {
      const s = await d.status(row.requestId, d.clientOptions);
      if (s.status === "PROCESSING" || s.status === "REQUEST_STATUS_UNKNOWN") continue;
      const detail = [
        s.recordCount !== null ? `records=${s.recordCount}` : null,
        ...s.errorCounts.map(c => `error ${c.reason}=${c.count}`),
        ...s.warningCounts.map(c => `warning ${c.reason}=${c.count}`),
      ].filter(Boolean).join("; ");
      await store.update(row.id, { googleStatus: s.status, googleDetail: detail.slice(0, 400) || null });
      outcome.statusChecked += 1;
    } catch (error) {
      problems.push(`status of request for deal ${row.dealId}: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    }
  }

  if (problems.length > 0) {
    outcome.status = "partial";
    outcome.reason = problems.slice(0, 3).join(" | ").slice(0, 400);
  }
  return outcome;
}
