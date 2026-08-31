import { Database } from "lucide-react";
import { trpc, type RouterOutputs } from "@/lib/trpc";

type Worker = RouterOutputs["workforce"]["listWorkers"]["workers"][number];
type Register = RouterOutputs["workforce"]["socialBrain"]["registers"][number];
type Remembered = RouterOutputs["workforce"]["socialBrain"]["remembers"][number];
type Unreconciled = RouterOutputs["workforce"]["socialBrain"]["unreconciled"][number];
type Elsewhere = RouterOutputs["workforce"]["socialBrain"]["elsewhere"][number];

/**
 * WSA Social Media.
 *
 * The owner sits at the top, then what she is designed to remember, then
 * the Social Brain registers themselves, then what belongs to somebody
 * else.
 *
 * The last of those matters as much as the first. Staff will reasonably
 * expect a social memory to know what was spent; her controlled record
 * gives spend to Alex, so the page says so by name instead of leaving a
 * gap that reads like an oversight. And every count is zero, stated in
 * plain words rather than shown as an empty grid somebody would take for
 * a loading state — a memory that produced a confident answer about a
 * 2020 post, with nothing imported behind it, would be worse than one
 * that admits it cannot.
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

      <section className="mb-8">
        <h3 className="mb-3 text-lg font-semibold text-wsa-navy">What she is built to remember</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {brain.data.remembers.map((c: Remembered) => (
            <div key={c.question} className="rounded-lg border border-wsa-navy/10 bg-white p-4">
              <h4 className="font-semibold text-wsa-navy">{c.question}</h4>
              <p className="mt-1 text-sm text-gray-600">{c.answer}</p>
              <p className="mt-2 text-xs text-gray-400">{c.sources}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-semibold text-wsa-navy">The Social Brain</h3>
        <span className="text-xs text-gray-400">{brain.data.source}</span>
      </div>

      {!brain.data.populated && (
        <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p>{brain.data.emptyNote}</p>
          <p className="mt-1 text-xs text-amber-800">{brain.data.toPopulate}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {brain.data.registers.map((r: Register) => (
          <div key={r.id} className="rounded-lg border border-wsa-navy/10 bg-white p-4">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h4 className="font-semibold text-wsa-navy">
                <span className="mr-1.5 text-xs font-normal text-gray-400">§{r.section}</span>
                {r.name}
              </h4>
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
        {brain.data.authorityNote}
      </p>

      {brain.data.unreconciled.length > 0 && (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
          <h4 className="text-sm font-semibold text-amber-900">
            Where the Control Pack and her brief do not agree
          </h4>
          <p className="mt-1 text-xs text-amber-800">
            Two controlled records, two lists. Reconciling them is a records decision, not something this page settles.
          </p>
          <ul className="mt-2 space-y-1.5">
            {brain.data.unreconciled.map((u: Unreconciled) => (
              <li key={u.brief + u.pack} className="text-xs text-amber-900">
                <span className="font-medium">{u.brief}</span> vs <span className="font-medium">{u.pack}</span>
                <span className="text-amber-800">. {u.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 border-t border-wsa-navy/10 pt-6">
        <h3 className="mb-1 text-lg font-semibold text-wsa-navy">Not hers to answer</h3>
        <p className="mb-3 text-sm text-gray-600">
          Ask her these and she will point you at the right person rather than guess.
        </p>
        <ul className="space-y-3">
          {brain.data.elsewhere.map((e: Elsewhere) => (
            <li key={e.subject} className="rounded-lg border border-wsa-navy/10 bg-gray-50 p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-medium text-wsa-navy">{e.subject}</span>
                <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                  {e.owner}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{e.why}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
