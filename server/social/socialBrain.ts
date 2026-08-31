/**
 * Nia's Social Brain: what WSA social memory is designed to hold.
 *
 * Transcribed from WSA_Nia_Social_Brain_Supporting_Control_Pack_v0.1_
 * WORKING_DRAFT.docx, read from 01_Working_Drafts on 30 August 2026. The
 * Pack is the operational record: it turns the memory architecture of
 * Nia's brief §8 into nine numbered registers with their actual fields
 * and controls, and it is the thing a records person would work from.
 *
 * A correction is recorded here because it was published and had to be
 * withdrawn. An earlier version of this file stated that the Control Pack
 * "has not been written" and rebuilt the register list from brief §8
 * instead. That was wrong. The Pack exists, was created on 30 August 2026,
 * and its creation is recorded in Change Entry 062. It was missed by a
 * loose keyword search and found by an exact-phrase one. The nine
 * registers this file had originally carried were a correct transcription
 * of it, and replacing them was a regression, not a fix.
 *
 * Where the Pack and the brief disagree, the disagreement is recorded in
 * PACK_TO_BRIEF below rather than resolved here. Reconciling two
 * controlled records is a records decision for Tom Arrington, not
 * something to settle by choosing whichever list a page looks better with.
 */

export interface SocialBrainRecord {
  id: string;
  /** The name the Control Pack gives it, with its section number. */
  name: string;
  section: number;
  /** What the Pack's own field table controls, condensed. */
  purpose: string;
  /** How many are in it. Zero, everywhere, until history is imported. */
  recorded: number;
}

export const CONTROL_PACK = Object.freeze({
  document: "WSA_Nia_Social_Brain_Supporting_Control_Pack_v0.1_WORKING_DRAFT.docx",
  version: "v0.1 Working Draft",
  status: "NOT APPROVED",
  created: "30 August 2026, recorded in Change Entry 062",
  authorityNote:
    "This pack implements records and tests only; it does not grant live publishing authority.",
});

/** Control Pack sections 1 to 9, in the document's own order. */
export const SOCIAL_BRAIN_RECORDS: readonly SocialBrainRecord[] = Object.freeze([
  {
    id: "content_ledger",
    name: "Master Social Content Ledger",
    section: 1,
    purpose:
      "One record per post: exact account, audience and country focus, purpose, named voice, canonical copy and each platform adaptation, evidence for every material claim, both quality gates, approval state, exact publish time and time zone, live post ID, performance checkpoints and the final learning.",
    recorded: 0,
  },
  {
    id: "asset_register",
    name: "Asset & Version Register",
    section: 2,
    purpose:
      "Every asset and every immutable version: type, who created it, source files, rights and consent evidence where people or third-party material appear, what it supersedes and why it changed.",
    recorded: 0,
  },
  {
    id: "video_timecode",
    name: "Video Timecode & Retention Register",
    section: 3,
    purpose:
      "The timeline itself: 0-1s, 1-3s, 3-5s and onward, subtitle timing, when the CTA begins, and the platform's actual retention metric named with its real granularity. Drop and rewatch points only where platform evidence supports them.",
    recorded: 0,
  },
  {
    id: "africa_intelligence",
    name: "Africa Market Intelligence Profile",
    section: 4,
    purpose:
      "Country plus audience segment, never 'Africa' as a substitute for local evidence. Observed questions, affordability themes, application timing, platform behaviour, high and weak performing themes linked to Content IDs, each with source, confidence, checked date and a revalidation trigger.",
    recorded: 0,
  },
  {
    id: "slop_review",
    name: "AI-Slop & Human Voice Review",
    section: 5,
    purpose:
      "Could 500 education agents post it unchanged? Is there real WSA judgement in it? Would the named person say it aloud? Empty superlatives, formulaic cadence, invented certainty, platform nativeness, and a final PASS, REWORK or BLOCKED.",
    recorded: 0,
  },
  {
    id: "editorial_calendar",
    name: "Editorial Calendar & Series Register",
    section: 6,
    purpose:
      "Themes, series and adaptations with a named owner, due date and publish window. One field is mandatory and one sentence long: the reason somebody would stop scrolling.",
    recorded: 0,
  },
  {
    id: "performance",
    name: "Performance & Experiment Register",
    section: 7,
    purpose:
      "What Nia expected and why, against real platform metrics only. Attention, engagement and action results, approved aggregated downstream quality evidence, the confounders that could explain it, a bounded conclusion and the next test.",
    recorded: 0,
  },
  {
    id: "community",
    name: "Community Insight Register",
    section: 8,
    purpose:
      "Themes, not personal case data. Recurring questions with data-minimised summaries, observed frequency without invented precision, where each needs routing, and a sensitive-data flag that stops personal detail entering the record at all.",
    recorded: 0,
  },
  {
    id: "readiness",
    name: "Publication Readiness Checklist",
    section: 9,
    purpose:
      "Fifteen checks before anything goes live, including both quality gates, evidence currency, no neighbouring-worker scope breach, rights and consent, accessibility, and publishing authority confirmed for this exact account and action.",
    recorded: 0,
  },
]);

export interface ReconciliationItem {
  briefSection8: string;
  controlPack: string | null;
  note: string;
}

/**
 * Where the Control Pack and brief §8 do not line up.
 *
 * The brief names ten records at architecture level; the Pack
 * operationalises nine. Most of the difference is renaming or merging and
 * is plainly the same record. Two items are genuine, and they are the
 * reason this list exists rather than a tidy claim that the records agree:
 * Hook & Format Library is in the brief and has no section in the Pack,
 * and the Publication Readiness Checklist is in the Pack and is not in
 * brief §8.
 *
 * Neither is resolved here. A page cannot decide which of two controlled
 * documents is right.
 */
export const PACK_TO_BRIEF: readonly ReconciliationItem[] = Object.freeze([
  {
    briefSection8: "Master Social Content Ledger",
    controlPack: "§1 Master Social Content Ledger",
    note: "Same record, same name.",
  },
  {
    briefSection8: "Asset & Version Register",
    controlPack: "§2 Asset & Version Register",
    note: "Same record, same name.",
  },
  {
    briefSection8: "Platform Performance Register",
    controlPack: "§7 Performance & Experiment Register",
    note: "Merged with the Experiment Register in the Pack.",
  },
  {
    briefSection8: "Experiment Register",
    controlPack: "§7 Performance & Experiment Register",
    note: "Merged with the Platform Performance Register in the Pack.",
  },
  {
    briefSection8: "Video Timecode & Retention Register",
    controlPack: "§3 Video Timecode & Retention Register",
    note: "Same record, same name.",
  },
  {
    briefSection8: "Africa Market Intelligence Library",
    controlPack: "§4 Africa Market Intelligence Profile",
    note: "Renamed. The brief calls the collection a Library and a single market a Profile; the Pack uses Profile throughout.",
  },
  {
    briefSection8: "AI-Slop Pattern Register",
    controlPack: "§5 AI-Slop & Human Voice Review",
    note: "Renamed and widened: the Pack merges the brief's separate Human Voice Gate into the same review.",
  },
  {
    briefSection8: "Editorial Calendar & Series Register",
    controlPack: "§6 Editorial Calendar & Series Register",
    note: "Same record, same name.",
  },
  {
    briefSection8: "Community Insight Register",
    controlPack: "§8 Community Insight Register",
    note: "Same record, same name.",
  },
  {
    briefSection8: "Hook & Format Library",
    controlPack: null,
    note: "UNRECONCILED. Named in brief §8 and given no section in the Control Pack. What works by platform and audience currently has nowhere to live.",
  },
  {
    briefSection8: "(not in brief §8)",
    controlPack: "§9 Publication Readiness Checklist",
    note: "UNRECONCILED. Added by the Control Pack and absent from the brief's memory architecture.",
  },
]);

export interface RememberedCapability {
  question: string;
  answer: string;
  /** Where it is controlled, so the claim is checkable. */
  sources: readonly string[];
}

/**
 * The things staff will actually ask a social memory, answered from the
 * controlled records rather than from what would be impressive to claim.
 *
 * Repeating is worth stating explicitly because it has no register of its
 * own. It lives across the Pack's lineage and freshness fields, brief §21
 * and §17, and test NIA-T13.
 */
export const DESIGNED_TO_REMEMBER: readonly RememberedCapability[] = Object.freeze([
  {
    question: "Every post",
    answer:
      "Published, scheduled, cancelled, corrected or deleted, on every managed account, with the exact publish time and time zone, the hook, the evidence behind each material claim, who approved it, and the reason if it did not stay live.",
    sources: ["Control Pack §1", "Brief §9"],
  },
  {
    question: "How effective it was",
    answer:
      "Real platform metrics only, split into attention, engagement and action, with confounders recorded beside them. High engagement and weak downstream quality is recorded as a mixed result, not a win.",
    sources: ["Control Pack §7", "Brief §16", "Test NIA-T07"],
  },
  {
    question: "When it should be repeated",
    answer:
      "Repurposing lineage links parent and child Content IDs, evidence carries a checked date and a revalidation trigger, and a strong old post is re-adapted for the platform and audience rather than reposted. The learning loop asks what should be repeated, what should change and what should never run again.",
    sources: ["Control Pack §1 lineage", "Control Pack §4 revalidation", "Brief §21", "Brief §17", "Test NIA-T13"],
  },
  {
    question: "What happened second by second in a video",
    answer:
      "First visual, word, face and sound at 0-1s, hook development to 3s, first proof point to 5s, then the meaningful cuts and the CTA. Where a platform gives only aggregate watch time, the Pack requires the real granularity to be named instead of invented.",
    sources: ["Control Pack §3", "Brief §10", "Test NIA-T09"],
  },
]);

export interface Elsewhere {
  subject: string;
  owner: string;
  why: string;
}

/**
 * Asked for, and deliberately not hers.
 *
 * Spend is the one to watch, and the position is more precise than "not
 * hers". The Control Pack's Performance & Experiment Register already
 * lists paid boost among the confounders Nia records against an organic
 * result, so noting that a post was boosted is inside her records today.
 * What is not hers is the paid figures themselves: brief §14 gives paid
 * strategy and measurement to Alex, and test NIA-T11 requires a boost
 * request to route to him. She does not become the source of truth for
 * paid measurement, and no register here holds spend.
 */
export const HELD_ELSEWHERE: readonly Elsewhere[] = Object.freeze([
  {
    subject: "Advertising spend, paid performance and cost per result",
    owner: "Alex — Paid Media",
    why:
      "Alex owns paid strategy, spend and paid measurement; a boost request routes to him rather than running on organic authority (brief §14, test NIA-T11). Nia may record that a post was boosted as a confounder on the organic result (Control Pack §7), but she holds no spend figure and is not the source of truth for paid.",
  },
  {
    subject: "Website and organic search performance",
    owner: "Ethan — SEO",
    why: "Ethan owns organic search and website SEO. They exchange content intelligence; neither absorbs the other (brief §14).",
  },
  {
    subject: "A student's own case, raised in comments or DMs",
    owner: "Sophie — Enquiry & Triage",
    why: "Student-specific questions leave the public thread and route to the enquiry process. Nia does not run a case in public (brief §14, §20, test NIA-T10).",
  },
  {
    subject: "Course suitability and education research",
    owner: "Amelia and Oliver",
    why: "Nia may use their controlled evidence; she does not research or decide suitability herself (brief §14, test NIA-T06).",
  },
  {
    subject: "Scholarship eligibility and funding gaps",
    owner: "Harper — Funding",
    why: "Nia may communicate approved funding facts. An unsupported scholarship claim is blocked and routed to Harper (brief §14, test NIA-T05).",
  },
  {
    subject: "Visa and immigration guidance",
    owner: "Priya — Visa & Compliance",
    why: "Nia may publish verified factual guidance already approved for publication. She gives no immigration strategy, and an unsupported visa claim is blocked and routed (brief §14, test NIA-T04).",
  },
]);

/**
 * What "she remembers years of posts" is actually true of today.
 *
 * The design is durable and auditable by intent. But nothing has been
 * imported, so the honest answer to "what did that post do" is that
 * nothing can answer it yet. A confident wrong answer about what worked is
 * worse than none, because somebody would build a quarter of content on it.
 */
export const MEMORY_HORIZON = Object.freeze({
  populated: false,
  designedFor:
    "Persistent, auditable records rather than chat memory, so a later worker or staff member can reconstruct what happened.",
  actualState:
    "Nothing has been imported. No post, performance figure or asset version exists in any of these registers, so no " +
    "question about past WSA social activity can be answered from them yet.",
  toChangeThat:
    "Importing WSA's existing social history is separate work. It needs NIA-G03, the approved analytics and export " +
    "data-access and retention scope, and NIA-G06, the definitive platform and account ownership map, settled first.",
});
