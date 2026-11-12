/**
 * The two halves of a conversion sync, shared by the Qualified Lead sync
 * (Deals, qualifiedLeadSync.ts) and the Enquiry sync (Leads,
 * enquirySync.ts) so the two cannot drift apart:
 *
 *   uploadPass  for each source not yet recorded for this conversion
 *               action: build the event, send it, record the outcome
 *               (uploaded, skipped with reason, failed with reason). The
 *               record is what stops a repeat: a source with a row is never
 *               sent again, whatever the row says. With validateOnly, Google
 *               checks each event and records nothing, and neither does this.
 *   statusPass  for uploads older than Google's processing delay, read the
 *               Google-side status. PROCESSING and REQUEST_STATUS_UNKNOWN are
 *               asked again on later runs, at most MAX_STATUS_CHECKS times,
 *               after which the row is marked UNRESOLVED with the last answer
 *               so it stops being retried silently and shows in the report.
 *
 * One lock covers both syncs: the scheduler runs them one after the other
 * in the same tick, and an acceptance run that overlaps either is told a
 * sync is already running.
 *
 * Nothing here prints or stores a name, email, phone number, click
 * identifier or token. Counts, ids, flags and reasons only.
 */
import { DataManagerError, type ClientOptions, type DataManagerDestination, type IngestEventsRequest, type RequestStatusSummary } from "./googleDataManager";
import { dealPersonId, identifierSummary, pipedriveTimeToIso, type BuildResult } from "./qualifiedLead";
import type { SourceType, UploadStore } from "./uploadStore";

/** Sources created inside this many days are considered. Google will not attribute a conversion to an older click anyway. */
export const LOOKBACK_DAYS = 30;
/** Google processes ingestion asynchronously; status is read after this. */
export const STATUS_CHECK_AFTER_MINUTES = 30;
export const STATUS_CHECKS_PER_RUN = 20;
/** After this many PROCESSING or REQUEST_STATUS_UNKNOWN answers the row is marked UNRESOLVED. */
export const MAX_STATUS_CHECKS = 5;

export type SyncTrigger = "schedule" | "manual" | "acceptance";

export interface SyncOutcome {
  status: "complete" | "partial" | "skipped";
  reason: string | null;
  /** True for a validateOnly dry run: "uploaded" then means "passed Google's validation", and nothing was recorded. */
  validateOnly: boolean;
  considered: number;
  uploaded: number;
  skipped: number;
  failed: number;
  alreadyRecorded: number;
  /** Uploads whose Google-side status was due a check this run. */
  statusAwaiting: number;
  /** Of those, how many Google settled (SUCCESS, PARTIAL_SUCCESS, FAILED). */
  statusChecked: number;
  /** Of those, how many reached MAX_STATUS_CHECKS unsettled and were marked UNRESOLVED. */
  statusUnresolved: number;
  skipReasons: Record<string, number>;
}

export function emptyOutcome(status: SyncOutcome["status"] = "complete", reason: string | null = null, validateOnly = false): SyncOutcome {
  return { status, reason, validateOnly, considered: 0, uploaded: 0, skipped: 0, failed: 0, alreadyRecorded: 0, statusAwaiting: 0, statusChecked: 0, statusUnresolved: 0, skipReasons: {} };
}

/** "skipped 3 (no_google_click_identifier 2, lead_has_no_id 1)", or "" when nothing was skipped. */
export function skipReasonSummary(reasons: Record<string, number>): string {
  const parts = Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ${n}`);
  return parts.length === 0 ? "" : parts.join(", ");
}

let running = false;
/** Runs fn unless another sync holds the lock, in which case onBusy's result is returned. */
export async function withSyncLock<T>(fn: () => Promise<T>, onBusy: () => T): Promise<T> {
  if (running) return onBusy();
  running = true;
  try {
    return await fn();
  } finally {
    running = false;
  }
}

/** A Pipedrive record that may become a conversion. */
export interface PassItem {
  sourceType: SourceType;
  sourceId: string;
  dealId: number | null;
  record: Record<string, unknown>;
}

/** The records created inside the look-back window, oldest first. */
export function inWindow(records: Array<Record<string, unknown>>, now: Date): Array<Record<string, unknown>> {
  const since = now.getTime() - LOOKBACK_DAYS * 24 * 3600 * 1000;
  return records
    .filter(r => {
      const iso = pipedriveTimeToIso(r.add_time);
      return iso !== null && Date.parse(iso) >= since;
    })
    .sort((a, b) => (pipedriveTimeToIso(a.add_time) as string).localeCompare(pipedriveTimeToIso(b.add_time) as string));
}

export interface UploadPassArgs {
  label: string;
  trigger: SyncTrigger;
  items: PassItem[];
  conversionActionId: string;
  destination: DataManagerDestination;
  build: (record: Record<string, unknown>, person: Record<string, unknown> | null) => BuildResult;
  transactionId: (item: PassItem) => string;
  validateOnly: boolean;
  store: UploadStore;
  getPersonRaw: (personId: number) => Promise<Record<string, unknown> | null>;
  ingest: (request: IngestEventsRequest, opts?: ClientOptions) => Promise<{ requestId: string; fieldWarnings: unknown[] }>;
  clientOptions?: ClientOptions;
  outcome: SyncOutcome;
  problems: string[];
}

export async function uploadPass(a: UploadPassArgs): Promise<void> {
  const { outcome, store } = a;
  for (const item of a.items) {
    const existing = await store.find(item.sourceType, item.sourceId, a.conversionActionId);
    if (existing) { outcome.alreadyRecorded += 1; continue; }
    outcome.considered += 1;

    let person: Record<string, unknown> | null = null;
    const personId = dealPersonId(item.record);
    if (personId !== null) {
      try { person = await a.getPersonRaw(personId); } catch { person = null; }
    }

    const built = a.build(item.record, person);
    const iso = pipedriveTimeToIso(item.record.add_time);
    const base = {
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      dealId: item.dealId,
      personId: built.personId,
      conversionActionId: a.conversionActionId,
      transactionId: a.transactionId(item),
      eventTimestamp: iso ? new Date(iso) : null,
      identifiers: identifierSummary(built.identifiers),
      requestId: null,
      googleStatus: null,
      googleDetail: null,
      attempts: 1,
      statusChecks: 0,
    };
    const who = `${item.sourceType} ${item.sourceId}`;

    if (!built.ok) {
      if (!a.validateOnly) await store.record({ ...base, status: "skipped", reason: built.reason });
      outcome.skipped += 1;
      outcome.skipReasons[built.reason] = (outcome.skipReasons[built.reason] ?? 0) + 1;
      continue;
    }

    try {
      const response = await a.ingest({ destinations: [a.destination], events: [built.event], encoding: "HEX", validateOnly: a.validateOnly }, a.clientOptions);
      if (!a.validateOnly) {
        await store.record({
          ...base,
          status: "uploaded",
          requestId: response.requestId || null,
          reason: response.fieldWarnings.length > 0 ? `${response.fieldWarnings.length} field warning(s) from Google` : null,
        });
      }
      outcome.uploaded += 1;
      console.log(`${a.label} ${a.trigger}: ${who} ${a.validateOnly ? "passed validation (validateOnly, nothing recorded)" : "uploaded"} (${base.identifiers}); request ${response.requestId || "no id"}`);
    } catch (error) {
      const message = error instanceof DataManagerError
        ? `${error.message}`.slice(0, 380)
        : `Upload threw: ${String((error as Error)?.message ?? error).slice(0, 300)}`;
      if (!a.validateOnly) await store.record({ ...base, status: "failed", reason: message });
      outcome.failed += 1;
      a.problems.push(`${who}: ${message}`);
      console.warn(`${a.label} ${a.trigger}: ${who} ${a.validateOnly ? "failed validation" : "upload failed"} (${base.identifiers}): ${message}`);
    }
  }
}

export interface StatusPassArgs {
  conversionActionId: string;
  store: UploadStore;
  status: (requestId: string, opts?: ClientOptions) => Promise<RequestStatusSummary>;
  clientOptions?: ClientOptions;
  now: Date;
  outcome: SyncOutcome;
  problems: string[];
}

export async function statusPass(a: StatusPassArgs): Promise<void> {
  const before = new Date(a.now.getTime() - STATUS_CHECK_AFTER_MINUTES * 60 * 1000);
  const awaiting = await a.store.awaitingStatus(a.conversionActionId, before, STATUS_CHECKS_PER_RUN);
  a.outcome.statusAwaiting += awaiting.length;
  for (const row of awaiting) {
    if (!row.requestId) { await a.store.update(row.id, { googleStatus: "NO_REQUEST_ID" }); continue; }
    try {
      const s = await a.status(row.requestId, a.clientOptions);
      if (s.status === "PROCESSING" || s.status === "REQUEST_STATUS_UNKNOWN") {
        const checks = (row.statusChecks ?? 0) + 1;
        if (checks >= MAX_STATUS_CHECKS) {
          await a.store.update(row.id, { statusChecks: checks, googleStatus: "UNRESOLVED", googleDetail: `Google still answered ${s.status} after ${checks} checks` });
          a.outcome.statusUnresolved += 1;
        } else {
          await a.store.update(row.id, { statusChecks: checks });
        }
        continue;
      }
      const detail = [
        s.recordCount !== null ? `records=${s.recordCount}` : null,
        ...s.errorCounts.map(c => `error ${c.reason}=${c.count}`),
        ...s.warningCounts.map(c => `warning ${c.reason}=${c.count}`),
      ].filter(Boolean).join("; ");
      await a.store.update(row.id, { googleStatus: s.status, googleDetail: detail.slice(0, 400) || null });
      a.outcome.statusChecked += 1;
    } catch (error) {
      a.problems.push(`status of request for ${row.sourceType} ${row.sourceId}: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    }
  }
}

/** Closes a run: partial with the first problems, if there were any. */
export function finish(outcome: SyncOutcome, problems: string[]): SyncOutcome {
  if (problems.length > 0) {
    outcome.status = "partial";
    outcome.reason = problems.slice(0, 3).join(" | ").slice(0, 400);
  }
  return outcome;
}

/** The log line the scheduler prints for one run, with the skip reasons it used to drop. */
export function outcomeLine(label: string, r: SyncOutcome): string {
  const skips = skipReasonSummary(r.skipReasons);
  return `${label} scheduled run: ${r.status}; considered ${r.considered}, uploaded ${r.uploaded}, skipped ${r.skipped}${skips ? ` (${skips})` : ""}, failed ${r.failed}, ` +
    `status: ${r.statusAwaiting} awaiting, ${r.statusChecked} settled, ${r.statusUnresolved} unresolved${r.reason ? ` (${r.reason.slice(0, 160)})` : ""}`;
}
