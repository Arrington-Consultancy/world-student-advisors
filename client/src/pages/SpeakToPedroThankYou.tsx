import { Mail, Phone } from "lucide-react";
import { Link } from "wouter";
import { COPY, PAGE_PATH, PEDRO, STORIES_PATHS } from "@/lib/speakToPedro";

const LINK =
  "font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red";

/**
 * Where Pedro's Pipedrive form can send a family once they have submitted
 * it (client/src/lib/speakToPedro.ts, THANK_YOU_PATH, for why it exists).
 *
 * Both languages are always shown, English first then Portuguese, side by
 * side on a large screen as on Pedro's page. There is no language switch:
 * the page is three lines long, and a family arriving from the form should
 * not have to choose again. Pedro's number and email follow once, as at the
 * foot of his page. Noindex, linked from nowhere.
 */
export default function SpeakToPedroThankYou() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
        <section className="grid gap-x-12 gap-y-10 py-8 lg:grid-cols-2 lg:py-12">
          {(["en", "pt"] as const).map(l => {
            const c = COPY[l];
            const Heading = l === "en" ? "h1" : "h2";
            return (
              <div
                key={l}
                lang={c.htmlLang}
                className="flex min-w-0 flex-col items-start gap-4"
              >
                <Heading className="text-3xl font-bold leading-tight tracking-tight text-wsa-navy sm:text-4xl">
                  {c.thankYou.headline}
                </Heading>
                <span className="block h-1 w-12 bg-wsa-red" aria-hidden />
                <p className="text-lg leading-relaxed text-gray-800">
                  {c.thankYou.body}
                </p>
                <div className="flex flex-col gap-2 text-base">
                  <Link href={PAGE_PATH} className={LINK}>
                    {c.thankYou.back}
                  </Link>
                  <Link href={STORIES_PATHS.angola} className={LINK}>
                    {c.stories.angolaLink}
                  </Link>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-wsa-navy/10 p-5">
          <div className="grid gap-x-12 gap-y-1 lg:grid-cols-2">
            {(["en", "pt"] as const).map(l => (
              <p
                key={l}
                lang={COPY[l].htmlLang}
                className="text-sm font-semibold uppercase tracking-wider text-gray-600"
              >
                {COPY[l].contactLabel}
              </p>
            ))}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg font-semibold text-wsa-navy">
            <a
              href={PEDRO.phoneHref}
              className="inline-flex items-center gap-2 hover:text-wsa-red"
            >
              <Phone className="h-5 w-5" aria-hidden />
              {PEDRO.phone}
            </a>
            <a
              href={`mailto:${PEDRO.email}`}
              className="inline-flex items-center gap-2 hover:text-wsa-red"
            >
              <Mail className="h-5 w-5" aria-hidden />
              {PEDRO.email}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
