import { useState } from "react";
import { AlertTriangle, Info, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

/**
 * Does this read like a machine wrote it?
 *
 * Runs the same quality gate that governs anything a WSA worker would
 * release, so staff drafting by hand are held to the standard the workers
 * will be. There is no model behind it: the checks are deterministic
 * patterns, which is exactly why it can be blunt about an em dash without
 * ever being wrong about one.
 *
 * Blocking findings are the ones that make writing unsafe or unusable —
 * a guarantee WSA cannot make, or the em dash the house style forbids.
 * Everything else is advisory: overstructure, bullet spam, corporate
 * filler, the formulaic "not X, but Y". Advice, not law.
 */
export function ContentCheckPanel({ token }: { token: string }) {
  const [text, setText] = useState("");
  const check = trpc.workforce.contentCheck.useMutation();

  const blocking = check.data?.findings.filter(f => f.severity === "blocking") ?? [];
  const advisory = check.data?.findings.filter(f => f.severity === "advisory") ?? [];

  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-sm text-gray-600">
        Paste anything before it goes out. It looks for the tells of machine-written prose: em dashes, guarantee
        language, corporate filler, relentless bullets and headings, and paragraphs that all run to one sentence.
        The same gate applies to the AI workers, so this is the standard either way.
      </p>

      <label htmlFor="content-check" className="sr-only">Text to check</label>
      <textarea
        id="content-check"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={10}
        maxLength={20000}
        placeholder="Paste a draft email, post or letter…"
        className="w-full rounded-md border border-wsa-navy/20 p-3 text-sm focus:border-wsa-red focus:outline-none"
      />

      <div className="mt-3 flex items-center gap-3">
        <Button
          onClick={() => check.mutate({ token, text })}
          disabled={text.trim().length === 0 || check.isPending}
          className="bg-wsa-red hover:bg-wsa-red/90"
        >
          {check.isPending ? "Checking…" : "Check it"}
        </Button>
        <span className="text-xs text-gray-400">{text.length} / 20000</span>
      </div>

      {check.error && <p className="mt-4 text-sm text-red-600">Could not run the check.</p>}

      {check.data && (
        <div className="mt-6">
          {check.data.passed && blocking.length === 0 && advisory.length === 0 && (
            <p className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              <ThumbsUp className="h-4 w-4 shrink-0" aria-hidden />
              Nothing flagged. This reads like a person wrote it.
            </p>
          )}

          {blocking.length > 0 && (
            <section className="mb-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-800">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Fix before sending ({blocking.length})
              </h3>
              <ul className="space-y-1.5">
                {blocking.map((f, i) => (
                  <li key={i} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                    {f.detail}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {advisory.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <Info className="h-4 w-4" aria-hidden />
                Worth a look ({advisory.length})
              </h3>
              <ul className="space-y-1.5">
                {advisory.map((f, i) => (
                  <li key={i} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {f.detail}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
