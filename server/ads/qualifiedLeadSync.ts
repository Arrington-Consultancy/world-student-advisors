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
 *      SUCCESS, PARTIAL_SUCCESS or FAILED with Google's own reason, or
 *      UNRESOLVED after MAX_STATUS_CHECKS unsettled answers.
 *
 * Steps 3 and 4 are conversionPass.ts, shared with the Enquiry sync
 * (enquirySync.ts), which does the same for Pipedrive Leads.
 *
 * Nothing here prints or stores a name, email, phone number, click
 * identifier or token. Counts, ids, flags and reasons only.
 */
import { ENV } from "../_core/env";
import { createPipedriveReader } from "../pipedrive-read";
import { credentialState, ingestEvents, retrieveRequestStatus, type ClientOptions, type IngestEventsRequest, type RequestStatusSummary } from "./googleDataManager";
import { buildQualifiedLeadEvent, qualifiedLeadConfig, qualifiedLeadDestination, transactionIdForDeal, type QualifiedLeadConfig } from "./qualifiedLead";
import { databaseUploadStore, type UploadStore } from "./uploadStore";
import { emptyOutcome, finish, inWindow, statusPass, uploadPass, withSyncLock, type SyncOutcome, type SyncTrigger } from "./conversionPass";

export { LOOKBACK_DAYS, MAX_STATUS_CHECKS, STATUS_CHECK_AFTER_MINUTES, STATUS_CHECKS_PER_RUN } from "./conversionPass";
export type { SyncOutcome, SyncTrigger } from "./conversionPass";

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

export function isExplicitRealSyncSuccess(syncState: SyncConfigState, outcome: SyncOutcome): boolean {
  return syncState === "ready" && outcome.status === "complete" && !outcome.validateOnly;
}

export type SyncConfigState = "ready" | "google_credential_unconfigured" | "google_credential_malformed" | "pipedrive_token_missing" | "database_unavailable" | "sync_disabled";

/**
 * The deliberate switch. Nothing is uploaded, by the scheduler or by the
 * acceptance script, until GOOGLE_ADS_QUALIFIED_LEAD_SYNC_ENABLED is exactly
 * "true". Default off, so a credential can be configured and proven with
 * validateOnly before the first real conversion leaves WSA. Absent, empty,
 * "1", "yes" or "TRUE " all mean off: the switch is turned on on purpose.
 */
export const SYNC_ENABLED_VAR = "GOOGLE_ADS_QUALIFIED_LEAD_SYNC_ENABLED";
export function syncEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[SYNC_ENABLED_VAR] === "true";
}

/** The configuration every conversion sync needs, before its own switch. Shared with enquirySync.ts. */
export async function baseConfigState(env: NodeJS.ProcessEnv, store: UploadStore | null | undefined): Promise<Exclude<SyncConfigState, "sync_disabled" | "ready"> | null> {
  const cred = credentialState(env);
  if (cred === "unconfigured") return "google_credential_unconfigured";
  if (cred === "malformed") return "google_credential_malformed";
  if (!(env.PIPEDRIVE_API_TOKEN ?? "").trim()) return "pipedrive_token_missing";
  const s = store === undefined ? await databaseUploadStore() : store;
  if (!s) return "database_unavailable";
  return null;
}

export async function syncConfigState(env: NodeJS.ProcessEnv = process.env, store: UploadStore | null | undefined = undefined): Promise<SyncConfigState> {
  const missing = await baseConfigState(env, store);
  if (missing) return missing;
  // Checked last so the state names the first missing piece of
  // configuration; "sync_disabled" means everything else is in place.
  if (!syncEnabled(env)) return "sync_disabled";
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

export async function runQualifiedLeadSync(trigger: SyncTrigger, deps?: SyncDeps): Promise<SyncOutcome> {
  const d = deps ?? (await productionDeps());
  const state = await syncConfigState(d.env, d.store);
  if (state !== "ready") return emptyOutcome("skipped", state);
  return withSyncLock(() => runInner(trigger, d, d.store as UploadStore), () => emptyOutcome("skipped", "a sync is already running"));
}

async function runInner(trigger: SyncTrigger, d: SyncDeps, store: UploadStore): Promise<SyncOutcome> {
  const now = d.now();
  const outcome = emptyOutcome();
  const problems: string[] = [];

  let deals: Array<Record<string, unknown>>;
  try {
    deals = await d.listDeals();
  } catch (error) {
    return { ...outcome, status: "partial", reason: `Pipedrive deals could not be read: ${String((error as Error)?.message ?? error).slice(0, 160)}` };
  }

  const items = inWindow(deals.filter(deal => typeof deal.id === "number"), now)
    .map(deal => ({ sourceType: "deal" as const, sourceId: String(deal.id), dealId: deal.id as number, record: deal }));

  await uploadPass({
    label: "[Google Ads QL]",
    trigger,
    items,
    conversionActionId: d.config.conversionActionId,
    destination: qualifiedLeadDestination(d.config),
    build: buildQualifiedLeadEvent,
    transactionId: item => transactionIdForDeal(item.dealId as number),
    validateOnly: false,
    store,
    getPersonRaw: d.getPersonRaw,
    ingest: d.ingest,
    clientOptions: d.clientOptions,
    outcome,
    problems,
  });

  // Google-side status for earlier uploads, once Google has had time to process.
  await statusPass({ conversionActionId: d.config.conversionActionId, store, status: d.status, clientOptions: d.clientOptions, now, outcome, problems });

  return finish(outcome, problems);
}
