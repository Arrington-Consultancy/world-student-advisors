import { trpc } from "@/lib/trpc";
import { ExternalLink, BookOpen, Search, Inbox } from "lucide-react";
import { useState } from "react";

/**
 * Every university's application portal in one place, with the instructions
 * beside it.
 *
 * Tim Hunt asked for this on 11 September 2026. The thing a counsellor
 * actually does is "I need to get into X's portal, now, while a student is
 * on the phone", so the design is built around that: one row per
 * university, the portal link as the obvious target, the instructions one
 * tap away, and a filter box because a list of forty universities is not
 * scannable.
 *
 * Text is deliberately larger than the rest of the portal used to be. Staff
 * read this on a phone between calls, and the previous 14px body was too
 * small to scan at arm's length.
 *
 * The list is empty until Tim supplies it, and that is rendered as a
 * deliberate, explained state rather than a broken page. Nothing here
 * invents a university or constructs a URL: a counsellor clicks these while
 * a student waits, and a plausible wrong address is worse than a missing
 * one.
 */
export function UniversityPortalsPanel({ token }: { token: string }) {
  const query = trpc.workforce.resources.useQuery({ token }, { enabled: !!token });
  const [filter, setFilter] = useState("");

  if (query.isLoading) {
    return <p className="text-base text-gray-500">Loading university portals…</p>;
  }

  if (!query.data?.permitted) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-base leading-relaxed text-amber-900">
          {query.data?.reason ?? "University portals are not available for this account."}
        </p>
      </div>
    );
  }

  const { portals, provenance } = query.data.universityPortals;
  const needle = filter.trim().toLowerCase();
  const shown = needle === ""
    ? portals
    : portals.filter(p => p.university.toLowerCase().includes(needle));

  // No intro line here: the section header above already carries the
  // one-line description, and repeating it only pushes the useful part
  // further down the screen.
  return (
    <div className="space-y-5">
      {portals.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Find a university"
            aria-label="Find a university"
            className="w-full rounded-xl border border-wsa-navy/15 bg-white py-3.5 pl-12 pr-4 text-base text-wsa-navy placeholder:text-gray-400 focus:border-wsa-red focus:outline-none focus:ring-2 focus:ring-wsa-red/20"
          />
        </div>
      )}

      {portals.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-base font-semibold text-amber-900">
            <Inbox className="h-5 w-5 shrink-0" aria-hidden />
            {provenance.suppliedBy
              ? `Waiting for ${provenance.suppliedBy} to send the links`
              : "Waiting for the links"}
          </p>
          <p className="mt-2 text-base leading-relaxed text-amber-900">{provenance.awaiting}</p>
          {provenance.openQuestions.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-amber-800">Still to decide</p>
              <ul className="mt-2 space-y-1.5">
                {provenance.openQuestions.map((q, i) => (
                  <li key={i} className="text-base leading-relaxed text-amber-900">• {q}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-wsa-navy/10 bg-white p-5 text-base text-gray-600">
          No university matches “{filter}”.
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map(portal => (
            <li
              key={portal.university}
              className="rounded-xl border border-wsa-navy/10 bg-white p-5 transition-colors hover:border-wsa-navy/25"
            >
              <h3 className="text-lg font-semibold text-wsa-navy">{portal.university}</h3>
              {portal.note && (
                <p className="mt-1.5 text-base leading-relaxed text-gray-600">{portal.note}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {/* rel is not optional: these open an external site from a
                    page that holds a signed-in staff session. */}
                {portal.applicationPortal ? (
                  <a
                    href={portal.applicationPortal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-wsa-red px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-wsa-red/90"
                  >
                    <ExternalLink className="h-5 w-5" aria-hidden />
                    Open application portal
                  </a>
                ) : (
                  <span className="inline-flex min-h-[48px] items-center rounded-lg border border-dashed border-gray-300 px-5 py-3 text-base text-gray-500">
                    Portal link not supplied yet
                  </span>
                )}

                {portal.instructions ? (
                  <a
                    href={portal.instructions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-wsa-navy/20 px-5 py-3 text-base font-semibold text-wsa-navy transition-colors hover:border-wsa-red hover:text-wsa-red"
                  >
                    <BookOpen className="h-5 w-5" aria-hidden />
                    How to use it
                  </a>
                ) : (
                  <span className="inline-flex min-h-[48px] items-center rounded-lg border border-dashed border-gray-300 px-5 py-3 text-base text-gray-500">
                    Instructions not supplied yet
                  </span>
                )}
              </div>

              {portal.lastChecked && (
                <p className="mt-3 text-sm text-gray-500">Links last checked {portal.lastChecked}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
