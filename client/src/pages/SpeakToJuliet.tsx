import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Check, Mail, MessageCircle, Play } from "lucide-react";
import {
  AVAILABILITY_NOTE,
  DESTINATIONS,
  DESTINATIONS_LINE,
  GLENICE,
  GLENICE_QUOTE,
  HERO,
  JULIET,
  JULIET_ORGANISATION,
  JULIET_PODCAST,
  GLENICE_HEAD_OFFICE_LINE,
  KEY_MESSAGE,
  type PersonCard,
  PIPEDRIVE_FORM,
  STEPS,
  STUDY_FAMILIES,
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
 * Tim Hunt has withdrawn both recordings made so far, the second on 24
 * September 2026 because of a telephone number error, and the next will have
 * a different link. Until its id is set the section holds the space with a
 * short, honest line: provision for the podcast rather than a broken player,
 * and no request to YouTube at all meanwhile.
 *
 * Once JULIET_PODCAST.youtubeId is set, the poster and player below appear
 * with no other change. The iframe is still only created when a visitor asks
 * for it, so nothing autoplays.
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
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_minmax(300px,400px)] lg:items-center lg:gap-12">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-wsa-red">
              <NigerianFlag className="h-7 w-[2.625rem] shrink-0" />
              {HERO.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-wsa-navy sm:text-4xl lg:text-5xl">
              {HERO.headline}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-700">{HERO.supporting}</p>

            <div className="mt-7">
              <WhatsAppButton onRef={el => { heroCtaRef.current = el; }} className="w-full sm:w-auto">
                {HERO.primaryCta}
              </WhatsAppButton>
            </div>

            <p className="mt-3.5 text-sm text-gray-600">
              <a href="#send-details" className="underline underline-offset-2 hover:text-wsa-navy">
                {HERO.secondaryCta}
              </a>
            </p>
          </div>

          {/* Juliet's photograph is the point of the hero, so it is not a
              decorative background: fixed dimensions, no layout shift. The
              caption beneath it is Tim Hunt's, 24 September 2026, in his
              four lines. */}
          <figure className="mx-auto w-full max-w-[320px] min-w-0 lg:max-w-none">
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

          <h3 className="mt-10 text-lg font-semibold text-wsa-navy">{SUPPORT_HEADING}</h3>
          <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORT_STEPS.map(s => (
              <li key={s} className="flex items-start gap-2 text-base leading-relaxed text-gray-700">
                <Check className="mt-1 h-4 w-4 shrink-0 text-wsa-red" aria-hidden />
                <span>{s}</span>
              </li>
            ))}
          </ul>
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
          <ul className="space-y-2.5">
            {KEY_MESSAGE.map(m => (
              <li key={m} className="text-lg leading-relaxed text-white sm:text-xl">{m}</li>
            ))}
          </ul>
          <div className="mt-7">
            <WhatsAppButton className="w-full sm:w-auto">Speak to Juliet</WhatsAppButton>
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
