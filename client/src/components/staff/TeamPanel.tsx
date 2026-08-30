import { trpc, type RouterOutputs } from "@/lib/trpc";

type Worker = RouterOutputs["workforce"]["listWorkers"]["workers"][number];

/**
 * Meet the AI team.
 *
 * A reference page, not a control surface. Staff do not come here to get
 * work done — the receptionist does that — they come to understand who
 * covers what. So it is a compact roster: name, remit, one line of
 * character, and an honest status.
 *
 * Status is the worker's real, current position from the controlled Worker
 * Register. Nothing here is softened: a worker that is not approved says
 * so, because a colleague deciding whether to rely on one needs the truth
 * more than they need the page to look finished.
 */
const STATUS_STYLE: Record<string, string> = {
  approved: "bg-green-50 text-green-800 border-green-200",
  approval_blocked: "bg-red-50 text-red-800 border-red-200",
  not_approved: "bg-gray-50 text-gray-600 border-gray-200",
  active: "bg-blue-50 text-blue-800 border-blue-200",
  infrastructure: "bg-blue-50 text-blue-800 border-blue-200",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  approval_blocked: "Approval blocked",
  not_approved: "In design",
  active: "Governance function",
  infrastructure: "Platform function",
};

export function TeamPanel({ token }: { token: string }) {
  const query = trpc.workforce.listWorkers.useQuery({ token });

  if (query.isLoading) return <p className="text-sm text-gray-500">Loading the team…</p>;
  if (query.error) return <p className="text-sm text-red-600">Could not load the team.</p>;
  if (!query.data) return null;

  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm text-gray-600">
        Who covers what. You do not need this page to get work done — ask reception and it will point you at the
        right specialist. This is here for when you want to know how the team is organised.
      </p>

      <div className="divide-y divide-wsa-navy/10 rounded-lg border border-wsa-navy/10 bg-white">
        {query.data.workers.map((w: Worker) => (
          <article key={w.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-baseline sm:gap-6">
            <div className="sm:w-56 sm:shrink-0">
              <h3 className="font-semibold text-wsa-navy">{w.canonicalName}</h3>
              <p className="text-xs text-gray-500">{w.roleTitle}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-700">{w.personality.whatFor}</p>
              <p className="mt-1 text-xs text-gray-500">
                <span className="font-medium">Not for:</span> {w.personality.whatNotFor}
              </p>
            </div>
            <span
              className={`shrink-0 self-start rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                STATUS_STYLE[w.specificationStatus] ?? STATUS_STYLE.not_approved
              }`}
            >
              {STATUS_LABEL[w.specificationStatus] ?? w.specificationStatus}
            </span>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Statuses come from the controlled WSA AI Worker Register. Approval is Tom Arrington's decision, recorded
        there — it is not something this portal can grant.
      </p>
    </div>
  );
}
