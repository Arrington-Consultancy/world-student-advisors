/**
 * Nia's Social Brain: what WSA social memory is designed to hold.
 *
 * Transcribed from WSA_Nia_Social_Media_Content_Intelligence_Specialist_
 * v0.1_WORKING_DRAFT.docx, read from 01_Working_Drafts on 30 August 2026.
 * Section numbers are kept so a reviewer can check the transcription
 * against the source instead of trusting it.
 *
 * A note on provenance, because it matters here. The QC Review v1.0 cites
 * "Social Brain Supporting Control Pack v0.1" among its bases, and the
 * Worker Register carries that name in Nia's specification version. That
 * document does not exist. It is not in SharePoint under any search, and
 * Nia's own brief §30 lists it as future work: "Next control: five-pass QC
 * ... then create the Social Brain Supporting Control Pack and formal
 * tests." So the register list below is transcribed from §8 of the brief,
 * which is the controlled record that actually exists, and CONTROL_PACK
 * says so rather than printing a filename staff cannot open.
 *
 * The ten records are §8 exactly — same names, same order, same stated
 * purposes. Not nine, and not with anything added: an eleventh register
 * that reads plausibly is still a register nobody approved, and the whole
 * value of this file is that it can be diffed against the document.
 */

export interface SocialBrainRecord {
  id: string;
  /** The name the controlled record gives it. Not a friendlier rewrite. */
  name: string;
  /** The Purpose column of §8, verbatim. */
  purpose: string;
  /** How many are in it. Zero, everywhere, until history is imported. */
  recorded: number;
}

/** What the page should cite as its source, since the Control Pack is unwritten. */
export const CONTROL_PACK_STATUS = Object.freeze({
  source: "WSA_Nia_Social_Media_Content_Intelligence_Specialist_v0.1_WORKING_DRAFT.docx §8",
  namedButNotWritten: "WSA_Nia_Social_Brain_Supporting_Control_Pack_v0.1",
  note:
    "The Supporting Control Pack is named by the QC Review but has not been written yet — Nia's brief §30 lists " +
    "creating it as the next control. These records are transcribed from §8 of the brief itself.",
});

/** §8 Social memory architecture, in the document's own order. */
export const SOCIAL_BRAIN_RECORDS: readonly SocialBrainRecord[] = Object.freeze([
  {
    id: "content_ledger",
    name: "Master Social Content Ledger",
    purpose:
      "One row/record for every published, scheduled, cancelled or materially revised post across every managed platform.",
    recorded: 0,
  },
  {
    id: "asset_register",
    name: "Asset & Version Register",
    purpose: "Canonical text, image, carousel, thumbnail, video, caption and edit versions with lineage.",
    recorded: 0,
  },
  {
    id: "platform_performance",
    name: "Platform Performance Register",
    purpose:
      "Reach, impressions, views, watch time, retention, reactions, comments, saves, shares, clicks and available conversion/quality evidence.",
    recorded: 0,
  },
  {
    id: "video_timecode",
    name: "Video Timecode & Retention Register",
    purpose:
      "Hook, scene, cut, subtitle, CTA and topic timecodes plus second-by-second or interval retention data where the platform actually provides it.",
    recorded: 0,
  },
  {
    id: "africa_intelligence",
    name: "Africa Market Intelligence Library",
    purpose: "Country and audience profiles with evidence, confidence and freshness.",
    recorded: 0,
  },
  {
    id: "hook_format",
    name: "Hook & Format Library",
    purpose: "What openings, lengths, structures, visual patterns and CTAs work by platform/audience.",
    recorded: 0,
  },
  {
    id: "slop_patterns",
    name: "AI-Slop Pattern Register",
    purpose: "Recurring phrases, rhythms, visual tropes and content defects Nia has rejected or corrected.",
    recorded: 0,
  },
  {
    id: "editorial_calendar",
    name: "Editorial Calendar & Series Register",
    purpose: "Planned themes, series, platform adaptations, owners, deadlines and status.",
    recorded: 0,
  },
  {
    id: "community_insight",
    name: "Community Insight Register",
    purpose:
      "Recurring questions, objections, comment themes and content opportunities, using data-minimised summaries.",
    recorded: 0,
  },
  {
    id: "experiment_register",
    name: "Experiment Register",
    purpose: "A/B hypotheses, variants, dates, audience/platform, results, confounders and learning.",
    recorded: 0,
  },
]);

export interface RememberedCapability {
  question: string;
  answer: string;
  /** Sections of the brief that carry it, so the claim is checkable. */
  sections: readonly string[];
}

/**
 * The things staff will actually ask a social memory, answered from the
 * brief rather than from what would be impressive to claim.
 *
 * "Every post", "how effective it was" and "when it should go out again"
 * are all genuinely in the controlled record. Repeating is worth stating
 * explicitly because it is easy to miss: it has no register of its own,
 * it lives across the Editorial Calendar & Series Register, the §17
 * learning loop, §21's resurfacing rule and test NIA-09.
 */
export const DESIGNED_TO_REMEMBER: readonly RememberedCapability[] = Object.freeze([
  {
    question: "Every post",
    answer:
      "Published, scheduled, cancelled or materially revised, on every managed platform — with the account, exact " +
      "publish time and time zone, hook, CTA, the factual claims and the evidence behind them, and who approved it.",
    sections: ["§8 Master Social Content Ledger", "§9 Every-post memory standard"],
  },
  {
    question: "How effective it was",
    answer:
      "Reach, views, watch time, retention, saves, shares and clicks, kept separate from causal claims about " +
      "applications or enrolments. High engagement with poor enquiry quality is recorded as exactly that, not as a win.",
    sections: ["§8 Platform Performance Register", "§16 Performance philosophy", "Test NIA-05"],
  },
  {
    question: "When it should be repeated",
    answer:
      "Strong evergreen work is resurfaced when the evidence and timing are still current, re-adapted rather than " +
      "reposted, and carried in the lineage so you can see what came from what. The learning loop asks what should be " +
      "repeated, what should change and what should never run again.",
    sections: ["§21 Editorial system", "§17 Learning loop", "§9 Repurposing lineage", "Test NIA-09"],
  },
  {
    question: "What happened second by second in a video",
    answer:
      "Hook, first face or voice, cuts, dead air, subtitles, proof points and CTA against the real timeline — and " +
      "where a platform gives only aggregate watch time, she says so instead of inventing precision.",
    sections: ["§10 Video-second intelligence", "Test NIA-07"],
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
 * Spend is the one to watch. It is a reasonable thing to want from a
 * social memory, and it is absent from §8 on purpose: §14 gives paid media
 * strategy and measurement to Alex, and test NIA-11 requires a boost
 * request to route to him rather than be absorbed under organic
 * authority. Putting a spend register in here would quietly move the
 * boundary, so it is named here as Alex's instead.
 */
export const HELD_ELSEWHERE: readonly Elsewhere[] = Object.freeze([
  {
    subject: "Advertising spend, budgets and cost per result",
    owner: "Alex — Paid Media",
    why:
      "Nia owns organic social. Paid boosting, ad targeting and paid measurement sit with Alex, and a boost request " +
      "routes to him rather than running on organic authority (§14, test NIA-11).",
  },
  {
    subject: "Website and organic search performance",
    owner: "Ethan — SEO",
    why: "Ethan owns organic search and website SEO. They exchange content intelligence; neither absorbs the other (§14).",
  },
  {
    subject: "A student's own case, raised in comments or DMs",
    owner: "Sophie — Enquiry & Triage",
    why: "Student-specific questions leave the public thread and route to the enquiry process. Nia does not run a case in public (§14, §20).",
  },
  {
    subject: "Course suitability and education research",
    owner: "Amelia and Oliver",
    why: "Nia may use their controlled evidence; she does not research or decide suitability herself (§14, test NIA-12).",
  },
]);

/**
 * What "she remembers six years of posts" is actually true of today.
 *
 * The design is durable and auditable by intent — §8's whole premise is
 * that memory lives in controlled records, not chat. But no history has
 * been imported, so the honest answer to "what did our 2020 post do" is
 * that nothing can answer it yet. Stating that is not a caveat for its own
 * sake: a confident wrong answer about what worked is worse than none,
 * because somebody would build a quarter of content on it.
 */
export const MEMORY_HORIZON = Object.freeze({
  populated: false,
  designedFor:
    "Persistent, auditable records rather than chat memory, so a later worker or staff member can reconstruct what happened.",
  actualState:
    "Nothing has been imported. No post, performance figure or asset version exists in any of these records, so no " +
    "question about past WSA social activity can be answered from them yet.",
  toChangeThat:
    "Importing WSA's existing social history is separate work, and it needs NIA-G03 (analytics and export data-access " +
    "and retention scope) and NIA-G06 (the platform and account ownership map) settled first.",
});
