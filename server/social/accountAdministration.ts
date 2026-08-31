/**
 * The Social Account Ownership and Administration Map.
 *
 * This is a governance, continuity and recovery record. It is explicitly
 * NOT the technical gate on whether an account can be connected.
 *
 * That distinction was wrong in the first version and is worth stating
 * plainly. Treating a hand-maintained administrator list as the security
 * authority has two failures: it blocks a connection the platform would
 * happily authorise, and it would authorise one the platform would
 * refuse. Meta, LinkedIn, YouTube and TikTok each know who may grant
 * access to their own assets, and where a platform can answer that
 * authoritatively, the platform is the authority. The technical gate is
 * WSA internal permission plus that platform's own authorisation, in
 * server/social/connection.ts.
 *
 * What this map is for is the question a platform cannot answer: whether
 * WSA as an organisation actually controls its own presence. Who could
 * grant or revoke access next year. Whether a channel disappears when one
 * person leaves. That risk is real now and is independent of any worker.
 *
 * Every unverified field is null with a stated reason rather than a best
 * guess. A guessed administrator is worse than an empty one: it looks
 * like an answer, so nobody goes and finds the real one, and the first
 * time it matters is a lockout.
 *
 * Nothing here changed any account. No administrator was added or
 * removed, no ownership transferred, no credential or platform setting
 * touched. Recovery details are recorded only where they can be held
 * without storing a secret.
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
  /** Whether WSA as an organisation has sufficient control of this asset. */
  sufficientOrganisationalControl: boolean | null;
  /** What is lost if the individual holding this account leaves WSA. */
  continuityRiskIfIndividualLeaves: string | null;
  /** Which authorised human or business account could grant or revoke access later. */
  canGrantOrRevokeAccess: string | null;
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
    sufficientOrganisationalControl: null,
    continuityRiskIfIndividualLeaves: null,
    canGrantOrRevokeAccess: null,
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
    sufficientOrganisationalControl: null,
    continuityRiskIfIndividualLeaves: null,
    canGrantOrRevokeAccess: null,
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
    sufficientOrganisationalControl: null,
    continuityRiskIfIndividualLeaves: null,
    canGrantOrRevokeAccess: null,
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
    sufficientOrganisationalControl: null,
    continuityRiskIfIndividualLeaves: null,
    canGrantOrRevokeAccess: null,
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
    sufficientOrganisationalControl: null,
    continuityRiskIfIndividualLeaves: null,
    canGrantOrRevokeAccess: null,
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
    sufficientOrganisationalControl: null,
    continuityRiskIfIndividualLeaves: null,
    canGrantOrRevokeAccess: null,
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
    "or TikTok. That is a verified finding rather than an unknown.",
});

/**
 * What this map does and does not gate.
 *
 * Kept as data rather than prose so the Staff Portal and any reviewer see
 * the same distinction, and so a future change that quietly turns the map
 * back into a security control has to change this line to do it.
 */
export const MAP_ROLE = Object.freeze({
  isTechnicalConnectionGate: false,
  technicalGate:
    "WSA internal permission (social_media scope, credential_admin action, credentials_security overlay) plus the " +
    "platform's own authorisation flow, which decides which assets the connecting person may grant.",
  thisMapAnswers:
    "Organisational ownership, continuity and recovery risk: who could grant or revoke access later, and what WSA " +
    "loses if one person leaves.",
  whySeparate:
    "A hand-maintained administrator list would both block connections a platform would authorise and permit ones it " +
    "would refuse. Where a platform can establish access authoritatively, it is the authority.",
});

/**
 * The organisational question that still needs a person. Narrowed from
 * the first version, which wrongly treated this as blocking the technical
 * connection as well.
 */
export const DECISION_FOR_TOM = Object.freeze({
  decision:
    "For each WSA social account: whether it is held in a business manager or on an individual's personal profile, " +
    "and which authorised human or business account can grant and revoke access.",
  doesNotBlock:
    "Technical connection. A staff member who passes the WSA gate and is authorised by the platform can connect an " +
    "asset without this being answered, subject to the existing connector and production approval gates.",
  doesBlock:
    "Any claim that WSA's organisational continuity risk is understood or resolved. That stays open until the " +
    "evidence genuinely exists.",
  currentVerifiedPosition:
    "Six accounts identified. Zero technical access held by WSA systems. Ownership and administration unevidenced on all six.",
  recommendedMinimumChange:
    "Confirm, per account, whether it sits in a business manager and who can grant or revoke access. Do not change " +
    "any administrator, owner or credential while answering.",
  riskIfLeft:
    "An account held on one person's personal profile is lost when that person leaves, and its history goes with it. " +
    "That risk is live now and is independent of anything to do with Nia.",
  changedByThisInspection: "Nothing. No administrator added or removed, no ownership transferred, no credential touched.",
});
