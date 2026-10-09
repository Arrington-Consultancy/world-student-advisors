import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  GraduationCap,
  Landmark,
  Loader2,
  PenLine,
  School,
  Sparkles,
  Sun,
  Trophy,
  Users,
} from "lucide-react";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";
import { useTurnstileSiteKey } from "@/hooks/useTurnstileSiteKey";
import { trpc } from "@/lib/trpc";
import { NIGERIA_DIALLING_CODE } from "@/lib/nigeriaLanding";
import {
  AWARDS,
  BEHIND,
  DRAFT,
  ENQUIRER_ROLES,
  EXPRESS_INTEREST,
  FOOTER_LINE,
  HERO,
  OPPORTUNITIES,
  OPPORTUNITY_CARDS,
  PARTNERS,
  PATRON,
  QURANIC,
  STEPS,
  TIMELINE,
  VISION,
  WHAT_IS,
  WHO_FOR,
  expressInterestHandoffUrl,
} from "@/lib/sarkinFulani";
import {
  NIGERIAN_STATES,
  QURANIC_FIELD_LIMITS,
  SCHOOL_TYPES,
  TAKEN_PART_OPTIONS,
  type QuranicSchoolRegistration,
} from "@shared/quranicCompetition";

/**
 * The Sarkin Fulani Future Leaders Programme. Tim Hunt's brief of 8 October
 * 2026, built from Farooq Gajo's revised proposal.
 *
 * TWO FORMS, TWO DESTINATIONS, and the page keeps them apart.
 *
 * The Expression of Interest (families) hands the visitor's answers to the
 * /contact sign-up, the one controlled path into Pipedrive, carrying the
 * campaign slug so the Lead note names this programme and the Student
 * Counsellors receive it. Nothing on this page writes to Pipedrive.
 *
 * The school registration for His Royal Highness's Annual Quranic
 * Memorisation Competition (schools) is the King's own and goes to the
 * Competition Committee in Nigeria by email, through
 * programme.registerQuranicCompetitionSchool. It never becomes a WSA Lead.
 *
 * MOBILE FIRST, for Nigeria: one column, no stock photography, no
 * third-party script before a visitor acts (Turnstile loads with the
 * school form only), the seal and logos served from this site at phone
 * sizes, and a sticky bar once the hero button has scrolled away.
 *
 * The copy lives in client/src/lib/sarkinFulani.ts.
 */

const GOLD = "#B8922E";

const OPPORTUNITY_ICONS: Record<string, typeof GraduationCap> = {
  "full-time": GraduationCap,
  football: Trophy,
  vector: Sparkles,
  "summer-schools": Sun,
  essay: PenLine,
};

const field =
  "w-full min-w-0 max-w-full rounded-xl border border-wsa-navy/15 bg-white px-4 py-3 text-base text-wsa-navy placeholder:text-gray-400 focus:border-wsa-red/60 focus:outline-none";
const labelClass = "block text-sm font-medium text-wsa-navy";

function PrimaryButton({ href, children, onRef, className = "" }: { href: string; children: React.ReactNode; onRef?: (el: HTMLAnchorElement | null) => void; className?: string }) {
  return (
    <a
      ref={onRef}
      href={href}
      className={`inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl bg-wsa-red px-6 py-3.5 text-base font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy ${className}`}
    >
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Six questions, then the controlled sign-up with those answers carried
 * across. Visible labels rather than placeholders: a parent on a phone
 * should never lose sight of what a box is for.
 */
function ExpressInterestForm({ id }: { id: string }) {
  const [role, setRole] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [opportunity, setOpportunity] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    window.location.assign(expressInterestHandoffUrl({ role, firstName, lastName, email, phone, opportunity }));
  };

  return (
    <form onSubmit={submit} className="min-w-0 max-w-full space-y-3.5" aria-labelledby={`${id}-heading`}>
      <div>
        <p id={`${id}-heading`} className="text-xl font-semibold text-wsa-navy">{EXPRESS_INTEREST.heading}</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{EXPRESS_INTEREST.supporting}</p>
        <p className="mt-1 text-xs text-gray-500">{EXPRESS_INTEREST.nextPageLine}</p>
      </div>

      <div>
        <label className={labelClass} htmlFor={`${id}-role`}>I am a</label>
        <select id={`${id}-role`} value={role} onChange={e => setRole(e.target.value)} required className={`${field} mt-1 ${role ? "" : "text-gray-400"}`}>
          <option value="">Please choose</option>
          {ENQUIRER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`${id}-first`}>First name</label>
          <input id={`${id}-first`} value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" required maxLength={60} className={`${field} mt-1`} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${id}-last`}>Family name</label>
          <input id={`${id}-last`} value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" required maxLength={60} className={`${field} mt-1`} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`${id}-email`}>Email address</label>
        <input id={`${id}-email`} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required maxLength={120} className={`${field} mt-1`} />
      </div>

      <div>
        <label className={labelClass} htmlFor={`${id}-phone`}>WhatsApp number</label>
        <div className="mt-1 flex min-w-0 max-w-full items-stretch overflow-hidden rounded-xl border border-wsa-navy/15 bg-white focus-within:border-wsa-red/60">
          <span className="flex items-center border-r border-wsa-navy/10 bg-wsa-stone/60 px-3 text-base text-gray-600" aria-hidden>
            {NIGERIA_DIALLING_CODE}
          </span>
          <input
            id={`${id}-phone`}
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="tel-national"
            inputMode="tel"
            placeholder="803 123 4567"
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-wsa-navy placeholder:text-gray-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`${id}-opportunity`}>Which opportunity interests you?</label>
        <select id={`${id}-opportunity`} value={opportunity} onChange={e => setOpportunity(e.target.value)} required className={`${field} mt-1 ${opportunity ? "" : "text-gray-400"}`}>
          <option value="">Please choose</option>
          {OPPORTUNITIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <button
        type="submit"
        className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl bg-wsa-red px-6 py-3.5 text-base font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
      >
        {EXPRESS_INTEREST.cta}
      </button>

      <p className="text-xs leading-relaxed text-gray-500">{EXPRESS_INTEREST.noPromise}</p>
      <p className="text-xs leading-relaxed text-gray-500">
        {EXPRESS_INTEREST.privacy} See our{" "}
        <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-wsa-navy">privacy policy</Link>.
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ */

type RegistrationState = Omit<QuranicSchoolRegistration, "schoolType" | "state" | "takenPartBefore"> & {
  schoolType: string;
  state: string;
  takenPartBefore: string;
};

const BLANK_REGISTRATION: RegistrationState = {
  schoolName: "",
  schoolType: "",
  town: "",
  state: "",
  contactName: "",
  contactRole: "",
  phone: "",
  email: "",
  expectedEntrants: "",
  ageGroups: "",
  takenPartBefore: "",
  message: "",
};

/**
 * The school registration for His Royal Highness's competition. Sent to
 * the Competition Committee, with the bot check and a honeypot because it
 * sends email. The fields are a working set to be finalised with the
 * Committee (shared/quranicCompetition.ts).
 */
function QuranicSchoolForm({ id }: { id: string }) {
  const [form, setForm] = useState<RegistrationState>(BLANK_REGISTRATION);
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const siteKey = useTurnstileSiteKey();

  const mutation = trpc.programme.registerQuranicCompetitionSchool.useMutation({
    onSuccess: result => {
      if (result.success) {
        setSent(true);
      } else {
        setError(result.error);
        setTurnstileToken("");
        turnstileRef.current?.reset();
      }
    },
    onError: err => {
      setError(err.message || "Something went wrong. Please try again in a few minutes.");
      setTurnstileToken("");
      turnstileRef.current?.reset();
    },
  });

  const set = (key: keyof RegistrationState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mutation.isPending) return;
    if (!turnstileToken) {
      setError("Please complete the verification check below, then try again.");
      return;
    }
    mutation.mutate({
      ...form,
      schoolType: form.schoolType as QuranicSchoolRegistration["schoolType"],
      state: form.state as QuranicSchoolRegistration["state"],
      takenPartBefore: form.takenPartBefore as QuranicSchoolRegistration["takenPartBefore"],
      website,
      turnstileToken,
    });
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-700/25 bg-white p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" aria-hidden />
        <h3 className="mt-3 text-xl font-semibold text-wsa-navy">{QURANIC.successHeading}</h3>
        <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-gray-700">{QURANIC.successLine}</p>
      </div>
    );
  }

  const L = QURANIC_FIELD_LIMITS;

  return (
    <form onSubmit={submit} className="min-w-0 max-w-full space-y-3.5" aria-labelledby={`${id}-heading`}>
      <div>
        <p id={`${id}-heading`} className="text-xl font-semibold text-wsa-navy">{QURANIC.formHeading}</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{QURANIC.formSupporting}</p>
      </div>

      <div>
        <label className={labelClass} htmlFor={`${id}-school`}>School name</label>
        <input id={`${id}-school`} value={form.schoolName} onChange={set("schoolName")} required maxLength={L.schoolName} autoComplete="organization" className={`${field} mt-1`} />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`${id}-type`}>Type of school</label>
          <select id={`${id}-type`} value={form.schoolType} onChange={set("schoolType")} required className={`${field} mt-1 ${form.schoolType ? "" : "text-gray-400"}`}>
            <option value="">Please choose</option>
            {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor={`${id}-state`}>State</label>
          <select id={`${id}-state`} value={form.state} onChange={set("state")} required className={`${field} mt-1 ${form.state ? "" : "text-gray-400"}`}>
            <option value="">Please choose</option>
            {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`${id}-town`}>Town or city</label>
        <input id={`${id}-town`} value={form.town} onChange={set("town")} required maxLength={L.town} autoComplete="address-level2" className={`${field} mt-1`} />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`${id}-contact`}>Contact name</label>
          <input id={`${id}-contact`} value={form.contactName} onChange={set("contactName")} required maxLength={L.contactName} autoComplete="name" className={`${field} mt-1`} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${id}-role`}>Role at the school</label>
          <input id={`${id}-role`} value={form.contactRole} onChange={set("contactRole")} required maxLength={L.contactRole} placeholder="Head teacher, Quran teacher, administrator" className={`${field} mt-1`} />
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`${id}-phone`}>Phone or WhatsApp number</label>
          <input id={`${id}-phone`} type="tel" value={form.phone} onChange={set("phone")} required maxLength={L.phone} autoComplete="tel" inputMode="tel" className={`${field} mt-1`} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${id}-email`}>Email address <span className="font-normal text-gray-500">(optional)</span></label>
          <input id={`${id}-email`} type="email" value={form.email} onChange={set("email")} maxLength={L.email} autoComplete="email" className={`${field} mt-1`} />
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`${id}-entrants`}>Students you expect to enter</label>
          <input id={`${id}-entrants`} value={form.expectedEntrants} onChange={set("expectedEntrants")} required maxLength={L.expectedEntrants} inputMode="numeric" placeholder="For example 12" className={`${field} mt-1`} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${id}-ages`}>Age groups <span className="font-normal text-gray-500">(optional)</span></label>
          <input id={`${id}-ages`} value={form.ageGroups} onChange={set("ageGroups")} maxLength={L.ageGroups} placeholder="For example 8 to 12 and 13 to 16" className={`${field} mt-1`} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`${id}-before`}>Has your school taken part before?</label>
        <select id={`${id}-before`} value={form.takenPartBefore} onChange={set("takenPartBefore")} required className={`${field} mt-1 ${form.takenPartBefore ? "" : "text-gray-400"}`}>
          <option value="">Please choose</option>
          {TAKEN_PART_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor={`${id}-message`}>Message for the Committee <span className="font-normal text-gray-500">(optional)</span></label>
        <textarea id={`${id}-message`} value={form.message} onChange={set("message")} maxLength={L.message} rows={4} className={`${field} mt-1`} />
      </div>

      {/* Honeypot: hidden from people, filled by bots. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
      </div>

      <TurnstileWidget
        ref={turnstileRef}
        siteKey={siteKey}
        onVerify={setTurnstileToken}
        onExpire={() => setTurnstileToken("")}
        onError={() => setTurnstileToken("")}
      />

      {error && (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || !turnstileToken}
        className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy"
      >
        {mutation.isPending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
        {QURANIC.cta}
      </button>

      <p className="text-xs leading-relaxed text-gray-500">{QURANIC.routingLine}</p>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function SectionHeading({ eyebrow, children, light = false }: { eyebrow?: string; children: React.ReactNode; light?: boolean }) {
  return (
    <>
      {eyebrow && (
        <p className={`text-sm font-semibold uppercase tracking-wider ${light ? "text-amber-300" : "text-wsa-red"}`}>{eyebrow}</p>
      )}
      <h2 className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${light ? "text-white" : "text-wsa-navy"}`}>{children}</h2>
    </>
  );
}

function Tick() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
      <Check className="h-3 w-3" aria-hidden />
    </span>
  );
}

export default function SarkinFulaniFutureLeaders() {
  const heroCtaRef = useRef<HTMLAnchorElement | null>(null);
  const [heroCtaGone, setHeroCtaGone] = useState(false);
  const [formInView, setFormInView] = useState(false);

  /**
   * The sticky bar appears once the hero's own button has scrolled away,
   * and hides again while either form is on screen: a school filling in
   * the Committee's registration should not have a WSA button sitting on
   * top of it. Observers only, no scroll handler, and the bar simply never
   * appears where IntersectionObserver is unavailable.
   */
  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const heroObserver = new IntersectionObserver(entries => setHeroCtaGone(!entries[0].isIntersecting), { rootMargin: "0px" });
    heroObserver.observe(el);
    const forms = ["express-interest", "quranic-competition"].map(id => document.getElementById(id)).filter((n): n is HTMLElement => n !== null);
    const visible = new Set<Element>();
    const formObserver = new IntersectionObserver(entries => {
      for (const e of entries) (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target));
      setFormInView(visible.size > 0);
    }, { rootMargin: "0px 0px -20% 0px" });
    forms.forEach(f => formObserver.observe(f));
    return () => {
      heroObserver.disconnect();
      formObserver.disconnect();
    };
  }, []);
  const showSticky = heroCtaGone && !formInView;

  return (
    <main className="bg-wsa-warm-white pt-24 lg:pt-28">

      {/* ── Review banner, while the page is a draft ─────────────── */}
      {DRAFT.isDraft && (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900 sm:px-6">
          <span className="font-semibold">{DRAFT.label}.</span> {DRAFT.line}
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-wsa-navy px-4 pb-12 pt-10 text-white sm:px-6 lg:pb-16 lg:pt-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_minmax(260px,320px)] lg:items-center lg:gap-12">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: GOLD }}>{HERO.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">{HERO.headline}</h1>
            <p className="mt-3 text-xl font-medium text-white/90 sm:text-2xl">{HERO.strap}</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">{HERO.supporting}</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-1.5 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
              {HERO.recruiting}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PrimaryButton href="#express-interest" onRef={el => { heroCtaRef.current = el; }} className="w-full sm:w-auto">
                {HERO.primaryCta}
              </PrimaryButton>
              <a
                href="#quranic-competition"
                className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl border-2 border-white/70 px-5 py-3 text-base font-semibold text-white transition hover:bg-white hover:text-wsa-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
              >
                <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
                {HERO.schoolsCta}
              </a>
            </div>
            <p className="mt-6 text-sm text-white/70">{HERO.partnersLine}</p>
          </div>

          {/* The seal of the Palace is the hero's image: served from this
              site at phone size, in a white roundel so it reads on navy.
              Royal material, displayed subject to the Office's approval. */}
          <div className="mx-auto flex w-full max-w-[320px] flex-col items-center">
            <div className="flex aspect-square w-48 items-center justify-center rounded-full bg-white p-3 shadow-lg ring-4 sm:w-56 lg:w-64" style={{ "--tw-ring-color": GOLD } as React.CSSProperties}>
              <img src={PATRON.seal} alt={PATRON.sealAlt} width={640} height={640} decoding="async" className="h-full w-full rounded-full object-contain" />
            </div>
            <p className="mt-4 text-center text-sm font-semibold uppercase tracking-wider" style={{ color: GOLD }}>{PATRON.honorific}</p>
            <p className="text-center text-lg font-semibold leading-snug">{PATRON.name}</p>
            <p className="text-center text-base text-white/80">{PATRON.title}</p>
          </div>
        </div>
      </section>

      {/* ── His Royal Highness's vision ──────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_minmax(260px,360px)] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <SectionHeading eyebrow="Patron">{VISION.heading}</SectionHeading>
            <p className="mt-5 border-l-4 pl-4 text-xl font-semibold italic leading-snug text-wsa-navy sm:text-2xl" style={{ borderColor: GOLD }}>{VISION.motto}</p>
            <div className="mt-5 space-y-4">
              {VISION.paragraphs.map(p => (
                <p key={p.slice(0, 40)} className="text-base leading-relaxed text-gray-700">{p}</p>
              ))}
            </div>
            <p className="mt-5 text-base leading-relaxed text-gray-700">{VISION.patronRole}</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-wsa-navy/10 bg-wsa-warm-white p-5 text-center">
            <img src={PATRON.foundationLogo} alt={PATRON.foundationLogoAlt} width={1200} height={636} decoding="async" className="mx-auto w-full max-w-[300px]" />
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{VISION.foundationLine}</p>
          </div>
        </div>
      </section>

      {/* ── What is the programme ────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <SectionHeading eyebrow="The programme">{WHAT_IS.heading}</SectionHeading>
            <div className="mt-5 space-y-4">
              {WHAT_IS.paragraphs.map(p => (
                <p key={p.slice(0, 40)} className="text-base leading-relaxed text-gray-700">{p}</p>
              ))}
            </div>
          </div>
          <div className="min-w-0 rounded-2xl border border-wsa-navy/10 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-wsa-navy">{WHAT_IS.offersHeading}</h3>
            <ul className="mt-4 space-y-2.5">
              {WHAT_IS.offers.map(o => (
                <li key={o} className="flex items-start gap-2.5 text-base text-gray-700">
                  <Tick />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Who we are looking for ───────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Selection">{WHO_FOR.heading}</SectionHeading>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700">{WHO_FOR.intro}</p>
          <ul className="mt-6 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {WHO_FOR.criteria.map(c => (
              <li key={c} className="flex items-start gap-2.5 text-base text-gray-700">
                <Tick />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-base font-medium leading-relaxed text-wsa-navy">{WHO_FOR.close}</p>
        </div>
      </section>

      {/* ── Brooke House College opportunities ───────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center gap-4">
            <img src={PARTNERS.brookeHouse.logo} alt={PARTNERS.brookeHouse.logoAlt} width={300} height={150} decoding="async" className="h-12 w-auto rounded-lg bg-white p-1 ring-1 ring-wsa-navy/10" />
            <div>
              <SectionHeading eyebrow="Brooke House College, England">The opportunities</SectionHeading>
            </div>
          </div>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {OPPORTUNITY_CARDS.map(card => {
              const Icon = OPPORTUNITY_ICONS[card.id] ?? GraduationCap;
              return (
                <article key={card.id} className="flex flex-col rounded-2xl border border-wsa-navy/10 bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wsa-navy/5 text-wsa-navy">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wider text-wsa-red">{card.eyebrow}</p>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold leading-snug text-wsa-navy">{card.title}</h3>
                  <div className="mt-2 space-y-2.5">
                    {card.body.map(p => (
                      <p key={p.slice(0, 40)} className="text-base leading-relaxed text-gray-700">{p}</p>
                    ))}
                  </div>
                  {card.pending && (
                    <ul className="mt-3 space-y-1.5">
                      {card.pending.map(p => (
                        <li key={p} className="rounded-lg border border-dashed border-amber-400/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">{p}</li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Tuition fee awards ───────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div className="min-w-0">
            <SectionHeading eyebrow="Tuition fee awards">{AWARDS.heading}</SectionHeading>
            <div className="mt-5 space-y-4">
              {AWARDS.paragraphs.map(p => (
                <p key={p.slice(0, 40)} className="text-base leading-relaxed text-gray-700">{p}</p>
              ))}
            </div>
            <p className="mt-4 inline-block rounded-lg border border-dashed border-amber-400/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">{AWARDS.confirmationNote}</p>
          </div>
          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-wsa-navy/10 bg-wsa-warm-white p-5">
              <h3 className="flex items-center gap-2 text-base font-semibold text-wsa-navy"><Award className="h-5 w-5 text-wsa-red" aria-hidden />{AWARDS.includedHeading}</h3>
              <ul className="mt-3 space-y-1.5">
                {AWARDS.included.map(i => <li key={i} className="flex items-start gap-2 text-base text-gray-700"><Tick /><span>{i}</span></li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-wsa-navy/10 bg-wsa-warm-white p-5">
              <h3 className="text-base font-semibold text-wsa-navy">{AWARDS.budgetHeading}</h3>
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {AWARDS.budget.map(b => <li key={b} className="text-base text-gray-700">{b}</li>)}
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{AWARDS.separateLine}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="What do I need to do?">Taking the first step is simple</SectionHeading>
          <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-wsa-navy/10 bg-white p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-wsa-navy text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold text-wsa-navy">{s.title}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-gray-700">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Programme timeline">Key dates</SectionHeading>
          <ol className="mt-7 space-y-4 border-l-2 pl-5" style={{ borderColor: GOLD }}>
            {TIMELINE.map(t => (
              <li key={`${t.when}-${t.what}`} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full" style={{ backgroundColor: GOLD }} aria-hidden />
                <p className="text-sm font-semibold uppercase tracking-wider text-wsa-red">{t.when}</p>
                <p className="text-base leading-relaxed text-gray-700">{t.what}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Who is behind the programme ──────────────────────────── */}
      <section className="border-t border-wsa-navy/10 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Partners">{BEHIND.heading}</SectionHeading>
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5 lg:row-span-1" style={{ borderColor: GOLD }}>
              <div className="flex items-center gap-4">
                <img src={PATRON.seal} alt="" width={640} height={640} decoding="async" className="h-16 w-16 shrink-0 rounded-full object-contain ring-2" style={{ "--tw-ring-color": GOLD } as React.CSSProperties} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: GOLD }}>Patron</p>
                  <p className="text-base font-semibold leading-snug text-wsa-navy">{PATRON.honorific} {PATRON.name}</p>
                  <p className="text-sm text-gray-600">{PATRON.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">{VISION.patronRole}</p>
            </div>
            <div className="rounded-2xl border border-wsa-navy/10 bg-white p-5">
              <img src={PARTNERS.brookeHouse.logo} alt={PARTNERS.brookeHouse.logoAlt} width={300} height={150} decoding="async" className="h-14 w-auto" />
              <p className="mt-3 text-base font-semibold text-wsa-navy">{PARTNERS.brookeHouse.name}, {PARTNERS.brookeHouse.place}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{BEHIND.brookeHouse}</p>
            </div>
            <div className="rounded-2xl border border-wsa-navy/10 bg-white p-5">
              <img src={PARTNERS.wsa.logo} alt={PARTNERS.wsa.logoAlt} width={1366} height={325} decoding="async" className="h-10 w-auto" />
              <p className="mt-3 text-base font-semibold text-wsa-navy">{PARTNERS.wsa.name}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{BEHIND.wsa}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Expression of Interest ───────────────────────────────── */}
      <section id="express-interest" className="scroll-mt-28 border-t border-wsa-navy/10 bg-wsa-navy px-4 py-12 text-white sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_minmax(320px,480px)] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <SectionHeading eyebrow="Families" light>Could this opportunity be right for your child?</SectionHeading>
            <p className="mt-4 text-lg leading-relaxed text-white/85">
              If you are the parent or guardian of an ambitious young person from the Arewa community, we would like to hear from you.
            </p>
            <ul className="mt-5 space-y-2">
              {OPPORTUNITIES.map(o => (
                <li key={o.value} className="flex items-start gap-2.5 text-base text-white/90">
                  <Users className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} aria-hidden />
                  <span>{o.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 rounded-2xl border border-white/15 bg-white p-5 text-wsa-navy shadow-lg sm:p-6">
            <ExpressInterestForm id="eoi" />
          </div>
        </div>
      </section>

      {/* ── Quranic Memorisation Competition, its own section ────── */}
      {/* Farooq Gajo, 29 September 2026: clearly identified as His Royal
          Highness's own, easy for a school to find (the hero links here),
          and its registration goes to the Competition Committee in Nigeria,
          never into WSA's enquiry process. A different colour so it cannot
          be mistaken for a Brooke House opportunity. */}
      <section id="quranic-competition" className="scroll-mt-28 border-t border-emerald-900/20 bg-emerald-950 px-4 py-12 text-white sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_minmax(320px,520px)] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10" style={{ color: GOLD }}>
                <BookOpen className="h-6 w-6" aria-hidden />
              </span>
              <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: GOLD }}>{QURANIC.eyebrow}</p>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{QURANIC.heading}</h2>
            <div className="mt-4 space-y-4">
              {QURANIC.paragraphs.map(p => (
                <p key={p.slice(0, 40)} className="text-base leading-relaxed text-white/85">{p}</p>
              ))}
            </div>
            <p className="mt-4 inline-flex items-start gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/85">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden />
              {QURANIC.detailsPending}
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-white/70">
              <School className="h-5 w-5 shrink-0" aria-hidden />
              <span>{QURANIC.routingLine}</span>
            </div>
          </div>
          <div className="relative min-w-0 rounded-2xl border border-white/15 bg-white p-5 text-wsa-navy shadow-lg sm:p-6">
            <QuranicSchoolForm id="quranic" />
          </div>
        </div>
      </section>

      {/* ── Closing ──────────────────────────────────────────────── */}
      <section className="border-t border-wsa-navy/10 bg-white px-4 py-12 text-center sm:px-6 lg:py-14">
        <div className="mx-auto max-w-3xl">
          <img src={PATRON.seal} alt="" width={640} height={640} decoding="async" className="mx-auto h-20 w-20 rounded-full object-contain ring-2" style={{ "--tw-ring-color": GOLD } as React.CSSProperties} />
          <p className="mt-5 text-2xl font-bold tracking-tight text-wsa-navy sm:text-3xl">{FOOTER_LINE.motto}</p>
          <p className="mt-3 text-base text-gray-700">{FOOTER_LINE.patronage}</p>
          <p className="mt-1 text-base text-gray-700">{FOOTER_LINE.partners}</p>
          <PrimaryButton href="#express-interest" className="mt-6 w-full sm:w-auto">{HERO.primaryCta}</PrimaryButton>
        </div>
      </section>

      <section className="border-t border-wsa-navy/10 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
          <Link href="/" className="underline underline-offset-2 hover:text-wsa-navy">World Student Advisors</Link>
          <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-wsa-navy">Privacy policy</Link>
        </div>
      </section>

      {/* Sticky bar, phones only, once the hero button has gone. */}
      {showSticky && (
        <>
          <div aria-hidden className="h-20 sm:hidden" />
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-wsa-navy/10 bg-white/95 px-4 pt-3 backdrop-blur sm:hidden"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <PrimaryButton href="#express-interest" className="w-full">{HERO.primaryCta}</PrimaryButton>
          </div>
        </>
      )}
    </main>
  );
}
