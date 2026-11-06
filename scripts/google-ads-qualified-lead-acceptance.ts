/**
 * Production acceptance for the WSA-owned Google Ads conversion uploads
 * (Data Manager API): the Qualified Lead (Tom Arrington's brief of 16
 * September 2026) and, since the Google Ads worker brief of 14 October
 * 2026, the Enquiry.
 *
 * Runs inside the Railway service's variables with a public database URL
 * substituted, as the other acceptance workflows do. What it proves, in
 * order, stopping honestly at the first thing that is not there:
 *   1. Configuration: which Google credential shape is present, the
 *      destination account, both conversion actions, the Pipedrive token,
 *      and each sync's state.
 *   2. Authentication: an access token is obtained for the Data Manager
 *      scope. Prints the outcome and the token's length, never the token.
 *   3. Validation uploads: events:ingest with validateOnly=true and one
 *      clearly synthetic event, to the Qualified Lead action and, once its id
 *      is set, to the Enquiry action. Google checks each request against the
 *      real destination and RECORDS NOTHING. The request ids and any field
 *      warnings are printed.
 *   4. The record: google_ads_conversion_uploads counts by status for each
 *      action, how many uploads are still awaiting a Google-side status or
 *      were marked UNRESOLVED, and the most recent rows as ids, flags,
 *      statuses and reasons (no personal data is in the table).
 *   4b. Google-side status of the five most recent uploads, read live, with
 *      the response's shape (no values) printed once. Read-only.
 *   5. Pipedrive: how many Deals and Leads fall inside the look-back window
 *      and how many carry a Google click identifier on the record. Counts
 *      only.
 *   6. Optionally (E2E_ENQUIRY_DRY_RUN=1) the Enquiry dry run: every Lead
 *      the real sync would send goes to Google with validateOnly, nothing
 *      is recorded on either side, and the counts are printed. This is the
 *      first run the brief asks for, reported to Tom before the switch goes
 *      on. It needs everything but GOOGLE_ADS_ENQUIRY_SYNC_ENABLED.
 *   7. Optionally (E2E_RUN_SYNC=1) one real run of each sync, exactly as the
 *      scheduler runs them, each behind its own switch. This sends real
 *      conversions if any exist and are unrecorded; it never fabricates one.
 * Exit 0 only when every step that could run passed.
 */
import { getDb } from "../server/db";
import { credentialIdentity, credentialState, describeShape, ingestEvents, parseRequestStatus, readCredential, retrieveRequestStatusRaw, accessToken, DataManagerError, type DataManagerCredential, type DataManagerDestination } from "../server/ads/googleDataManager";
import { ATTRIBUTION_FIELD_KEYS, qualifiedLeadConfig, qualifiedLeadDestination, pipedriveTimeToIso } from "../server/ads/qualifiedLead";
import { ENQUIRY, enquiryActionProblem, enquiryConfig, enquiryDestination } from "../server/ads/enquiry";
import { databaseUploadStore } from "../server/ads/uploadStore";
import { isExplicitRealSyncSuccess, LOOKBACK_DAYS, runQualifiedLeadSync, syncConfigState } from "../server/ads/qualifiedLeadSync";
import { enquirySyncConfigState, runEnquirySync } from "../server/ads/enquirySync";
import { skipReasonSummary, type SyncOutcome } from "../server/ads/conversionPass";
import { createPipedriveReader } from "../server/pipedrive-read";
import { ENV } from "../server/_core/env";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => { if (!ok) failures += 1; console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`); };
const note = (label: string) => console.log(`  note ${label}`);
const runLine = (r: SyncOutcome) =>
  `${r.status}${r.validateOnly ? " (validateOnly)" : ""}; considered ${r.considered}, ${r.validateOnly ? "passed validation" : "uploaded"} ${r.uploaded}, skipped ${r.skipped}` +
  `${Object.keys(r.skipReasons).length ? ` (${skipReasonSummary(r.skipReasons)})` : ""}, failed ${r.failed}, already recorded ${r.alreadyRecorded}, ` +
  `status: ${r.statusAwaiting} awaiting, ${r.statusChecked} settled, ${r.statusUnresolved} unresolved${r.reason ? `; ${r.reason}` : ""}`;

console.log("\n=== 1. Configuration ===");
const config = qualifiedLeadConfig();
const enqConfig = enquiryConfig();
const enqProblem = enquiryActionProblem(enqConfig);
const state = credentialState();
note(`Google credential: ${state}${credentialIdentity() ? ` (${credentialIdentity()})` : ""}`);
note(`Google Ads customer ${config.customerId}${config.loginCustomerId ? `, via manager ${config.loginCustomerId}` : ""}`);
note(`Qualified Lead action ${config.conversionActionId}`);
note(`Enquiry action ${enqConfig.conversionActionId ?? "not set"}${enqProblem && enqProblem !== "missing" ? ` (REFUSED: ${enqProblem})` : ""}${enqProblem === "missing" ? ` (set ${ENQUIRY.conversionActionIdVar} once "${ENQUIRY.conversionActionName}" exists in Google Ads)` : ""}`);
if (enqProblem && enqProblem !== "missing") check(false, "Enquiry action is a separate upload action", enqProblem);
check(Boolean(ENV.pipedriveApiToken), "Pipedrive website token present");
const store = await databaseUploadStore();
check(store !== null, "database reachable");
const syncState = await syncConfigState(process.env, store);
const enqState = await enquirySyncConfigState(process.env, store);
note(`Qualified Lead sync state: ${syncState}`);
note(`Enquiry sync state: ${enqState}`);

console.log("\n=== 2. Authentication ===");
const credential = readCredential();
let token: string | null = null;
if (!credential) {
  note("no Google credential configured: authentication and validation cannot run yet. This is the one outstanding configuration.");
} else {
  try {
    token = await accessToken(credential);
    check(token.length > 20, "access token obtained for the Data Manager scope", `${token.length} characters`);
  } catch (error) {
    check(false, "access token obtained", String((error as Error)?.message ?? error).slice(0, 200));
  }
}

console.log("\n=== 3. Validation uploads (validateOnly=true; Google records nothing) ===");
async function validateDestination(label: string, destination: DataManagerDestination, cred: DataManagerCredential) {
  try {
    const r = await ingestEvents({
      destinations: [destination],
      events: [{
        transactionId: `wsa-acceptance-validate-only-${Date.now()}`,
        eventTimestamp: new Date().toISOString(),
        adIdentifiers: { gclid: "WSA_ACCEPTANCE_VALIDATE_ONLY" },
        eventSource: "WEB",
      }],
      encoding: "HEX",
      validateOnly: true,
    }, { credential: cred });
    check(true, `Google accepted the request shape for the ${label} action`, `request ${r.requestId || "(no id for validateOnly)"}; ${r.fieldWarnings.length} field warning(s)`);
    for (const w of r.fieldWarnings.slice(0, 5)) note(`field warning: ${JSON.stringify(w).slice(0, 200)}`);
  } catch (error) {
    const e = error as DataManagerError;
    check(false, `Google accepted the request shape for the ${label} action`, `${e.message}`.slice(0, 300));
    if (e.status === 403) note("HTTP 403 usually means the credential's identity has not been given access to the Google Ads account, or the Data Manager API is not enabled on its Cloud project.");
    if (e.status === 400 || e.status === 404) note("For a new action, check the id is the conversion action's numeric id and that its source is \"Import from clicks\".");
  }
}
if (token && credential) {
  await validateDestination("Qualified Lead", qualifiedLeadDestination(config), credential);
  if (!enqProblem) await validateDestination("Enquiry", enquiryDestination(enqConfig), credential);
  else note("Enquiry validation skipped: no usable Enquiry action id yet.");
} else {
  note("skipped: no access token.");
}

console.log("\n=== 4. The record ===");
if (store) {
  try {
    const ql = await store.counts(config.conversionActionId);
    check(true, "google_ads_conversion_uploads readable", `Qualified Lead: uploaded ${ql.uploaded}, skipped ${ql.skipped}, failed ${ql.failed}`);
    if (enqConfig.conversionActionId) {
      const enq = await store.counts(enqConfig.conversionActionId);
      note(`Enquiry: uploaded ${enq.uploaded}, skipped ${enq.skipped}, failed ${enq.failed}`);
    }
    const db = await getDb();
    if (db) {
      const { googleAdsConversionUploads: t } = await import("../drizzle/schema");
      const { desc, sql } = await import("drizzle-orm");
      const [byGoogle] = (await db.execute(sql`
        SELECT conversionActionId, COALESCE(googleStatus, 'awaiting') AS g, COUNT(*) AS n
        FROM google_ads_conversion_uploads WHERE status = 'uploaded' GROUP BY conversionActionId, g ORDER BY conversionActionId, g
      `)) as unknown as [Array<{ conversionActionId: string; g: string; n: number }>];
      for (const r of byGoogle) note(`action ${r.conversionActionId}: ${r.n} upload(s) with Google status ${r.g}`);
      // Every upload Google did not accept, with Google's own reason. Uses
      // only columns that existed before migration 0021.
      const [notAccepted] = (await db.execute(sql`
        SELECT id, dealId, conversionActionId, googleStatus, googleDetail, createdAt FROM google_ads_conversion_uploads
        WHERE status = 'uploaded' AND googleStatus IS NOT NULL AND googleStatus <> 'SUCCESS' ORDER BY id DESC LIMIT 10
      `)) as unknown as [Array<{ id: number; dealId: number | null; conversionActionId: string; googleStatus: string; googleDetail: string | null; createdAt: Date }>];
      for (const r of notAccepted) note(`not accepted: row ${r.id}${r.dealId !== null ? ` (deal ${r.dealId})` : ""} -> ${r.conversionActionId}, uploaded ${new Date(r.createdAt).toISOString().slice(0, 10)}: ${r.googleStatus}${r.googleDetail ? `, ${r.googleDetail.slice(0, 200)}` : ""}`);
      const unresolved = byGoogle.filter(r => r.g === "UNRESOLVED").reduce((n, r) => n + Number(r.n), 0);
      check(unresolved === 0, "no upload left UNRESOLVED by Google", unresolved ? `${unresolved} row(s); see googleDetail` : "");
      const rows = await db.select().from(t).orderBy(desc(t.id)).limit(10);
      for (const r of rows) {
        const google = r.status === "uploaded" ? (r.googleStatus ?? "awaiting") : "n/a (not sent)";
        note(`${r.sourceType} ${r.sourceId} -> ${r.conversionActionId}: ${r.status} (${r.identifiers}) google=${google}${r.reason ? ` reason=${r.reason.slice(0, 120)}` : ""}`);
      }
    }
  } catch (error) {
    check(false, "google_ads_conversion_uploads readable", String((error as Error)?.message ?? error).slice(0, 200));
  }
}

console.log("\n=== 4b. Google-side status of recent uploads (read-only; shape only, no values) ===");
if (token && credential) {
  try {
    const db = await getDb();
    const { sql } = await import("drizzle-orm");
    const [rows] = (await db!.execute(sql`SELECT id, dealId, requestId, googleStatus, createdAt FROM google_ads_conversion_uploads WHERE status = 'uploaded' AND requestId IS NOT NULL ORDER BY id DESC LIMIT 5`)) as unknown as [Array<{ id: number; dealId: number | null; requestId: string; googleStatus: string | null; createdAt: Date }>];
    let shown = false;
    for (const r of rows) {
      const raw = await retrieveRequestStatusRaw(r.requestId, { credential });
      if (!shown) { note(`raw response shape: ${JSON.stringify(describeShape(raw)).slice(0, 900)}`); shown = true; }
      const s = parseRequestStatus(raw);
      note(`row ${r.id}${r.dealId !== null ? ` (deal ${r.dealId})` : ""}, uploaded ${new Date(r.createdAt).toISOString().slice(0, 10)}: Google says ${s.status}, records ${s.recordCount ?? "none"}, errors ${s.errorCounts.length}; stored ${r.googleStatus ?? "awaiting"}`);
    }
    check(true, "request status read for recent uploads", `${rows.length} row(s)`);
  } catch (error) {
    check(false, "request status read for recent uploads", String((error as Error)?.message ?? error).slice(0, 200));
  }
} else {
  note("skipped: no access token.");
}

console.log(`\n=== 5. Pipedrive deals and leads in the ${LOOKBACK_DAYS}-day window (counts only) ===`);
const reader = createPipedriveReader(() => ENV.pipedriveApiToken);
const since = Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000;
const inWindow = (r: Record<string, unknown>) => { const iso = pipedriveTimeToIso(r.add_time); return iso !== null && Date.parse(iso) >= since; };
const hasClick = (r: Record<string, unknown>, keys: { gclid: string; gbraid: string; wbraid: string }) =>
  [keys.gclid, keys.gbraid, keys.wbraid].some(k => typeof r[k] === "string" && (r[k] as string).trim() !== "");
try {
  const deals = await reader.listDealsRaw();
  const recent = deals.filter(inWindow);
  check(true, "deals read", `${deals.length} total; ${recent.length} created in the window; ${recent.filter(d => hasClick(d, ATTRIBUTION_FIELD_KEYS.deal)).length} of those carry a Google click identifier on the deal`);
} catch (error) {
  check(false, "deals read", String((error as Error)?.message ?? error).slice(0, 200));
}
try {
  const leads = await reader.listLeadsRaw();
  const recent = leads.filter(inWindow);
  check(true, "leads read", `${leads.length} total; ${recent.length} created in the window; ${recent.filter(l => hasClick(l, ATTRIBUTION_FIELD_KEYS.lead)).length} of those carry a Google click identifier on the lead (the sync also reads the Person)`);
} catch (error) {
  check(false, "leads read", String((error as Error)?.message ?? error).slice(0, 200));
}

if (process.env.E2E_ENQUIRY_DRY_RUN === "1") {
  console.log("\n=== 6. Enquiry dry run (validateOnly: Google checks every event and records nothing; neither does WSA) ===");
  const r = await runEnquirySync("acceptance", undefined, { validateOnly: true });
  check(r.status === "complete" && r.validateOnly, "Enquiry dry run", runLine(r));
}

if (process.env.E2E_RUN_SYNC === "1") {
  console.log("\n=== 7. One real run of each sync ===");
  const ql = await runQualifiedLeadSync("acceptance");
  check(isExplicitRealSyncSuccess(syncState, ql), "Qualified Lead sync run", `${runLine(ql)}${syncState !== "ready" ? `; sync state ${syncState}` : ""}`);
  const enq = await runEnquirySync("acceptance");
  if (enqState === "ready") check(enq.status === "complete", "Enquiry sync run", runLine(enq));
  else note(`Enquiry sync not run: ${enqState}`);
}

console.log(`\nRESULT: ${failures === 0 ? "every step that could run passed" : `${failures} check(s) failed`}. Qualified Lead sync: ${syncState}. Enquiry sync: ${enqState}.`);
process.exit(failures === 0 ? 0 : 1);
