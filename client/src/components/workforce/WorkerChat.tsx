import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CornerDownLeft, FileText, Paperclip, X, TriangleAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_DISCLAIMER,
  checkAttachment,
} from "@shared/attachments";

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
 * ATTACHMENTS. A file is sent with one question and is never stored. It is
 * not added to the display thread either, because the server does not keep
 * it and a paperclip sitting in the transcript would suggest the worker can
 * still see it on the next turn. The disclaimer is shown as soon as a file
 * is chosen, before it can be sent, because a warning after the fact is not
 * a warning. Type and size are checked here for a quick answer and again on
 * the server, which is where the actual limit lives.
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

/** A file chosen but not yet sent. Held in memory only, never persisted. */
interface PickedFile {
  filename: string;
  mediaType: string;
  byteSize: number;
  /** Base64 without the data URI prefix, which is what the server expects. */
  data: string;
}

const MAX_FILES = 3;

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      // Strip "data:<type>;base64," so the server receives bare base64.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function readableSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WorkerChat({ token, workerId, workerName }: { token: string; workerId: string; workerName: string }) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const ask = trpc.workforce.ask.useMutation();

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    if (fileInput.current) fileInput.current.value = "";
    setFileError(null);

    const accepted: PickedFile[] = [];
    for (const file of chosen.slice(0, MAX_FILES - files.length)) {
      const check = checkAttachment({
        filename: file.name,
        mediaType: file.type,
        byteSize: file.size,
      });
      if (!check.ok) {
        setFileError(check.reason ?? "That file cannot be attached.");
        continue;
      }
      accepted.push({
        filename: file.name,
        mediaType: file.type,
        byteSize: file.size,
        data: await toBase64(file),
      });
    }
    if (accepted.length > 0) setFiles(prev => [...prev, ...accepted]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;

    ask.mutate(
      {
        token,
        workerId,
        request: trimmed,
        conversationId,
        attachments: files.length > 0 ? files : undefined,
      },
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
            // Cleared on the way out. The file went with that one question
            // and must not ride along with the next one.
            setFiles([]);
            setFileError(null);
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
          <div className="flex h-fit shrink-0 flex-col gap-2">
            <button
              type="submit"
              disabled={text.trim().length === 0 || ask.isPending}
              className="rounded-lg bg-wsa-red px-4 py-2.5 text-sm font-medium text-white transition hover:bg-wsa-red/90 disabled:opacity-40"
            >
              {ask.isPending ? "Working…" : <span className="flex items-center gap-1.5">Send <CornerDownLeft className="h-3.5 w-3.5" aria-hidden /></span>}
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={files.length >= MAX_FILES || ask.isPending}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-wsa-navy/20 px-4 py-2 text-sm text-wsa-navy transition hover:bg-wsa-stone/50 disabled:opacity-40"
            >
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              Attach
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              multiple
              onChange={pick}
              className="hidden"
              aria-label={`Attach a file for ${workerName} to examine`}
            />
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            <ul className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <li
                  key={`${file.filename}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-wsa-navy/15 bg-wsa-stone/40 py-1.5 pl-3 pr-1.5 text-xs text-wsa-navy"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="max-w-[16rem] truncate">{file.filename}</span>
                  <span className="text-gray-500">{readableSize(file.byteSize)}</span>
                  <button
                    type="button"
                    onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="rounded p-1 text-gray-500 transition hover:bg-wsa-navy/10 hover:text-wsa-navy"
                    aria-label={`Remove ${file.filename}`}
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>

            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{ATTACHMENT_DISCLAIMER}</span>
            </p>
          </div>
        )}

        {fileError && (
          <p className="mt-2 text-xs text-red-700">{fileError}</p>
        )}
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
