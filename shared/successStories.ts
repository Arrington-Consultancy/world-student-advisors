/**
 * The WSA student success story record, and the gate that decides whether
 * one may be shown to the public.
 *
 * WHY THIS EXISTS. The approved Student Success Story and Proof Direction
 * moves WSA's proof layer away from describing what WSA does and towards
 * verified accounts of what WSA has done for real students. That direction
 * is not only editorial. Most of it is a set of conditions that must hold
 * before a word about a real person reaches the public web, and conditions
 * that live only in a document get forgotten the first time somebody is in
 * a hurry.
 *
 * So the conditions are here, as a function that refuses.
 *
 * WHAT THE DIRECTION REQUIRES, and where each requirement lives:
 *
 *   "No story, quotation, photograph, adviser attribution or outcome may be
 *   published until all relevant facts are traceable to an authorised case
 *   record or supplied evidence and the student has given recorded consent
 *   for the specific intended use. The student must approve the final
 *   wording and visual before publication. A child requires parent or
 *   guardian consent."
 *
 * Each clause of that is a separate check in decidePublication below, and
 * each is refused by name, so a story that cannot be published says which
 * condition it failed rather than disappearing silently.
 *
 * WHY THE GATE IS SEPARATE FROM THE STORE. A record existing is not
 * permission to publish it. The store holds records at every stage,
 * including drafts with no consent yet and stories a student has since
 * withdrawn. Only decidePublication decides, and the page renders only what
 * it allows, so adding a record can never publish it by accident.
 *
 * WHY THE STORE IS EMPTY. Because no real student story has passed the gate,
 * and inventing one would be the exact failure this module exists to
 * prevent. A fabricated story on a proof page is worse than an empty proof
 * page: it is a false claim about a real category of person, published under
 * WSA's name. The page renders an honest empty state instead.
 *
 * A visa grant is not the only definition of success. The direction is
 * explicit that a student who changed course or destination, or whom WSA
 * advised not to pursue an unsuitable option, may be a valid success story
 * where the record and consent support it. Nothing here privileges one
 * outcome shape over another.
 */

/** How the student is identified publicly. Anonymisation must be a decision, not a blank field. */
export type StoryIdentity =
  | { kind: "named"; displayName: string }
  | { kind: "anonymised"; label: string; reason: string };

/**
 * What the student actually agreed to. Consent is per use, so a student who
 * agreed to a website page has not thereby agreed to a social post.
 */
export interface ConsentRecord {
  /** Recorded, specific and current. False covers "asked but not yet given" as well as never asked. */
  recorded: boolean;
  /** The uses consented to. A publication location outside this list is not consented. */
  scope: readonly StoryPublicationLocation[];
  /** The student saw and approved the exact wording that will appear. */
  finalWordingApproved: boolean;
  /** The student saw and approved the exact image that will appear. Also required when no photograph is used. */
  finalVisualApproved: boolean;
  /** Set when the student was a child at the time of consent. */
  studentWasChild: boolean;
  /** Required, and only required, when studentWasChild is true. */
  parentOrGuardianConsent: boolean;
  /** Recorded withdrawal. Once true the story is never published again. */
  withdrawn: boolean;
  withdrawnDate?: string;
}

export type StoryPublicationLocation = "website" | "social" | "print";

/** Where a fact came from. A fact with no traceable source cannot be published. */
export interface EvidenceRecord {
  /** Reference to the authorised case record or supplied evidence. Never the evidence itself. */
  reference: string;
  /** Date the outcome was evidenced, ISO yyyy-mm-dd. */
  evidenceDate: string;
  /** The named human accountable for checking this story before release. */
  reviewOwner: string;
}

export interface SuccessStory {
  id: string;
  identity: StoryIdentity;
  country: string;
  /** What the student wanted. The opening of the governing story. */
  goal: string;
  /** The decision or challenge, and the advice WSA actually gave. */
  decision: string;
  /** The support actually provided. Not what WSA offers in general. */
  supportProvided: string;
  /** The evidenced outcome. Never a guarantee, a projection or an inference. */
  outcome: string;
  /** What the student hopes to do next, where they said so. */
  nextStep?: string;
  /** Only where evidenced. */
  course?: string;
  institution?: string;
  destination?: string;
  /** Only where the case record supports their involvement. */
  adviser?: string;
  /** The student's own voice. */
  quotation?: string;
  photograph?: { src: string; alt: string };
  evidence: EvidenceRecord;
  consent: ConsentRecord;
  /** Where WSA intends this to appear, checked against the consent scope. */
  intendedLocations: readonly StoryPublicationLocation[];
  /**
   * An authorised human has approved release. Separate from consent: the
   * student agreeing does not by itself release the story, and neither the
   * Website AI nor Nia can set this by drafting content.
   */
  humanApprovalToPublish: boolean;
}

export type PublicationRefusalCode =
  | "consent_not_recorded"
  | "consent_withdrawn"
  | "location_outside_consent_scope"
  | "final_wording_not_approved"
  | "final_visual_not_approved"
  | "guardian_consent_missing"
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

/**
 * Whether this story may appear in this location.
 *
 * Deny by default: every condition must pass, and a condition that cannot
 * be evaluated counts as failed. The order runs from the strongest reason
 * to refuse to the weakest, so the reason recorded is the most important
 * one rather than whichever happened to be checked first. Withdrawal is
 * checked before anything else, because a student who has withdrawn should
 * never see their story assessed on any other basis.
 */
export function decidePublication(
  story: SuccessStory,
  location: StoryPublicationLocation,
): PublicationDecision {
  if (story.consent.withdrawn) {
    return refuse("consent_withdrawn", "The student has withdrawn consent for this story.");
  }
  if (!story.consent.recorded) {
    return refuse("consent_not_recorded", "No recorded student consent for this story.");
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
      "The student was a child and no parent or guardian consent is recorded.",
    );
  }
  if (!story.consent.finalWordingApproved) {
    return refuse("final_wording_not_approved", "The student has not approved the final wording.");
  }
  if (!story.consent.finalVisualApproved) {
    return refuse("final_visual_not_approved", "The student has not approved the final visual.");
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
): SuccessStory[] {
  return stories.filter(story => decidePublication(story, location).publishable);
}

/**
 * Every recorded student success story, at any stage.
 *
 * Empty, and that is the current true state rather than an unfinished one.
 * No student story has passed the consent and evidence gate, so there is
 * nothing here to publish. Adding a record to this list does not publish
 * it: decidePublication still has to allow it, and a real entry needs
 * recorded consent, traceable evidence, a named review owner and an
 * authorised human release.
 */
export const SUCCESS_STORIES: readonly SuccessStory[] = [];
