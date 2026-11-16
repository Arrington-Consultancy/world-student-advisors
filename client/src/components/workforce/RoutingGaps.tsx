import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * The Routing Gap Log review: recurring gaps as patterns.
 *
 * Tom, 11 September 2026: show recurring gaps grouped by interpreted
 * intent and failure type, so we see patterns rather than reading
 * individual logs. Each group is reviewed into one of four outcomes and
 * nothing here changes a remit: a review is a decision about what to do
 * next, recorded against the row, and the fix happens elsewhere.
 *
 * access_admin only, gated on the server. This component renders what
 * workforce.routingGaps returns and nothing it does not.
 */

const FAILURE_LABEL: Record<string, string> = {
  no_recognised_intent: "No recognised intent",
  subject_without_approved_remit: "Recognised subject, no approved remit",
  remit_but_worker_inactive: "Approved remit, worker not active",
  remit_but_capability_closed: "Approved remit, capability closed",
  permission_failure: "Permission or access failure",
  connector_failure: "Connector or data-access failure",
  ambiguity_needs_clarification: "Ambiguous, needs clarification",
  router_misclassification_corrected: "Router misclassification, corrected by staff",
};

const FAILURE_HINT: Record<string, string> = {
  no_recognised_intent: "Usually a router defect: the remit model has no outcome for how this was asked.",
  subject_without_approved_remit: "Usually a workforce gap. Nobody is approved to do this. A governance decision for Tom.",
  remit_but_worker_inactive: "A worker or access defect, not a routing one.",
  remit_but_capability_closed: "The right worker, a gated capability. Check whether the gate is meant to be open.",
  permission_failure: "The staff member cannot reach the worker who owns it. An access decision.",
  connector_failure: "The worker owns it and lacks the data. A capability or connector gap.",
  ambiguity_needs_clarification: "Two remits could own it. The router should ask, not guess.",
  router_misclassification_corrected: "Staff said the router got it wrong. Strong evidence of a router defect.",
};

const OUTCOMES = [
  { id: "router_defect", label: "Router defect" },
  { id: "worker_or_access_defect", label: "Worker, tool or access defect" },
  { id: "out_of_scope", label: "Genuinely outside WSA scope" },
  { id: "governance_proposal", label: "Propose a remit change for Tom" },
] as const;

export function RoutingGaps({ token }: { token: string }) {
  const gaps = trpc.workforce.routingGaps.useQuery({ token }, { enabled: !!token });
  const review = trpc.workforce.routingGapReview.useMutation({ onSuccess: () => gaps.refetch() });
  const [open, setOpen] = useState<string | null>(null);

  if (gaps.isLoading) return <p className="text-base text-gray-500">Loading the routing gap log…</p>;
  if (!gaps.data?.permitted) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-base text-amber-900">
        {gaps.data?.reason ?? "The routing gap log is not available for this account."}
      </div>
    );
  }

  const { groups, model } = gaps.data;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-wsa-navy/10 bg-white p-4 text-sm text-gray-600">
        <p>
          Routing model <span className="font-medium text-wsa-navy">{model.version}</span>, last reconciled against
          controlled records on {model.lastReconciled}.
        </p>
        <p className="mt-1">
          Built from: {model.baseline.map(b => `${b.record} (${b.dated})`).join("; ")}.
        </p>
        <p className="mt-1">
          Nothing in this log changes a remit. A recurring gap is reviewed into one of four outcomes and the fix is made where it belongs.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-5 text-base text-green-900">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          No routing gaps recorded yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map(group => {
            const key = `${group.interpretedIntent ?? "none"}|${group.failureType}`;
            const expanded = open === key;
            return (
              <li key={key} className="rounded-xl border border-wsa-navy/10 bg-white">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : key)}
                  aria-expanded={expanded}
                  className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-wsa-navy/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-wsa-navy">
                      {group.interpretedIntent ? group.interpretedIntent.replace(/_/g, " ") : "No intent recognised"}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-600">{FAILURE_LABEL[group.failureType] ?? group.failureType}</p>
                    <p className="mt-1.5 text-sm text-gray-500">{FAILURE_HINT[group.failureType]}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <span className="rounded-full bg-wsa-navy px-2.5 py-0.5 font-medium text-white">{group.count}</span>
                    {group.unreviewed > 0 && (
                      <span className="flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-4 w-4" aria-hidden /> {group.unreviewed} unreviewed
                      </span>
                    )}
                    {group.routerVersions.length > 1 && (
                      <span className="text-gray-500">seen under {group.routerVersions.join(", ")}</span>
                    )}
                    {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" aria-hidden /> : <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden />}
                  </div>
                </button>
                {expanded && (
                  <ul className="divide-y divide-wsa-navy/10 border-t border-wsa-navy/10">
                    {group.examples.map(e => (
                      <li key={e.id} className="p-4">
                        <p className="text-base text-wsa-navy">“{e.requestText}”</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {new Date(e.createdAt).toLocaleString("en-GB")} · router {e.routerVersion}
                          {e.originalWorkerId && ` · sent to ${e.originalWorkerId}`}
                          {e.correctedWorkerId && ` · staff said ${e.correctedWorkerId}`}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {OUTCOMES.map(o => (
                            <button
                              key={o.id}
                              type="button"
                              disabled={review.isPending}
                              onClick={() => review.mutate({ token, gapId: e.id, outcome: o.id })}
                              className="rounded-lg border border-wsa-navy/20 px-3 py-1.5 text-sm text-wsa-navy hover:border-wsa-red hover:text-wsa-red disabled:opacity-40"
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
