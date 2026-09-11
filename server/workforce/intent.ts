/**
 * Reducing a staff member's sentence to concepts.
 *
 * This is the layer that has to cope with how people actually type into a
 * box between phone calls: "wat unis we got", "can this guy afford it",
 * "hey. give a list of cold leads". None of those is a well-formed
 * question and all three are perfectly clear to a colleague.
 *
 * WHAT THIS IS NOT. It is not a bigger keyword table. A keyword table maps
 * words to WORKERS, so every new phrasing needs a new entry filed under
 * somebody, and the table slowly becomes the routing policy. Here words
 * map to CONCEPTS, concepts combine into outcomes in remit.ts, and remits
 * decide who owns an outcome. Adding "uni" below teaches the system a word
 * for university. It grants nobody anything, and it cannot: a worker's
 * remit is the only thing that says what a worker is for.
 *
 * THREE KINDS OF TOLERANCE, all lexical and all deliberately narrow:
 *
 * Abbreviations, because "unis" is not a misspelling of anything. A short
 * controlled list, each entry a form WSA staff actually use.
 *
 * Misspellings, by edit distance against the known forms only. A word can
 * be one edit from a form it is five letters long, two edits from eight.
 * It cannot reach a form it never nearly wrote, so "scholrship" finds
 * scholarship and "sponsor" does not become "spencer".
 *
 * Endings, by the same small stemmer the old routing used, so "ranking",
 * "ranked" and "ranks" are one idea.
 */
import type { Concept } from "./remit";
import { stem } from "./routing";

/**
 * Shorthand WSA staff use. Expanded before anything else looks at the
 * text, so the rest of the pipeline never has to know about it.
 *
 * Only genuine shorthand belongs here. A word that means something
 * slightly different is not an abbreviation, and putting it here would be
 * the keyword-table mistake wearing a different hat.
 */
const ABBREVIATIONS: Record<string, string> = {
  uni: "university",
  unis: "universities",
  uc: "university",
  app: "application",
  apps: "applications",
  req: "requirement",
  reqs: "requirements",
  info: "information",
  pls: "please",
  plz: "please",
  wat: "what",
  wot: "what",
  whats: "what is",
  hows: "how is",
  cant: "cannot",
  dont: "do not",
  doesnt: "does not",
  isnt: "is not",
  weve: "we have",
  ive: "i have",
  im: "i am",
  thats: "that is",
  u: "you",
  r: "are",
  yr: "your",
  b4: "before",
  asap: "urgent",
};

/**
 * Ordinary English that carries no WSA meaning, and is never repaired.
 *
 * The misspelling pass found a real hazard on its first run: "what
 * scholarships could this student apply for" routed to nobody, because
 * "could" is one edit from "cold" and the cold-lead outcome outranked the
 * scholarship one. A typo repair that turns a correctly spelled word into
 * a different correctly spelled word is worse than no repair at all.
 *
 * So any word on this list is passed through untouched. Nothing here is a
 * concept form, and nothing that becomes one may be added.
 */
const NEVER_REPAIRED = new Set([
  "could", "would", "should", "about", "there", "where", "which", "these", "those",
  "other", "being", "doing", "going", "thing", "think", "might", "still", "after",
  "again", "place", "first", "never", "every", "under", "while", "since", "until",
  "above", "below", "please", "thanks", "really", "maybe", "sorry", "quick", "quickly",
  "today", "tomorrow", "yesterday", "morning", "afternoon", "evening", "urgent",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "june", "july", "august", "september",
  "october", "november", "december", "intake", "because", "though", "although",
  "anything", "something", "nothing", "everyone", "someone", "anyone",
]);

/**
 * The concept vocabulary. Each concept lists the forms that express it.
 *
 * Multi-word forms are matched as consecutive words, so "cold lead" is one
 * thing and a sentence containing both words far apart is not.
 */
const CONCEPT_FORMS: Record<Concept, string[]> = {
  enquiry: ["enquiry", "enquiries", "inquiry", "inquiries", "got in touch", "came in", "contacted us"],
  triage: ["triage", "who should take", "what do we do with"],
  new: ["new", "fresh", "just came", "just arrived"],

  student: ["student", "applicant", "candidate", "this guy", "this girl", "this lady", "this lad", "this one", "he", "she", "him", "her", "they"],
  profile: ["profile", "discovery", "discovery profile"],
  background: ["background", "history", "prior study", "previous study"],
  know: ["know about", "do we know", "what do we know", "tell me about"],

  university: ["university", "universities", "institution", "institutions", "school", "college", "partner"],
  course: ["course", "courses", "programme", "programmes", "program", "programs", "degree", "degrees", "pathway", "pathways"],
  inventory: ["have we got", "do we have", "we work with", "on our books", "in our portfolio", "we offer", "do we offer", "we got"],
  list: ["list", "listing", "give me a list", "which ones"],
  available: ["available", "availability", "what is there", "options", "option"],

  requirement: ["requirement", "requirements", "entry requirement", "entry requirements", "criteria", "what is needed", "need to have"],
  fee: ["fee", "fees", "tuition", "price", "pricing"],
  deadline: ["deadline", "deadlines", "closing date", "cut off", "when does it close"],
  ranking: ["ranking", "rankings", "ranked", "rank", "ranks", "position", "visibility"],
  league: ["league", "league table", "league tables"],

  compare: ["compare", "comparison", "versus", "vs", "against each other", "side by side"],
  suitable: ["suitable", "suitability", "right for", "fit for", "good fit", "best fit"],
  better: ["better", "best", "stronger", "which is better"],
  choose: ["choose", "choosing", "pick", "picking", "decide between", "go for"],

  application: ["application", "applications", "applying", "apply", "ucas", "form"],
  ready: ["ready", "good to go", "ready to send", "ready to go", "all set"],
  complete: ["complete", "completed", "finished", "done", "missing anything", "anything missing"],
  // "submission" is deliberately absent. As a noun it names the application
  // ("for this admissions submission"), not the act of sending it, and
  // treating it as the act routed a deadline question into James's closed
  // submit capability.
  submit: ["submit", "submitting", "lodge", "file it", "send it in"],
  send: ["send", "sending", "send it", "send off", "go out"],

  visa: ["visa", "visas", "ukvi", "cas", "brp", "ihs", "sponsor licence", "student route"],
  immigration: ["immigration", "home office", "border", "right to study", "right to remain"],
  rule: ["rule", "rules", "regulation", "regulations", "guidance", "policy", "what does the rule say", "allowed"],
  dependant: ["dependant", "dependants", "dependent", "dependents", "wife", "husband", "spouse", "partner of", "family", "children", "child", "bring his", "bring her", "bring their"],
  eligible: ["eligible", "eligibility", "qualify", "qualifies", "entitled"],

  scholarship: ["scholarship", "scholarships", "bursary", "bursaries", "grant", "grants", "award", "awards"],
  funding: ["funding", "finance", "financial", "sponsorship", "sponsor"],
  afford: ["afford", "affordable", "affordability", "can pay", "cannot pay", "afford it", "stretch to"],
  cost: ["cost", "costs", "how much", "expensive", "budget"],
  money: ["money", "funds", "savings", "income"],
  gap: ["gap", "shortfall", "short by", "missing", "still needed"],

  arrival: ["arrival", "arrive", "arrives", "arriving", "pre arrival", "before they travel", "travel", "airport"],
  enrol: ["enrol", "enrols", "enrolment", "enroll", "enrollment", "register for the course", "start date"],
  accommodation: ["accommodation", "housing", "where will they live", "halls"],

  audit: ["audit", "audited", "auditing", "case audit", "independent review"],
  quality: ["quality", "quality assurance", "quality control", "standard"],
  check: ["check", "checked", "checking", "review", "reviewed", "look over", "go over", "sanity check"],
  case: ["case", "cases", "case file", "file", "record for this student"],

  website: ["website", "web site", "site", "web page", "webpage", "our pages", "landing page"],
  search: ["search", "google", "organic search", "search engine", "serp"],
  seo: ["seo", "organic growth", "search console"],
  traffic: ["traffic", "visitors", "sessions", "clicks"],

  records: ["records", "record keeping", "document control", "documents"],
  sharepoint: ["sharepoint", "share point", "document library"],
  filing: ["filing", "file structure", "folder", "folders", "where does this go", "where should this live"],
  version: ["version", "versions", "version control", "versioning"],

  paid: ["paid", "paid media", "ppc", "pay per click"],
  advert: ["advert", "adverts", "ad", "ads", "advertising", "advertisement", "google ads", "meta ads"],
  campaign: ["campaign", "campaigns"],
  spend: ["spend", "spending", "budget spent", "cost per lead", "cpl", "cpa"],
  lead: ["lead", "leads"],
  conversion: ["conversion", "conversions", "conversion tracking"],

  social: ["social", "social media", "instagram", "facebook", "linkedin", "tiktok", "youtube", "channel"],
  post: ["post", "posts", "posting", "caption", "captions", "reel", "reels", "story", "stories", "tweet"],
  content: ["content", "copy", "creative"],
  draft: ["draft", "drafting", "write", "writing", "write me", "put together", "come up with", "create"],
  critique: ["critique", "improve", "make it better", "tighten", "rewrite", "feedback on"],
  platform: ["platform", "platforms", "account", "accounts"],

  publish: ["publish", "publishing", "push live", "put it live", "go live", "post it"],
  schedule: ["schedule", "scheduling", "scheduled", "queue it", "line it up"],
  reply: ["reply", "replies", "respond to", "comment back", "dm back"],
  market: ["market", "markets", "country", "countries", "nigeria", "kenya", "ghana", "uganda", "tanzania"],
  audience: ["audience", "audiences", "followers", "follower", "engagement"],

  count: ["how many", "number of", "count", "total", "how much of", "have we had", "did we get", "did we have", "volume of", "stats", "statistics", "figures"],
  report: ["report", "reporting", "breakdown", "summary of", "over the last", "in the last", "last month", "last year", "this year", "12 months", "this quarter", "per month"],

  cold: ["cold", "cold lead", "cold leads", "cold list", "untouched"],
  prospect: ["prospect", "prospects", "prospecting", "business development", "new business"],
  outreach: ["outreach", "outbound", "cold call", "cold calling", "cold email", "canvassing"],

  person_specific: [
    "this student", "this particular student", "this applicant", "this candidate",
    "this guy", "this girl", "this lady", "this lad", "this person", "this one",
    "my student", "our student", "for him", "for her", "for them",
    "his", "her", "their", "he", "she",
  ],
};

/** Every known single word, used as the target set for the misspelling pass. */
const KNOWN_WORDS: Set<string> = (() => {
  const words = new Set<string>();
  for (const forms of Object.values(CONCEPT_FORMS)) {
    for (const form of forms) for (const w of form.split(/\s+/)) words.add(stem(w));
  }
  return words;
})();

/** Levenshtein, capped: it stops as soon as the distance exceeds the budget. */
export function editDistance(a: string, b: string, budget: number): number {
  if (Math.abs(a.length - b.length) > budget) return budget + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      row.push(v);
      if (v < best) best = v;
    }
    if (best > budget) return budget + 1;
    prev = row;
  }
  return prev[b.length];
}

/**
 * How far a word is allowed to be from a known one.
 *
 * Short words get nothing, because at four letters almost everything is
 * one edit from something and "fee" would reach "see". The allowance grows
 * with length because a long word carries enough signal to survive a typo.
 */
function budgetFor(word: string): number {
  if (word.length >= 8) return 2;
  if (word.length >= 5) return 1;
  return 0;
}

/** Expand shorthand, strip punctuation, stem, and repair obvious typos. */
export function normalise(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);

  const expanded: string[] = [];
  for (const word of raw) {
    const abbreviation = ABBREVIATIONS[word];
    if (abbreviation) expanded.push(...abbreviation.split(" "));
    else expanded.push(word);
  }

  return expanded.map(word => {
    const stemmed = stem(word);
    if (KNOWN_WORDS.has(stemmed)) return stemmed;
    if (NEVER_REPAIRED.has(word) || NEVER_REPAIRED.has(stemmed)) return stemmed;
    const budget = budgetFor(stemmed);
    if (budget === 0) return stemmed;
    // Nearest known word, and only when it is strictly nearer than every
    // other candidate. An ambiguous typo is left alone rather than guessed.
    let best: { word: string; distance: number } | null = null;
    let tied = false;
    for (const known of Array.from(KNOWN_WORDS)) {
      const distance = editDistance(stemmed, known, budget);
      if (distance > budget) continue;
      if (!best || distance < best.distance) {
        best = { word: known, distance };
        tied = false;
      } else if (distance === best.distance) {
        tied = true;
      }
    }
    return best && !tied ? best.word : stemmed;
  });
}

function containsSequence(words: readonly string[], phrase: readonly string[]): boolean {
  for (let i = 0; i + phrase.length <= words.length; i++) {
    let hit = true;
    for (let j = 0; j < phrase.length; j++) {
      if (words[i + j] !== phrase[j]) { hit = false; break; }
    }
    if (hit) return true;
  }
  return false;
}

/** Which concepts a request expresses. */
export function conceptsIn(text: string): Set<Concept> {
  const words = normalise(text);
  const found = new Set<Concept>();
  for (const [concept, forms] of Object.entries(CONCEPT_FORMS) as [Concept, string[]][]) {
    for (const form of forms) {
      const phrase = form.split(/\s+/).map(stem);
      if (containsSequence(words, phrase)) { found.add(concept); break; }
    }
  }
  return found;
}

/** Exposed so a test can assert the shorthand list stays small and honest. */
export const KNOWN_ABBREVIATIONS = ABBREVIATIONS;
export const CONCEPT_VOCABULARY = CONCEPT_FORMS;
export const PROTECTED_WORDS = NEVER_REPAIRED;
