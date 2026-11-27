import { useState, type ReactNode } from "react";
import LamangoContact from "@/components/LamangoContact";
import PipedriveFormEmbed from "@/components/PipedriveFormEmbed";
import {
  CAMEROON_FLAG_SRC,
  COPY,
  LAMANGO_FORM_URL,
  LANGS,
  type Lang,
  type LamangoCopy,
} from "@/lib/speakToLamango";

/**
 * Parlez à Lamango / Speak to Lamango. Laid out as Pedro's page is: the two
 * languages side by side on a large screen, and on a phone a switch that
 * chooses one while the other stays in the page. French first, as on Tim
 * Hunt's form. A first draft: see client/src/lib/speakToLamango.ts for what
 * is still to come from Tim.
 */

const FORM_ID = "register";

function Bilingual({
  lang,
  render,
}: {
  lang: Lang;
  render: (c: LamangoCopy) => ReactNode;
}) {
  return (
    <div className="grid gap-x-12 gap-y-6 lg:grid-cols-2">
      {LANGS.map(l => (
        <div
          key={l}
          lang={COPY[l].htmlLang}
          className={`min-w-0 ${l === lang ? "" : "hidden lg:block"}`}
        >
          {render(COPY[l])}
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl font-bold tracking-tight text-wsa-navy">
      {children}
    </h2>
  );
}

export default function SpeakToLamango() {
  const [lang, setLang] = useState<Lang>("fr");

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
        <div
          className="flex justify-end lg:hidden"
          role="group"
          aria-label="Langue / Language"
        >
          {LANGS.map((l, i) => (
            <span key={l} className="flex items-center">
              {i > 0 && (
                <span className="px-2 text-gray-400" aria-hidden>
                  /
                </span>
              )}
              <button
                type="button"
                lang={COPY[l].htmlLang}
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={`text-sm font-semibold uppercase tracking-wider ${
                  lang === l
                    ? "text-emerald-700 underline underline-offset-4"
                    : "text-gray-500 hover:text-wsa-navy"
                }`}
              >
                {COPY[l].switchLabel}
              </button>
            </span>
          ))}
        </div>

        {/* Hero. No photograph yet: Tim has not sent one. */}
        <section className="mt-4 border-b border-wsa-navy/10 pb-10 lg:mt-0">
          <Bilingual
            lang={lang}
            render={c => (
              <>
                <p className="flex items-center gap-2 text-sm text-gray-700">
                  <img
                    src={CAMEROON_FLAG_SRC}
                    alt=""
                    width={28}
                    height={21}
                    className="h-[1.05rem] w-7 shrink-0 rounded-[2px] border border-black/10 object-cover"
                  />
                  {c.hero.eyebrow}
                </p>
                <h1 className="mt-1 text-4xl font-bold tracking-tight text-wsa-navy">
                  {c.hero.headline}
                </h1>
                <p className="mt-2 text-base font-medium text-gray-800">
                  {c.hero.role}
                </p>
                <div className="mt-4 space-y-3">
                  {c.hero.intro.map(p => (
                    <p
                      key={p.slice(0, 30)}
                      className="text-base leading-relaxed text-gray-700"
                    >
                      {p}
                    </p>
                  ))}
                </div>
                <p className="mt-4 text-base font-semibold text-wsa-navy">
                  {c.hero.freeLine}
                </p>
                <a
                  href={`#${FORM_ID}`}
                  className="mt-3 inline-block font-semibold text-emerald-700 underline-offset-2 hover:underline"
                >
                  {c.hero.cta}
                </a>
              </>
            )}
          />
        </section>

        <section className="border-b border-wsa-navy/10 py-10">
          <Bilingual
            lang={lang}
            render={c => (
              <>
                <SectionHeading>{c.help.heading}</SectionHeading>
                <ul className="mt-4 space-y-3">
                  {c.help.items.map(item => (
                    <li
                      key={item.title}
                      className="rounded-xl bg-sky-50 px-4 py-3"
                    >
                      <h3 className="text-base font-semibold text-wsa-navy">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[15px] leading-relaxed text-gray-700">
                        {item.body}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <SectionHeading>{c.destinations.heading}</SectionHeading>
                  <p className="mt-2 text-base leading-relaxed text-gray-800">
                    {c.destinations.list.join(" • ")}
                  </p>
                </div>
              </>
            )}
          />
        </section>

        {/* Tim's own bilingual Pipedrive form, exactly as supplied. */}
        <section id={FORM_ID} className="scroll-mt-24 pt-10">
          <Bilingual
            lang={lang}
            render={c => (
              <>
                <SectionHeading>{c.form.heading}</SectionHeading>
                <p className="mt-1 text-base text-gray-700">
                  {c.form.supporting}
                </p>
              </>
            )}
          />
          <PipedriveFormEmbed embedUrl={LAMANGO_FORM_URL} className="mt-6" />
          <div className="mt-3">
            <Bilingual
              lang={lang}
              render={c => (
                <p className="text-xs leading-relaxed text-gray-500">
                  {c.form.privacy}
                </p>
              )}
            />
          </div>
        </section>

        <div className="mt-10">
          <LamangoContact />
        </div>
      </div>
    </div>
  );
}
