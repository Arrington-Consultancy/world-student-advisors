import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Check, CreditCard, FileCheck, GraduationCap, LifeBuoy, Mail, MessageCircle, MessagesSquare, Phone, Plane, Play, Stamp } from "lucide-react";
import {
  AVAILABILITY_NOTE,
  BACKED_BY_LABEL,
  DESTINATIONS,
  DESTINATION_FLAGS,
  DESTINATIONS_HEADING,
  DESTINATIONS_LINE,
  GLENICE,
  GLENICE_QUOTE,
  HERO,
  JULIET,
  JULIET_ORGANISATION,
  JULIET_PODCAST,
  GLENICE_HEAD_OFFICE_LINE,
  FREE_BADGE,
  HELP_HEADING,
  HERO_CONTACT,
  KEY_MESSAGE,
  READY_HEADING,
  type PersonCard,
  PIPEDRIVE_FORM,
  STEPS,
  STUDY_FAMILIES,
  TRUST_LINE,
  SUPPORT_HEADING,
  SUPPORT_STEPS,
  WHATSAPP_FIRST_MESSAGE,
  whatsappHref,
} from "@/lib/speakToJuliet";

/**
 * Speak to Juliet. The Nigeria landing page whose one job is to put a visitor
 * in touch with Juliet Nnajiofor-Uyi in Lagos.
 *
 * WHATSAPP IS THE PRIMARY ACTION, not the form. In this market a message to a
 * named person is a far smaller step than handing details to a company, so
 * the WhatsApp link leads the hero and returns as a sticky bar on a phone
 * once the hero button has scrolled away. The form is offered as the
 * alternative for a visitor who would rather not message.
 *
 * THE FORM IS TIM HUNT'S PIPEDRIVE FORM, embedded exactly as he supplied it
 * on 23 September 2026. Pipedrive's loader replaces the placeholder with the
 * form in an iframe, the submission goes straight to Pipedrive, and nothing
 * on this site sees it. This page therefore creates no lead through this
 * codebase and writes nothing to Pipedrive itself.
 *
 * The copy lives in client/src/lib/speakToJuliet.ts, so a wording change
 * from Tim does not touch this file.
 */

const WHATSAPP_GREEN = "#128C7E";

/** One icon per line of SUPPORT_STEPS, in Tim Hunt's order. Decorative. */
const HELP_ICONS = [GraduationCap, FileCheck, CreditCard, Stamp, MessagesSquare, Plane, LifeBuoy] as const;

/* ------------------------------------------------------------------ */

const FLAG_GREEN = "#008751";

/**
 * The Nigerian flag, drawn rather than fetched, so the hero has no image
 * dependency and nothing to go missing. Tim Hunt asked for it on 19
 * September 2026 and for it to be larger on 24 September: it identifies the
 * page as Nigeria's at a glance and reinforces Juliet as WSA's person on the
 * ground there.
 */
function NigerianFlag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex overflow-hidden rounded-[3px] border border-black/10 ${className}`}
      role="img"
      aria-label="Flag of Nigeria"
    >
      <span className="block h-full w-1/3" style={{ backgroundColor: FLAG_GREEN }} />
      <span className="block h-full w-1/3 bg-white" />
      <span className="block h-full w-1/3" style={{ backgroundColor: FLAG_GREEN }} />
    </span>
  );
}

function WhatsAppButton({
  className = "",
  children,
  onRef,
}: {
  className?: string;
  children: React.ReactNode;
  onRef?: (el: HTMLAnchorElement | null) => void;
}) {
  return (
    <a
      ref={onRef}
      href={whatsappHref(JULIET.whatsappDigits ?? "", WHATSAPP_FIRST_MESSAGE)}
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
 * Juliet's introduction.
 *
 * The recording is the third one: Tim Hunt withdrew the first two, the
 * second on 24 September 2026 because of a telephone number error, and Tom
 * Arrington supplied the replacement link on 25 September. Its id lives in
 * JULIET_PODCAST. Should that id ever be emptied again the section holds the
 * space with a short, honest line and makes no request to YouTube.
 *
 * The poster is Juliet's own photograph, served from this site. The iframe
 * is only created when a visitor asks for it, so nothing autoplays.
 */
function JulietPodcast() {
  const [playing, setPlaying] = useState(false);

  if (!JULIET_PODCAST.youtubeId) {
    return (
      <div className="rounded-2xl border border-dashed border-wsa-navy/20 bg-white/60 p-5">
        <p className="text-sm font-semibold text-wsa-navy">{JULIET_PODCAST.title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{JULIET_PODCAST.awaitingLine}</p>
      </div>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play: ${JULIET_PODCAST.title}`}
        className="group relative block w-full overflow-hidden rounded-2xl border border-wsa-navy/12 bg-wsa-stone focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
      >
        {/* Juliet's own photograph is the poster, served from this site, so it
            always loads and the page makes no third-party request before a
            visitor has asked to watch anything. Decorative here: the button
            carries the name. */}
        <img
          src={JULIET.photo}
          alt=""
          width={600}
          height={800}
          decoding="async"
          className="aspect-video w-full max-w-full object-cover object-[center_25%]"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-wsa-navy/25 transition group-hover:bg-wsa-navy/35">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow">
            <Play className="ml-0.5 h-6 w-6 text-wsa-navy" aria-hidden />
          </span>
        </span>
        <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-wsa-navy/85 to-transparent px-4 pb-3 pt-8 text-left">
          <span className="block text-sm font-semibold text-white">
            {JULIET_PODCAST.title}{JULIET_PODCAST.duration ? `, ${JULIET_PODCAST.duration}` : ""}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-white/85">{JULIET_PODCAST.blurb}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-wsa-navy/12 bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${JULIET_PODCAST.youtubeId}?autoplay=1&rel=0`}
        title={`${JULIET_PODCAST.title}. ${JULIET_PODCAST.blurb}`}
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full max-w-full border-0"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Tim Hunt's Pipedrive form, embedded as he supplied it.
 *
 * Pipedrive's loader looks for elements with the data attribute when it runs
 * and replaces each with the form in an iframe. In a single-page app the
 * loader has to run AFTER this placeholder is in the document, and again on
 * every visit to the page, so the script element is appended in an effect
 * once the placeholder has mounted and removed when the page unmounts. A
 * fresh script element executes even when the browser serves it from cache,
 * which is what makes a second visit work.
 *
 * The link underneath is the honest fallback: it appears for a visitor
 * without scripts and stays visible until the iframe has arrived, so a
 * blocked or slow loader never leaves an empty box with nothing to do.
 */
function PipedriveForm({ id }: { id: string }) {
  const host = useRef<HTMLDivElement | null>(null);
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const script = document.createElement("script");
    script.src = PIPEDRIVE_FORM.loaderSrc;
    script.async = true;
    document.body.appendChild(script);

    // The loader gives no callback, so the arrival of its iframe is the
    // signal that the form is on the page.
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
      <p id={`${id}-heading`} className="text-lg font-semibold text-wsa-navy">
        {PIPEDRIVE_FORM.heading}
      </p>
      <p className="pb-3 text-sm text-gray-600">{PIPEDRIVE_FORM.supporting}</p>

      <div
        ref={host}
        className="pipedriveWebForms min-w-0 max-w-full"
        data-pd-webforms={PIPEDRIVE_FORM.embedUrl}
      />

      {!embedded && (
        <p className="pt-3 text-sm text-gray-600">
          {PIPEDRIVE_FORM.fallbackLine}{" "}
          <a
            href={PIPEDRIVE_FORM.embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-wsa-navy"
          >
            {PIPEDRIVE_FORM.fallbackCta}
          </a>
        </p>
      )}

      <p className="pt-3 text-xs leading-relaxed text-gray-500">
        Your details go to WSA's student records system so that Juliet can contact you. See our{" "}
        <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-wsa-navy">privacy policy</Link>.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Contact details for a person who has them. Glenice has none on this page,
 * by Tim Hunt's instruction of 19 September 2026, so this renders nothing
 * rather than an empty row: Juliet is the contact, and the page should not
 * hint otherwise.
 */
function ContactLines({ person }: { person: PersonCard }) {
  if (!person.whatsappDigits || !person.whatsapp || !person.email) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <a
        href={whatsappHref(person.whatsappDigits, person === JULIET ? WHATSAPP_FIRST_MESSAGE : undefined)}
        target="_blank"
        rel="noopener noreferrer"
        style={{ backgroundColor: WHATSAPP_GREEN }}
        className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        <span>WhatsApp {person.whatsapp}</span>
      </a>
      <a
        href={`mailto:${person.email}`}
        className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-xl border border-wsa-navy/20 px-3.5 py-2 text-sm font-medium text-wsa-navy transition hover:border-wsa-red"
      >
        <Mail className="h-4 w-4" aria-hidden />
        <span className="break-all">{person.email}</span>
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function SpeakToJuliet() {
  const heroCtaRef = useRef<HTMLAnchorElement | null>(null);
  const [showSticky, setShowSticky] = useState(false);

  /**
   * The sticky bar appears once the hero's own button has scrolled out of
   * view, so the two never compete. Observer only, no scroll handler, and it
   * simply never appears where IntersectionObserver is unavailable.
   */
  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      entries => setShowSticky(!entries[0].isIntersecting),
      { rootMargin: "0px" },
    );
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
              <NigerianFlag className="h-7 w-[2.625rem] shrink-0" />
              {HERO.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-wsa-navy sm:text-4xl lg:text-5xl">
              {HERO.headline}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-700">{HERO.supporting}</p>

            {/* WSA as the source of authority, Tim Hunt's direction of 27
                September 2026. Existing approved wording only; see TRUST_LINE. */}
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
              <WhatsAppButton onRef={el => { heroCtaRef.current = el; }} className="w-full sm:w-auto">
                {HERO.primaryCta}
              </WhatsAppButton>
            </div>

            {/* Juliet's number and email, visible without scrolling: Tim
                Hunt's Version 4, 27 September 2026. The number opens
                WhatsApp and the email opens the visitor's mail app, as he
                asked. Both values are JULIET's; Glenice has none here. */}
            <div className="mt-4 grid max-w-xl gap-3 sm:grid-cols-[auto_1fr]">
              <a
                href={whatsappHref(JULIET.whatsappDigits ?? "", WHATSAPP_FIRST_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[3.5rem] items-center gap-3 rounded-xl border-2 border-wsa-navy/15 bg-white px-4 py-2.5 transition hover:border-wsa-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
              >
                <Phone className="h-5 w-5 shrink-0 text-wsa-navy" aria-hidden />
                <span className="min-w-0 leading-tight">
                  <span className="block text-base font-semibold text-wsa-navy">{JULIET.whatsapp}</span>
                  <span className="block text-xs text-gray-600">{HERO_CONTACT.phoneLabel}</span>
                </span>
              </a>
              <a
                href={`mailto:${JULIET.email}`}
                className="flex min-h-[3.5rem] items-center gap-3 rounded-xl border-2 border-wsa-navy/15 bg-white px-4 py-2.5 transition hover:border-wsa-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
              >
                <Mail className="h-5 w-5 shrink-0 text-wsa-navy" aria-hidden />
                <span className="min-w-0 leading-tight">
                  <span className="block break-all text-sm font-semibold text-wsa-navy">{JULIET.email}</span>
                  <span className="block text-xs text-gray-600">{HERO_CONTACT.emailLabel}</span>
                </span>
              </a>
            </div>

            {/* The second clear route, Tim Hunt's wording of 26 September
                2026: a proper button, outlined so WhatsApp above stays the
                primary action while this one is plainly visible. */}
            <div className="mt-7 max-w-xl border-t border-wsa-navy/10 pt-6">
              <p className="text-base font-semibold text-wsa-navy">{HERO.secondary.heading}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{HERO.secondary.supporting}</p>
              <a
                href="#send-details"
                className="mt-3.5 inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl border-2 border-wsa-navy bg-transparent px-6 py-3 text-base font-semibold text-wsa-navy transition hover:bg-wsa-navy hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy sm:w-auto"
              >
                {HERO.secondary.cta}
              </a>
            </div>
          </div>

          {/* Juliet's photograph is the point of the hero, so it is not a
              decorative background: fixed dimensions, no layout shift. The
              caption beneath it is Tim Hunt's, 24 September 2026, in his
              four lines. */}
          <div className="mx-auto w-full max-w-[360px] min-w-0">
            <figure className="min-w-0">
              <img
                src={JULIET.photo}
                alt={JULIET.photoAlt}
                width={600}
                height={800}
                className="block aspect-[3/4] w-full rounded-2xl border border-wsa-navy/10 bg-wsa-stone object-cover object-top shadow-sm"
              />
              <figcaption className="mt-3 text-center leading-snug lg:text-left">
                <span className="block text-base font-semibold text-wsa-navy">{JULIET.name}</span>
                <span className="block text-sm text-gray-700">{JULIET.role}</span>
                <span className="block text-sm text-gray-700">{JULIET_ORGANISATION}</span>
                <span className="block text-sm text-gray-500">{JULIET.location}</span>
              </figcaption>
            </figure>

            {/* Juliet is the face; WSA is the authority. Glenice, in Tim
                Hunt's settled role, stands beside her from the first screen,
                and the free-support badge carries his charging rule. Her real
                photograph, no contact details: all contact is through Juliet. */}
            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-wsa-navy/10 bg-white p-3 shadow-sm">
                <img
                  src={GLENICE.photo}
                  alt={GLENICE.photoAlt}
                  width={64}
                  height={85}
                  decoding="async"
                  className="block aspect-[3/4] w-16 shrink-0 rounded-lg border border-wsa-navy/10 bg-wsa-stone object-cover object-top"
                />
                <div className="min-w-0 leading-snug">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-wsa-red">{BACKED_BY_LABEL}</p>
                  <p className="text-sm font-semibold text-wsa-navy">{GLENICE.name}</p>
                  <p className="text-xs text-gray-700">{GLENICE.role}</p>
                  <p className="text-xs text-gray-500">{GLENICE_HEAD_OFFICE_LINE}</p>
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
      {/* Tim Hunt's support list, from his master draft, as an icon row near
          the top so the WSA offer is visible before the detail. His own
          heading for the list, "Free service from WSA", is the eyebrow. */}
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
      {/* Tim Hunt's flag row, 27 September 2026, names only. The wording
          for each destination stays in Where you could study, in his words. */}
      <section className="border-t border-wsa-navy/10 px-4 py-10 sm:px-6 lg:py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{DESTINATIONS_HEADING}</h2>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-700">{DESTINATIONS_LINE}</p>
          <ul className="mt-7 grid grid-cols-4 gap-x-3 gap-y-6 sm:grid-cols-8">
            {DESTINATION_FLAGS.map(f => (
              <li key={f.code} className="flex flex-col items-center text-center">
                <img
                  src={`/flags/${f.code}.svg`}
                  alt={`Flag of ${f.name === "UK" ? "the United Kingdom" : f.name === "USA" ? "the United States" : f.name === "Europe" ? "the European Union" : f.name}`}
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

      {/* ── Juliet ───────────────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_minmax(300px,420px)] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{JULIET.name}</h2>
            <p className="mt-1 text-lg text-gray-700">{JULIET.role}</p>
            <p className="mt-0.5 text-base text-gray-500">{JULIET.location}</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-700">
              Juliet is your first point of contact in Nigeria. She works with students and families across the country,
              from first questions through to deciding where to apply.
            </p>
            <ContactLines person={JULIET} />
          </div>
          <div className="min-w-0">
            <JulietPodcast />
          </div>
        </div>
      </section>

      {/* ── What Juliet can help with ────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">What you can ask her about</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {STUDY_FAMILIES.map(f => (
              <div key={f.title} className="rounded-2xl border border-wsa-navy/10 bg-white p-5">
                <h3 className="text-lg font-semibold text-wsa-navy">{f.title}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-gray-700">{f.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-gray-500">{AVAILABILITY_NOTE}</p>
        </div>
      </section>

      {/* ── Destinations ─────────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">Where you could study</h2>
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

      {/* ── Glenice ──────────────────────────────────────────────── */}
      {/* Above How this works, at Tim Hunt's request of 24 September 2026:
          at the foot of the page she read as an afterthought, and step 3
          below names her, so the reader should have met her first. Her
          photograph is larger for the same reason. No contact details:
          all contact is through Juliet. */}
      <section className="border-t border-wsa-navy/10 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-wsa-navy/10 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5 sm:flex-nowrap">
            <img
              src={GLENICE.photo}
              alt={GLENICE.photoAlt}
              width={112}
              height={149}
              decoding="async"
              className="block aspect-[3/4] w-28 shrink-0 rounded-xl border border-wsa-navy/10 bg-wsa-stone object-cover object-top"
            />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-tight text-wsa-navy">{GLENICE.name}</h2>
              <p className="mt-0.5 text-base text-gray-700">{GLENICE.role}</p>
              <p className="mt-0.5 text-sm text-gray-500">{GLENICE_HEAD_OFFICE_LINE}</p>
              <p className="mt-3 text-base leading-relaxed text-gray-700">{GLENICE_QUOTE}</p>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Glenice does not contact you at this stage. Juliet speaks to you first, and introduces you to
                Glenice when you decide to go ahead.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">How this works</h2>
          <ol className="mt-7 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-wsa-navy/10 bg-wsa-warm-white p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-wsa-navy text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-wsa-navy">{s.title}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-gray-700">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Tim Hunt's key message ───────────────────────────────── */}
      {/* His own summary of what the page has to leave the reader with,
          in his words. It is the last thing before the form for that
          reason: whatever else a visitor skims, this is the point. */}
      <section className="border-t border-wsa-navy/10 bg-wsa-navy px-4 py-12 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{READY_HEADING}</h2>
          <ul className="mt-5 space-y-2.5">
            {KEY_MESSAGE.map(m => (
              <li key={m} className="text-lg leading-relaxed text-white sm:text-xl">{m}</li>
            ))}
          </ul>
          {/* Both routes again, as in the hero: WhatsApp first, then the
              outlined button to the form, so a reader who has scrolled this
              far has the same two clear choices. */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <WhatsAppButton className="w-full sm:w-auto">{HERO.primaryCta}</WhatsAppButton>
            <a
              href="#send-details"
              className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl border-2 border-white bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-white hover:text-wsa-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
            >
              {HERO.secondary.cta}
            </a>
          </div>
        </div>
      </section>

      {/* ── The form ─────────────────────────────────────────────── */}
      <section id="send-details" className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-wsa-navy/12 bg-wsa-warm-white p-5 shadow-sm sm:p-6">
          <PipedriveForm id="juliet-form" />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
          <Link href="/" className="underline underline-offset-2 hover:text-wsa-navy">World Student Advisors</Link>
          <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-wsa-navy">Privacy policy</Link>
        </div>
      </section>

      {/* Sticky WhatsApp bar, phones only, once the hero button has gone. It
          clears the phone's own home indicator with the safe area inset, and
          the page carries matching bottom padding so it never covers the last
          line of the footer. */}
      {showSticky && (
        <>
          <div aria-hidden className="h-20 sm:hidden" />
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-wsa-navy/10 bg-white/95 px-4 pt-3 backdrop-blur sm:hidden"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <WhatsAppButton className="w-full">{HERO.primaryCta}</WhatsAppButton>
          </div>
        </>
      )}
    </main>
  );
}
