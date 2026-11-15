import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, FileCheck, GraduationCap, Mail, MessageCircle, Plane, Play, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DESTINATION_FLAGS, FORM_FALLBACK, PIPEDRIVE_LOADER_SRC, whatsappHref } from "@/lib/advisorLandingPage";
import { SUCCESS_STORIES_LINK, type CounsellorLandingContent } from "@/lib/counsellorLandingPage";

/**
 * The Student Counsellor landing page, on Tim Hunt's mock-up of 12 November
 * 2026 for Eldah (see client/src/lib/counsellorLandingPage.ts). Every word
 * comes from the content object passed in, so Glenice's and Manet's pages
 * are new content files, not new pages.
 *
 * WhatsApp is the main contact option; the counsellor's own Pipedrive form
 * is the alternative, embedded by Pipedrive's loader, so a submission goes
 * from the visitor's browser to Pipedrive and never touches this server.
 *
 * The video is created only when a visitor presses play, so nothing
 * autoplays and no YouTube request is made before then. The certificate
 * opens in a pop-up, above the cookie banner, so its Close button is never
 * covered on a phone.
 */

const WHATSAPP_GREEN = "#128C7E";
const WSA_LOGO = "/manus-storage/wsa_logo_beb199d6.png";
const HELP_ICONS = { course: GraduationCap, applications: FileCheck, "next-steps": Plane } as const;

function RedRule() {
  return <span aria-hidden className="mt-2 block h-1 w-12 rounded-full bg-wsa-red" />;
}

function WhatsAppButton({
  content,
  message,
  className = "",
  children,
  onRef,
}: {
  content: CounsellorLandingContent;
  message?: string;
  className?: string;
  children: React.ReactNode;
  onRef?: (el: HTMLAnchorElement | null) => void;
}) {
  return (
    <a
      ref={onRef}
      href={whatsappHref(content.person.whatsappDigits, message ?? content.person.firstMessage)}
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

function ContactLines({ content, className = "" }: { content: CounsellorLandingContent; className?: string }) {
  const { person } = content;
  return (
    <ul className={`space-y-2 text-base ${className}`}>
      <li>
        <a
          href={whatsappHref(person.whatsappDigits, person.firstMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 font-semibold text-wsa-navy hover:underline"
        >
          <MessageCircle className="h-5 w-5 shrink-0 text-wsa-red" aria-hidden />
          {person.whatsapp}
        </a>
      </li>
      <li>
        <a href={`mailto:${person.email}`} className="inline-flex items-center gap-2.5 break-all font-semibold text-wsa-navy hover:underline">
          <Mail className="h-5 w-5 shrink-0 text-wsa-red" aria-hidden />
          {person.email}
        </a>
      </li>
    </ul>
  );
}

function Video({ content }: { content: CounsellorLandingContent }) {
  const [playing, setPlaying] = useState(false);
  const { video, person } = content;

  return (
    <figure className="min-w-0">
      {playing ? (
        <div className="overflow-hidden rounded-2xl border border-wsa-navy/12 bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={`${video.label}: ${person.name}`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full max-w-full border-0"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play: ${video.label}`}
          className="group relative block w-full overflow-hidden rounded-2xl border border-wsa-navy/12 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
        >
          <img
            src={person.photo}
            alt=""
            width={person.photoWidth}
            height={person.photoHeight}
            decoding="async"
            loading="lazy"
            className="aspect-video w-full max-w-full object-cover object-[center_20%]"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-wsa-navy/10 transition group-hover:bg-wsa-navy/20">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wsa-red shadow">
              <Play className="ml-0.5 h-6 w-6 text-white" aria-hidden />
            </span>
          </span>
          <span className="absolute bottom-0 left-0 right-0 bg-wsa-navy/80 px-4 py-2 text-left text-base font-semibold text-white">
            {video.label}
          </span>
        </button>
      )}
      <figcaption className="mt-2 text-sm leading-snug text-gray-700">
        {video.caption}{" "}
        <Link href={video.libraryPath} className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red">
          Student Support Library
        </Link>
      </figcaption>
    </figure>
  );
}

function Certificate({ content }: { content: CounsellorLandingContent }) {
  const [open, setOpen] = useState(false);
  const { certificate } = content.credentials;
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={certificate.linkLabel}
        className="block w-32 overflow-hidden rounded-lg border border-wsa-navy/15 bg-white shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy sm:w-36"
      >
        <img src={certificate.src} alt="" width={certificate.width} height={certificate.height} loading="lazy" className="h-auto w-full" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-blue-800 underline underline-offset-2 hover:text-wsa-red"
      >
        {certificate.linkLabel}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          // z-[110]: above the cookie banner (z-[100]).
          className="z-[110] flex max-h-[100dvh] w-full max-w-full flex-col gap-0 rounded-none border-0 bg-white p-0 sm:max-h-[92vh] sm:max-w-lg sm:rounded-2xl sm:border"
        >
          <div className="flex items-center justify-between gap-3 border-b border-wsa-navy/10 px-4 py-3">
            <DialogTitle className="text-base font-semibold text-wsa-navy">British Council certificate</DialogTitle>
            <DialogClose className="flex h-10 w-10 items-center justify-center rounded-lg text-wsa-navy hover:bg-wsa-navy/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wsa-navy">
              <X className="h-5 w-5" aria-hidden />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <img src={certificate.src} alt={certificate.alt} width={certificate.width} height={certificate.height} className="mx-auto h-auto w-full max-w-md" />
          </div>
          <div className="border-t border-wsa-navy/10 px-4 pt-3" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
            <DialogClose className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl bg-wsa-navy px-6 text-base font-semibold text-white hover:opacity-90">
              Close
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The counsellor's Pipedrive form, embedded as supplied. The loader runs
 * once the placeholder is in the document, and the link underneath stays
 * until the form arrives, so a blocked or slow loader never leaves an empty
 * box. The same pattern as the representative pages.
 */
function PipedriveForm({ content }: { content: CounsellorLandingContent }) {
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
    <div className="min-w-0 max-w-full">
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

function FooterBand({ content }: { content: CounsellorLandingContent }) {
  return (
    <section className="bg-sky-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <Link href="/" aria-label="World Student Advisors home">
          <img src={WSA_LOGO} alt="World Student Advisors" className="h-12 w-auto" loading="lazy" />
        </Link>
        <ContactLines content={content} />
      </div>
    </section>
  );
}

export default function CounsellorLandingPage({ content }: { content: CounsellorLandingContent }) {
  const { person, hero } = content;
  const heroCtaRef = useRef<HTMLAnchorElement | null>(null);
  const [showSticky, setShowSticky] = useState(false);

  /** The phone-only sticky WhatsApp bar appears once the hero button has scrolled away. */
  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => setShowSticky(!entries[0].isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="bg-white pt-24 lg:pt-28">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-8 pt-6 sm:px-6 lg:pb-10 lg:pt-10">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-10">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-wsa-navy/15 bg-white px-3 py-1.5 text-sm font-semibold text-wsa-navy">
              <img src="/flags/gb.svg" alt="" width={28} height={21} className="h-[1.05rem] w-7 rounded-[2px] border border-black/10 object-cover" />
              {content.teamBadge}
            </p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-4xl font-bold leading-tight tracking-tight text-wsa-navy sm:text-5xl">{hero.headline}</h1>
                <RedRule />
              </div>
              {/* On a phone the large photograph comes after the contact
                  details, so her face is also here, beside her name. */}
              <img
                src={person.photo}
                alt=""
                width={96}
                height={96}
                className="h-20 w-20 shrink-0 rounded-full border-2 border-wsa-navy/10 object-cover object-[center_15%] lg:hidden"
              />
            </div>
            <p className="mt-4 text-xl font-semibold text-wsa-navy">{hero.subheading}</p>
            {hero.intro.map(p => (
              <p key={p.slice(0, 32)} className="mt-3 max-w-xl text-lg leading-relaxed text-gray-800">{p}</p>
            ))}
            <p className="mt-4 max-w-xl text-lg font-semibold leading-snug text-wsa-navy">{hero.freeLine}</p>
            <div className="mt-6">
              <WhatsAppButton content={content} onRef={el => { heroCtaRef.current = el; }} className="w-full sm:w-auto">
                {hero.primaryCta}
              </WhatsAppButton>
            </div>
            <ContactLines content={content} className="mt-5" />
          </div>
          <div className="mx-auto w-full max-w-md min-w-0 lg:max-w-none">
            <img
              src={person.photo}
              alt={person.photoAlt}
              width={person.photoWidth}
              height={person.photoHeight}
              fetchPriority="high"
              className="block h-auto w-full"
            />
          </div>
        </div>
      </section>

      {/* ── Trust band ───────────────────────────────────────────── */}
      <section className="px-4 sm:px-6">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl bg-sky-50 px-4 py-4 text-center">
          {content.trust.map((t, i) => (
            <li key={t} className="flex items-center gap-4 text-base font-semibold text-wsa-navy sm:text-lg">
              {i > 0 && <span aria-hidden className="h-2 w-2 rounded-full bg-wsa-red" />}
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Video and credentials ────────────────────────────────── */}
      <section className="px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:gap-12">
          <Video content={content} />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-wsa-navy sm:text-3xl">{content.credentials.heading}</h2>
              <RedRule />
              <p className="mt-4 text-lg leading-relaxed text-gray-800">{content.credentials.body}</p>
            </div>
            <Certificate content={content} />
          </div>
        </div>
      </section>

      {/* ── How I can help you ───────────────────────────────────── */}
      <section className="px-4 pb-10 sm:px-6 lg:pb-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight text-wsa-navy sm:text-4xl">{content.help.heading}</h2>
          <RedRule />
          <ul className="mt-7 grid gap-4 md:grid-cols-3">
            {content.help.items.map(item => {
              const Icon = HELP_ICONS[item.icon];
              return (
                <li key={item.title} className="rounded-2xl bg-sky-50 p-5">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-7 w-7 shrink-0 text-wsa-red" aria-hidden />
                    <h3 className="text-lg font-semibold leading-snug text-wsa-navy">{item.title}</h3>
                  </div>
                  <p className="mt-2 text-base leading-relaxed text-gray-800">{item.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Destinations ─────────────────────────────────────────── */}
      <section className="px-4 pb-10 sm:px-6 lg:pb-14">
        <div className="mx-auto max-w-6xl rounded-2xl bg-sky-50 px-4 py-6 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-wsa-navy">{content.destinationsHeading}</h2>
          <ul className="mt-5 grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-8">
            {DESTINATION_FLAGS.map(f => (
              <li key={f.code} className="flex flex-col items-center text-center">
                <img src={`/flags/${f.code}.svg`} alt={f.alt} width={64} height={48} loading="lazy" className="h-12 w-16 rounded-md border border-wsa-navy/10 object-cover shadow-sm" />
                <span className="mt-2 text-sm font-semibold text-wsa-navy">{f.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Student Success Stories ──────────────────────────────── */}
      <section className="px-4 pb-10 sm:px-6 lg:pb-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{content.stories.heading}</h2>
          <RedRule />
          <p className="mt-4 text-lg text-gray-800">{content.stories.body}</p>
          <Link href={SUCCESS_STORIES_LINK} className="mt-2 inline-flex items-center gap-1.5 text-lg font-semibold text-blue-800 underline underline-offset-2 hover:text-wsa-red">
            {content.stories.linkLabel}
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ── The form ─────────────────────────────────────────────── */}
      <section id="send-details" className="px-4 pb-12 sm:px-6 lg:pb-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-wsa-navy/15 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{content.form.heading}</h2>
          <RedRule />
          <p className="mb-4 mt-4 text-base text-gray-800">{content.form.supporting}</p>
          <PipedriveForm content={content} />
        </div>
      </section>

      <FooterBand content={content} />

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

/** Where the counsellor's Pipedrive form can send the student once they have submitted it. */
export function CounsellorThankYouPage({ content }: { content: CounsellorLandingContent }) {
  const { thankYou } = content;
  return (
    <main className="bg-white pt-24 lg:pt-28">
      <section className="px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto flex max-w-xl flex-col items-start gap-5">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-wsa-navy sm:text-4xl">{thankYou.headline}</h1>
          <RedRule />
          <p className="text-lg leading-relaxed text-gray-800">{thankYou.body}</p>
          <WhatsAppButton content={content} message={thankYou.whatsappMessage} className="w-full sm:w-auto">
            {thankYou.whatsappCta}
          </WhatsAppButton>
          <div className="flex flex-col gap-2 text-base">
            <Link href={content.path} className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red">{thankYou.back}</Link>
            <Link href={SUCCESS_STORIES_LINK} className="font-medium text-wsa-navy underline underline-offset-2 hover:text-wsa-red">
              {content.stories.linkLabel}
            </Link>
          </div>
        </div>
      </section>
      <FooterBand content={content} />
    </main>
  );
}
