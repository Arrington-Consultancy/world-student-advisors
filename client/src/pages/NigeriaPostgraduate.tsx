import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, BadgeCheck, BookOpen, CheckCircle2, FileText, Mail, MessageCircle, MessageSquare, ShieldCheck, UserRound } from "lucide-react";
import {
  BENEFITS,
  CAMPAIGN_DESTINATIONS,
  CAMPAIGN_PROGRAMMES,
  COUNSELLORS,
  HELP_CONTACT,
  HELP_ME_DECIDE,
  LIBRARY,
  NIGERIA_DIALLING_CODE,
  OTHER_DESTINATIONS_NOTE,
  toInternationalNigerianNumber,
} from "@/lib/nigeriaLanding";

/**
 * Nigeria postgraduate landing page. Working draft, 12 September 2026.
 *
 * Built to the Tom-approved Implementation Direction of 12 September 2026
 * and the review of the same date. Deliberately simple: who it is for,
 * why WSA, who you will actually deal with, and one short form.
 *
 * NOT FOR PAID TRAFFIC YET. The controlled Google Ads brief of 15 August
 * 2026 covers taught Master's only, and this page follows the wider
 * MPhil/MRes/PhD direction. The route is left out of the sitemap and the
 * prerender list, and carries noindex, until that is reconciled.
 *
 * The short form does not create leads itself. It hands what the student
 * typed to the existing /contact signup, which is the one controlled path
 * into Pipedrive and carries the validation and the bot check. A second,
 * weaker lead route would be a real risk for the sake of a few fields.
 */

const FLAG_GREEN = "#008751";

/** The Nigerian flag, drawn rather than fetched, so the hero has no image dependency. */
function NigerianFlag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex overflow-hidden rounded-[2px] border border-black/10 ${className}`}
      role="img"
      aria-label="Flag of Nigeria"
    >
      <span className="block h-full w-1/3" style={{ backgroundColor: FLAG_GREEN }} />
      <span className="block h-full w-1/3 bg-white" />
      <span className="block h-full w-1/3" style={{ backgroundColor: FLAG_GREEN }} />
    </span>
  );
}

const BENEFIT_ICONS = [UserRound, FileText, MessageSquare, ShieldCheck];

/**
 * The short CTA form. Five fields, which is the least that lets a
 * counsellor start, and then straight into the controlled signup with
 * those answers carried across.
 */
function EnquiryForm({ id }: { id: string }) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("");
  const [destination, setDestination] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (firstName.trim()) params.set("firstName", firstName.trim());
    if (email.trim()) params.set("email", email.trim());
    // A local Nigerian number is handed over in international form, or not
    // at all. A mangled number is worse than a missing one.
    const international = toInternationalNigerianNumber(phone);
    if (international) params.set("phone", international);
    // The value the student picked is the value that is recorded. Taught
    // Master's, MPhil, MRes and PhD stay four things, and Germany stays
    // Germany, all the way into the CRM.
    if (level) params.set("desiredLevel", level);
    if (destination) params.set("preferredDestination", destination);
    window.location.assign(`/contact?${params.toString()}#student-signup`);
  };

  const field =
    "w-full rounded-xl border border-wsa-navy/15 bg-white px-4 py-3 text-base text-wsa-navy placeholder:text-gray-400 focus:border-wsa-red/60 focus:outline-none";

  return (
    <form onSubmit={submit} className="space-y-2.5" aria-labelledby={`${id}-heading`}>
      <p id={`${id}-heading`} className="text-lg font-semibold text-wsa-navy">
        Speak to a counsellor
      </p>
      <p className="pb-1 text-sm text-gray-600">Five questions now, the rest on the next page.</p>
      <label className="sr-only" htmlFor={`${id}-first`}>First name</label>
      <input id={`${id}-first`} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" required className={field} />
      <label className="sr-only" htmlFor={`${id}-email`}>Email address</label>
      <input id={`${id}-email`} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" required className={field} />
      <label className="sr-only" htmlFor={`${id}-phone`}>WhatsApp number</label>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-wsa-navy/15 bg-white focus-within:border-wsa-red/60">
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
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-wsa-navy placeholder:text-gray-400 focus:outline-none"
        />
      </div>
      <label className="sr-only" htmlFor={`${id}-level`}>What you want to study</label>
      <select id={`${id}-level`} value={level} onChange={e => setLevel(e.target.value)} required className={`${field} ${level ? "" : "text-gray-400"}`}>
        <option value="">What do you want to study?</option>
        {CAMPAIGN_PROGRAMMES.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`${id}-destination`}>Preferred destination</label>
      <select id={`${id}-destination`} value={destination} onChange={e => setDestination(e.target.value)} className={`${field} ${destination ? "" : "text-gray-400"}`}>
        <option value="">Preferred destination (optional)</option>
        {CAMPAIGN_DESTINATIONS.map(d => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
        <option value={HELP_ME_DECIDE}>Help me decide</option>
      </select>
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-wsa-red px-5 py-3.5 text-base font-semibold text-white transition hover:bg-wsa-red/90"
      >
        Get my study options
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
      <p className="pt-0.5 text-xs leading-relaxed text-gray-500">
        We use your details to advise you on studying abroad. See our{" "}
        <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-wsa-navy">privacy policy</Link>.
      </p>
    </form>
  );
}

/**
 * A counsellor, with a credential only where WSA holds the certificate.
 * The British Council's own disclaimer sits next to the credential, so
 * the page never reads as though the British Council endorses WSA.
 */
function CounsellorCard({ person }: { person: (typeof COUNSELLORS)[number] }) {
  return (
    <div className="rounded-2xl border border-wsa-navy/10 bg-white p-5">
      <div className="flex items-start gap-4">
        <img
          src={person.photo}
          alt={`${person.name}, ${person.role} at World Student Advisors`}
          width={80}
          height={80}
          loading="lazy"
          className="h-20 w-20 shrink-0 rounded-full border border-wsa-navy/10 bg-wsa-stone object-cover"
        />
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight text-wsa-navy">{person.name}</p>
          <p className="mt-0.5 text-base text-gray-700">{person.role}</p>
          <p className="mt-0.5 text-sm text-gray-500">{person.location}</p>
        </div>
      </div>

      {/* Contact details appear only for a person who has approved them in
          writing. Babatunde has not, so his card shows none. */}
      {person.contact && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={person.contact.whatsappHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#128C7E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#0f7568]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            WhatsApp {person.contact.whatsapp}
          </a>
          <a
            href={`mailto:${person.contact.email}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-wsa-navy/20 px-3.5 py-2 text-sm font-medium text-wsa-navy transition hover:border-wsa-red/50 hover:text-wsa-red"
          >
            <Mail className="h-4 w-4" aria-hidden />
            Email
          </a>
        </div>
      )}

      {person.credential && (
        <div className="mt-4 rounded-xl bg-wsa-stone/70 p-3.5">
          <p className="flex items-start gap-2 text-sm font-medium text-wsa-navy">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-wsa-red" aria-hidden />
            <span>
              {person.credential.label}
              <span className="block font-normal text-gray-600">
                Valid to {person.credential.validUntil}. Certificate {person.credential.certificateCode}.
              </span>
            </span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{person.credential.disclaimer}</p>
          {person.credential.href ? (
            <a href={person.credential.href} className="mt-2 inline-block text-sm font-medium text-wsa-red underline underline-offset-2">
              View the certificate
            </a>
          ) : (
            <p className="mt-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-2.5 py-1.5 text-xs leading-relaxed text-amber-900">
              PLACEHOLDER: the certificate file is held in SharePoint but is not yet published here. It needs to be
              placed in the campaign asset location and cleared with {person.name} before it goes on a public page.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function NigeriaPostgraduate() {
  return (
    // The marketing header is fixed, so the page starts below it.
    <main className="bg-wsa-warm-white pt-24 lg:pt-28">
      {/* Draft banner. Removed when the campaign scope is reconciled. */}
      <div className="border-y border-amber-300 bg-amber-50 px-4 py-2.5 text-center">
        <p className="mx-auto max-w-3xl text-sm leading-relaxed text-amber-900">
          <span className="font-semibold">Working draft.</span> Not published for paid traffic. The controlled Google Ads
          brief covers taught Master&rsquo;s only and needs reconciling with the MPhil, MRes and PhD scope first.
        </p>
      </div>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="px-4 pb-10 pt-8 sm:px-6 lg:pb-16 lg:pt-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_minmax(320px,420px)] lg:items-start lg:gap-12">
          <div>
            <p className="flex items-center gap-2.5">
              <NigerianFlag className="h-4 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wider text-wsa-navy">For Nigerian graduates</span>
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-[1.12] tracking-tight text-wsa-navy sm:text-4xl lg:text-5xl">
              Postgraduate study abroad, planned with one person who knows your case
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-700">
              Taught Master&rsquo;s, MRes, MPhil and PhD. You get your own Personal Student Counsellor from your first
              question through to your visa preparation.
            </p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {CAMPAIGN_PROGRAMMES.map(p => (
                <li key={p.value} className="rounded-full border border-wsa-navy/15 bg-white px-3.5 py-1.5 text-sm font-medium text-wsa-navy">
                  {p.label}
                </li>
              ))}
            </ul>

            <div className="mt-7 overflow-hidden rounded-2xl">
              <img
                src="/manus-storage/wsa_confident_graduate_0e9accf4.jpg"
                alt="A World Student Advisors student in the United Kingdom"
                width={1000}
                height={560}
                className="h-52 w-full object-cover object-center sm:h-72 lg:h-80"
              />
            </div>
          </div>

          {/* The form sits high on mobile too: it is the point of the page. */}
          <div className="rounded-2xl border border-wsa-navy/12 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <EnquiryForm id="hero-form" />
          </div>
        </div>
      </section>

      {/* ── Why WSA ─────────────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">What you get with WSA</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((b, i) => {
              const Icon = BENEFIT_ICONS[i] ?? CheckCircle2;
              return (
                <div key={b.title} className="rounded-2xl border border-wsa-navy/10 bg-wsa-warm-white p-5">
                  <Icon className="h-6 w-6 text-wsa-red" aria-hidden />
                  <h3 className="mt-3 text-lg font-semibold leading-snug text-wsa-navy">{b.title}</h3>
                  <p className="mt-1.5 text-base leading-relaxed text-gray-700">{b.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── The people ──────────────────────────────────────────── */}
      <section className="px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">Who you will be dealing with</h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-700">
            Real people, based in Nigeria. Your counsellor is named and stays with you.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {COUNSELLORS.map(p => (
              <CounsellorCard key={p.name} person={p} />
            ))}
          </div>
          <Link
            href="/counsellors"
            className="mt-5 inline-flex items-center gap-1.5 text-base font-medium text-wsa-red underline-offset-2 hover:underline"
          >
            See the full WSA team
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ── Destinations, as text. No thumbnail strip. ──────────── */}
      <section className="border-y border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">Where we place postgraduates</h2>
          <ul className="mt-6 space-y-3">
            {CAMPAIGN_DESTINATIONS.map(d => (
              <li key={d.value} className="flex items-start gap-3">
                <CheckCircle2 className={`mt-1 h-5 w-5 shrink-0 ${d.emphasis === "primary" ? "text-wsa-red" : "text-wsa-navy/35"}`} aria-hidden />
                <p className="text-base leading-relaxed text-gray-700">
                  <span className="font-semibold text-wsa-navy">{d.label}.</span> {d.note}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-gray-500">{OTHER_DESTINATIONS_NOTE}</p>
        </div>
      </section>

      {/* ── Student Support Library ─────────────────────────────── */}
      <section className="px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-wsa-navy/10 bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 max-w-2xl">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-wsa-red">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Free to use
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-wsa-navy">{LIBRARY.title}</h2>
                <p className="mt-2 text-base leading-relaxed text-gray-700">{LIBRARY.body}</p>
                <Link
                  href={LIBRARY.path}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-wsa-navy/20 px-4 py-2.5 text-base font-medium text-wsa-navy transition hover:border-wsa-red/50 hover:text-wsa-red"
                >
                  Open the library
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              {/* Restrained QR: encodes the real library URL, nothing else.
                  Hidden on small screens, where a QR code is useless. */}
              <div className="hidden shrink-0 text-center sm:block">
                <img
                  src="/images/nigeria-landing/student-support-library-qr.svg"
                  alt="QR code linking to the WSA Student Support Library"
                  width={120}
                  height={120}
                  loading="lazy"
                  className="h-[120px] w-[120px] rounded-lg border border-wsa-navy/10 bg-white p-1.5"
                />
                <p className="mt-1.5 text-xs text-gray-500">Scan to open</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="bg-wsa-navy px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1fr_minmax(320px,420px)]">
          <div>
            <p className="flex items-center gap-2.5">
              <NigerianFlag className="h-4 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wider text-white/70">For Nigerian graduates</span>
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              Start with a conversation, not a form letter
            </h2>
            <p className="mt-3 max-w-xl text-lg leading-relaxed text-white/80">
              Tell us what you studied and what you want to do next. Your counsellor will take it from there.
            </p>
            {/* The named help route. Eldah approved her number and email in
                writing on 12 September 2026; nobody else's appear. */}
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4">
              <p className="text-sm uppercase tracking-wider text-white/60">Would rather just ask someone?</p>
              <p className="mt-1.5 text-base text-white/90">
                {HELP_CONTACT.name}, {HELP_CONTACT.role}, answers WhatsApp directly.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={HELP_CONTACT.whatsappHref}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#128C7E] px-4 py-2.5 text-base font-medium text-white transition hover:bg-[#0f7568]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  {HELP_CONTACT.whatsapp}
                </a>
                <a
                  href={`mailto:${HELP_CONTACT.email}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 px-4 py-2.5 text-base font-medium text-white transition hover:border-white/50"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  Email Eldah
                </a>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <EnquiryForm id="footer-form" />
          </div>
        </div>
      </section>
    </main>
  );
}
