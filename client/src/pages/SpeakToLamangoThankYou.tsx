import { Link } from "wouter";
import LamangoContact from "@/components/LamangoContact";
import { COPY, LANGS, PAGE_PATH } from "@/lib/speakToLamango";

/**
 * Where Lamango's Pipedrive form can send a student once they have submitted
 * it. Both languages, French first, with no switch: the page is three lines
 * long. Built with her page so the form never has to borrow another
 * counsellor's thank-you page, as Pedro's did. Noindex, linked from nowhere.
 */
export default function SpeakToLamangoThankYou() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
        <section className="grid gap-x-12 gap-y-10 py-8 lg:grid-cols-2 lg:py-12">
          {LANGS.map(l => {
            const c = COPY[l];
            const Heading = l === "fr" ? "h1" : "h2";
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
                <Link
                  href={PAGE_PATH}
                  className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red"
                >
                  {c.thankYou.back}
                </Link>
              </div>
            );
          })}
        </section>
        <LamangoContact />
      </div>
    </main>
  );
}
