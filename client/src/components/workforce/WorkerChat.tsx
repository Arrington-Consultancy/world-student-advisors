import { useState, type FormEvent } from "react";
import { CornerDownLeft, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * A conversation with an approved worker.
 *
 * Rendered only where the register says the worker may execute, and that
 * is checked again on the server for every request. This component holds
 * no authority: it sends the worker id, what the staff member typed, and
 * an opaque conversation id, and shows what comes back. If it were
 * pointed at a worker that is not authorised, the server would refuse in
 * exactly the same way.
 *
 * WHAT THIS COMPONENT DELIBERATELY DOES NOT SEND.
 * It keeps a copy of the thread to draw on screen, and never posts it
 * back. Only the conversation id goes up, and the server rebuilds the
 * real transcript from turns it wrote itself. If the browser supplied the
 * history, anyone able to reach the endpoint could invent a prior answer
 * and use it to steer a worker outside its brief, and nothing downstream
 * could tell an invented turn from a real one. So what is drawn here is a
 * display copy, and the server's copy is the one that counts.
 *
 * A refusal is shown as plainly as an answer, and is NOT added to the
 * thread, because the server does not remember it either. The reasons
 * here are the ones a staff member can act on, and hiding them behind a
 * generic error would leave somebody guessing whether they lack
 * permission, the worker is unapproved, or the model was unreachable.
 */
interface Turn {
  role: "staff" | "worker";
  content: string;
  briefReference?: string | null;
}

export function WorkerChat({ token, workerId, workerName }: { token: string; workerId: string; workerName: string }) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const ask = trpc.workforce.ask.useMutation();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;

    ask.mutate(
      { token, workerId, request: trimmed, conversationId },
      {
        onSuccess: result => {
          // The thread only grows on an answer, matching what the server
          // stored. Showing a refused turn as part of the conversation
          // would imply the worker will remember it next time; it will not.
          if (result.outcome === "answered" && result.visibleText) {
            setTurns(prev => [
              ...prev,
              { role: "staff", content: trimmed },
              { role: "worker", content: result.visibleText as string, briefReference: result.briefReference },
            ]);
            if (result.conversationId) setConversationId(result.conversationId);
            setText("");
          }
        },
      },
    );
  };

  const result = ask.data;
  const showRefusal = result && result.outcome !== "answered";

  return (
    <div className="border-t border-wsa-navy/10 bg-white px-5 py-4">
      {turns.length > 0 && (
        <div className="mb-4 space-y-3">
          {turns.map((turn, i) =>
            turn.role === "staff" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-wsa-navy px-3.5 py-2.5 text-sm leading-relaxed text-white">
                  {turn.content}
                </p>
              </div>
            ) : (
              <div key={i} className="rounded-lg border border-wsa-navy/10 bg-wsa-stone/50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-wsa-navy">{turn.content}</p>
                {turn.briefReference && (
                  <p className="mt-3 flex items-start gap-1.5 border-t border-wsa-navy/10 pt-2.5 text-xs text-gray-500">
                    <FileText className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                    Answered under {turn.briefReference}
                  </p>
                )}
              </div>
            ),
          )}
        </div>
      )}

      <form onSubmit={submit}>
        <label htmlFor={`ask-${workerId}`} className="mb-1.5 block text-xs font-medium text-gray-600">
          {turns.length === 0 ? `Ask ${workerName}` : `Reply to ${workerName}`}
        </label>
        <div className="flex gap-2">
          <textarea
            id={`ask-${workerId}`}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder={
              turns.length === 0
                ? `Describe the enquiry for ${workerName}…`
                : `Reply to ${workerName}. She has this conversation so far.`
            }
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

      {showRefusal && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <p className="font-medium">{workerName} did not answer this.</p>
          <p className="mt-1 leading-relaxed">{result.reason}</p>
          {turns.length > 0 && (
            <p className="mt-2 text-xs text-amber-800">
              The conversation above is unchanged. {workerName} will not remember this message.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
