/**
 * One run of the Enquiry conversion sync: Pipedrive Leads in, Google Data
 * Manager events out to the "WSA | Enquiry" conversion action, every
 * decision recorded once. The Google Ads worker brief of 14 October 2026,
 * approved by Tom Arrington; the event itself is defined in enquiry.ts.
 *
 * It is the Qualified Lead sync (qualifiedLeadSync.ts) with Leads for
 * Deals: the same Google credential, the same Data Manager client, the same
 * upload record and the same two passes (conversionPass.ts). What is its
 * own:
 *   - its switch, GOOGLE_ADS_ENQUIRY_SYNC_ENABLED, exactly "true", default
 *     off and independent of the Qualified Lead switch;
 *   - its destination, GOOGLE_ADS_ENQUIRY_CONVERSION_ACTION_ID, with no
 *     default, and refused if it names the website-tag "Submit lead form"
 *     action or the Qualified Lead action;
 *   - a dry run: validateOnly, which sends every event Google would get to
 *     the real destination for checking, records nothing on either side,
 *     and reports what it would have done. This is how the first run is
 *     made, and its result goes to Tom before the switch goes on. The dry
 *     run needs everything except the switch.
 */
import { ENV } from "../_core/env";
import { createPipedriveReader } from "../pipedrive-read";
import { ingestEvents, retrieveRequestStatus, type ClientOptions, type IngestEventsRequest, type RequestStatusSummary } from "./googleDataManager";
import { buildEnquiryEvent, enquiryActionProblem, enquiryConfig, enquiryDestination, leadId, transactionIdForLead, type EnquiryConfig } from "./enquiry";
import { databaseUploadStore, type UploadStore } from "./uploadStore";
import { baseConfigState } from "./qualifiedLeadSync";
import { emptyOutcome, finish, inWindow, statusPass, uploadPass, withSyncLock, type SyncOutcome, type SyncTrigger } from "./conversionPass";

export const ENQUIRY_SYNC_ENABLED_VAR = "GOOGLE_ADS_ENQUIRY_SYNC_ENABLED";
export function enquirySyncEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[ENQUIRY_SYNC_ENABLED_VAR] === "true";
}

export type EnquirySyncConfigState =
  | "ready"
  | "google_credential_unconfigured"
  | "google_credential_malformed"
  | "pipedrive_token_missing"
  | "database_unavailable"
  | "enquiry_conversion_action_missing"
  | "enquiry_conversion_action_is_submit_lead_form_tag_action"
  | "enquiry_conversion_action_is_qualified_lead_action"
  | "sync_disabled";

export interface EnquirySyncDeps {
  listLeads(): Promise<Array<Record<string, unknown>>>;
  getPersonRaw(personId: number): Promise<Record<string, unknown> | null>;
  store: UploadStore | null;
  ingest: (request: IngestEventsRequest, opts?: ClientOptions) => Promise<{ requestId: string; fieldWarnings: unknown[] }>;
  status: (requestId: string, opts?: ClientOptions) => Promise<RequestStatusSummary>;
  clientOptions?: ClientOptions;
  config: EnquiryConfig;
  now(): Date;
  env: NodeJS.ProcessEnv;
}

/**
 * The state of everything a real run needs, naming the first thing
 * missing. "sync_disabled" means everything is in place except the switch,
 * which is also exactly what a validateOnly dry run needs.
 */
export async function enquirySyncConfigState(
  env: NodeJS.ProcessEnv = process.env,
  store: UploadStore | null | undefined = undefined,
  config: EnquiryConfig = enquiryConfig(env),
): Promise<EnquirySyncConfigState> {
  const missing = await baseConfigState(env, store);
  if (missing) return missing;
  const problem = enquiryActionProblem(config, env);
  if (problem) return `enquiry_conversion_action_${problem}`;
  if (!enquirySyncEnabled(env)) return "sync_disabled";
  return "ready";
}

export async function productionEnquiryDeps(): Promise<EnquirySyncDeps> {
  const reader = createPipedriveReader(() => ENV.pipedriveApiToken);
  return {
    listLeads: () => reader.listLeadsRaw(),
    getPersonRaw: personId => reader.getPersonRaw(personId),
    store: await databaseUploadStore(),
    ingest: ingestEvents,
    status: retrieveRequestStatus,
    config: enquiryConfig(),
    now: () => new Date(),
    env: process.env,
  };
}

export interface EnquiryRunOptions {
  /** Google checks every event against the real destination and records nothing; neither does this. Needs everything but the switch. */
  validateOnly?: boolean;
}

export async function runEnquirySync(trigger: SyncTrigger, deps?: EnquirySyncDeps, opts: EnquiryRunOptions = {}): Promise<SyncOutcome> {
  const d = deps ?? (await productionEnquiryDeps());
  const validateOnly = opts.validateOnly === true;
  const state = await enquirySyncConfigState(d.env, d.store, d.config);
  const runnable = state === "ready" || (validateOnly && state === "sync_disabled");
  if (!runnable) return emptyOutcome("skipped", state, validateOnly);
  return withSyncLock(() => runInner(trigger, d, d.store as UploadStore, validateOnly), () => emptyOutcome("skipped", "a sync is already running", validateOnly));
}

async function runInner(trigger: SyncTrigger, d: EnquirySyncDeps, store: UploadStore, validateOnly: boolean): Promise<SyncOutcome> {
  const now = d.now();
  const outcome = emptyOutcome("complete", null, validateOnly);
  const problems: string[] = [];
  const conversionActionId = d.config.conversionActionId as string;

  let leads: Array<Record<string, unknown>>;
  try {
    leads = await d.listLeads();
  } catch (error) {
    return { ...outcome, status: "partial", reason: `Pipedrive leads could not be read: ${String((error as Error)?.message ?? error).slice(0, 160)}` };
  }

  // A record without a usable Lead id is counted, not keyed: there is
  // nothing to record it under.
  const keyed = leads.filter(lead => leadId(lead) !== null);
  const unkeyed = inWindow(leads.filter(lead => leadId(lead) === null), now).length;
  if (unkeyed > 0) {
    outcome.skipped += unkeyed;
    outcome.skipReasons.lead_has_no_id = unkeyed;
  }

  const items = inWindow(keyed, now)
    .map(lead => ({ sourceType: "lead" as const, sourceId: leadId(lead) as string, dealId: null, record: lead }));

  await uploadPass({
    label: "[Google Ads ENQ]",
    trigger,
    items,
    conversionActionId,
    destination: enquiryDestination(d.config),
    build: buildEnquiryEvent,
    transactionId: item => transactionIdForLead(item.sourceId),
    validateOnly,
    store,
    getPersonRaw: d.getPersonRaw,
    ingest: d.ingest,
    clientOptions: d.clientOptions,
    outcome,
    problems,
  });

  if (!validateOnly) {
    await statusPass({ conversionActionId, store, status: d.status, clientOptions: d.clientOptions, now, outcome, problems });
  }

  return finish(outcome, problems);
}
