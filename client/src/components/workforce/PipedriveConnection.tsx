import { useEffect, useState } from "react";
import { Link2, ShieldCheck, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

/**
 * The WSA Pipedrive connection for the AI workforce, inside Staff access.
 *
 * WSA has no spare Pipedrive seat, so the workforce does not get a user of
 * its own. It reads through a dedicated WSA Pipedrive OAuth application,
 * authorised once here by a WSA administrator whose own Pipedrive account
 * has full visibility. The scopes are fixed on the server (Change Entry
 * 100); what any worker may do with them is decided separately, per
 * worker, and no worker holds a write.
 * Nothing about the tokens is shown here; this screen only says whether a
 * grant exists, who made it, when, and what it covers.
 */
const OUTCOME_MESSAGES: Record<string, string> = {
  connected: "Pipedrive is connected. The workforce can now reach the CRM through the WSA application within the approved scope set. Each worker is still limited to its own approved grant; no worker holds a write.",
  denied: "Authorisation was declined in Pipedrive. Nothing was stored.",
  invalid: "Pipedrive returned to the site without the expected details. Nothing was stored. Start again from this screen.",
  state_invalid: "The consent link had expired or did not match this site. Nothing was stored. Start again from this screen.",
  scopes_refused: "Pipedrive offered access outside the approved scope set, so the grant was refused and not stored. Check the application's scopes in the Pipedrive Developer Hub and try again.",
  company_refused: "Pipedrive authorised the application for a company other than World Student Advisors (for example a developer sandbox), so the grant was refused and not stored. Sign in to Pipedrive as a WSA administrator at worldstudentadvisors.pipedrive.com and try again.",
  exchange_failed: "Pipedrive did not complete the token exchange. Nothing was stored. Check the client id and secret on the service and try again.",
  store_failed: "The grant could not be stored because the database was unavailable. Nothing was retained. Try again shortly.",
  unconfigured: "The WSA Pipedrive OAuth application is not configured on this service yet.",
};

const STATUS_LABEL: Record<string, string> = {
  operational: "Connected",
  not_authorised: "Not yet authorised",
  reauthorisation_required: "Needs authorising again",
  unconfigured: "Not configured",
};

function formatWhen(value: string | Date | null | undefined): string {
  if (!value) return "not recorded";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "not recorded" : d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function PipedriveConnection({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const status = trpc.workforce.pipedriveOAuthStatus.useQuery({ token }, { enabled: !!token });
  const start = trpc.workforce.pipedriveOAuthStart.useMutation({
    onSuccess: r => {
      if (!r.permitted) { setMessage(r.reason); return; }
      if (!r.configured) { setMessage(r.reason); return; }
      window.location.assign(r.url);
    },
    onError: () => setMessage("Could not start the Pipedrive authorisation. Try again."),
  });

  // The callback sends the browser back with ?pipedrive=<outcome>. Shown
  // once, then removed from the address bar so a refresh does not repeat it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("pipedrive");
    if (!outcome) return;
    setMessage(OUTCOME_MESSAGES[outcome] ?? "Pipedrive returned an outcome this screen does not recognise. Nothing was stored.");
    const url = new URL(window.location.href);
    url.searchParams.delete("pipedrive");
    window.history.replaceState({}, "", url.toString());
    status.refetch();
  }, []);

  if (!status.data?.permitted) return null;
  const s = status.data;
  const connected = s.status === "operational";

  return (
    <section className="mt-8 rounded-lg border border-wsa-navy/10 bg-white p-5">
      <h3 className="text-base font-semibold text-wsa-navy">Pipedrive connection for the AI workforce</h3>
      <p className="mt-1 text-base text-gray-600">
        The workforce reads the CRM through a dedicated WSA Pipedrive application, not a paid user. A WSA administrator with full
        Pipedrive visibility authorises it once. The application sees only what that administrator can see, and its scopes are fixed to the approved set:
        {" "}{s.approvedScopes.join(", ")}.
      </p>

      <div className="mt-4 flex items-start gap-3 rounded-md border border-wsa-navy/10 bg-wsa-cream/40 p-3">
        {connected ? <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" aria-hidden /> : <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden />}
        <div className="text-base text-gray-800">
          <p className="font-medium">{STATUS_LABEL[s.status] ?? s.status}</p>
          {s.status === "unconfigured" && (
            <p className="mt-1 text-gray-600">
              PIPEDRIVE_OAUTH_CLIENT_ID, PIPEDRIVE_OAUTH_CLIENT_SECRET and PIPEDRIVE_OAUTH_TOKEN_KEY must be present on the service before anyone can authorise.
            </p>
          )}
          {s.apiDomainHost && <p className="mt-1 text-gray-600">Company: {s.apiDomainHost}</p>}
          {s.scopes && <p className="mt-1 text-gray-600">Granted scopes: {s.scopes}</p>}
          {s.authorisedAt && <p className="mt-1 text-gray-600">Authorised {formatWhen(s.authorisedAt)} by staff account {s.authorisedByStaffUserId ?? "unknown"}.</p>}
          {s.lastRefreshedAt && <p className="mt-1 text-gray-600">Token last refreshed {formatWhen(s.lastRefreshedAt)}.</p>}
          {s.lastRefreshError && <p className="mt-1 text-amber-700">Last refresh problem: {s.lastRefreshError}</p>}
        </div>
      </div>

      {s.status !== "unconfigured" && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            onClick={() => { setMessage(null); start.mutate({ token }); }}
            disabled={start.isPending}
            className="bg-wsa-red text-white hover:bg-wsa-red/90"
          >
            <Link2 className="mr-2 h-4 w-4" aria-hidden />
            {start.isPending ? "Opening Pipedrive…" : connected ? "Authorise again" : "Connect Pipedrive"}
          </Button>
          <p className="text-sm text-gray-500">
            Sign in to Pipedrive with a WSA account. Do not use an Arrington Consultancy account.
          </p>
        </div>
      )}

      {message && <p className="mt-3 text-base text-gray-700">{message}</p>}
    </section>
  );
}
