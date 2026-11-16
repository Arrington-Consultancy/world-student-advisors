import { useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ReadFirstNotice as Notice } from "@/lib/advisorLandingPage";

/**
 * "Please read this before contacting ...": a box with one button per
 * language, placed beside a contact point. A button opens the notice in that
 * language, full screen on a phone and as a panel on a larger screen, with
 * the other languages a tap away. Nothing opens by itself: Tom Arrington
 * chose buttons over an automatic pop-up on 6 November 2026, because Google
 * ranks phone pages lower when a pop-up covers them on arrival.
 *
 * The notice is the same wherever its box appears, so the page can offer it
 * in several places (Tim Hunt, 5 November 2026: "so they don't miss it").
 */
export default function ReadFirstNotice({
  notice,
  tone = "light",
  className = "",
}: {
  notice: Notice;
  /** "dark" for the navy closing section. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const body = useRef<HTMLDivElement | null>(null);
  const version = notice.versions[index] ?? notice.versions[0];
  const dark = tone === "dark";

  const show = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  /** Another language starts at its own beginning, not where the last one was left. */
  const switchTo = (i: number) => {
    setIndex(i);
    body.current?.scrollTo({ top: 0 });
  };

  return (
    <div
      data-read-first
      className={`rounded-2xl border-2 px-4 py-3.5 ${dark ? "border-amber-300/70 bg-white/10" : "border-amber-400 bg-amber-50"} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Info className={`mt-0.5 h-5 w-5 shrink-0 ${dark ? "text-amber-300" : "text-amber-700"}`} aria-hidden />
        <div className="min-w-0 leading-snug">
          {notice.versions.map((v, i) => (
            <p
              key={v.lang}
              lang={v.lang}
              className={`${i === 0 ? "text-base font-semibold" : "mt-0.5 text-sm font-medium"} ${dark ? "text-white" : "text-wsa-navy"}`}
            >
              {v.heading}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {notice.versions.map((v, i) => (
          <button
            key={v.lang}
            type="button"
            lang={v.lang}
            onClick={() => show(i)}
            className={`inline-flex min-h-[2.75rem] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-w-[8rem] ${
              dark
                ? "bg-white text-wsa-navy hover:bg-amber-50 focus-visible:outline-white"
                : "bg-wsa-navy text-white hover:opacity-90 focus-visible:outline-wsa-navy"
            }`}
          >
            {v.language}
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          // z-[110]: above the cookie banner (z-[100]), which would otherwise
          // cover the Close button on a phone on a first visit.
          className="z-[110] flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 rounded-none border-0 bg-white p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:border"
        >
          <div className="flex items-center justify-between gap-3 border-b border-wsa-navy/10 px-4 py-3">
            <div role="group" aria-label="Language" className="flex flex-wrap gap-2">
              {notice.versions.map((v, i) => (
                <button
                  key={v.lang}
                  type="button"
                  lang={v.lang}
                  aria-pressed={i === index}
                  onClick={() => switchTo(i)}
                  className={`min-h-[2.5rem] rounded-lg px-3.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy ${
                    i === index ? "bg-wsa-navy text-white" : "border border-wsa-navy/20 text-wsa-navy hover:border-wsa-navy"
                  }`}
                >
                  {v.language}
                </button>
              ))}
            </div>
            <DialogClose className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-wsa-navy transition hover:bg-wsa-navy/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wsa-navy">
              <X className="h-5 w-5" aria-hidden />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div ref={body} lang={version.lang} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <DialogTitle className="text-xl font-bold leading-snug text-wsa-navy sm:text-2xl">{version.heading}</DialogTitle>
            <p className="mt-3 text-base leading-relaxed text-gray-800">{version.intro}</p>
            <ol className="mt-5 space-y-4">
              {version.points.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wsa-navy text-sm font-semibold text-white">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-base leading-relaxed text-gray-800">{p.body}</p>
                    {p.costs && (
                      <ul className="mt-2 space-y-1.5 border-l-2 border-amber-400 pl-3">
                        {p.costs.map(c => (
                          <li key={c} className="text-base leading-relaxed text-gray-800">{c}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-base font-semibold leading-relaxed text-wsa-navy">{version.closing}</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{version.note}</p>
            {version.signOff && <p className="mt-4 text-base font-semibold text-wsa-navy">{version.signOff}</p>}
          </div>

          <div
            className="border-t border-wsa-navy/10 px-4 pt-3"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <DialogClose className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl bg-wsa-navy px-6 text-base font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy">
              Close
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
