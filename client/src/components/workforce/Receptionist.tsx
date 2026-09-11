import { useState, type FormEvent } from "react";
import { ArrowRight, ChevronRight, CircleCheck, CircleDashed, CornerDownLeft, Lock, Search } from "lucide-react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { WorkerChat } from "./WorkerChat";

type Worker = RouterOutputs["workforce"]["listWorkers"]["workers"][number];

/**
 * Reception: the front door.
 *
 * It shows who it found, as a person. A name, a role, what they own and
 * whether they can take the work, laid out so the answer is legible at a
 * glance rather than as four lines of prose the reader has to parse.
 *
 * It is never a dead end. When nothing is identified, the whole team is
 * shown with what each owns, and every card a member of staff may reach is
 * a way in. Tom, 11 September 2026: this section should function as a
 * specialist directory, not static information.
 *
 * It never learns. "Wrong specialist?" records what the person said as
 * evidence about the router; it grants nothing, teaches nothing and
 * changes no remit. A correction is reviewed by a person.
 *
 * Ownership is still decided server-side and only server-side. This
 * renders what the register said and never picks a specialist itself, and
 * a directory card that opens a worker still meets the same server check
 * on the ask that follows as a routed request does.
 */

/**
 * Examples of real WSA work, not invented ones.
 *
 * Drawn from what WSA actually places students into, as the public Study
 * Options page states: A Levels, Foundation, International Year One,
 * Undergraduate, Pre-Master's and Top-Up, Master's and Doctoral, Sport
 * Pathways and Online Learning. Each was run through the router before
 * being put here, because an example that does not route is worse than no
 * example. They reach James, Amelia, Harper and Nia respectively.
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

const HIDDEN_FROM_DIRECTORY = new Set(["staff_receptionist", "wsa_governance_assurance", "wsa_core_brain"]);

/**
 * One card in the specialist directory.
 *
 * A worker this person can reach is a button: the whole card, with a
 * chevron so it reads as a door and not a label, a visible focus ring, and
 * a pointer. A worker they cannot reach, or that cannot take work today, is
 * rendered as a plain card with the reason, following the portal's existing
 * rule for hidden and disabled workers: visible so the team is legible,
 * inert so nobody is invited through a door the server will shut.
 */
function DirectoryCard({ worker, onOpen }: { worker: Worker; onOpen: (worker: Worker) => void }) {
  const reachable = worker.reachableByYou && worker.canOpenForLiveExecution;

  if (!reachable) {
    return (
      <div
        className="flex items-start justify-between gap-3 rounded-xl border border-dashed border-wsa-navy/15 bg-wsa-stone/40 px-4 py-3"
        aria-disabled="true"
      >
        <div className="min-w-0">
          <p className="text-base font-medium text-gray-600">{worker.canonicalName}</p>
          <p className="text-sm text-gray-500">{worker.roleTitle}</p>
          <p className="mt-1 text-sm text-gray-500">
            {!worker.canOpenForLiveExecution
              ? "Not yet available for live work."
              : "Not in your access. Ask Tom if you need this specialist."}
          </p>
        </div>
        <Lock className="mt-1 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(worker)}
      className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-wsa-navy/10 bg-white px-4 py-3 text-left transition hover:border-wsa-red/50 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-wsa-red/60 focus-visible:ring-offset-2"
    >
      <div className="min-w-0">
        <p className="text-base font-medium text-wsa-navy group-hover:text-wsa-red">{worker.canonicalName}</p>
        <p className="text-sm text-gray-500">{worker.roleTitle}</p>
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-wsa-red"
        aria-hidden
      />
    </button>
  );
}

export function Receptionist({ token }: { token: string }) {
  const [request, setRequest] = useState("");
  const [submitted, setSubmitted] = useState("");
  /** A specialist opened straight from the directory, bypassing nothing but the routing step. */
  const [direct, setDirect] = useState<Worker | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [corrected, setCorrected] = useState<string | null>(null);

  const routeQuery = trpc.workforce.route.useQuery(
    { token, request: submitted },
    { enabled: submitted.length > 0 },
  );
  const workers = trpc.workforce.listWorkers.useQuery({ token });
  const correct = trpc.workforce.routingCorrect.useMutation();

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRequest(trimmed);
    setSubmitted(trimmed);
    setDirect(null);
    setCorrecting(false);
    setCorrected(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(request);
  };

  const result = routeQuery.data;

  /**
   * The staff member says Reception got it wrong, and names who should have
   * had it. Two things happen. The correction is recorded as evidence, with
   * the router's original answer beside it. And the chosen specialist opens
   * with the same request, so one Ask is still one Ask.
   */
  const correctTo = (worker: Worker) => {
    correct.mutate({
      token,
      request: submitted,
      originalWorkerId: result?.responsibleWorkerId ?? null,
      correctedWorkerId: worker.id,
      gapId: result?.gapId ?? null,
    });
    setCorrected(worker.canonicalName);
    setCorrecting(false);
    setDirect(worker);
  };

  const directory = workers.data?.workers.filter((w: Worker) => !HIDDEN_FROM_DIRECTORY.has(w.id)) ?? [];

  const renderDirectory = (heading: string, onOpen: (w: Worker) => void) => (
    <div className="mt-5">
      <p className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">{heading}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {directory.map((w: Worker) => (
          <DirectoryCard key={w.id} worker={w} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );

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
        <p className="mt-2 px-1 text-sm text-gray-500">
          Not sure who handles it? We will point you to the right place.
        </p>
      </form>

      {!result && !routeQuery.isFetching && !direct && (
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

      {/* A specialist opened directly, from the directory or from a
          correction. Same card, same chat, same server checks. */}
      {direct && (
        <article className="mt-6 overflow-hidden rounded-2xl border border-wsa-navy/12 bg-white shadow-sm">
          {corrected && (
            <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
              Noted. You said this should have gone to {corrected}. That has been recorded so the routing can be reviewed.
            </p>
          )}
          {submitted && (
            <p className="border-b border-wsa-navy/10 bg-wsa-warm-white px-5 py-3 text-sm text-gray-600">
              You asked: <span className="text-wsa-navy">“{submitted}”</span>
            </p>
          )}
          <div className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-wsa-navy text-base font-semibold text-white" aria-hidden>
              {initials(direct.canonicalName)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold leading-tight text-wsa-navy">
                {direct.canonicalName}, WSA {direct.roleTitle} Specialist
              </h3>
              <p className="mt-2 text-base leading-relaxed text-gray-700">{direct.personality.whatFor}</p>
            </div>
          </div>
          <WorkerChat
            token={token}
            workerId={direct.id}
            workerName={direct.canonicalName}
            initialRequest={submitted || undefined}
          />
        </article>
      )}

      {result?.matched && !direct && (
        <article className="mt-6 overflow-hidden rounded-2xl border border-wsa-navy/12 bg-white shadow-sm">
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
              {/* The human gate. The subject is this worker's; the decision
                  is not. Shown before the chat so nobody reads an answer
                  that the worker is not allowed to give. */}
              {result.humanGate && (
                <p className="mt-3 rounded-lg bg-amber-50/70 px-3 py-2 text-sm leading-relaxed text-amber-900">
                  {result.humanGate}
                </p>
              )}
              {result.blocker && (
                <p className="mt-3 rounded-lg bg-amber-50/70 px-3 py-2 text-sm leading-relaxed text-amber-900">
                  {result.blocker}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start justify-between gap-2.5 border-t border-wsa-navy/10 bg-wsa-stone/60 px-5 py-3.5">
            <div className="flex items-start gap-2.5">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-wsa-red" aria-hidden />
              <p className="text-base leading-relaxed text-wsa-navy">{result.safeNextAction}</p>
            </div>
            <button
              type="button"
              onClick={() => setCorrecting(c => !c)}
              aria-expanded={correcting}
              className="shrink-0 text-sm text-gray-500 underline-offset-2 hover:text-wsa-red hover:underline"
            >
              Wrong specialist?
            </button>
          </div>

          {correcting && (
            <div className="border-t border-wsa-navy/10 px-5 pb-5">
              {renderDirectory("Who should have had it?", correctTo)}
            </div>
          )}

          {/* Only where the register authorises execution. The server
              checks again on every request regardless of what renders. */}
          {!correcting && result.availability === "available" && result.responsibleWorkerId && (
            <WorkerChat
              token={token}
              workerId={result.responsibleWorkerId}
              workerName={result.responsibleWorkerName?.split(",")[0] ?? "this specialist"}
              // The handoff. `submitted` is what the person typed, verbatim,
              // and is the same string the router was given. It carries no
              // case or student context, and workforce.ask re-resolves the
              // signed-in member's permissions on every call.
              initialRequest={submitted}
            />
          )}
        </article>
      )}

      {result && !result.matched && !direct && (
        <div className="mt-6">
          <div className="rounded-2xl border border-wsa-navy/12 bg-white p-5">
            {/* Two different things reach this branch and the router now
                says which. A recognised outcome nobody owns is stated as
                such, citing the record. A sentence the router could not
                read is stated as that, and only that. */}
            <h3 className="text-base font-semibold text-wsa-navy">
              {result.failure === "subject_without_approved_remit"
                ? "No approved specialist owns this"
                : result.failure === "remit_but_capability_closed" || result.failure === "remit_but_worker_inactive"
                  ? "The right specialist cannot take this at the moment"
                  : "I could not confidently match that to a specialist"}
            </h3>
            <p className="mt-1.5 text-base leading-relaxed text-gray-700">{result.status}</p>
            <p className="mt-1.5 text-base leading-relaxed text-gray-600">{result.safeNextAction}</p>
            <p className="mt-3 text-sm text-gray-500">
              This has been recorded. If you know a specialist who does own this, pick them below and that will be recorded too.
            </p>
          </div>

          {workers.data && renderDirectory("Who covers what. Pick one to send this to them.", correctTo)}
        </div>
      )}

      {/* The standing directory: a way in for staff who already know who
          they want. Shown when nothing else is on screen. */}
      {!result && !routeQuery.isFetching && !direct && workers.data && renderDirectory("Or go straight to a specialist", w => {
        setSubmitted("");
        setDirect(w);
      })}
    </div>
  );
}
