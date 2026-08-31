import { useState, type FormEvent } from "react";
import { CornerDownLeft, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Asking an approved worker to do something.
 *
 * Rendered only where the register says the worker may execute, and that
 * is checked again on the server for every request. This component holds
 * no authority: it sends the worker id and what the staff member typed,
 * and shows what comes back. If it were pointed at a worker that is not
 * authorised, the server would refuse in exactly the same way.
 *
 * A refusal is shown as plainly as an answer. The reasons here are the
 * ones a staff member can act on, and hiding them behind a generic error
 * would leave somebody guessing whether they lack permission, the worker
 * is unapproved, or the model was unreachable.
 */
export function WorkerChat({ token, workerId, workerName }: { token: string; workerId: string; workerName: string }) {
  const [text, setText] = useState("");
  const ask = trpc.workforce.ask.useMutation();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    ask.mutate({ token, workerId, request: trimmed });
  };

  const result = ask.data;

  return (
    <div className="border-t border-wsa-navy/10 bg-white px-5 py-4">
      <form onSubmit={submit}>
        <label htmlFor={`ask-${workerId}`} className="mb-1.5 block text-xs font-medium text-gray-600">
          Ask {workerName}
        </label>
        <div className="flex gap-2">
          <textarea
            id={`ask-${workerId}`}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder={`Describe the enquiry for ${workerName}…`}
            className="flex-1 rounded-lg border border-wsa-navy/20 p-2.5 text-sm focus:border-wsa-red focus:outline-none"
          />
          <button
            type="submit"
            disabled={text.trim().length === 0 || ask.isPending}
            className="h-fit shrink-0 rounded-lg bg-wsa-red px-4 py-2.5 text-sm font-medium text-white transition hover:bg-wsa-red/90 disabled:opacity-40"
          >
            {ask.isPending ? "Working…" : <span className="flex items-center gap-1.5">Send <CornerDownLeft className="h-3.5 w-3.5" aria-hidden /></span>}
          </button>
        </div>
      </form>

      {ask.error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Could not reach {workerName}. Try again in a moment.
        </p>
      )}

      {result && result.outcome !== "answered" && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <p className="font-medium">{workerName} did not answer this.</p>
          <p className="mt-1 leading-relaxed">{result.reason}</p>
        </div>
      )}

      {result?.outcome === "answered" && result.visibleText && (
        <div className="mt-3 rounded-lg border border-wsa-navy/10 bg-wsa-stone/50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-wsa-navy">{result.visibleText}</p>
          {result.briefReference && (
            <p className="mt-3 flex items-start gap-1.5 border-t border-wsa-navy/10 pt-2.5 text-xs text-gray-500">
              <FileText className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              Answered under {result.briefReference}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
