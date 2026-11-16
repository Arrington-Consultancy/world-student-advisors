import { useEffect, useState } from "react";
import { HardDriveDownload, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

/**
 * The WSA AI Reporting Mirror, inside Staff access.
 *
 * Pipedrive stays the source of truth. The service exports sanitised
 * reporting files hourly into one Google Drive folder, "WSA AI Reporting
 * Mirror", written and read through a credential that can see nothing
 * else on that Drive. This panel shows the grant, the configuration, the
 * mirror's freshness and the recent runs, and offers a manual run. No
 * token and no record content is shown or fetched here.
 */
const OUTCOME_MESSAGES: Record<string, string> = {
  connected: "Google Drive is connected for the reporting mirror with drive.file access only. The first sync runs within a few minutes; use Sync now to run it immediately.",
  denied: "Authorisation was declined at Google. Nothing was stored.",
  invalid: "Google returned without the expected details. Nothing was stored. Start again from this screen.",
  state_invalid: "The consent link had expired or did not match this site. Nothing was stored. Start again from this screen.",
  scopes_refused: "Google offered wider access than drive.file, so the grant was refused and not stored.",
  exchange_failed: "Google did not complete the token exchange. Nothing was stored. Check the client id and secret on the service and try again.",
  store_failed: "The grant could not be stored because the database was unavailable. Nothing was retained. Try again shortly.",
  unconfigured: "The Google mirror client is not configured on this service yet.",
};
const CONFIG_LABEL: Record<string, string> = {
  ready: "Ready to sync",
  token_source_unset: "Waiting for the Pipedrive credential decision (PIPEDRIVE_MIRROR_TOKEN_SOURCE is not set)",
  token_missing: "The chosen Pipedrive credential variable is empty on the service",
  drive_unconfigured: "Google mirror client not configured on the service",
  drive_not_authorised: "Google Drive not yet authorised",
  drive_reauthorisation_required: "Google Drive needs authorising again",
};
const MIRROR_LABEL: Record<string, string> = {
  fresh: "Current", partial: "Current but partial", stale: "Stale: not presented as current", inconsistent: "Inconsistent: a sync failed part way, last good manifest stands",
  no_manifest: "No completed sync yet", not_authorised: "Drive not authorised", unconfigured: "Not configured", error: "Could not read the mirror",
};
function when(v: string | Date | null | undefined): string {
  if (!v) return "not recorded";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "not recorded" : d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function ReportingMirror({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const status = trpc.workforce.driveMirrorStatus.useQuery({ token }, { enabled: !!token });
  const start = trpc.workforce.driveMirrorOAuthStart.useMutation({
    onSuccess: r => {
      if (!r.permitted) { setMessage(r.reason); return; }
      if (!r.configured) { setMessage(r.reason); return; }
      window.location.assign(r.url);
    },
    onError: () => setMessage("Could not start the Google authorisation. Try again."),
  });
  const backup = trpc.workforce.crmBackupNow.useMutation({
    onSuccess: r => {
      if (!r.permitted) { setMessage(r.reason); return; }
      setMessage(r.status === "complete" ? `Backup complete: snapshot ${r.snapshotLabel}.` : `Backup ${r.status}${r.reason ? `: ${r.reason}` : ""}.`);
      status.refetch();
    },
    onError: () => setMessage("The backup could not be started. Try again."),
  });
  const sync = trpc.workforce.driveMirrorSyncNow.useMutation({
    onSuccess: r => {
      if (!r.permitted) { setMessage(r.reason); return; }
      setMessage(r.status === "complete" ? `Sync complete: ${r.counts?.leads ?? 0} leads, ${r.counts?.deals ?? 0} deals, ${r.counts?.persons ?? 0} persons.` : `Sync ${r.status}${r.reason ? `: ${r.reason}` : ""}.`);
      status.refetch();
    },
    onError: () => setMessage("The sync could not be started. Try again."),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("drive_mirror");
    if (!outcome) return;
    setMessage(OUTCOME_MESSAGES[outcome] ?? "Google returned an outcome this screen does not recognise. Nothing was stored.");
    const url = new URL(window.location.href);
    url.searchParams.delete("drive_mirror");
    window.history.replaceState({}, "", url.toString());
    status.refetch();
  }, []);

  if (!status.data?.permitted) return null;
  const s = status.data;
  const connected = s.grant.status === "operational";
  const mirrorOk = s.mirror?.status === "fresh" || s.mirror?.status === "partial";

  return (
    <section className="mt-8 rounded-lg border border-wsa-navy/10 bg-white p-5">
      <h3 className="text-base font-semibold text-wsa-navy">Reporting mirror (Pipedrive to Google Drive)</h3>
      <p className="mt-1 text-base text-gray-600">
        Pipedrive remains the source of truth. Every hour the service writes sanitised reporting files (no names, emails, phone numbers,
        passport data or notes) into one Drive folder, "WSA AI Reporting Mirror". Reporting questions are answered from that copy after its
        manifest is checked, and never from a stale copy. The credential can see only the files it wrote.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-md border border-wsa-navy/10 bg-wsa-cream/40 p-3">
          {connected ? <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" aria-hidden /> : <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden />}
          <div className="text-base text-gray-800">
            <p className="font-medium">Google Drive: {connected ? "connected" : s.grant.status.replace(/_/g, " ")}</p>
            <p className="mt-1 text-gray-600">Scope: {s.scope.replace("https://www.googleapis.com/auth/", "")}</p>
            {s.grant.authorisedAt && <p className="mt-1 text-gray-600">Authorised {when(s.grant.authorisedAt)} by staff account {s.grant.authorisedByStaffUserId ?? "unknown"}.</p>}
            {s.grant.lastRefreshError && <p className="mt-1 text-amber-700">Last refresh problem: {s.grant.lastRefreshError}</p>}
            <p className="mt-1 text-gray-600">{CONFIG_LABEL[s.config] ?? s.config}. Pipedrive credential: {s.tokenSource ? s.tokenSource.replace(/_/g, " ") : "not chosen"}.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-wsa-navy/10 bg-wsa-cream/40 p-3">
          {mirrorOk ? <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" aria-hidden /> : <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden />}
          <div className="text-base text-gray-800">
            <p className="font-medium">Mirror: {s.mirror ? (MIRROR_LABEL[s.mirror.status] ?? s.mirror.status) : "not readable until Drive is connected"}</p>
            {s.mirror?.lastSuccessfulSyncAt && <p className="mt-1 text-gray-600">Last successful sync {when(s.mirror.lastSuccessfulSyncAt)}{s.mirror.ageMinutes !== null ? ` (${s.mirror.ageMinutes} min ago)` : ""}.</p>}
            {s.mirror?.coverage && <p className="mt-1 text-gray-600">Coverage {s.mirror.coverage.from ? when(s.mirror.coverage.from) : "start of records"} to {when(s.mirror.coverage.to)}.</p>}
            {s.mirror?.counts && <p className="mt-1 text-gray-600">{s.mirror.counts.leads} leads, {s.mirror.counts.deals} deals, {s.mirror.counts.persons} persons.</p>}
            {s.mirror && !mirrorOk && <p className="mt-1 text-amber-700">{s.mirror.detail}</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        {s.grant.status !== "unconfigured" && (
          <Button type="button" onClick={() => { setMessage(null); start.mutate({ token }); }} disabled={start.isPending} className="bg-wsa-red text-white hover:bg-wsa-red/90">
            <HardDriveDownload className="mr-2 h-4 w-4" aria-hidden />
            {start.isPending ? "Opening Google…" : connected ? "Authorise Google Drive again" : "Connect Google Drive"}
          </Button>
        )}
        {connected && s.config === "ready" && (
          <>
            <Button type="button" variant="outline" onClick={() => { setMessage(null); sync.mutate({ token }); }} disabled={sync.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} aria-hidden />
              {sync.isPending ? "Syncing…" : "Sync mirror now"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setMessage(null); backup.mutate({ token }); }} disabled={backup.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${backup.isPending ? "animate-spin" : ""}`} aria-hidden />
              {backup.isPending ? "Backing up…" : "Back up now"}
            </Button>
          </>
        )}
        <p className="text-sm text-gray-500">Sign in with the Google account that will hold the folder. The credential is limited to files this service creates.</p>
      </div>

      {s.runs.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th className="py-1 pr-3">Started</th><th className="py-1 pr-3">Trigger</th><th className="py-1 pr-3">Status</th><th className="py-1 pr-3">Records</th><th className="py-1">Reason</th></tr></thead>
            <tbody>
              {s.runs.map(r => (
                <tr key={r.id} className="border-t border-wsa-navy/10 text-gray-700">
                  <td className="py-1 pr-3 whitespace-nowrap">{when(r.startedAt)}</td>
                  <td className="py-1 pr-3">{r.trigger}</td>
                  <td className={`py-1 pr-3 ${r.status === "complete" ? "text-green-700" : r.status === "running" ? "text-gray-500" : "text-amber-700"}`}>{r.status}</td>
                  <td className="py-1 pr-3 whitespace-nowrap">{r.leadCount ?? "–"} / {r.dealCount ?? "–"} / {r.personCount ?? "–"}</td>
                  <td className="py-1">{r.reason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 rounded-md border border-wsa-navy/10 p-3 text-sm text-gray-700">
        <p className="font-medium text-wsa-navy">Workforce Drive identity (read only, selected folders)</p>
        {s.workforceDrive.identity ? (
          <p className="mt-1">Share these folders, view only, with <span className="font-mono">{s.workforceDrive.identity}</span>: {s.workforceDrive.designatedFolders.map(f => f.name).join(", ")}.</p>
        ) : (
          <p className="mt-1">Not configured: WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON is absent on the service.</p>
        )}
        <p className="mt-1">Workers: {s.workforceDrive.workers.map(w => `${w.workerId} (${w.folders.join(", ")})`).join("; ")}.</p>
        <p className="mt-1">Never shared or designated: {s.workforceDrive.notDesignated.map(f => f.name).join(", ")}. The backup folder is never shared.</p>
      </div>

      {s.backups.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <p className="text-sm font-medium text-wsa-navy">Daily backup snapshots</p>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th className="py-1 pr-3">Started</th><th className="py-1 pr-3">Snapshot</th><th className="py-1 pr-3">Status</th><th className="py-1 pr-3">Records</th><th className="py-1">Reason</th></tr></thead>
            <tbody>
              {s.backups.map(b => (
                <tr key={b.id} className="border-t border-wsa-navy/10 text-gray-700">
                  <td className="py-1 pr-3 whitespace-nowrap">{when(b.startedAt)}</td>
                  <td className="py-1 pr-3 font-mono">{b.snapshotLabel ?? ""}</td>
                  <td className={`py-1 pr-3 ${b.status === "complete" ? "text-green-700" : b.status === "running" ? "text-gray-500" : "text-amber-700"}`}>{b.status}</td>
                  <td className="py-1 pr-3 whitespace-nowrap">{b.counts ? Object.values(b.counts).reduce((a, n) => a + n, 0) : "–"}</td>
                  <td className="py-1">{b.reason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && <p className="mt-3 text-base text-gray-700">{message}</p>}
    </section>
  );
}
