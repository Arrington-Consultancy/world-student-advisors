import { Database } from "lucide-react";
import { trpc, type RouterOutputs } from "@/lib/trpc";

type Worker = RouterOutputs["workforce"]["listWorkers"]["workers"][number];
type Register = RouterOutputs["workforce"]["socialBrain"]["registers"][number];

/**
 * WSA Social Media.
 *
 * The owner sits at the top, then the Social Brain: the registers that
 * hold WSA's social memory.
 *
 * Every count is zero, and the page says so in plain words rather than
 * showing an empty grid and letting somebody assume the data is loading.
 * That honesty is the whole point of the page. A social memory that
 * claimed to recall a 2020 post, when nothing has been imported, would
 * produce a confident answer with nothing behind it — and a confident
 * wrong answer about what worked is worse than no answer, because
 * somebody would act on it.
 */
export function SocialMediaPanel({ token }: { token: string }) {
  const brain = trpc.workforce.socialBrain.useQuery({ token });
  const workers = trpc.workforce.listWorkers.useQuery({ token });

  if (brain.isLoading || workers.isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (brain.error || workers.error) return <p className="text-sm text-red-600">Could not load the social area.</p>;
  if (!brain.data || !workers.data) return null;

  const owner: Worker | undefined = workers.data.workers.find((w: Worker) => w.id === brain.data.ownerWorkerId);

  return (
    <div>
      {owner && (
        <section className="mb-8 rounded-lg border border-wsa-navy/10 bg-white p-5">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-wsa-navy/5 text-xl font-semibold text-wsa-navy"
              aria-hidden
            >
              {owner.canonicalName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-xl font-semibold text-wsa-navy">{owner.canonicalName}</h2>
                <span className="text-sm text-gray-500">{owner.roleTitle}</span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                  Not approved, no publishing authority
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{owner.personality.summary}</p>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium">For:</span> {owner.personality.whatFor}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                <span className="font-medium">Not for:</span> {owner.personality.whatNotFor}
              </p>
            </div>
          </div>

          {owner.materialBlockers.length > 0 && (
            <div className="mt-4 border-t border-wsa-navy/5 pt-3">
              <p className="mb-1 text-xs font-medium text-gray-700">Before she can act:</p>
              <ul className="space-y-0.5">
                {owner.materialBlockers.map((b: string, i: number) => (
                  <li key={i} className="text-xs text-gray-500">{b}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-lg font-semibold text-wsa-navy">The Social Brain</h3>
        <span className="text-xs text-gray-400">{brain.data.controlPack}</span>
      </div>

      {!brain.data.populated && (
        <p className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {brain.data.emptyNote}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {brain.data.registers.map((r: Register) => (
          <div key={r.id} className="rounded-lg border border-wsa-navy/10 bg-white p-4">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h4 className="font-semibold text-wsa-navy">{r.name}</h4>
              <span className="shrink-0 text-xs text-gray-400">
                {r.recorded === 0 ? "nothing recorded" : `${r.recorded} recorded`}
              </span>
            </div>
            <p className="text-sm text-gray-600">{r.holds}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 flex items-start gap-2 text-xs text-gray-400">
        <Database className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        These registers are the design from the Social Brain Control Pack. Importing WSA's existing social history
        is a separate piece of work, and until it happens nothing here can be recalled.
      </p>
    </div>
  );
}
