import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, Mail, MessageCircle, Play } from "lucide-react";
import {
  AVAILABILITY_NOTE,
  CAMPAIGN_DESTINATIONS,
  DESTINATIONS,
  DESTINATIONS_LINE,
  FORM,
  FORM_STUDY_OPTIONS,
  GLENICE,
  GLENICE_QUOTE,
  HELP_ME_DECIDE,
  HERO,
  JULIET,
  JULIET_VIDEO,
  STEPS,
  STUDY_FAMILIES,
  SUPPORT_HEADING,
  SUPPORT_STEPS,
  WHATSAPP_FIRST_MESSAGE,
  whatsappHref,
} from "@/lib/speakToJuliet";
import { toInternationalNigerianNumber, NIGERIA_DIALLING_CODE } from "@/lib/nigeriaLanding";

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
 * THE FORM CREATES NO LEAD. It hands what the student typed to the /contact
 * signup, exactly as the Nigeria postgraduate page does, because that is the
 * one controlled path into the CRM and it carries the validation, the bot
 * check and the conversion tracking. Nothing here writes to Pipedrive.
 *
 * The copy lives in client/src/lib/speakToJuliet.ts, including everything Tim
 * Hunt may still reword, so his revision does not touch this file.
 */

const WHATSAPP_GREEN = "#128C7E";

/* ------------------------------------------------------------------ */

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
      href={whatsappHref(JULIET.whatsappDigits, WHATSAPP_FIRST_MESSAGE)}
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
 * Juliet's introduction, shown as a poster with a play control. The YouTube
 * iframe does not exist until a visitor asks for it, so the page never
 * autoplays and never spends a visitor's data on a video they did not start.
 */
function JulietVideo() {
  const [playing, setPlaying] = useState(false);

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative block w-full overflow-hidden rounded-2xl border border-wsa-navy/12 bg-wsa-stone focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
      >
        {/* Juliet's own photograph, not YouTube's thumbnail. It is served
            from this site, so it always loads, and the page makes no request
            to a third party before a visitor has asked to watch anything. */}
        <img
          src={JULIET.photo}
          alt=""
          width={600}
          height={800}
          loading="lazy"
          className="aspect-video w-full max-w-full object-cover object-[center_25%]"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-wsa-navy/25 transition group-hover:bg-wsa-navy/35">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow">
            <Play className="ml-0.5 h-6 w-6 text-wsa-navy" aria-hidden />
          </span>
        </span>
        <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-wsa-navy/85 to-transparent px-4 pb-3 pt-8 text-left">
          <span className="block text-sm font-semibold text-white">
            {JULIET_VIDEO.title}, {JULIET_VIDEO.duration}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-white/85">{JULIET_VIDEO.blurb}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-wsa-navy/12 bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${JULIET_VIDEO.youtubeId}?autoplay=1&rel=0`}
        title={`${JULIET_VIDEO.title}. ${JULIET_VIDEO.blurb}`}
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full max-w-full border-0"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The fallback enquiry form. Five fields, the same five the Nigeria
 * postgraduate page asks for, because that is the least that lets Juliet
 * start. Family name and funding are not asked at first contact: the signup
 * form collects what it needs if the enquiry goes anywhere.
 */
function FallbackForm({ id }: { id: string }) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("");
  const [destination, setDestination] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (firstName.trim()) params.set("firstName", firstName.trim());
    if (email.trim()) params.set("email", email.trim());
    // Handed over in international form or not at all. A mangled number is
    // worse than a missing one.
    const international = toInternationalNigerianNumber(phone);
    if (international) params.set("phone", international);
    if (level) params.set("desiredLevel", level);
    if (destination) params.set("preferredDestination", destination);
    window.location.assign(`/contact?${params.toString()}#student-signup`);
  };

  const field =
    "w-full min-w-0 max-w-full rounded-xl border border-wsa-navy/15 bg-white px-4 py-3 text-base text-wsa-navy placeholder:text-gray-400 focus:border-wsa-red/60 focus:outline-none";

  return (
    <form onSubmit={submit} className="min-w-0 max-w-full space-y-2.5" aria-labelledby={`${id}-heading`}>
      <p id={`${id}-heading`} className="text-lg font-semibold text-wsa-navy">
        {FORM.heading}
      </p>
      <p className="pb-1 text-sm text-gray-600">{FORM.supporting}</p>

      <label className="sr-only" htmlFor={`${id}-first`}>First name</label>
      <input
        id={`${id}-first`}
        value={firstName}
        onChange={e => setFirstName(e.target.value)}
        placeholder="First name"
        autoComplete="given-name"
        required
        className={field}
      />

      <label className="sr-only" htmlFor={`${id}-phone`}>WhatsApp number</label>
      <div className="flex min-w-0 max-w-full items-stretch overflow-hidden rounded-xl border border-wsa-navy/15 bg-white focus-within:border-wsa-red/60">
        <span className="flex items-center border-r border-wsa-navy/10 bg-wsa-stone/60 px-3 text-base text-gray-600" aria-hidden>
          {NIGERIA_DIALLING_CODE}
        </span>
        <input
          id={`${id}-phone`}
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="WhatsApp number"
          autoComplete="tel"
          required
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-wsa-navy placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      <label className="sr-only" htmlFor={`${id}-email`}>Email address</label>
      <input
        id={`${id}-email`}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email address"
        autoComplete="email"
        required
        className={field}
      />

      <label className="sr-only" htmlFor={`${id}-level`}>What you want to study</label>
      <select
        id={`${id}-level`}
        value={level}
        onChange={e => setLevel(e.target.value)}
        required
        className={`${field} ${level ? "" : "text-gray-400"}`}
      >
        <option value="">What do you want to study?</option>
        {FORM_STUDY_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor={`${id}-destination`}>Preferred destination</label>
      <select
        id={`${id}-destination`}
        value={destination}
        onChange={e => setDestination(e.target.value)}
        className={`${field} ${destination ? "" : "text-gray-400"}`}
      >
        <option value="">Preferred destination (optional)</option>
        {CAMPAIGN_DESTINATIONS.map(d => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
        <option value={HELP_ME_DECIDE}>Help me decide</option>
      </select>

      <button
        type="submit"
        className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-wsa-red px-5 py-3.5 text-base font-semibold text-white transition hover:bg-wsa-red/90"
      >
        {FORM.submit}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>

      <p className="pt-0.5 text-xs leading-relaxed text-gray-500">
        We use your details to advise you on studying abroad. See our{" "}
        <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-wsa-navy">privacy policy</Link>.
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function ContactLines({ person }: { person: { whatsapp: string; whatsappDigits: string; email: string; name: string } }) {
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
            <p className="text-sm font-semibold uppercase tracking-wider text-wsa-red">{HERO.eyebrow}</p>
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
              decorative background: fixed dimensions, no layout shift. */}
          <div className="min-w-0">
            <img
              src={JULIET.photo}
              alt={JULIET.photoAlt}
              width={600}
              height={800}
              className="mx-auto block aspect-[3/4] w-full max-w-[320px] rounded-2xl border border-wsa-navy/10 bg-wsa-stone object-cover object-top shadow-sm lg:max-w-none"
            />
          </div>
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
            <JulietVideo />
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

          {/* What WSA does alongside the student. Tim Hunt's list, under a
              heading that makes no cost claim while the charging wording is
              unconfirmed. */}
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

      {/* ── Glenice ──────────────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-wsa-navy/10 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
            <img
              src={GLENICE.photo}
              alt={GLENICE.photoAlt}
              width={80}
              height={107}
              loading="lazy"
              className="block aspect-[3/4] w-20 shrink-0 rounded-xl border border-wsa-navy/10 bg-wsa-stone object-cover object-top"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight text-wsa-navy">{GLENICE.name}</h2>
              <p className="mt-0.5 text-base text-gray-700">{GLENICE.role}</p>
              <p className="mt-3 text-base leading-relaxed text-gray-700">{GLENICE_QUOTE}</p>
              <ContactLines person={GLENICE} />
            </div>
          </div>
        </div>
      </section>

      {/* ── The fallback form ────────────────────────────────────── */}
      <section id="send-details" className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-wsa-navy/12 bg-wsa-warm-white p-5 shadow-sm sm:p-6">
          <FallbackForm id="juliet-form" />
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
