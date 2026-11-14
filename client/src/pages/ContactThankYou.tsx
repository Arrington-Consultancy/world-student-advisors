import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { whatsappHref } from "@/lib/advisorLandingPage";
import { FIRST_CONTACT, REGISTRATION_THANK_YOU as T, reportRegistrationConversionOnce } from "@/lib/registrationForm";

const WHATSAPP_GREEN = "#128C7E";

/**
 * Where Tim Hunt's Pipedrive Website Registration Form sends the student
 * after a successful submission (client/src/lib/registrationForm.ts). It
 * captures nothing: no form, no fields, no call to Pipedrive or this server.
 * The one thing it does beyond saying thank you is report the site's
 * established Google Ads conversion, once, for a fresh arrival, which the
 * website's own form used to report itself. Noindex and linked from nowhere,
 * so visiting the site cannot count as a registration.
 */
export default function ContactThankYou() {
  useEffect(() => {
    reportRegistrationConversionOnce();
  }, []);

  return (
    <main className="bg-wsa-warm-white pt-24 lg:pt-28">
      <section className="px-4 pb-14 pt-8 sm:px-6 lg:pb-20 lg:pt-12">
        <div className="mx-auto max-w-3xl">
          <p className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wider text-wsa-red">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-3.5 w-3.5" aria-hidden />
            </span>
            {T.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-wsa-navy sm:text-4xl lg:text-5xl">{T.headline}</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-700">{T.body}</p>

          <div className="mt-8 max-w-2xl border-t border-wsa-navy/10 pt-6">
            <p className="text-base font-semibold text-wsa-navy">{T.sooner}</p>
            <a
              href={whatsappHref(FIRST_CONTACT.whatsappDigits, T.whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ backgroundColor: WHATSAPP_GREEN }}
              className="mt-3.5 inline-flex min-h-[3rem] w-full items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy sm:w-auto"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              {T.whatsappCta}
            </a>
            <p className="mt-2 text-sm text-gray-600">{FIRST_CONTACT.whatsapp}</p>
          </div>

          <div className="mt-8 flex flex-col gap-2 text-base">
            <Link href="/student-support-library" className="inline-flex items-center gap-1.5 font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red">
              {T.library}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/student-success-stories" className="inline-flex items-center gap-1.5 font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red">
              {T.stories}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
