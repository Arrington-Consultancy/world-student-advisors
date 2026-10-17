import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Check, CreditCard, FileCheck, GraduationCap, LifeBuoy, Mail, MessageCircle, MessagesSquare, Phone, Plane, Play, Stamp } from "lucide-react";
import {
  BACKED_BY_LABEL,
  DESTINATIONS,
  DESTINATIONS_HEADING,
  DESTINATIONS_LINE,
  DESTINATION_FLAGS,
  FORM_FALLBACK,
  FREE_BADGE,
  HELP_HEADING,
  PIPEDRIVE_LOADER_SRC,
  READY_HEADING,
  SUPPORT_HEADING,
  SUPPORT_STEPS,
  TRUST_LINE,
  WHERE_HEADING,
  whatsappHref,
  type AdvisorLandingContent,
} from "@/lib/advisorLandingPage";

/**
 * The country representative landing page, on Speak to Juliet's design
 * (Tim Hunt, 16 October 2026: "use our existing Speak to Juliet landing page
 * as the design template, keeping the same branding, layout and overall
 * presentation"). Every word comes from the content object passed in, so a
 * new representative is a new content file, not a new page.
 *
 * WhatsApp is the primary action; the representative's own Pipedrive form is
 * the alternative, embedded by Pipedrive's loader. A submission goes from the
 * visitor's browser to Pipedrive and never touches this server.
 */

const WHATSAPP_GREEN = "#128C7E";

/** One icon per service area, in Tim Hunt's order. Decorative. */
const HELP_ICONS = [GraduationCap, FileCheck, CreditCard, Stamp, MessagesSquare, Plane, LifeBuoy] as const;

function WhatsAppButton({
  content,
  className = "",
  children,
  onRef,
}: {
  content: AdvisorLandingContent;
  className?: string;
  children: React.ReactNode;
  onRef?: (el: HTMLAnchorElement | null) => void;
}) {
  return (
    <a
      ref={onRef}
      href={whatsappHref(content.advisor.whatsappDigits ?? "", content.advisor.firstMessage)}
      target="_blank"
      rel="noopener noreferrer"
      style={{ backgroundColor: WHATSAPP_GREEN }}
      className={`inline-flex min-h-[3rem] items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy ${className}`}
    >
      <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
      {children}
    </a>
  );
}

/**
 * The representative's introduction. Their own photograph is the poster,
 * served from this site, and the YouTube frame is created only when a
 * visitor presses play, so nothing autoplays and no third-party request is
 * made before then.
 */
function Podcast({ content }: { content: AdvisorLandingContent }) {
  const [playing, setPlaying] = useState(false);
  const { podcast, advisor } = content;

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play: ${podcast.title}`}
        className="group relative block w-full overflow-hidden rounded-2xl border border-wsa-navy/12 bg-wsa-stone focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
      >
        <img
          src={advisor.photo}
          alt=""
          width={advisor.photoWidth}
          height={advisor.photoHeight}
          decoding="async"
          className="aspect-video w-full max-w-full object-cover object-[center_30%]"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-wsa-navy/25 transition group-hover:bg-wsa-navy/35">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow">
            <Play className="ml-0.5 h-6 w-6 text-wsa-navy" aria-hidden />
          </span>
        </span>
        <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-wsa-navy/85 to-transparent px-4 pb-3 pt-8 text-left">
          <span className="block text-sm font-semibold text-white">{podcast.title}</span>
          <span className="mt-0.5 block text-xs leading-snug text-white/85">{podcast.blurb}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-wsa-navy/12 bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${podcast.youtubeId}?autoplay=1&rel=0`}
        title={`${podcast.title}. ${podcast.blurb}`}
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full max-w-full border-0"
      />
    </div>
  );
}

/**
 * The representative's Pipedrive form, embedded as supplied. The loader must
 * run after the placeholder is in the document, and again on every visit, so
 * the script is appended once the placeholder has mounted and removed when
 * the page unmounts. The link underneath stays until the iframe arrives, so
 * a blocked or slow loader never leaves an empty box.
 */
function PipedriveForm({ content, id }: { content: AdvisorLandingContent; id: string }) {
  const host = useRef<HTMLDivElement | null>(null);
  const [embedded, setEmbedded] = useState(false);
  const { form } = content;

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
  }, []);

  return (
    <div className="min-w-0 max-w-full" aria-labelledby={`${id}-heading`}>
      <p id={`${id}-heading`} className="text-lg font-semibold text-wsa-navy">{form.heading}</p>
      <p className="pb-3 text-sm text-gray-600">{form.supporting}</p>

      <div ref={host} className="pipedriveWebForms min-w-0 max-w-full" data-pd-webforms={form.embedUrl} />

      {!embedded && (
        <p className="pt-3 text-sm text-gray-600">
          {FORM_FALLBACK.line}{" "}
          <a href={form.embedUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:text-wsa-navy">
            {FORM_FALLBACK.cta}
          </a>
        </p>
      )}

      <p className="pt-3 text-xs leading-relaxed text-gray-500">
        {form.privacyLine} See our{" "}
        <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-wsa-navy">privacy policy</Link>.
      </p>
    </div>
  );
}

export default function AdvisorLandingPage({ content }: { content: AdvisorLandingContent }) {
  const { advisor, counsellor, hero, country } = content;
  const heroCtaRef = useRef<HTMLAnchorElement | null>(null);
  const [showSticky, setShowSticky] = useState(false);

  /** The phone-only sticky WhatsApp bar appears once the hero button has scrolled away. */
  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => setShowSticky(!entries[0].isIntersecting), { rootMargin: "0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="bg-wsa-warm-white pt-24 lg:pt-28">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-10 pt-8 sm:px-6 lg:pb-14 lg:pt-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_minmax(300px,360px)] lg:items-center lg:gap-12">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-wsa-red">
              <img
                src={`/flags/${country.flagCode}.svg`}
                alt={`Flag of ${country.name}`}
                width={40}
                height={30}
                className="h-[1.875rem] w-10 shrink-0 rounded-[3px] border border-black/10 object-cover"
              />
              {hero.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-wsa-navy sm:text-4xl lg:text-5xl">{hero.headline}</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-700">{hero.supporting}</p>

            <ul className="mt-5 space-y-1.5">
              {TRUST_LINE.map(t => (
                <li key={t} className="flex items-start gap-2 text-sm font-medium text-wsa-navy sm:text-base">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <WhatsAppButton content={content} onRef={el => { heroCtaRef.current = el; }} className="w-full sm:w-auto">
                {hero.primaryCta}
              </WhatsAppButton>
            </div>

            {/* The representative's number and email, visible without scrolling. */}
            <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] lg:max-w-2xl">
              <a
                href={whatsappHref(advisor.whatsappDigits ?? "", advisor.firstMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[3.5rem] items-center gap-3 rounded-xl border-2 border-wsa-navy/15 bg-white px-4 py-2.5 transition hover:border-wsa-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
              >
                <Phone className="h-5 w-5 shrink-0 text-wsa-navy" aria-hidden />
                <span className="min-w-0 leading-tight">
                  <span className="block text-base font-semibold text-wsa-navy">{advisor.whatsapp}</span>
                  <span className="block text-xs text-gray-600">{hero.phoneLabel}</span>
                </span>
              </a>
              <a
                href={`mailto:${advisor.email}`}
                className="flex min-h-[3.5rem] items-center gap-3 rounded-xl border-2 border-wsa-navy/15 bg-white px-4 py-2.5 transition hover:border-wsa-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
              >
                <Mail className="h-5 w-5 shrink-0 text-wsa-navy" aria-hidden />
                <span className="min-w-0 leading-tight">
                  <span className="block break-all text-sm font-semibold text-wsa-navy">{advisor.email}</span>
                  <span className="block text-xs text-gray-600">{hero.emailLabel}</span>
                </span>
              </a>
            </div>

            <div className="mt-7 max-w-xl border-t border-wsa-navy/10 pt-6">
              <p className="text-base font-semibold text-wsa-navy">{hero.secondary.heading}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{hero.secondary.supporting}</p>
              <a
                href="#send-details"
                className="mt-3.5 inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl border-2 border-wsa-navy bg-transparent px-6 py-3 text-base font-semibold text-wsa-navy transition hover:bg-wsa-navy hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy sm:w-auto"
              >
                {hero.secondary.cta}
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[360px] min-w-0">
            <figure className="min-w-0">
              <img
                src={advisor.photo}
                alt={advisor.photoAlt}
                width={advisor.photoWidth}
                height={advisor.photoHeight}
                className="block aspect-[3/4] w-full rounded-2xl border border-wsa-navy/10 bg-wsa-stone object-cover object-top shadow-sm"
              />
              <figcaption className="mt-3 text-center leading-snug lg:text-left">
                <span className="block text-base font-semibold text-wsa-navy">{advisor.name}</span>
                <span className="block text-sm text-gray-700">{advisor.role}</span>
                <span className="block text-sm text-gray-700">{advisor.organisation}</span>
                <span className="block text-sm text-gray-500">{advisor.location}</span>
              </figcaption>
            </figure>

            {/* The counsellor beside the representative from the first screen, with no contact details. */}
            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-wsa-navy/10 bg-white p-3 shadow-sm">
                <img
                  src={counsellor.photo}
                  alt={counsellor.photoAlt}
                  width={64}
                  height={85}
                  decoding="async"
                  className="block aspect-[3/4] w-16 shrink-0 rounded-lg border border-wsa-navy/10 bg-wsa-stone object-cover object-top"
                />
                <div className="min-w-0 leading-snug">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-wsa-red">{BACKED_BY_LABEL}</p>
                  <p className="text-sm font-semibold text-wsa-navy">{counsellor.name}</p>
                  <p className="text-xs text-gray-700">{counsellor.role}</p>
                  <p className="text-xs text-gray-500">{counsellor.headOfficeLine}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 rounded-2xl border border-emerald-600/25 bg-emerald-50 px-4 py-2.5 text-center leading-snug">
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">{FREE_BADGE.heading}</p>
                <p className="text-sm text-emerald-900/80">{FREE_BADGE.line}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How we can help you ──────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-10 sm:px-6 lg:py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-wsa-red">{SUPPORT_HEADING}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{HELP_HEADING}</h2>
          <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-7">
            {SUPPORT_STEPS.map((s, i) => {
              const Icon = HELP_ICONS[i % HELP_ICONS.length];
              return (
                <li key={s} className="flex flex-col items-center text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wsa-navy/5 text-wsa-navy">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="mt-3 text-sm font-semibold leading-snug text-wsa-navy">{s}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Study destinations ───────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-10 sm:px-6 lg:py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{DESTINATIONS_HEADING}</h2>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-700">{DESTINATIONS_LINE}</p>
          <ul className="mt-7 grid grid-cols-4 gap-x-3 gap-y-6 sm:grid-cols-8">
            {DESTINATION_FLAGS.map(f => (
              <li key={f.code} className="flex flex-col items-center text-center">
                <img
                  src={`/flags/${f.code}.svg`}
                  alt={f.alt}
                  width={64}
                  height={48}
                  decoding="async"
                  className="h-12 w-16 rounded-md border border-wsa-navy/10 object-cover shadow-sm"
                />
                <span className="mt-2 text-sm font-semibold text-wsa-navy">{f.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── The representative and their podcast ─────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_minmax(300px,420px)] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{advisor.name}</h2>
            <p className="mt-1 text-lg text-gray-700">{advisor.role}</p>
            <p className="mt-0.5 text-base text-gray-500">{advisor.location}</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-700">{advisor.intro}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={whatsappHref(advisor.whatsappDigits ?? "", advisor.firstMessage)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: WHATSAPP_GREEN }}
                className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                <span>WhatsApp {advisor.whatsapp}</span>
              </a>
              <a
                href={`mailto:${advisor.email}`}
                className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-xl border border-wsa-navy/20 px-3.5 py-2 text-sm font-medium text-wsa-navy transition hover:border-wsa-red"
              >
                <Mail className="h-4 w-4" aria-hidden />
                <span className="break-all">{advisor.email}</span>
              </a>
            </div>
          </div>
          <div className="min-w-0">
            <Podcast content={content} />
            {content.podcast.libraryPath && (
              <p className="mt-2 text-sm">
                <Link href={content.podcast.libraryPath} className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red">
                  {content.podcast.libraryLabel}
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── What you can ask about ───────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{content.askHeading}</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {content.studyFamilies.map(f => (
              <div key={f.title} className="rounded-2xl border border-wsa-navy/10 bg-white p-5">
                <h3 className="text-lg font-semibold text-wsa-navy">{f.title}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-gray-700">{f.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-gray-500">{content.availabilityNote}</p>
        </div>
      </section>

      {/* ── Where you could study ────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{WHERE_HEADING}</h2>
          <dl className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {DESTINATIONS.map(d => (
              <div key={d.name} className="border-l-2 border-wsa-red/30 pl-4">
                <dt className="text-base font-semibold text-wsa-navy">{d.name}</dt>
                <dd className="mt-0.5 text-base leading-relaxed text-gray-700">{d.body}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-7 max-w-3xl text-base leading-relaxed text-gray-700">{DESTINATIONS_LINE}</p>
        </div>
      </section>

      {/* ── The counsellor ───────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{counsellor.panelHeading}</h2>
          <div className="rounded-2xl border border-wsa-navy/10 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start gap-5 sm:flex-nowrap">
              <img
                src={counsellor.photo}
                alt={counsellor.photoAlt}
                width={112}
                height={149}
                decoding="async"
                className="block aspect-[3/4] w-28 shrink-0 rounded-xl border border-wsa-navy/10 bg-wsa-stone object-cover object-top"
              />
              <div className="min-w-0">
                <h3 className="text-xl font-semibold leading-tight text-wsa-navy">{counsellor.name}</h3>
                <p className="mt-0.5 text-base text-gray-700">{counsellor.role}</p>
                <p className="mt-0.5 text-sm text-gray-500">{counsellor.headOfficeLine}</p>
                {counsellor.panelBody.map(p => (
                  <p key={p.slice(0, 40)} className="mt-3 text-base leading-relaxed text-gray-700">{p}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How this works ───────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">How this works</h2>
          <ol className="mt-7 grid gap-4 sm:grid-cols-3">
            {content.steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-wsa-navy/10 bg-wsa-warm-white p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-wsa-navy text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold text-wsa-navy">{s.title}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-gray-700">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Ready to start? ──────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-wsa-navy px-4 py-12 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{READY_HEADING}</h2>
          <ul className="mt-5 space-y-2.5">
            {content.keyMessage.map(m => (
              <li key={m} className="text-lg leading-relaxed text-white sm:text-xl">{m}</li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <WhatsAppButton content={content} className="w-full sm:w-auto">{hero.primaryCta}</WhatsAppButton>
            <a
              href="#send-details"
              className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl border-2 border-white bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-white hover:text-wsa-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
            >
              {hero.secondary.cta}
            </a>
          </div>
        </div>
      </section>

      {/* ── The form ─────────────────────────────────────────────── */}
      <section id="send-details" className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-wsa-navy/12 bg-wsa-warm-white p-5 shadow-sm sm:p-6">
          <PipedriveForm content={content} id="advisor-form" />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
          <Link href="/" className="underline underline-offset-2 hover:text-wsa-navy">World Student Advisors</Link>
          <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-wsa-navy">Privacy policy</Link>
        </div>
      </section>

      {/* Sticky WhatsApp bar, phones only, once the hero button has gone. */}
      {showSticky && (
        <>
          <div aria-hidden className="h-20 sm:hidden" />
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-wsa-navy/10 bg-white/95 px-4 pt-3 backdrop-blur sm:hidden"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <WhatsAppButton content={content} className="w-full">{hero.primaryCta}</WhatsAppButton>
          </div>
        </>
      )}
    </main>
  );
}
