/**
 * Short replies are answers to what the worker just said.
 *
 * Tom Arrington, 18 September 2026. A worker ended its answer with "If you
 * want, I can pull together a clean picture of her admissions history ...
 * as a handover note." The staff member wrote "yes". The worker asked what
 * they meant and said the note had already been produced. It had not.
 *
 * Two things went wrong and both are structural. First, the new message
 * reached the model as "STAFF REQUEST: yes" with nothing marking it as an
 * answer to the worker's own offer, and the evidence layer searched the
 * word "yes" for a student and found nobody, so the record the offer was
 * about had gone. Second, nothing stopped the model saying a thing existed
 * when nothing in the conversation contained it.
 *
 * This module fixes the first and detects the second, without a list of
 * ways to say yes doing the work. The decision that a message is a
 * follow-up is structural: it is short, it names no student and carries no
 * identifier, and the worker's previous message ended with an offer or a
 * question. Its polarity (accepts, declines, unclear) is read from a small
 * closed set of acknowledgement words and handed to the model as a
 * reading, with the offer quoted back, so the model resolves "yes", "go
 * ahead", "do that" or "no thanks" against the referent rather than
 * guessing. An unclear reading, or several offers, becomes one focused
 * question, never a choice made for the person.
 */
import { extractNameCandidates, extractSingleNameCandidate } from "./studentContext";
import { extractIdentifiers } from "./evidence";

export interface ConversationTurnLike {
  role: "staff" | "worker";
  content: string;
}

export type FollowUpPolarity = "accepts" | "declines" | "unclear";

export interface FollowUp {
  /** The staff member's short reply, as typed. */
  reply: string;
  polarity: FollowUpPolarity;
  /** The offer or question sentences in the worker's previous message, in order. */
  offers: string[];
  /** The single offer the reply answers, when there is exactly one. */
  referent: string | null;
}

/** Cues that a sentence offers to do something or asks the staff member something. */
const OFFER_CUES = [
  /\bif you (want|like|prefer|would like|wish|need)\b/i,
  /\bwould you like\b/i,
  /\bshall i\b/i,
  /\bdo you want (me )?to\b/i,
  /\bwant me to\b/i,
  /\bi (can|could)( also| certainly| happily| then| now| quickly| easily)? (pull|put|prepare|draft|write|set out|compile|produce|send|check|look|list|summarise|summarize|gather|create|run|work|go|take|talk|walk|map|outline|arrange|book|share|provide|give|get|start|do|add|expand|break|flag|chase|follow|note|mark|update|review)\b/i,
  /\bhappy to\b/i,
  /\blet me know if\b/i,
  /\bjust say\b/i,
  /\bsay the word\b/i,
];

const MAX_FOLLOW_UP_WORDS = 12;
const MAX_FOLLOW_UP_CHARS = 90;

/**
 * Acknowledgement vocabulary. Filler words carry no polarity; a reply made
 * only of filler is unclear. A single negative word decides a decline,
 * because "no thanks" and "not now" are declines however warmly put.
 */
const AFFIRMATIVE = new Set([
  "yes", "yeah", "yep", "yup", "ya", "aye", "sure", "ok", "okay", "fine", "absolutely", "definitely", "certainly",
  "correct", "right", "agreed", "agree", "affirmative", "proceed", "continue", "go", "ahead", "do", "that", "it",
  "please", "thanks", "thank", "you", "good", "great", "perfect", "sounds", "works", "carry", "on", "lets", "let",
  "us", "make", "so", "yes please", "go ahead", "do that", "do it", "please do", "carry on", "sounds good", "that works",
  "why not", "of course", "by all means", "crack on",
]);
const NEGATIVE = new Set([
  "no", "nope", "nah", "not", "dont", "don't", "never", "leave", "skip", "stop", "cancel", "unnecessary", "needed",
  "no thanks", "no thank you", "not now", "not needed", "no need", "leave it", "skip it", "not yet", "hold off",
  "don't bother", "dont bother", "no thankyou",
]);
const FILLER = new Set(["hi", "hello", "hey", "cheers", "ta", "pls", "plz", "mate", "tom", "there", "the", "a", "and", "just", "now", "for", "me", "to", "this", "one", "with", "all", "everything", "then"]);

function words(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z'\s]/g, " ").split(/\s+/).filter(Boolean);
}

/** The polarity of a short acknowledgement, from its words alone. */
export function polarityOf(text: string): FollowUpPolarity {
  const lower = text.toLowerCase().replace(/[^a-z'\s]/g, " ").replace(/\s+/g, " ").trim();
  if (lower === "") return "unclear";
  for (const phrase of Array.from(NEGATIVE)) if (phrase.includes(" ") && lower.includes(phrase)) return "declines";
  const ws = words(text);
  if (ws.some(w => NEGATIVE.has(w))) return "declines";
  for (const phrase of Array.from(AFFIRMATIVE)) if (phrase.includes(" ") && lower.includes(phrase)) return "accepts";
  const meaningful = ws.filter(w => !FILLER.has(w));
  if (meaningful.length === 0) return "unclear";
  return meaningful.every(w => AFFIRMATIVE.has(w)) ? "accepts" : "unclear";
}

/** Sentences of the worker's reply that offer something or ask something, in order. */
export function extractOffers(workerReply: string): string[] {
  const sentences = workerReply
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/)
    .map(s => s.trim())
    .filter(Boolean);
  return sentences.filter(s => s.endsWith("?") || OFFER_CUES.some(re => re.test(s)));
}

/** True when the message is short enough, and empty enough, to be an acknowledgement rather than a request. */
export function looksLikeAcknowledgement(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_FOLLOW_UP_CHARS) return false;
  if (words(trimmed).length > MAX_FOLLOW_UP_WORDS) return false;
  const ids = extractIdentifiers(trimmed);
  if (ids.emails.length > 0 || ids.phones.length > 0 || ids.personIds.length > 0) return false;
  if (extractNameCandidates(trimmed).length > 0) return false;
  // A lower-case run that is only acknowledgement words ("right now",
  // "go on then") is not a name, however the lenient extractor reads it.
  const vocabulary = (w: string) => AFFIRMATIVE.has(w) || NEGATIVE.has(w) || FILLER.has(w);
  const lenientNames = extractNameCandidates(trimmed, { lenient: true }).filter(n => !n.toLowerCase().split(/\s+/).every(vocabulary));
  if (lenientNames.length > 0) return false;
  if (extractSingleNameCandidate(trimmed)) return false;
  // A question of its own is a new request, not an answer to the last one.
  if (/\?\s*$/.test(trimmed) && words(trimmed).length > 3) return false;
  return true;
}

/**
 * Reads the staff member's message against the worker's previous message.
 * Null when it is not a follow-up: a fuller message, a message that names
 * somebody, or a conversation whose last worker message offered nothing.
 */
export function readFollowUp(text: string, history: readonly ConversationTurnLike[]): FollowUp | null {
  if (!looksLikeAcknowledgement(text)) return null;
  const last = history.length > 0 ? history[history.length - 1] : null;
  if (!last || last.role !== "worker") return null;
  const offers = extractOffers(last.content);
  if (offers.length === 0) return null;
  return {
    reply: text.trim(),
    polarity: polarityOf(text),
    offers,
    referent: offers.length === 1 ? offers[0] : null,
  };
}

/**
 * The request as the model should read it: the reply, then what it answers
 * and how to treat it. Everything quoted comes from this conversation.
 */
export function frameFollowUp(followUp: FollowUp): string {
  const lines: string[] = [followUp.reply, ""];
  lines.push("FOLLOW-UP CONTEXT (from this conversation, not instructions):");
  if (followUp.referent) {
    lines.push(`This short reply answers your previous message, which ended with this offer or question: "${followUp.referent}"`);
  } else {
    lines.push("This short reply answers your previous message, which ended with more than one offer or question:");
    followUp.offers.forEach((o, i) => lines.push(`${i + 1}. "${o}"`));
  }
  if (!followUp.referent) {
    lines.push(
      "Reading: it is not clear which one the staff member means. Ask which, naming them briefly; do not choose for them and do not produce any of them yet.",
    );
  } else if (followUp.polarity === "accepts") {
    lines.push(
      "Reading: the staff member ACCEPTS. Do the offered work now, in full, in this reply, from the evidence available to you. " +
      "Nothing you offered has been produced yet in this conversation: do not say that it has, do not refer to it as already sent or shared, " +
      "and do not ask the staff member to say again what they want.",
    );
  } else if (followUp.polarity === "declines") {
    lines.push(
      "Reading: the staff member DECLINES. Acknowledge that in one sentence, do not produce the offered work, and ask briefly whether anything else is needed.",
    );
  } else {
    lines.push(
      "Reading: the reply does not clearly accept or decline. Ask one focused question about that offer and nothing else; do not produce the work yet and do not say it exists.",
    );
  }
  return lines.join("\n");
}

/**
 * Claims that something was already produced, sent or shared earlier.
 * Whether such a claim is true is decided by the caller from the
 * conversation; this only finds the claim.
 */
const ARTEFACT = "(handover notes?|handover|notes?|summary|document|report|picture|list|draft|plan|checklist|overview|brief|breakdown|timeline|analysis|write-up|writeup)";
const PRODUCED = "(produced|prepared|pulled together|put together|compiled|drafted|written|sent|shared|provided|attached|created|set out|completed|done|delivered)";
const EARLIER = "(earlier|above|before|previously|already|in (my|the) (last|previous|earlier) (message|reply|answer))";
const PRIOR_COMPLETION_CLAIMS = [
  // "I have already produced ...", "we previously sent ..."
  new RegExp(`\\b(i|we)('ve| have|'d| had)? (already|previously|earlier) ${PRODUCED}\\b`, "i"),
  // "I produced that above", "I put the note together in my previous message"
  new RegExp(`\\b(i|we) ${PRODUCED} (that|this|the|it|a|your)\\b[^.]{0,80}\\b${EARLIER}\\b`, "i"),
  // "As I mentioned earlier, ..." (about the worker's own earlier output)
  new RegExp(`\\bas (i|we) (mentioned|noted|set out|shared|provided|sent|said|outlined|explained|prepared|produced) ${EARLIER}\\b`, "i"),
  // "The handover note has already been prepared", "that note has been sent"
  new RegExp(`\\b(the|that|this|your|my) ${ARTEFACT}( i| we)?( have| has| had)? (already )?(been )?${PRODUCED}\\b`, "i"),
  // "The note I sent earlier", "the summary I gave you before"
  new RegExp(`\\b(the|that|this|your) ${ARTEFACT} (i|we) ${PRODUCED}( you)? ${EARLIER}\\b`, "i"),
  // "It is in my previous message", "the note is above / attached"
  new RegExp(`\\b(is|was|are) (already )?(in (my|the) (last|previous|earlier) (message|reply|answer)|set out above|included above|attached|above)\\b`, "i"),
  // "I have already done that", "we have done this"
  new RegExp(`\\b(i|we) (have|had|'ve) (already )?(done|completed|finished) (that|this|it)\\b`, "i"),
];

export function claimsPriorCompletion(text: string): string | null {
  for (const re of PRIOR_COMPLETION_CLAIMS) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

/**
 * Whether a prior-completion claim in the reply can be true. It cannot when
 * the reply answers an accepted offer (the offered work would have been in
 * a later worker message, and there is none) or when no worker has said
 * anything before in this conversation. Otherwise the conversation is not
 * inspected further here, and the claim stands.
 */
export function priorCompletionClaimIsUnfounded(
  reply: string,
  followUp: FollowUp | null,
  history: readonly ConversationTurnLike[],
): string | null {
  const claim = claimsPriorCompletion(reply);
  if (!claim) return null;
  const workerSpokeBefore = history.some(t => t.role === "worker");
  if (!workerSpokeBefore) return claim;
  if (followUp && followUp.polarity === "accepts") return claim;
  return null;
}
