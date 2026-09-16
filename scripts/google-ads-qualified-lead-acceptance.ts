/**
 * Production acceptance for the WSA-owned Google Ads Qualified Lead path
 * (Data Manager API). Tom Arrington's brief of 16 September 2026.
 *
 * Runs inside the Railway service's variables with a public database URL
 * substituted, as the other acceptance workflows do. What it proves, in
 * order, stopping honestly at the first thing that is not there:
 *   1. Configuration: which Google credential shape is present, the
 *      destination account and conversion action, the Pipedrive token.
 *   2. Authentication: an access token is obtained for the Data Manager
 *      scope. Prints the outcome and the token's length, never the token.
 *   3. Validation upload: events:ingest with validateOnly=true and one
 *      clearly synthetic event. Google checks the request against the real
 *      destination and RECORDS NOTHING. No conversion is created. The
 *      request id and any field warnings are printed.
 *   4. The record: the google_ads_conversion_uploads table exists and its
 *      counts by status; the most recent rows as ids, flags, statuses and
 *      reasons (no personal data is in the table).
 *   5. Pipedrive: how many Deals fall inside the look-back window and how
 *      many carry a Google click identifier. Counts only.
 *   6. Optionally (E2E_RUN_SYNC=1) one real sync run, exactly as the
 *      scheduler runs it. This sends real qualified leads if any exist and
 *      are unrecorded; it never fabricates one.
 * Exit 0 only when every step that could run passed.
 */
import { getDb } from "../server/db";
import { credentialIdentity, credentialState, ingestEvents, readCredential, accessToken, DataManagerError } from "../server/ads/googleDataManager";
import { ATTRIBUTION_FIELD_KEYS, qualifiedLeadConfig, qualifiedLeadDestination, pipedriveTimeToIso } from "../server/ads/qualifiedLead";
import { databaseUploadStore } from "../server/ads/uploadStore";
import { LOOKBACK_DAYS, runQualifiedLeadSync, syncConfigState } from "../server/ads/qualifiedLeadSync";
import { createPipedriveReader } from "../server/pipedrive-read";
import { ENV } from "../server/_core/env";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => { if (!ok) failures += 1; console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`); };
const note = (label: string) => console.log(`  note ${label}`);

console.log("\n=== 1. Configuration ===");
const config = qualifiedLeadConfig();
const state = credentialState();
note(`Google credential: ${state}${credentialIdentity() ? ` (${credentialIdentity()})` : ""}`);
note(`destination: Google Ads customer ${config.customerId}, conversion action ${config.conversionActionId}${config.loginCustomerId ? `, via manager ${config.loginCustomerId}` : ""}`);
check(Boolean(ENV.pipedriveApiToken), "Pipedrive website token present");
const store = await databaseUploadStore();
check(store !== null, "database reachable");
const syncState = await syncConfigState(process.env, store);
note(`sync state: ${syncState}`);

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

console.log("\n=== 3. Validation upload (validateOnly=true; Google records nothing) ===");
if (token) {
  const nowIso = new Date().toISOString();
  try {
    const r = await ingestEvents({
      destinations: [qualifiedLeadDestination(config)],
      events: [{
        transactionId: `wsa-acceptance-validate-only-${Date.now()}`,
        eventTimestamp: nowIso,
        adIdentifiers: { gclid: "WSA_ACCEPTANCE_VALIDATE_ONLY" },
        eventSource: "WEB",
      }],
      encoding: "HEX",
      validateOnly: true,
    }, { credential });
    check(true, "Google accepted the request shape for the real destination", `request ${r.requestId || "(no id for validateOnly)"}; ${r.fieldWarnings.length} field warning(s)`);
    for (const w of r.fieldWarnings.slice(0, 5)) note(`field warning: ${JSON.stringify(w).slice(0, 200)}`);
  } catch (error) {
    const e = error as DataManagerError;
    check(false, "Google accepted the request shape for the real destination", `${e.message}`.slice(0, 300));
    if (e.status === 403) note("HTTP 403 usually means the credential's identity has not been given access to the Google Ads account, or the Data Manager API is not enabled on its Cloud project.");
  }
} else {
  note("skipped: no access token.");
}

console.log("\n=== 4. The record ===");
if (store) {
  try {
    const counts = await store.counts();
    check(true, "google_ads_conversion_uploads readable", `uploaded ${counts.uploaded}, skipped ${counts.skipped}, failed ${counts.failed}`);
    const db = await getDb();
    if (db) {
      const { googleAdsConversionUploads } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const rows = await db.select().from(googleAdsConversionUploads).orderBy(desc(googleAdsConversionUploads.id)).limit(8);
      for (const r of rows) note(`deal ${r.dealId}: ${r.status} (${r.identifiers}) request=${r.requestId ?? "none"} google=${r.googleStatus ?? "pending"}${r.reason ? ` reason=${r.reason.slice(0, 120)}` : ""}`);
    }
  } catch (error) {
    check(false, "google_ads_conversion_uploads readable", String((error as Error)?.message ?? error).slice(0, 200));
  }
}

console.log(`\n=== 5. Pipedrive deals in the ${LOOKBACK_DAYS}-day window (counts only) ===`);
try {
  const reader = createPipedriveReader(() => ENV.pipedriveApiToken);
  const deals = await reader.listDealsRaw();
  const since = Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000;
  const recent = deals.filter(d => { const iso = pipedriveTimeToIso(d.add_time); return iso !== null && Date.parse(iso) >= since; });
  const K = ATTRIBUTION_FIELD_KEYS.deal;
  const withClick = recent.filter(d => [K.gclid, K.gbraid, K.wbraid].some(k => typeof d[k] === "string" && (d[k] as string).trim() !== ""));
  check(true, "deals read", `${deals.length} total; ${recent.length} created in the window; ${withClick.length} of those carry a Google click identifier on the deal`);
} catch (error) {
  check(false, "deals read", String((error as Error)?.message ?? error).slice(0, 200));
}

if (process.env.E2E_RUN_SYNC === "1") {
  console.log("\n=== 6. One real sync run ===");
  const r = await runQualifiedLeadSync("acceptance");
  check(r.status !== "partial", "sync run", `${r.status}; considered ${r.considered}, uploaded ${r.uploaded}, skipped ${r.skipped}, failed ${r.failed}, already recorded ${r.alreadyRecorded}, status checked ${r.statusChecked}${r.reason ? `; ${r.reason}` : ""}`);
  for (const [reason, n] of Object.entries(r.skipReasons)) note(`skipped ${n}: ${reason}`);
}

console.log(`\nRESULT: ${failures === 0 ? "every step that could run passed" : `${failures} check(s) failed`}. Sync state: ${syncState}.`);
process.exit(failures === 0 ? 0 : 1);
