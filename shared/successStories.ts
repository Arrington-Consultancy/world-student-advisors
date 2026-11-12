/**
 * The WSA student success story record, and the gate that decides whether
 * one may be shown to the public.
 *
 * CONTROLLING RECORD. WSA_Student_Success_Story_and_Proof_Direction_
 * 2026-09-04_APPROVED.docx, in 17_Senior Management Team/AI_Operating_
 * System/07_Control_Room. Decision owner Tom Arrington, 4 September 2026.
 * The Drive handover of 17 August is the working instruction; where the two
 * differ, the SharePoint record controls, and this module follows it.
 *
 * WHY THIS EXISTS. The direction makes verified student journeys the
 * backbone of WSA's proof layer. Most of it reads as editorial guidance and
 * is really a set of conditions that must hold before a word about a real
 * person reaches the public web. Conditions that live only in a document
 * get forgotten the first time somebody is in a hurry, so they are here as
 * a function that refuses, one check per clause of the gate, each refusing
 * by name.
 *
 * THE GATE, clause by clause, as the controlled record states it:
 *
 *   "Every factual claim is traceable to an authorised case record or
 *   evidence supplied for this purpose."            -> evidence.reference
 *
 *   "Consent is recorded for the specific words, images, channels and
 *   intended duration of use."      -> consent.recorded, .scope, .duration
 *
 *   "The student approves the final wording and visual. A parent or
 *   guardian approves where the subject is a child."
 *                -> finalWordingApproved, finalVisualApproved, guardian
 *
 *   "Sensitive personal data is excluded unless specific authority and
 *   explicit consent cover it."                  -> sensitive-data check
 *
 *   "Visa, admission, employment and career claims are verified. WSA must
 *   not imply guarantees or infer outcomes that are not evidenced."
 *                                              -> outcomeClaimsVerified
 *
 *   "No content describes WSA as giving regulated immigration advice
 *   unless the current controlled authority expressly permits that claim."
 *                                       -> regulated-advice-claim check
 *
 *   "A consent withdrawal is recorded and actioned across every recorded
 *   publication location."                    -> withdrawal, before all
 *
 * WHY THE GATE IS SEPARATE FROM THE STORE. A record existing is not
 * permission to publish it. The store holds records at every stage,
 * including drafts with no consent yet and stories a student has since
 * withdrawn. Only decidePublication decides, and the page renders only what
 * it allows, so adding a record can never publish it by accident.
 *
 * WHY CONSENT AND HUMAN RELEASE ARE SEPARATE. The record is explicit that
 * neither the Website AI nor Nia "receives automatic account access, live
 * publishing, scheduling, external-send, reply, deletion or approval
 * authority", and that "the shared executive route must not be used to
 * bypass either worker's controls". A story the student has fully consented
 * to is still not released until a human says so, so drafting content can
 * never publish it.
 *
 * WHY THE STORE IS EMPTY. Because no real student story has passed the
 * gate. The record instructs: "Build the presentation and record structure
 * only. Do not populate a real student story unless the consent and
 * evidence gate has passed and a human has approved the final asset."
 * Inventing one would be the exact failure this module exists to prevent.
 * The page renders an honest empty state instead.
 *
 * A visa grant is not the only definition of success. The record treats
 * "changed direction, declining an unsuitable option, arrival, graduation
 * and career progress" as potential success stories, so nothing here
 * privileges one outcome shape over another.
 */

/** How the student is identified publicly. Anonymisation must be a decision, not a blank field. */
export type StoryIdentity =
  | { kind: "named"; displayName: string }
  | { kind: "anonymised"; label: string; reason: string };

export type StoryPublicationLocation = "website" | "social" | "print";

/**
 * The intended duration of use, which the record requires to be part of
 * consent. `until: null` means indefinite, and is a recorded decision
 * rather than a missing value.
 */
export interface ConsentDuration {
  from: string;
  until: string | null;
}

/**
 * What the student actually agreed to. Consent is per use, so a student who
 * agreed to a website page has not thereby agreed to a social post, and
 * consent that has run out is not current consent.
 */
export interface ConsentRecord {
  /** Recorded, specific and current. False covers "asked but not yet given" as well as never asked. */
  recorded: boolean;
  /** The channels consented to. A publication location outside this list is not consented. */
  scope: readonly StoryPublicationLocation[];
  /** The intended duration of use. */
  duration: ConsentDuration;
  /** The student saw and approved the exact wording that will appear. */
  finalWordingApproved: boolean;
  /** The student saw and approved the exact image that will appear. Also required when no photograph is used. */
  finalVisualApproved: boolean;
  /** Set when the student was a child at the time of consent. */
  studentWasChild: boolean;
  /** Required, and only required, when studentWasChild is true. */
  parentOrGuardianConsent: boolean;
}

/**
 * A recorded withdrawal, and whether it has actually been actioned.
 *
 * The record requires withdrawal to be "actioned across every recorded
 * publication location", so a withdrawal that has been logged but not yet
 * carried out is tracked as outstanding rather than treated as done.
 */
export interface WithdrawalRecord {
  requestedDate: string;
  /** Removal completed in every location the story was published to. */
  removalComplete: boolean;
  completedDate?: string;
}

/** Where a fact came from. A fact with no traceable source cannot be published. */
export interface EvidenceRecord {
  /** Reference to the authorised case record or evidence supplied for this purpose. Never the evidence itself. */
  reference: string;
  /** Date the outcome was evidenced, ISO yyyy-mm-dd. */
  evidenceDate: string;
  /** The named human accountable for checking this story before release. */
  reviewOwner: string;
}

/** Publication status and every location the story actually reached. */
export interface PublicationRecord {
  status: "draft" | "approved" | "published" | "withdrawn";
  publishedLocations: readonly StoryPublicationLocation[];
}

/**
 * The ten countries on Tim Hunt's Student Success Stories page (his design
 * of 11 November 2026), in his order. A country appears on the page only
 * when at least one of its stories passes the gate.
 */
export const SUCCESS_STORY_COUNTRIES = [
  { slug: "angola", name: "Angola", flagCode: "ao" },
  { slug: "ghana", name: "Ghana", flagCode: "gh" },
  { slug: "kenya", name: "Kenya", flagCode: "ke" },
  { slug: "malawi", name: "Malawi", flagCode: "mw" },
  { slug: "nigeria", name: "Nigeria", flagCode: "ng" },
  { slug: "south-sudan", name: "South Sudan", flagCode: "ss" },
  { slug: "tanzania", name: "Tanzania", flagCode: "tz" },
  { slug: "uganda", name: "Uganda", flagCode: "ug" },
  { slug: "zambia", name: "Zambia", flagCode: "zm" },
  { slug: "zimbabwe", name: "Zimbabwe", flagCode: "zw" },
] as const;

export type SuccessStoryCountry = (typeof SUCCESS_STORY_COUNTRIES)[number];
export type SuccessStoryCountrySlug = SuccessStoryCountry["slug"];

export const SUCCESS_STORIES_PATH = "/student-success-stories";

export function successStoryCountryPath(slug: SuccessStoryCountrySlug): string {
  return `${SUCCESS_STORIES_PATH}/${slug}`;
}

/**
 * A photograph in a story. `illustration` is a decision, not a default: an
 * AI-made or staged image is labelled as an illustration on the page, so it
 * is never passed off as a photograph of the person named.
 */
export interface StoryImage {
  src: string;
  alt: string;
  /** The image's own pixel size, so the page reserves its space. */
  width: number;
  height: number;
  caption?: string;
  illustration: boolean;
}

export type StoryBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "image"; image: StoryImage }
  /** The closing name and course lines, as Tim set them at the end of a story. */
  | { kind: "signature"; lines: readonly string[] };

/** The story in one language, exactly as approved for publication. */
export interface StoryVersion {
  /** The language's name, on its button, e.g. "English", "Português". */
  language: string;
  /** The text's language code, so phones and screen readers treat it as that language. */
  lang: string;
  title?: string;
  /** Name, course, institution and year, under the title. */
  byline: readonly string[];
  blocks: readonly StoryBlock[];
}

export interface SuccessStory {
  id: string;
  identity: StoryIdentity;
  countrySlug: SuccessStoryCountrySlug;
  /**
   * The story as written, first version first. More than one version is the
   * same story in another language (Tim Hunt's Angola stories are in English
   * and Portuguese). Every word and image here is what the student approved.
   */
  versions: readonly StoryVersion[];

  evidence: EvidenceRecord;
  consent: ConsentRecord;
  publication: PublicationRecord;
  withdrawal?: WithdrawalRecord;

  /**
   * Visa, admission, employment and career claims in this story have been
   * verified against the evidence rather than inferred.
   */
  outcomeClaimsVerified: boolean;

  /** The story includes immigration, financial, health or safeguarding detail. */
  includesSensitiveData: boolean;
  /** The specific recorded authority covering that data. Required only when the flag above is set. */
  sensitiveDataAuthority: string;

  /** The copy would describe WSA as giving regulated immigration advice. */
  claimsRegulatedImmigrationAdvice: boolean;
  /** The controlled authority expressly permitting that claim. Required only when the flag above is set. */
  regulatedAdviceAuthority: string;

  /**
   * An authorised human has approved the final asset for release. Separate
   * from consent, and never set by a worker drafting content.
   */
  humanApprovalToPublish: boolean;
}

export type PublicationRefusalCode =
  | "consent_withdrawn"
  | "consent_not_recorded"
  | "consent_expired"
  | "location_outside_consent_scope"
  | "guardian_consent_missing"
  | "final_wording_not_approved"
  | "final_visual_not_approved"
  | "sensitive_data_without_authority"
  | "regulated_advice_claim_without_authority"
  | "outcome_claims_unverified"
  | "evidence_not_traceable"
  | "review_owner_missing"
  | "human_approval_missing";

export interface PublicationDecision {
  publishable: boolean;
  /** Present whenever publishable is false. */
  code?: PublicationRefusalCode;
  reason?: string;
}

function refuse(code: PublicationRefusalCode, reason: string): PublicationDecision {
  return { publishable: false, code, reason };
}

/** Whether the recorded consent duration still covers this moment. */
function consentIsCurrent(duration: ConsentDuration, now: Date): boolean {
  if (duration.until === null) return true;
  const until = Date.parse(duration.until);
  if (Number.isNaN(until)) return false;
  return now.getTime() <= until;
}

/**
 * Whether this story may appear in this location.
 *
 * Deny by default: every condition must pass, and a condition that cannot
 * be evaluated counts as failed. The order runs from the strongest reason
 * to refuse to the weakest, so the reason recorded is the most important
 * one rather than whichever happened to be checked first. Withdrawal is
 * checked before anything else, because a student who has withdrawn should
 * never see their story assessed on any other basis.
 *
 * `now` is injected so consent expiry is testable, and defaults to the real
 * clock in every production call.
 */
export function decidePublication(
  story: SuccessStory,
  location: StoryPublicationLocation,
  now: Date = new Date(),
): PublicationDecision {
  if (story.withdrawal || story.publication.status === "withdrawn") {
    return refuse("consent_withdrawn", "The student has withdrawn consent for this story.");
  }
  if (!story.consent.recorded) {
    return refuse("consent_not_recorded", "No recorded student consent for this story.");
  }
  if (!consentIsCurrent(story.consent.duration, now)) {
    return refuse(
      "consent_expired",
      "The recorded consent duration for this story has ended.",
    );
  }
  if (!story.consent.scope.includes(location)) {
    return refuse(
      "location_outside_consent_scope",
      `The student did not consent to publication in "${location}".`,
    );
  }
  if (story.consent.studentWasChild && !story.consent.parentOrGuardianConsent) {
    return refuse(
      "guardian_consent_missing",
      "The subject was a child and no parent or guardian approval is recorded.",
    );
  }
  if (!story.consent.finalWordingApproved) {
    return refuse("final_wording_not_approved", "The student has not approved the final wording.");
  }
  if (!story.consent.finalVisualApproved) {
    return refuse("final_visual_not_approved", "The student has not approved the final visual.");
  }
  if (story.includesSensitiveData && story.sensitiveDataAuthority.trim() === "") {
    return refuse(
      "sensitive_data_without_authority",
      "The story includes sensitive personal data with no specific recorded authority covering it.",
    );
  }
  if (story.claimsRegulatedImmigrationAdvice && story.regulatedAdviceAuthority.trim() === "") {
    return refuse(
      "regulated_advice_claim_without_authority",
      "The story describes WSA as giving regulated immigration advice without controlled authority for that claim.",
    );
  }
  if (!story.outcomeClaimsVerified) {
    return refuse(
      "outcome_claims_unverified",
      "The visa, admission, employment or career claims in this story are not verified.",
    );
  }
  if (story.evidence.reference.trim() === "") {
    return refuse(
      "evidence_not_traceable",
      "No authorised case record or supplied evidence is referenced for this story.",
    );
  }
  if (story.evidence.reviewOwner.trim() === "") {
    return refuse("review_owner_missing", "No named review owner is recorded for this story.");
  }
  if (!story.humanApprovalToPublish) {
    return refuse("human_approval_missing", "No authorised human has approved this story for release.");
  }
  return { publishable: true };
}

/**
 * The stories cleared for one location, in the order given.
 *
 * The page calls this rather than reading the store, so a record can only
 * ever reach a browser through the gate.
 */
export function publishableStories(
  stories: readonly SuccessStory[],
  location: StoryPublicationLocation,
  now: Date = new Date(),
): SuccessStory[] {
  return stories.filter(story => decidePublication(story, location, now).publishable);
}

/**
 * Withdrawals that have been requested but not yet carried out everywhere.
 *
 * The record requires a withdrawal to be actioned across every recorded
 * publication location, which is work in the world rather than a flag. This
 * surfaces the ones still outstanding so they can be chased, instead of a
 * logged withdrawal being mistaken for a completed one.
 */
export function outstandingWithdrawals(stories: readonly SuccessStory[]): SuccessStory[] {
  return stories.filter(story => story.withdrawal !== undefined && !story.withdrawal.removalComplete);
}

/**
 * Every recorded student success story, at any stage.
 *
 * Empty, and that is the current true state rather than an unfinished one.
 * Tim Hunt sent twelve stories from ten countries on 11 November 2026, and
 * Tom Arrington chose on 12 November that each goes live once Tim confirms
 * the person has agreed to their words and photographs being published.
 * Until then they stay out of this list, and out of this repository, which
 * is public: committing a story's words or photographs here would publish
 * them before the student agreed, whatever the page shows.
 *
 * Adding a record still does not publish it: decidePublication has to allow
 * it, and a real entry needs recorded consent for the channel and duration,
 * traceable evidence, verified outcome claims, a named review owner and an
 * authorised human release of the final asset.
 */
export const SUCCESS_STORIES: readonly SuccessStory[] = [];

/** One country on the page, with its stories that passed the gate, in the store's order. */
export interface PublishedCountry {
  country: SuccessStoryCountry;
  path: string;
  stories: SuccessStory[];
}

/**
 * The countries that have at least one story cleared for the website, in
 * Tim Hunt's order. A country with none is left off the page altogether,
 * so the page never shows a flag that leads nowhere.
 */
export function publishedCountries(
  stories: readonly SuccessStory[],
  now: Date = new Date(),
): PublishedCountry[] {
  const cleared = publishableStories(stories, "website", now);
  return SUCCESS_STORY_COUNTRIES.map(country => ({
    country,
    path: successStoryCountryPath(country.slug),
    stories: cleared.filter(s => s.countrySlug === country.slug),
  })).filter(c => c.stories.length > 0);
}

/**
 * The country pages that exist, derived from the gate, so the route table,
 * the prerender list and the sitemap test can never offer a page whose
 * stories are not cleared.
 */
export const SUCCESS_STORY_PATHS: readonly string[] = publishedCountries(SUCCESS_STORIES).map(c => c.path);
