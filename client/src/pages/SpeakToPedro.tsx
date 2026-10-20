import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Check, ChevronDown } from "lucide-react";
import {
  ELDAH_PHOTO,
  OFFICIAL_SOURCES,
  PEDRO_COPY,
  PEDRO_FORM_EMBED_URLS,
  PEDRO_LANGS,
  PEDRO_PATHS,
  PEDRO_PHOTO,
  PIPEDRIVE_LOADER_SRC,
  WSA_LOGO,
  isPipedriveFormUrl,
  languageSwitchHref,
  publicationBlockers,
  type PedroLang,
} from "@/lib/speakToPedro";

/**
 * Speak to Pedro, for families in Luanda: Portuguese at /speak-to-pedro,
 * English at /speak-to-pedro/en. Every word lives in
 * client/src/lib/speakToPedro.ts, which also records why the page is shaped
 * the way it is.
 *
 * It is built on the country representative pages (Speak to Madalitso) but
 * not cloned from them: it has its own slim header with the unchanged WSA
 * logo and a language switch, because the site's header and footer are in
 * English, and it leaves out what is not approved for Angola (contact
 * numbers, a podcast, the free-service line).
 *
 * The page writes nothing. The enquiry form is Pipedrive's, embedded by
 * Pipedrive's own loader once Tim has created it; until then its slot says
 * so. No conversion is reported anywhere on these pages.
 */

const ENQUIRY_ID = "enquiry";
const PATHWAYS_ID = "pathways";

function LanguageSwitch({ lang, path }: { lang: PedroLang; path: string }) {
  const search = useSearch();
  const copy = PEDRO_COPY[lang];
  return (
    <nav
      aria-label={copy.switchLabel}
      className="flex items-center rounded-full border border-wsa-navy/15 bg-white p-0.5 text-sm font-semibold"
    >
      {PEDRO_LANGS.map(target => {
        const active = target === lang;
        return (
          <Link
            key={target}
            href={languageSwitchHref(path, target, search)}
            hrefLang={target}
            lang={target}
            aria-current={active ? "true" : undefined}
            aria-label={PEDRO_COPY[target].langName}
            className={`min-w-[2.75rem] rounded-full px-3 py-1.5 text-center transition ${
              active
                ? "bg-wsa-navy text-white"
                : "text-wsa-navy/70 hover:text-wsa-navy"
            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-red`}
          >
            {target.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}

function PedroHeader({ lang, path }: { lang: PedroLang; path: string }) {
  return (
    <header className="border-b-4 border-wsa-red bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="shrink-0" aria-label="World Student Advisors">
          <img
            src={WSA_LOGO.src}
            alt="World Student Advisors"
            width={WSA_LOGO.width}
            height={WSA_LOGO.height}
            className="h-10 w-auto sm:h-12"
          />
        </Link>
        <LanguageSwitch lang={lang} path={path} />
      </div>
    </header>
  );
}

function DraftBanner({ lang }: { lang: PedroLang }) {
  if (publicationBlockers().length === 0) return null;
  const { draft } = PEDRO_COPY[lang];
  return (
    <div
      role="note"
      data-draft-banner
      className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900 sm:px-6"
    >
      <span className="font-semibold">{draft.label}.</span> {draft.line}
    </div>
  );
}

function PrimaryButton({
  href,
  children,
  className = "",
  onRef,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  onRef?: (el: HTMLAnchorElement | null) => void;
}) {
  return (
    <a
      ref={onRef}
      href={href}
      className={`inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-wsa-red px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-wsa-red/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
    >
      {children}
    </a>
  );
}

/**
 * The Pipedrive form, embedded as supplied, exactly as on Speak to
 * Madalitso: the loader is appended once the placeholder has mounted and
 * removed when the page unmounts, and the link underneath stays until the
 * iframe arrives, so a blocked or slow loader never leaves an empty box.
 */
function PipedriveEmbed({
  lang,
  embedUrl,
}: {
  lang: PedroLang;
  embedUrl: string;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const [embedded, setEmbedded] = useState(false);
  const { form } = PEDRO_COPY[lang];

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const script = document.createElement("script");
    script.src = PIPEDRIVE_LOADER_SRC;
    script.async = true;
    document.body.appendChild(script);
    const observer =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            if (el.querySelector("iframe")) setEmbedded(true);
          });
    observer?.observe(el, { childList: true, subtree: true });
    return () => {
      observer?.disconnect();
      script.remove();
    };
  }, [embedUrl]);

  return (
    <div className="min-w-0 max-w-full">
      <div
        ref={host}
        className="pipedriveWebForms min-w-0 max-w-full"
        data-pd-webforms={embedUrl}
      />
      {!embedded && (
        <p className="pt-3 text-sm text-gray-600">
          {form.fallbackLine}{" "}
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-wsa-navy"
          >
            {form.fallbackCta}
          </a>
        </p>
      )}
    </div>
  );
}

function EnquiryForm({ lang }: { lang: PedroLang }) {
  const embedUrl = PEDRO_FORM_EMBED_URLS[lang];
  const { form } = PEDRO_COPY[lang];
  if (isPipedriveFormUrl(embedUrl))
    return <PipedriveEmbed lang={lang} embedUrl={embedUrl} />;
  return (
    <div
      data-form-pending
      className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 px-5 py-8 text-center"
    >
      <p className="text-base font-semibold text-amber-900">
        {form.pendingTitle}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-amber-900/80">
        {form.pendingBody}
      </p>
    </div>
  );
}

function Portrait({ lang }: { lang: PedroLang }) {
  const { pedro, draft } = PEDRO_COPY[lang];
  return (
    <figure className="relative mx-auto w-full max-w-[340px] min-w-0">
      <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]">
        <div className="relative">
          <img
            src={PEDRO_PHOTO.src}
            alt={`${pedro.name}, ${pedro.role}`}
            width={PEDRO_PHOTO.width}
            height={PEDRO_PHOTO.height}
            decoding="async"
            fetchPriority="high"
            className="block aspect-square w-full rounded-xl bg-wsa-stone object-cover"
          />
          {!PEDRO_PHOTO.approvedForPublication && (
            <span
              data-draft-photo
              className="absolute left-2 top-2 rounded-md bg-amber-400/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-950"
            >
              {draft.photo}
            </span>
          )}
        </div>
        <figcaption className="px-3 pb-2 pt-3 text-wsa-navy">
          <span className="block text-base font-semibold">{pedro.name}</span>
          <span className="block text-sm text-gray-600">
            {pedro.role} · {pedro.place}
          </span>
        </figcaption>
      </div>
    </figure>
  );
}

function SectionHeading({
  id,
  children,
  light = false,
}: {
  id?: string;
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <h2
      id={id}
      className={`text-2xl font-semibold leading-tight tracking-tight sm:text-3xl ${light ? "text-white" : "text-wsa-navy"}`}
    >
      {children}
    </h2>
  );
}

function Faq({ lang }: { lang: PedroLang }) {
  const { faq } = PEDRO_COPY[lang];
  return (
    <section
      aria-labelledby="faq-heading"
      className="bg-white px-4 py-14 sm:px-6 lg:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <SectionHeading id="faq-heading">{faq.heading}</SectionHeading>
          <div className="mt-8 divide-y divide-wsa-navy/10 border-y border-wsa-navy/10">
            {faq.items.map(item => (
              <details key={item.q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-semibold text-wsa-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-red [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-wsa-red transition group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="pb-5 pr-8 text-[15px] leading-relaxed text-gray-700">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-gray-600">{faq.sourcesLabel}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {OFFICIAL_SOURCES.map(s => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  lang="en"
                  className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PedroFooter({ lang, path }: { lang: PedroLang; path: string }) {
  const { footer } = PEDRO_COPY[lang];
  return (
    <footer className="border-t border-wsa-navy/10 bg-wsa-warm-white px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href="/"
            className="underline underline-offset-2 hover:text-wsa-navy"
          >
            {footer.home}
          </Link>
          <Link
            href="/privacy-policy"
            className="underline underline-offset-2 hover:text-wsa-navy"
          >
            {footer.privacy}
          </Link>
        </div>
        <LanguageSwitch lang={lang} path={path} />
      </div>
    </footer>
  );
}

function SpeakToPedroPage({ lang }: { lang: PedroLang }) {
  const [path] = useLocation();
  const copy = PEDRO_COPY[lang];
  const { hero, pathways, help, people, pedro, eldah, process, form, closing } =
    copy;
  const heroCtaRef = useRef<HTMLAnchorElement | null>(null);
  const [showSticky, setShowSticky] = useState(false);

  /** The phone-only sticky button appears once the hero button has scrolled away. */
  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries =>
      setShowSticky(!entries[0].isIntersecting)
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div lang={lang} className="bg-wsa-warm-white text-gray-900">
      <PedroHeader lang={lang} path={path} />
      <DraftBanner lang={lang} />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-wsa-navy px-4 pb-14 pt-10 text-white sm:px-6 lg:pb-20 lg:pt-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.25fr_minmax(300px,360px)] lg:items-center lg:gap-16">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/75 sm:text-sm">
              <span className="h-0.5 w-8 bg-wsa-red" aria-hidden />
              {hero.eyebrow}
            </p>
            <h1 className="mt-5 text-[2.05rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.35rem]">
              {hero.headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              {hero.intro}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PrimaryButton
                href={`#${ENQUIRY_ID}`}
                onRef={el => {
                  heroCtaRef.current = el;
                }}
                className="w-full sm:w-auto"
              >
                {hero.primaryCta}
              </PrimaryButton>
              <a
                href={`#${PATHWAYS_ID}`}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-white/35 px-6 py-3 text-base font-semibold text-white transition hover:border-white hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {hero.secondaryCta}
              </a>
            </div>
            <p className="mt-6 text-sm text-white/60">{hero.levels}</p>
          </div>
          <Portrait lang={lang} />
        </div>
      </section>

      {/* ── Study pathways ───────────────────────────────────────── */}
      <section
        id={PATHWAYS_ID}
        aria-labelledby="pathways-heading"
        className="scroll-mt-4 px-4 py-14 sm:px-6 lg:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <SectionHeading id="pathways-heading">
              {pathways.heading}
            </SectionHeading>
            <p className="mt-4 text-base leading-relaxed text-gray-700 sm:text-lg">
              {pathways.intro}
            </p>
          </div>
          <ol className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {pathways.items.map((item, i) => (
              <li
                key={item.title}
                className="min-w-0 border-t-2 border-wsa-red pt-5"
              >
                <span className="text-sm font-semibold tabular-nums text-wsa-red">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-lg font-semibold leading-snug text-wsa-navy">
                  {item.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── How WSA helps ────────────────────────────────────────── */}
      <section
        aria-labelledby="help-heading"
        className="bg-white px-4 py-14 sm:px-6 lg:py-20"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div className="min-w-0">
            <SectionHeading id="help-heading">{help.heading}</SectionHeading>
            <p className="mt-4 text-base leading-relaxed text-gray-700 sm:text-lg">
              {help.intro}
            </p>
            <p className="mt-6 border-l-2 border-wsa-red pl-4 text-sm leading-relaxed text-gray-600">
              {help.honesty}
            </p>
          </div>
          <ul className="grid min-w-0 content-start gap-x-6 gap-y-4 sm:grid-cols-2">
            {help.items.map(item => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl bg-wsa-warm-white px-4 py-3.5 text-[15px] font-medium text-wsa-navy"
              >
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-wsa-red"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Pedro and Eldah ──────────────────────────────────────── */}
      <section
        aria-labelledby="people-heading"
        className="bg-wsa-stone px-4 py-14 sm:px-6 lg:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <SectionHeading id="people-heading">
              {people.heading}
            </SectionHeading>
            <p className="mt-4 text-base leading-relaxed text-gray-700 sm:text-lg">
              {people.intro}
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:max-w-4xl">
            <figure className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm">
              <img
                src={PEDRO_PHOTO.src}
                alt={`${pedro.name}, ${pedro.role}`}
                width={PEDRO_PHOTO.width}
                height={PEDRO_PHOTO.height}
                loading="lazy"
                decoding="async"
                className="block aspect-[4/3] w-full object-cover object-[center_25%]"
              />
              <figcaption className="px-5 pb-6 pt-5">
                <span className="block text-lg font-semibold text-wsa-navy">
                  {pedro.name}
                </span>
                <span className="block text-sm font-medium text-wsa-red">
                  {pedro.role} · {pedro.place}
                </span>
                <span className="mt-3 block text-[15px] leading-relaxed text-gray-700">
                  {pedro.body}
                </span>
                <span className="mt-3 block text-sm leading-relaxed text-gray-500">
                  {pedro.office}
                </span>
              </figcaption>
            </figure>
            <figure className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm">
              <img
                src={ELDAH_PHOTO.src}
                alt={`${eldah.name}, ${eldah.role}`}
                width={ELDAH_PHOTO.width}
                height={ELDAH_PHOTO.height}
                loading="lazy"
                decoding="async"
                className="block aspect-[4/3] w-full object-cover object-[center_20%]"
              />
              <figcaption className="px-5 pb-6 pt-5">
                <span className="block text-lg font-semibold text-wsa-navy">
                  {eldah.name}
                </span>
                <span className="block text-sm font-medium text-wsa-red">
                  {eldah.role}
                </span>
                <span className="mt-3 block text-[15px] leading-relaxed text-gray-700">
                  {eldah.body}
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section
        aria-labelledby="process-heading"
        className="bg-white px-4 py-14 sm:px-6 lg:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <SectionHeading id="process-heading">
            {process.heading}
          </SectionHeading>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {process.steps.map((step, i) => (
              <li key={step.title} className="flex min-w-0 gap-4 md:flex-col">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wsa-navy text-base font-semibold text-white"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-wsa-navy">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-sm text-gray-600">{process.note}</p>
        </div>
      </section>

      {/* ── Enquiry ──────────────────────────────────────────────── */}
      <section
        id={ENQUIRY_ID}
        aria-labelledby="enquiry-heading"
        className="scroll-mt-4 bg-wsa-warm-white px-4 py-14 sm:px-6 lg:py-20"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="min-w-0">
            <SectionHeading id="enquiry-heading">{form.heading}</SectionHeading>
            <p className="mt-4 text-base leading-relaxed text-gray-700 sm:text-lg">
              {form.supporting}
            </p>
            <p className="mt-6 text-sm leading-relaxed text-gray-600">
              {form.privacy}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {form.minors}
            </p>
            <p className="mt-3 text-sm">
              <Link
                href="/privacy-policy"
                className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red"
              >
                {form.privacyLink}
              </Link>
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-wsa-navy/10 bg-white p-5 shadow-sm sm:p-7">
            <EnquiryForm lang={lang} />
          </div>
        </div>
      </section>

      <Faq lang={lang} />

      {/* ── Closing ──────────────────────────────────────────────── */}
      <section className="bg-wsa-navy px-4 py-14 text-white sm:px-6 lg:py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <SectionHeading light>{closing.heading}</SectionHeading>
            <p className="mt-3 text-base text-white/80 sm:text-lg">
              {closing.body}
            </p>
          </div>
          <PrimaryButton href={`#${ENQUIRY_ID}`} className="w-full md:w-auto">
            {closing.cta}
          </PrimaryButton>
        </div>
      </section>

      <PedroFooter lang={lang} path={path} />

      {/* ── Phone-only sticky button ─────────────────────────────── */}
      <div
        aria-hidden={!showSticky}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-wsa-navy/10 bg-white/95 px-4 py-3 backdrop-blur transition-transform duration-200 md:hidden ${showSticky ? "translate-y-0" : "translate-y-full"}`}
      >
        <PrimaryButton href={`#${ENQUIRY_ID}`} className="w-full">
          {hero.primaryCta}
        </PrimaryButton>
      </div>
      <div className="h-20 md:hidden" aria-hidden />
    </div>
  );
}

/**
 * Where each language's Pipedrive form sends the family. Captures nothing
 * and reports no conversion: advertising is off and no conversion has been
 * approved. It promises nothing about who calls or how soon.
 */
function SpeakToPedroThankYouPage({ lang }: { lang: PedroLang }) {
  const [path] = useLocation();
  const { thankYou } = PEDRO_COPY[lang];
  return (
    <div
      lang={lang}
      className="flex min-h-screen flex-col bg-wsa-warm-white text-gray-900"
    >
      <PedroHeader lang={lang} path={path} />
      <DraftBanner lang={lang} />
      <section className="flex-1 px-4 py-14 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl">
          <p className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wider text-wsa-red">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-3.5 w-3.5" aria-hidden />
            </span>
            {thankYou.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-wsa-navy sm:text-4xl">
            {thankYou.headline}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-gray-700">
            {thankYou.body}
          </p>
          <div className="mt-8 flex flex-col gap-3 text-base sm:flex-row sm:flex-wrap sm:gap-x-6">
            <Link
              href={PEDRO_PATHS[lang]}
              className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red"
            >
              {thankYou.back}
            </Link>
            <Link
              href="/student-support-library"
              className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red"
            >
              {thankYou.library}
            </Link>
          </div>
        </div>
      </section>
      <PedroFooter lang={lang} path={path} />
    </div>
  );
}

export function SpeakToPedroPt() {
  return <SpeakToPedroPage lang="pt" />;
}

export function SpeakToPedroEn() {
  return <SpeakToPedroPage lang="en" />;
}

export function SpeakToPedroThankYouPt() {
  return <SpeakToPedroThankYouPage lang="pt" />;
}

export function SpeakToPedroThankYouEn() {
  return <SpeakToPedroThankYouPage lang="en" />;
}
