import { Link } from "wouter";
import { Check, Mail, MessageCircle } from "lucide-react";
import { FREE_SERVICE_LINE, whatsappHref, type AdvisorLandingContent } from "@/lib/advisorLandingPage";

const WHATSAPP_GREEN = "#128C7E";

/**
 * Where a country representative's Pipedrive form sends the student after a
 * successful submission, on Speak to Juliet's thank-you design.
 *
 * It captures nothing: no form, no fields, no call to Pipedrive or to this
 * server. Pipedrive is the source of the lead and sends the student's
 * acknowledgement. Unlike Juliet's thank-you page it reports no Google Ads or
 * Meta conversion: none was asked for, and a conversion on a page that is not
 * an advertising destination would only add noise to the campaigns that
 * count them. Adding one is a decision for Tom Arrington.
 */
export default function AdvisorThankYouPage({ content }: { content: AdvisorLandingContent }) {
  const { advisor, thankYou } = content;

  return (
    <main className="bg-wsa-warm-white pt-24 lg:pt-28">
      <section className="px-4 pb-14 pt-8 sm:px-6 lg:pb-20 lg:pt-12">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_minmax(260px,320px)] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <p className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wider text-wsa-red">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
              {thankYou.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-wsa-navy sm:text-4xl lg:text-5xl">{thankYou.headline}</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-700">{thankYou.body}</p>
            <p className="mt-3 text-base font-medium text-wsa-navy">{FREE_SERVICE_LINE}</p>

            <div className="mt-8 max-w-2xl border-t border-wsa-navy/10 pt-6">
              <p className="text-base font-semibold text-wsa-navy">{thankYou.sooner}</p>
              <div className="mt-3.5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a
                  href={whatsappHref(advisor.whatsappDigits ?? "", thankYou.whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ backgroundColor: WHATSAPP_GREEN }}
                  className="inline-flex min-h-[3rem] items-center justify-center gap-2.5 whitespace-nowrap rounded-xl px-6 py-3.5 text-base font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden />
                  {thankYou.whatsappCta}
                </a>
                <a
                  href={`mailto:${advisor.email}`}
                  className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-2 border-wsa-navy/15 bg-white px-5 py-3 text-base font-semibold text-wsa-navy transition hover:border-wsa-navy"
                >
                  <Mail className="h-5 w-5" aria-hidden />
                  <span className="break-all text-sm sm:text-base">{advisor.email}</span>
                </a>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2 text-base sm:flex-row sm:flex-wrap sm:gap-x-6">
              <Link href={content.path} className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red">{thankYou.back}</Link>
              <Link href="/student-support-library" className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red">{thankYou.library}</Link>
            </div>
          </div>

          <figure className="mx-auto w-full max-w-[280px] min-w-0">
            <img
              src={advisor.photo}
              alt={advisor.photoAlt}
              width={advisor.photoWidth}
              height={advisor.photoHeight}
              decoding="async"
              className="block aspect-[3/4] w-full rounded-2xl border border-wsa-navy/10 bg-wsa-stone object-cover object-top shadow-sm"
            />
            <figcaption className="mt-3 text-center leading-snug lg:text-left">
              <span className="block text-base font-semibold text-wsa-navy">{advisor.name}</span>
              <span className="block text-sm text-gray-700">{advisor.role}</span>
              <span className="block text-sm text-gray-700">{advisor.organisation}</span>
              <span className="block text-sm text-gray-500">{advisor.location}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-t border-wsa-navy/10 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
          <Link href="/" className="underline underline-offset-2 hover:text-wsa-navy">World Student Advisors</Link>
          <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-wsa-navy">Privacy policy</Link>
        </div>
      </section>
    </main>
  );
}
