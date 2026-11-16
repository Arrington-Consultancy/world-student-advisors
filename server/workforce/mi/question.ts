/**
 * Reading a management-information question.
 *
 * Tom Arrington, 11 September 2026: "How many cold leads have we had from
 * the website in the last 12 months?" is not a request to generate cold
 * leads. It is a historical question asking for a count from existing
 * business data. The Staff Portal must first understand the OUTCOME being
 * asked for, and must tell an information question from an action request:
 * "how many cold leads did we have" is information; "give me 50 cold
 * leads" is prospecting.
 *
 * This module turns a sentence into a structured question the resolver can
 * take to the authorised sources. It reads whole meaning, not isolated
 * words: measure (count, ranking, trend), subject (leads, enquiries,
 * students, applications, referrals), channel filter (website, referral,
 * partner), a country, a pipeline stage, a status such as "went cold", and
 * a period. Anything it cannot place is left null rather than guessed, and
 * the resolver says what it assumed.
 */
import { normalise } from "../intent";

export type Measure = "count" | "ranking" | "trend";
export type Subject = "leads" | "enquiries" | "students" | "applications" | "referrals";
export type Channel = "website" | "referral" | "partner";

export interface Period {
  from: Date;
  to: Date;
  /** How the period was named by the person, for the answer. */
  label: string;
  /** True when no period was stated and the default of twelve months was assumed. */
  assumed: boolean;
}

export interface InformationQuestion {
  measure: Measure;
  subject: Subject;
  channel: Channel | null;
  country: string | null;
  stage: string | null;
  /** "cold": the enquiry stopped after first contact. */
  status: "cold" | null;
  /**
   * Filters the person clearly asked for that this layer cannot apply.
   *
   * Tom Arrington asked "how many cold leads are self funded since the site
   * has been redone" on 12 September 2026 and was given a count of website
   * leads. Nothing was wrong with that count; it simply was not the question.
   * "Self funded" was dropped without a word, so a figure answering a
   * narrower question than the one asked read as if it answered it.
   *
   * A dimension this parser cannot model is now carried here instead of
   * disappearing, and the resolver refuses to present a plain count when it
   * is non-empty. The list is deliberately short and grows from real
   * questions rather than from imagination: a phrase listed here must be
   * something staff genuinely ask for and the records genuinely cannot
   * answer.
   */
  unmodelled: readonly string[];
  /** For rankings: what to group by. Only "channel" is supported. */
  groupBy: "channel" | null;
  /** For trends: compare the recent window with the one before it. */
  trendAnchor: "since_new_site" | "over_period" | null;
  period: Period;
  original: string;
}

const COUNTRIES = [
  "nigeria", "kenya", "ghana", "uganda", "tanzania", "zimbabwe", "zambia", "cameroon", "rwanda",
  "ethiopia", "south africa", "botswana", "malawi", "sierra leone", "gambia", "senegal", "egypt",
  "morocco", "india", "pakistan", "bangladesh", "sri lanka", "nepal", "china", "vietnam", "turkey",
];

const STAGES = ["cas", "visa", "offer", "application", "enrolled", "enrolment", "pre departure", "arrival", "discovery", "first contact"];

/** Imperatives that ask for work to be done, not for a figure. */
const ACTION_MARKERS = [
  "give me", "get me", "find me", "send me", "pull", "generate", "create", "build", "make me",
  "put together", "compile a list", "list of", "export", "download",
];

function words(text: string): string[] {
  return normalise(text);
}
function has(ws: readonly string[], phrase: string): boolean {
  const p = normalise(phrase);
  for (let i = 0; i + p.length <= ws.length; i++) {
    let ok = true;
    for (let j = 0; j < p.length; j++) if (ws[i + j] !== p[j]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}
function hasAny(ws: readonly string[], phrases: readonly string[]): boolean {
  return phrases.some(p => has(ws, p));
}

/** True when the sentence asks for something to be produced rather than reported. */
export function isActionRequest(text: string): boolean {
  const ws = words(text);
  // "give me the number of" is still a question; an action marker followed by
  // a count marker is not an action.
  if (hasAny(ws, ["how many", "number of", "no of", "count of", "total of", "which source", "have we", "did we", "has the", "have the"])) return false;
  return hasAny(ws, ACTION_MARKERS);
}

function startOfMonth(d: Date): Date { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function addMonths(d: Date, n: number): Date { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate())); }
function quarterStart(d: Date): Date { return new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1)); }

export function parsePeriod(text: string, now: Date): Period {
  const ws = words(text);
  const raw = text.toLowerCase();
  const n = raw.match(/(?:last|past|previous)\s+(\d{1,2})\s+months?/);
  if (n) {
    const months = Number(n[1]);
    return { from: addMonths(now, -months), to: now, label: `the last ${months} months`, assumed: false };
  }
  if (hasAny(ws, ["last 12 months", "last twelve months", "past year", "last year", "previous year", "12 months", "twelve months", "a year"]) && !has(ws, "this year")) {
    if (has(ws, "last year") && !has(ws, "12 months")) {
      const y = now.getUTCFullYear() - 1;
      return { from: new Date(Date.UTC(y, 0, 1)), to: new Date(Date.UTC(y + 1, 0, 1)), label: `${y}`, assumed: false };
    }
    return { from: addMonths(now, -12), to: now, label: "the last 12 months", assumed: false };
  }
  if (has(ws, "this year") || has(ws, "year to date") || has(ws, "ytd")) {
    return { from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), to: now, label: `${now.getUTCFullYear()} so far`, assumed: false };
  }
  if (has(ws, "last quarter") || has(ws, "previous quarter")) {
    const thisQ = quarterStart(now);
    return { from: addMonths(thisQ, -3), to: thisQ, label: "last quarter", assumed: false };
  }
  if (has(ws, "this quarter")) {
    return { from: quarterStart(now), to: now, label: "this quarter", assumed: false };
  }
  if (has(ws, "last month") || has(ws, "previous month")) {
    const thisM = startOfMonth(now);
    return { from: addMonths(thisM, -1), to: thisM, label: "last month", assumed: false };
  }
  if (has(ws, "this month")) {
    return { from: startOfMonth(now), to: now, label: "this month", assumed: false };
  }
  if (hasAny(ws, ["last 6 months", "last six months", "six months", "6 months"])) {
    return { from: addMonths(now, -6), to: now, label: "the last 6 months", assumed: false };
  }
  if (hasAny(ws, ["last 3 months", "last three months", "three months", "3 months"])) {
    return { from: addMonths(now, -3), to: now, label: "the last 3 months", assumed: false };
  }
  return { from: addMonths(now, -12), to: now, label: "the last 12 months", assumed: true };
}

function detectSubject(ws: readonly string[]): Subject | null {
  if (hasAny(ws, ["referral", "referrals", "referred"])) return "referrals";
  if (hasAny(ws, ["application", "applications", "applied"])) return "applications";
  if (hasAny(ws, ["lead", "leads"])) return "leads";
  if (hasAny(ws, ["enquiry", "enquiries", "inquiry", "inquiries", "sign up", "sign ups", "signup", "signups"])) return "enquiries";
  if (hasAny(ws, ["student", "students", "applicant", "applicants"])) return "students";
  return null;
}

function detectChannel(ws: readonly string[]): Channel | null {
  if (hasAny(ws, ["from the website", "website", "web site", "the site", "online form", "sign up form", "web form", "web enquiries"])) return "website";
  if (hasAny(ws, ["from partners", "partner", "partners", "agent", "agents"])) return "partner";
  if (hasAny(ws, ["referral", "referrals", "referred", "word of mouth"])) return "referral";
  return null;
}

function detectCountry(text: string): string | null {
  const lower = text.toLowerCase();
  for (const c of COUNTRIES) {
    if (new RegExp(`\\b${c.replace(" ", "\\s+")}(n|ns|ian|ians)?\\b`).test(lower)) return c.replace(/\b\w/g, m => m.toUpperCase());
  }
  return null;
}

function detectStage(ws: readonly string[]): string | null {
  for (const s of STAGES) if (has(ws, s) && (has(ws, "stage") || s === "cas" || s === "visa" || s === "enrolled")) return s;
  return null;
}

/**
 * "Cold" is modelled: the evidence record carries it. The phrase list was
 * too narrow, matching "went cold" but not the way people actually write
 * it, so "cold leads" was read as leads with no status filter at all.
 */
function detectStatus(ws: readonly string[]): "cold" | null {
  const stated = [
    "went cold", "gone cold", "go cold", "cold after", "stopped responding",
    "dropped off", "never came back", "did not respond",
    "cold lead", "cold leads", "cold enquiry", "cold enquiries",
    "cold inquiry", "cold inquiries", "cold applicant", "cold applicants",
    "cold student", "cold students", "cold referral", "cold referrals",
  ];
  return hasAny(ws, stated) ? "cold" : null;
}

/**
 * Filters staff ask for that the records cannot answer in this layer.
 * Matched on the whole sentence so a hyphenated or spaced spelling is
 * caught the same way. Each entry names itself in the answer.
 */
const UNMODELLED_FILTERS: ReadonlyArray<{ readonly label: string; readonly patterns: readonly RegExp[] }> = Object.freeze([
  {
    label: "how the student is funded",
    patterns: [
      /\bself[\s._-]?fund(ed|ing)?\b/i,
      /\bprivately[\s._-]?funded\b/i,
      /\bsponsor(ed|ship)?\b/i,
      /\bscholarship(s)?\b/i,
      /\bbursar(y|ies)\b/i,
      /\bstudent[\s._-]?(loan|finance)\b/i,
    ],
  },
]);

export function detectUnmodelled(text: string): string[] {
  return UNMODELLED_FILTERS.filter(f => f.patterns.some(p => p.test(text))).map(f => f.label);
}

function detectMeasure(ws: readonly string[]): Measure | null {
  if (hasAny(ws, ["which source", "what source", "which channel", "where did most", "produced the most", "biggest source", "top source", "most enquiries", "most leads"])) return "ranking";
  if (hasAny(ws, ["increased", "increase", "decreased", "gone up", "gone down", "trend", "trending", "growing", "grown", "since the new", "since new", "up since", "down since", "compared to", "compared with", "up or down", "more or fewer", "improved"])) return "trend";
  if (hasAny(ws, ["how many", "number of", "no of", "num of", "count", "total", "how much", "have we had", "did we get", "did we have", "volume"])) return "count";
  return null;
}

/**
 * Null when the sentence is not an information question this layer can
 * take to the records: an action request, or no recognisable subject and
 * measure. The router then treats it as it did before.
 */
export function parseInformationQuestion(text: string, now: Date = new Date()): InformationQuestion | null {
  if (isActionRequest(text)) return null;
  const ws = words(text);
  const measure = detectMeasure(ws);
  const subject = detectSubject(ws);
  if (!measure || !subject) return null;

  const status = detectStatus(ws);
  let channel = detectChannel(ws);
  // "cold leads" describes a state, not a channel; "cold leads from the
  // website" is website-channel leads that went cold or simply website leads.
  if (subject === "referrals") channel = channel ?? "referral";

  return {
    measure,
    subject,
    channel,
    country: detectCountry(text),
    stage: detectStage(ws),
    status,
    unmodelled: detectUnmodelled(text),
    groupBy: measure === "ranking" ? "channel" : null,
    trendAnchor: measure === "trend" ? (hasAny(ws, ["since the new site", "new site", "new website", "site went live", "went live", "relaunch"]) ? "since_new_site" : "over_period") : null,
    period: parsePeriod(text, now),
    original: text,
  };
}

/**
 * A follow-up, read against the question before it.
 *
 * Tom Arrington, 12 September 2026: an answer should be something you can
 * continue, not a dead end you have to retype around. "And from Nigeria?"
 * is a real question, but only next to what was asked first.
 *
 * The rule is inheritance, not replacement: a follow-up changes the
 * dimensions it names and leaves every other one exactly as it was. The
 * period matters most here. A follow-up that says nothing about time keeps
 * the window already in force, because silently reverting to the default
 * twelve months would change the answer without changing the question.
 *
 * A handful of phrases widen instead of narrow, so a person can undo a
 * filter they set a moment ago rather than starting again.
 *
 * This never sees the client's idea of the earlier question. The route
 * endpoint re-parses the earlier text server-side and passes the result
 * here, so a thread cannot be used to smuggle in a question nobody asked.
 */
export type FollowUpParse =
  | { kind: "question"; question: InformationQuestion }
  | { kind: "not_a_follow_up"; reason: string };

/** Phrases that remove a filter rather than adding one. */
const CLEARS_CHANNEL = ["overall", "in total", "altogether", "all channels", "any channel", "all sources", "any source", "every source", "regardless of source", "from anywhere", "no matter where"];
const CLEARS_COUNTRY = ["all countries", "any country", "every country", "anywhere", "regardless of country", "all nationalities"];

export function parseFollowUpQuestion(text: string, previous: InformationQuestion, now: Date = new Date()): FollowUpParse {
  if (isActionRequest(text)) {
    return { kind: "not_a_follow_up", reason: "That asks for something to be produced rather than for a figure." };
  }
  const ws = words(text);

  const measure = detectMeasure(ws);
  const subject = detectSubject(ws);
  const channel = detectChannel(ws);
  const country = detectCountry(text);
  const stage = detectStage(ws);
  const status = detectStatus(ws);
  const unmodelled = detectUnmodelled(text);
  const period = parsePeriod(text, now);
  const clearChannel = hasAny(ws, CLEARS_CHANNEL);
  const clearCountry = hasAny(ws, CLEARS_COUNTRY);

  const changesSomething =
    measure !== null || subject !== null || channel !== null || country !== null ||
    stage !== null || status !== null || unmodelled.length > 0 ||
    !period.assumed || clearChannel || clearCountry;

  if (!changesSomething) {
    return {
      kind: "not_a_follow_up",
      reason: "I could not tell what to change about the previous question. Naming a period, a channel, a country or a stage is enough.",
    };
  }

  const nextMeasure = measure ?? previous.measure;
  return {
    kind: "question",
    question: {
      measure: nextMeasure,
      subject: subject ?? previous.subject,
      // An explicit widening beats inheritance; a named channel beats both.
      channel: channel ?? (clearChannel ? null : previous.channel),
      country: country ?? (clearCountry ? null : previous.country),
      stage: stage ?? previous.stage,
      status: status ?? previous.status,
      unmodelled: Array.from(new Set([...previous.unmodelled, ...unmodelled])),
      groupBy: nextMeasure === "ranking" ? "channel" : null,
      trendAnchor:
        nextMeasure === "trend"
          ? hasAny(ws, ["since the new site", "new site", "new website", "site went live", "went live", "relaunch"])
            ? "since_new_site"
            : (previous.trendAnchor ?? "over_period")
          : null,
      // Keep the window in force, label and all, unless this sentence names one.
      period: period.assumed ? previous.period : period,
      original: text,
    },
  };
}
