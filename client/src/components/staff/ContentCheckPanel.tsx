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
 * Each finding is shown as a card carrying four things: what is wrong,
 * the controlled rule it breaches, what to do instead, and the offending
 * text itself. The last two are what make it usable. A panel that says
 * "an em dash was found" leaves the writer hunting through their own
 * draft and guessing at the fix; one that quotes the sentence and says
 * "use a comma, a full stop, or brackets" is finished advice.
 *
 * Blocking findings are the ones that make writing unsafe or unusable: a
 * guarantee WSA cannot make, or the em dash the house style forbids.
 * Everything else is advisory. Advice, not law.
 */

type Finding = {
  code: string;
  severity: string;
  detail: string;
  rule: string;
  remedy: string;
  excerpt: string | null;
};

/** Turns a finding code into the short label on the card's badge line. */
function categoryLabel(code: string): string {
  return code.replace(/_/g, " ");
}

function FindingCard({ finding, blocking }: { finding: Finding; blocking: boolean }) {
  return (
    <li
      className={`border-l-2 bg-white p-4 ${
        blocking ? "border-wsa-red" : "border-gray-300"
      }`}
    >
      <p className="text-sm leading-relaxed text-wsa-navy">
        <span
          className={`mr-2 inline-block px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider ${
            blocking ? "bg-wsa-red/10 text-wsa-red" : "bg-gray-100 text-gray-600"
          }`}
        >
          {blocking ? "Must fix" : "Consider"}
        </span>
        <span className="font-semibold">{categoryLabel(finding.code)}</span>
        <span className="text-gray-500">: {finding.detail}</span>
      </p>

      <p className="mt-2 text-sm leading-relaxed text-gray-700">{finding.remedy}</p>

      {finding.excerpt && (
        <pre className="mt-2.5 overflow-x-auto whitespace-pre-wrap break-words bg-gray-50 p-2.5 font-mono text-xs leading-relaxed text-gray-700">
          {finding.excerpt}
        </pre>
      )}

      <p className="mt-2 text-xs text-gray-400">{finding.rule}</p>
    </li>
  );
}

export function ContentCheckPanel({ token }: { token: string }) {
  const [text, setText] = useState("");
  const check = trpc.workforce.contentCheck.useMutation();

  const findings = (check.data?.findings ?? []) as Finding[];
  const blocking = findings.filter(f => f.severity === "blocking");
  const advisory = findings.filter(f => f.severity === "advisory");
  const checkedText = check.data ? text : null;

  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-sm leading-relaxed text-gray-600">
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
        className="w-full border border-wsa-navy/20 p-3 text-sm focus:border-wsa-red focus:outline-none"
      />

      <div className="mt-3 flex items-center gap-3">
        <Button
          onClick={() => check.mutate({ token, text })}
          disabled={text.trim().length === 0 || check.isPending}
          className="bg-wsa-red text-white hover:bg-wsa-red/90"
        >
          {check.isPending ? "Checking…" : "Check the writing"}
        </Button>
        <span className="text-xs text-gray-400">{text.length} characters</span>
      </div>

      {check.error && <p className="mt-4 text-sm text-red-600">Could not run the check.</p>}

      {check.data && (
        <div className="mt-6">
          {blocking.length > 0 && (
            <p className="mb-4 border-l-2 border-wsa-red bg-wsa-red/5 px-4 py-3 text-sm font-semibold text-wsa-red">
              {blocking.length === 1
                ? "1 thing must be fixed before this can go out."
                : `${blocking.length} things must be fixed before this can go out.`}
            </p>
          )}

          {blocking.length === 0 && advisory.length === 0 && (
            <p className="flex items-center gap-2 border-l-2 border-green-600 bg-green-50 px-4 py-3 text-sm text-green-900">
              <ThumbsUp className="h-4 w-4 shrink-0" aria-hidden />
              Nothing flagged. This reads like a person wrote it.
            </p>
          )}

          {blocking.length === 0 && advisory.length > 0 && (
            <p className="mb-4 border-l-2 border-green-600 bg-green-50 px-4 py-3 text-sm text-green-900">
              Nothing blocking. The notes below are worth a look but none of them stops this going out.
            </p>
          )}

          {blocking.length > 0 && (
            <section className="mb-6">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-wsa-navy">
                <AlertTriangle className="h-4 w-4 text-wsa-red" aria-hidden />
                Must fix ({blocking.length})
              </h3>
              <ul className="space-y-2">
                {blocking.map((f, i) => (
                  <FindingCard key={`${f.code}-${i}`} finding={f} blocking />
                ))}
              </ul>
            </section>
          )}

          {advisory.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-wsa-navy">
                <Info className="h-4 w-4 text-gray-400" aria-hidden />
                Worth a look ({advisory.length})
              </h3>
              <ul className="space-y-2">
                {advisory.map((f, i) => (
                  <FindingCard key={`${f.code}-${i}`} finding={f} blocking={false} />
                ))}
              </ul>
            </section>
          )}

          {checkedText !== text && (
            <p className="mt-4 text-xs text-gray-400">
              You have edited the text since this check ran. Check it again before relying on the result.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
