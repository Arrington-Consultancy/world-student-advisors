import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Mail, MessageCircle, Phone } from "lucide-react";
import PipedriveFormEmbed from "@/components/PipedriveFormEmbed";
import {
  CAMEROON_FLAG_SRC,
  COPY,
  DEFAULT_LANG,
  LAMANGO,
  LAMANGO_FORM_URL,
  LANGS,
  MANET_PHOTO,
  MAP,
  PORTRAIT,
  SUCCESS_STORIES_PATH,
  type Lang,
  type LamangoCopy,
} from "@/lib/speakToLamango";

/**
 * World Student Advisors Cameroon, Lamango's page, built to Tim Hunt's
 * mock-up of 28 November 2026. English on the left and French on the right
 * on a large screen, with the map, her portrait and Manet's photograph
 * between them, as he drew it. On a phone a switch chooses one language
 * and the other stays in the page. The wording is in
 * client/src/lib/speakToLamango.ts.
 */

const FORM_ID = "register";

/** One column per language on a large screen; on a phone, the chosen one. */
function langClass(l: Lang, lang: Lang) {
  return `min-w-0 ${l === lang ? "" : "hidden lg:block"}`;
}

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
        <div key={l} lang={COPY[l].htmlLang} className={langClass(l, lang)}>
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

function Region({ c }: { c: LamangoCopy }) {
  return (
    <>
      <h1 className="flex items-center gap-2 text-xl font-bold leading-snug tracking-tight text-wsa-navy">
        <img
          src={CAMEROON_FLAG_SRC}
          alt=""
          width={28}
          height={21}
          className="h-[1.05rem] w-7 shrink-0 rounded-[2px] border border-black/10 object-cover"
        />
        {c.region.title}
      </h1>
      <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-gray-600">
        {c.region.name}
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] leading-snug text-gray-800">
        {c.region.countries.map(country => (
          <li key={country}>{country}</li>
        ))}
      </ul>
    </>
  );
}

function Intro({ c }: { c: LamangoCopy }) {
  return (
    <>
      <div className="space-y-3">
        {c.intro.paragraphs.map(p => (
          <p
            key={p.slice(0, 30)}
            className="text-base leading-relaxed text-gray-700"
          >
            {p}
          </p>
        ))}
      </div>
      <a
        href={LAMANGO.whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-800 px-6 py-2.5 text-base font-bold text-white hover:bg-emerald-900"
      >
        <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
        {c.intro.whatsapp}
      </a>
    </>
  );
}

export default function SpeakToLamango() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [en, fr] = LANGS;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
        <div
          className="flex justify-end lg:hidden"
          role="group"
          aria-label="Language / Langue"
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

        {/* The region: its countries either side of Tim's map. */}
        <section className="mt-4 grid items-start gap-6 border-b border-wsa-navy/10 pb-10 lg:mt-0 lg:grid-cols-[1fr_2.4fr_1fr]">
          <div lang={COPY[en].htmlLang} className={langClass(en, lang)}>
            <Region c={COPY[en]} />
          </div>
          <img
            src={MAP.src}
            alt={COPY[lang].region.mapAlt}
            width={MAP.width}
            height={MAP.height}
            className="order-last h-auto w-full rounded-xl lg:order-none"
          />
          <div lang={COPY[fr].htmlLang} className={langClass(fr, lang)}>
            <Region c={COPY[fr]} />
          </div>
        </section>

        {/* Lamango: her portrait and details between the two languages. */}
        <section className="grid items-start gap-8 border-b border-wsa-navy/10 py-10 lg:grid-cols-[1fr_auto_1fr]">
          <div lang={COPY[en].htmlLang} className={langClass(en, lang)}>
            <Intro c={COPY[en]} />
          </div>
          <div className="order-first mx-auto w-full max-w-[16rem] text-center lg:order-none">
            <img
              src={PORTRAIT.src}
              alt={COPY[lang].intro.portraitAlt}
              width={PORTRAIT.width}
              height={PORTRAIT.height}
              className="h-auto w-full rounded-xl"
            />
            <p className="mt-3 text-base font-semibold text-wsa-navy">
              {LAMANGO.name}
            </p>
            <p className="mt-2 flex flex-col items-center gap-1.5 text-[15px] font-medium text-wsa-navy">
              <a
                href={LAMANGO.phoneHref}
                className="inline-flex items-center gap-2 hover:text-wsa-red"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                {LAMANGO.phone}
              </a>
              <a
                href={`mailto:${LAMANGO.email}`}
                className="inline-flex min-w-0 max-w-full items-start gap-2 hover:text-wsa-red"
              >
                <Mail className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                {/* A long address may wrap after the @. */}
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {LAMANGO.email.split("@")[0]}@<wbr />
                  {LAMANGO.email.split("@")[1]}
                </span>
              </a>
            </p>
          </div>
          <div lang={COPY[fr].htmlLang} className={langClass(fr, lang)}>
            <Intro c={COPY[fr]} />
          </div>
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
                <div className="mt-8 rounded-2xl bg-sky-50 px-5 py-4">
                  <h2 className="text-lg font-bold text-wsa-navy">
                    {c.stories.heading}
                  </h2>
                  <p className="mt-1 text-[15px] leading-relaxed text-gray-700">
                    {c.stories.body}
                  </p>
                  <Link
                    href={SUCCESS_STORIES_PATH}
                    className="mt-2 inline-block text-[15px] font-semibold text-wsa-navy underline-offset-2 hover:underline"
                  >
                    {c.stories.link}
                  </Link>
                </div>
              </>
            )}
          />
        </section>

        {/* Manet, who takes over at the application stage. */}
        <section className="py-10">
          <div className="grid items-center gap-6 rounded-2xl bg-sky-50 p-6 lg:grid-cols-[1fr_auto_1fr]">
            {LANGS.map((l, i) => {
              const c = COPY[l];
              return (
                <div
                  key={l}
                  lang={c.htmlLang}
                  className={`${langClass(l, lang)} ${i === 0 ? "" : "lg:order-last"}`}
                >
                  <h2 className="text-2xl font-bold tracking-tight text-wsa-navy">
                    {c.manet.heading}
                  </h2>
                  <p className="mt-1 text-base font-semibold text-wsa-navy">
                    {c.manet.role}
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-gray-700">
                    {c.manet.body}
                  </p>
                </div>
              );
            })}
            <img
              src={MANET_PHOTO.src}
              alt={COPY[lang].manet.photoAlt}
              width={MANET_PHOTO.width}
              height={MANET_PHOTO.height}
              loading="lazy"
              className="order-first mx-auto h-auto w-40 rounded-xl lg:order-none"
            />
          </div>
        </section>

        {/* Tim's own bilingual Pipedrive form, exactly as supplied. */}
        <section id={FORM_ID} className="scroll-mt-24">
          <PipedriveFormEmbed embedUrl={LAMANGO_FORM_URL} />
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
      </div>
    </div>
  );
}
