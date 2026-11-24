import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Mail, Phone, PlayCircle } from "lucide-react";
import PipedriveFormEmbed from "@/components/PipedriveFormEmbed";
import VideoModal from "@/components/VideoModal";
import {
  ANGOLA_FLAG_SRC,
  COPY,
  ELDAH,
  PEDRO,
  PEDRO_FORM_URL,
  PODCAST,
  STORIES_PATHS,
  type Lang,
  type PedroCopy,
} from "@/lib/speakToPedro";

/**
 * Speak to Pedro / Fale com o Pedro: Tim Hunt's bilingual page of
 * 22 November 2026, laid out from his mock-up. All words live in
 * client/src/lib/speakToPedro.ts.
 *
 * Every section is two columns, English then Portuguese, each with its own
 * lang attribute. On a large screen both show, as in the mock-up. On a
 * phone only one fits, so the "English / Português" switch at the top
 * (also from the mock-up) chooses it; the other stays in the page, hidden,
 * so the prerendered HTML carries both languages for search engines.
 */

const FORM_ID = "register";

/** One section in both languages; `lang` decides which shows on a phone. */
function Bilingual({
  lang,
  render,
}: {
  lang: Lang;
  render: (c: PedroCopy) => ReactNode;
}) {
  return (
    <div className="grid gap-x-12 gap-y-6 lg:grid-cols-2">
      {(["en", "pt"] as const).map(l => (
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

export default function SpeakToPedro() {
  const [lang, setLang] = useState<Lang>("en");
  const [playing, setPlaying] = useState(false);

  const heroText = (c: PedroCopy) => (
    <>
      <p className="flex items-center gap-2 text-sm text-gray-700">
        <img
          src={ANGOLA_FLAG_SRC}
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
      <p className="mt-2 text-base font-medium text-gray-800">{c.hero.role}</p>
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
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
        {/* The mock-up's language switch. Both languages show on a large screen. */}
        <div
          className="flex justify-end lg:hidden"
          role="group"
          aria-label="Language / Idioma"
        >
          {(["en", "pt"] as const).map((l, i) => (
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

        {/* Hero: English, Pedro, Portuguese. */}
        <section className="mt-4 grid items-center gap-8 border-b border-wsa-navy/10 pb-10 lg:mt-0 lg:grid-cols-[1fr_minmax(0,300px)_1fr]">
          <div
            lang={COPY.en.htmlLang}
            className={`min-w-0 ${lang === "en" ? "" : "hidden lg:block"} lg:order-1`}
          >
            {heroText(COPY.en)}
          </div>
          <img
            src={PEDRO.photo}
            alt={COPY[lang].hero.photoAlt}
            width={PEDRO.photoWidth}
            height={PEDRO.photoHeight}
            decoding="async"
            className="order-first mx-auto h-auto w-full max-w-[260px] lg:order-2 lg:max-w-none"
          />
          <div
            lang={COPY.pt.htmlLang}
            className={`min-w-0 ${lang === "pt" ? "" : "hidden lg:block"} lg:order-3`}
          >
            {heroText(COPY.pt)}
          </div>
        </section>

        {/* How we can help you */}
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
              </>
            )}
          />
        </section>

        {/* Destinations and the podcast */}
        <section className="border-b border-wsa-navy/10 py-10">
          <Bilingual
            lang={lang}
            render={c => (
              <>
                <SectionHeading>{c.destinations.heading}</SectionHeading>
                <p className="mt-2 text-base leading-relaxed text-gray-800">
                  {c.destinations.list.join(" • ")}
                </p>
                <div className="mt-8">
                  <SectionHeading>{c.podcast.heading}</SectionHeading>
                  <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3">
                    <h3 className="text-base font-semibold text-wsa-navy">
                      {c.podcast.title}
                    </h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-gray-700">
                      {c.podcast.body}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPlaying(true)}
                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline"
                    >
                      <PlayCircle className="h-4 w-4" aria-hidden />
                      {c.podcast.cta}
                    </button>
                  </div>
                </div>
              </>
            )}
          />
        </section>

        {/* Student success stories */}
        <section className="border-b border-wsa-navy/10 py-10">
          <Bilingual
            lang={lang}
            render={c => (
              <>
                <SectionHeading>{c.stories.heading}</SectionHeading>
                <p className="mt-2 text-base leading-relaxed text-gray-700">
                  {c.stories.body}
                </p>
                <p className="mt-2">
                  <Link
                    href={STORIES_PATHS.angola}
                    className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red"
                  >
                    {c.stories.angolaLink}
                  </Link>
                </p>
                <p className="mt-1">
                  <Link
                    href={STORIES_PATHS.all}
                    className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red"
                  >
                    {c.stories.allLink}
                  </Link>
                </p>
              </>
            )}
          />
        </section>

        {/* Meet Eldah Therone, with her photograph between the two languages. */}
        <section className="py-10">
          <div className="grid items-center gap-6 rounded-2xl bg-sky-50 p-6 lg:grid-cols-[1fr_minmax(0,180px)_1fr]">
            {(["en", "pt"] as const).map((l, i) => (
              <div
                key={l}
                lang={COPY[l].htmlLang}
                className={`min-w-0 ${l === lang ? "" : "hidden lg:block"} ${i === 0 ? "lg:order-1" : "lg:order-3"}`}
              >
                <h2 className="text-2xl font-bold tracking-tight text-wsa-navy">
                  {COPY[l].eldah.heading}
                </h2>
                <p className="mt-1 text-sm font-semibold text-wsa-navy">
                  {COPY[l].eldah.role}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
                  {COPY[l].eldah.body}
                </p>
              </div>
            ))}
            <img
              src={ELDAH.photo}
              alt={COPY[lang].eldah.photoAlt}
              width={ELDAH.photoWidth}
              height={ELDAH.photoHeight}
              loading="lazy"
              decoding="async"
              className="order-first mx-auto h-auto w-full max-w-[180px] rounded-xl lg:order-2"
            />
          </div>
        </section>

        {/* Prefer Pedro to contact you? Pedro's own bilingual Pipedrive form. */}
        <section
          id={FORM_ID}
          className="scroll-mt-24 border-t border-wsa-navy/10 pt-10"
        >
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
          <PipedriveFormEmbed embedUrl={PEDRO_FORM_URL} className="mt-6" />
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

        {/* Pedro's number and email, as at the foot of the mock-up. */}
        <section className="mt-10 rounded-2xl border border-wsa-navy/10 p-5">
          <Bilingual
            lang={lang}
            render={c => (
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-600">
                {c.contactLabel}
              </p>
            )}
          />
          <p className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-base font-semibold text-wsa-navy sm:text-lg">
            <a
              href={PEDRO.phoneHref}
              className="inline-flex items-center gap-2 hover:text-wsa-red"
            >
              <Phone className="h-5 w-5" aria-hidden />
              {PEDRO.phone}
            </a>
            {[PEDRO.email, PEDRO.secondEmail].map(address => (
              <a
                key={address}
                href={`mailto:${address}`}
                className="inline-flex min-w-0 max-w-full items-center gap-2 hover:text-wsa-red"
              >
                <Mail className="h-5 w-5 shrink-0" aria-hidden />
                {/* A long address may wrap after the @ on a narrow phone, and never pushes the page sideways. */}
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {address.split("@")[0]}@<wbr />
                  {address.split("@")[1]}
                </span>
              </a>
            ))}
          </p>
        </section>
      </div>

      <VideoModal
        resource={
          playing
            ? {
                title: COPY[lang].podcast.title,
                videoId: PODCAST.youtubeId,
                url: PODCAST.youtubeUrl,
              }
            : null
        }
        onOpenChange={open => setPlaying(open)}
      />
    </div>
  );
}
