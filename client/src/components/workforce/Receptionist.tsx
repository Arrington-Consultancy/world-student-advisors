import { useState, type FormEvent } from "react";
import { ArrowRight, CircleCheck, CircleDashed, CornerDownLeft, Search } from "lucide-react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { WorkerChat } from "./WorkerChat";

type Worker = RouterOutputs["workforce"]["listWorkers"]["workers"][number];

/**
 * Reception: the front door.
 *
 * The previous version was an input, a button and a grey box, and it read
 * like a database form because that is what it was. Two things are
 * different here.
 *
 * It shows who it found, as a person. A name, a role, what they own and
 * whether they can take the work, laid out so the answer is legible at a
 * glance rather than as four lines of prose the reader has to parse.
 *
 * It is never a dead end. When nothing is identified, the whole team is
 * shown with what each owns, because "no controlled worker could be
 * confidently identified" is an accurate sentence and a useless screen. A
 * person who asked a reasonable question should leave knowing who to ask
 * next, not just that this box could not help.
 *
 * Ownership is still decided server-side and only server-side. This
 * renders what the register said and never picks a specialist itself.
 */

/**
 * Examples of real WSA work, not invented ones.
 *
 * The first version of this list asked "What English courses are available?".
 * WSA does not offer English courses. Tom caught it on the live homepage on
 * 11 September 2026, and it was the same fault as inventing a university
 * portal link: plausible, confident, and false about the business.
 *
 * These four are drawn from what WSA actually places students into, which
 * the public Study Options page states: A Levels, Foundation, International
 * Year One, Undergraduate, Pre-Master's and Top-Up, Master's and Doctoral,
 * Sport Pathways and Online Learning.
 *
 * Each was run through routeStaffRequest before being put here, because an
 * example that does not route is worse than no example: it is the first
 * thing a new staff member clicks. They reach James, Amelia, Harper and Nia
 * respectively. Two earlier candidates were dropped for failing that check,
 * not for reading badly.
 */
const EXAMPLES = [
  "Is this application ready to send?",
  "What are the entry requirements for a pre-master's?",
  "Is there any scholarship funding for this student?",
  "Write a social media post about the January intake",
];

function initials(name: string): string {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
}

export function Receptionist({ token }: { token: string }) {
  const [request, setRequest] = useState("");
  const [submitted, setSubmitted] = useState("");

  const routeQuery = trpc.workforce.route.useQuery(
    { token, request: submitted },
    { enabled: submitted.length > 0 },
  );
  const workers = trpc.workforce.listWorkers.useQuery({ token });

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRequest(trimmed);
    setSubmitted(trimmed);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(request);
  };

  const result = routeQuery.data;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="group relative rounded-2xl border border-wsa-navy/15 bg-white shadow-sm transition focus-within:border-wsa-red/60 focus-within:shadow-md">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <label htmlFor="reception-request" className="sr-only">
            Ask WSA what you need
          </label>
          <input
            id="reception-request"
            value={request}
            onChange={e => setRequest(e.target.value)}
            placeholder="Ask WSA what you need…"
            autoComplete="off"
            className="w-full bg-transparent py-4 pl-12 pr-32 text-base text-wsa-navy placeholder:text-gray-400 focus:outline-none sm:text-lg"
          />
          <button
            type="submit"
            disabled={request.trim().length === 0 || routeQuery.isFetching}
            className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-xl bg-wsa-red px-4 py-2.5 text-base font-medium text-white transition hover:bg-wsa-red/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {routeQuery.isFetching ? "Finding…" : "Ask"}
            {!routeQuery.isFetching && <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />}
          </button>
        </div>
        {/* Says what the box is for before somebody has to guess. The whole
            point of Reception is that staff do not need to know which
            specialist owns a job. */}
        <p className="mt-2 px-1 text-sm text-gray-500">
          Not sure who handles it? We will point you to the right place.
        </p>
      </form>

      {!result && !routeQuery.isFetching && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => ask(e)}
              className="rounded-full border border-wsa-navy/15 bg-white px-3.5 py-1.5 text-sm text-gray-600 transition hover:border-wsa-red/40 hover:text-wsa-navy"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {routeQuery.error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800">
          Reception could not be reached. Try again in a moment.
        </p>
      )}

      {result?.matched && (
        <article className="mt-6 overflow-hidden rounded-2xl border border-wsa-navy/12 bg-white shadow-sm">
          {/* What was asked, shown verbatim above the answer. The person
              already pressed Ask once, so this is a record of the handoff
              rather than a prompt to do it again. */}
          <p className="border-b border-wsa-navy/10 bg-wsa-warm-white px-5 py-3 text-sm text-gray-600">
            You asked: <span className="text-wsa-navy">“{submitted}”</span>
          </p>
          <div className="flex items-start gap-4 p-5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-wsa-navy text-base font-semibold text-white"
              aria-hidden
            >
              {initials(result.responsibleWorkerName ?? "")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h3 className="text-lg font-semibold leading-tight text-wsa-navy">
                  {result.responsibleWorkerName}
                </h3>
                {result.availability === "available" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-sm font-medium text-green-800">
                    <CircleCheck className="h-3 w-3" aria-hidden /> Available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-medium text-amber-800">
                    <CircleDashed className="h-3 w-3" aria-hidden /> Not yet available
                  </span>
                )}
              </div>
              <p className="mt-2 text-base leading-relaxed text-gray-700">{result.ownershipReason}</p>
              {result.blocker && (
                <p className="mt-3 rounded-lg bg-amber-50/70 px-3 py-2 text-sm leading-relaxed text-amber-900">
                  {result.blocker}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2.5 border-t border-wsa-navy/10 bg-wsa-stone/60 px-5 py-3.5">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-wsa-red" aria-hidden />
            <p className="text-base leading-relaxed text-wsa-navy">{result.safeNextAction}</p>
          </div>

          {/* Only where the register authorises execution. The server
              checks again on every request regardless of what renders. */}
          {result.availability === "available" && result.responsibleWorkerId && (
            <WorkerChat
              token={token}
              workerId={result.responsibleWorkerId}
              workerName={result.responsibleWorkerName?.split(",")[0] ?? "this specialist"}
              // The handoff. `submitted` is what the person typed, verbatim,
              // and is the same string the router was given. Reception used
              // to identify the right specialist and then hand over nothing,
              // so one Ask became two.
              //
              // This carries no case or student context. It is the request
              // text and nothing else, and workforce.ask re-resolves the
              // signed-in member's permissions on every call, so routing
              // cannot become a way to put anything in front of a worker
              // that this person could not reach directly.
              initialRequest={submitted}
            />
          )}
        </article>
      )}

      {result && !result.matched && (
        <div className="mt-6">
          <div className="rounded-2xl border border-wsa-navy/12 bg-white p-5">
            {/* "No one owns that yet" was a claim the software cannot
                currently support. Two different things reach this branch:
                the router genuinely established that no approved remit
                covers the request, and the router simply failed to
                recognise one. Today it cannot tell them apart, so it makes
                the weaker, true statement. The stronger wording, "No
                approved specialist owns this request", is reserved for
                when the router can actually establish that. Tom's point,
                11 September 2026: otherwise staff read a software failure
                as a gap in WSA's processes. */}
            <h3 className="text-base font-semibold text-wsa-navy">
              I could not confidently match that to a specialist
            </h3>
            <p className="mt-1.5 text-base leading-relaxed text-gray-700">{result.status}</p>
            <p className="mt-1.5 text-base leading-relaxed text-gray-600">{result.safeNextAction}</p>
          </div>

          {workers.data && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
                Who covers what, in case one of these is closer
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {workers.data.workers
                  .filter((w: Worker) => w.id !== "staff_receptionist" && w.id !== "wsa_governance_assurance")
                  .map((w: Worker) => (
                    <div
                      key={w.id}
                      className="rounded-xl border border-wsa-navy/10 bg-white px-4 py-3"
                    >
                      <p className="text-base font-medium text-wsa-navy">{w.canonicalName}</p>
                      <p className="text-sm text-gray-500">{w.roleTitle}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
