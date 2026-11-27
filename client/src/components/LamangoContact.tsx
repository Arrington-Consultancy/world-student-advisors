import { Mail, MessageCircle, Phone } from "lucide-react";
import { COPY, LAMANGO, LANGS } from "@/lib/speakToLamango";

/**
 * Lamango's office, number, WhatsApp and email, shown once under both
 * languages on her page and on her thank-you page.
 */
export default function LamangoContact() {
  return (
    <section className="rounded-2xl border border-wsa-navy/10 p-5">
      <div className="grid gap-x-12 gap-y-1 lg:grid-cols-2">
        {LANGS.map(l => (
          <p
            key={l}
            lang={COPY[l].htmlLang}
            className="text-sm font-semibold uppercase tracking-wider text-gray-600"
          >
            {COPY[l].contactLabel}
          </p>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-base font-semibold text-wsa-navy sm:text-lg">
        <a
          href={LAMANGO.phoneHref}
          className="inline-flex items-center gap-2 hover:text-wsa-red"
        >
          <Phone className="h-5 w-5 shrink-0" aria-hidden />
          {LAMANGO.phone}
        </a>
        <a
          href={LAMANGO.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-wsa-red"
        >
          <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
          {COPY.fr.whatsappLabel}
        </a>
        <a
          href={`mailto:${LAMANGO.email}`}
          className="inline-flex min-w-0 max-w-full items-center gap-2 hover:text-wsa-red"
        >
          <Mail className="h-5 w-5 shrink-0" aria-hidden />
          {/* A long address may wrap after the @ on a narrow phone. */}
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {LAMANGO.email.split("@")[0]}@<wbr />
            {LAMANGO.email.split("@")[1]}
          </span>
        </a>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        <span lang={COPY.fr.htmlLang}>{COPY.fr.officeLabel}</span>
        {" / "}
        <span lang={COPY.en.htmlLang}>{COPY.en.officeLabel}</span>
        {": "}
        {LAMANGO.address}
      </p>
    </section>
  );
}
