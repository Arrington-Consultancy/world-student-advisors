/**
 * NIA-G06: the proposed Social Account Ownership and Administration Map.
 *
 * Built by inspection, and deliberately split into what was verified and
 * what was not, because the two must never be presented as one thing. The
 * useful part of a map like this is knowing which lines you can act on.
 *
 * What could be verified: the platform and the exact account, from the
 * canonical WSA social links record confirmed in July 2026, and the
 * technical access position, from the production service's own
 * configuration.
 *
 * What could not: who owns each account at business level, which humans
 * administer it, what the recovery dependencies are, and whether each is a
 * personal profile's asset or held in a business manager. None of that is
 * derivable from a public page or from any controlled WSA record, and no
 * platform API is reachable to ask. A person has to answer it.
 *
 * Every unverified field below is null with a stated reason rather than a
 * best guess. A guessed administrator is worse than an empty one: it looks
 * like an answer, so nobody goes and finds the real one, and the first
 * time it matters is a lockout or a compromised account.
 *
 * Nothing here changed any account. No administrator was added or removed,
 * no ownership transferred, no credential touched. This is an inspection.
 */

export type ManagementModel = "personal_profile" | "business_managed" | "shared" | "unknown";

export interface AccountAdministrationEntry {
  platform: string;
  /** The exact page, profile or channel. Verified. */
  account: string;
  /** How that identity was established. */
  accountEvidence: string;
  /** Business-level owner where the platform distinguishes it. */
  businessOwner: string | null;
  /** Named human administrators. */
  humanAdministrators: readonly string[] | null;
  /** Application, service or API access held by WSA systems. Verified. */
  technicalAccess: string;
  /** Recovery email, phone, backup admin. */
  recoveryDependencies: readonly string[] | null;
  managementModel: ManagementModel;
  /** Whether WSA control is sufficient to support Nia safely. */
  sufficientForNia: boolean | null;
  /** Why a field above is null. Empty when everything needed is known. */
  unverified: readonly string[];
}

const NO_TECHNICAL_ACCESS =
  "None. No credential for this platform exists on the production service.";

const NOT_DERIVABLE =
  "Not derivable from a public page or from any controlled WSA record, and no platform API is reachable to ask.";

export const ACCOUNT_ADMINISTRATION_MAP: readonly AccountAdministrationEntry[] = Object.freeze([
  {
    platform: "LinkedIn",
    account: "World Student Advisors company page (/company/world-student-advisors)",
    accountEvidence: "client/src/lib/socialLinks.ts, canonical WSA social links, user-confirmed July 2026.",
    businessOwner: null,
    humanAdministrators: null,
    technicalAccess: NO_TECHNICAL_ACCESS,
    recoveryDependencies: null,
    managementModel: "unknown",
    sufficientForNia: null,
    unverified: [
      `Page administrators: ${NOT_DERIVABLE}`,
      "Whether a LinkedIn Page super admin exists besides the original creator",
    ],
  },
  {
    platform: "Facebook",
    account: "World Student Advisors Student Support Centre",
    accountEvidence: "client/src/lib/socialLinks.ts; the share link share/19GkxG3W7U resolves to this page.",
    businessOwner: null,
    humanAdministrators: null,
    technicalAccess: NO_TECHNICAL_ACCESS,
    recoveryDependencies: null,
    managementModel: "unknown",
    sufficientForNia: null,
    unverified: [
      `Page role assignments: ${NOT_DERIVABLE}`,
      "Whether the page sits in a WSA Business Manager or on a personal profile",
    ],
  },
  {
    platform: "Facebook",
    account: "International Friendship Society, the WSA alumni network page",
    accountEvidence: "client/src/lib/socialLinks.ts, recorded there as the alumni network page.",
    businessOwner: null,
    humanAdministrators: null,
    technicalAccess: NO_TECHNICAL_ACCESS,
    recoveryDependencies: null,
    managementModel: "unknown",
    sufficientForNia: null,
    unverified: [
      `Page role assignments: ${NOT_DERIVABLE}`,
      "Whether this page is a WSA asset at all, or an affiliated community page WSA does not own",
    ],
  },
  {
    platform: "Instagram",
    account: "@worldstudentadv",
    accountEvidence: "client/src/lib/socialLinks.ts.",
    businessOwner: null,
    humanAdministrators: null,
    technicalAccess: NO_TECHNICAL_ACCESS,
    recoveryDependencies: null,
    managementModel: "unknown",
    sufficientForNia: null,
    unverified: [
      `Account access: ${NOT_DERIVABLE}`,
      "Whether it is a Business or Creator account and whether it is linked to the Facebook page",
    ],
  },
  {
    platform: "YouTube",
    account: "@WorldStudentAdvisors",
    accountEvidence:
      "client/src/lib/socialLinks.ts; also the video source for the Events page and the Student Support Library.",
    businessOwner: null,
    humanAdministrators: null,
    technicalAccess:
      "None for analytics. The Google client configured in production is the Student Portal sign-in and carries no YouTube scope.",
    recoveryDependencies: null,
    managementModel: "unknown",
    sufficientForNia: null,
    unverified: [
      `Channel owner and managers: ${NOT_DERIVABLE}`,
      "Whether the channel sits under a Brand Account or a personal Google account, which decides whether it survives one person leaving",
    ],
  },
  {
    platform: "WhatsApp",
    account: "Public WSA contact number +44 7914 797830, plus per-office numbers",
    accountEvidence: "client/src/lib/socialLinks.ts and the office contact table on the live Contact page.",
    businessOwner: null,
    humanAdministrators: null,
    technicalAccess: NO_TECHNICAL_ACCESS,
    recoveryDependencies: null,
    managementModel: "unknown",
    sufficientForNia: null,
    unverified: [
      "Whether WSA holds a WhatsApp Business or API route at all",
      "Which handset or account each office number is registered to",
    ],
  },
]);

/** Verified across the whole estate, and stated as a positive finding. */
export const VERIFIED_POSITION = Object.freeze({
  accountsIdentified: 6,
  technicalAccessHeld: 0,
  statement:
    "Six WSA social accounts are identified with evidence. WSA systems hold no technical or service access to any of " +
    "them: the production service carries no credential for Meta, Facebook, Instagram, LinkedIn, YouTube analytics " +
    "or TikTok. That is a verified finding rather than an unknown, and it means no worker could reach any of these " +
    "accounts today even if one were approved.",
});

/**
 * The one thing that needs a person, stated as a single decision rather
 * than a list of open questions.
 */
export const DECISION_FOR_TOM = Object.freeze({
  decision:
    "Who administers each WSA social account, and whether each account is held in a business manager or on an " +
    "individual's personal profile.",
  whyItCannotBeAnsweredHere:
    "Administrator lists are visible only from inside each account. No WSA controlled record holds them, and the " +
    "build environment has no reachability to any platform.",
  currentVerifiedPosition:
    "Six accounts identified. Zero technical access held by WSA systems. Administration unevidenced on all six.",
  recommendedMinimumChange:
    "Confirm, per account, the named human administrators and whether it sits in a business manager. Do not change " +
    "any administrator as part of answering. The answer is what makes NIA-G06 closable and is a precondition for " +
    "NIA-G03, because an export needs an administrator to authorise it.",
  riskIfLeft:
    "An account held on one person's personal profile is lost when that person leaves, and its history goes with " +
    "it. That risk is live now and is independent of anything to do with Nia.",
  changedByThisInspection: "Nothing. No administrator added or removed, no ownership transferred, no credential touched.",
});
