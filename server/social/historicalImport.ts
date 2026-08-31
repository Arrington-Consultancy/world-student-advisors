/**
 * NIA-G03: what history could actually be imported, established from
 * evidence rather than from what would be desirable.
 *
 * The gate asks for the approved analytics and data-access scope and
 * retention for social-platform exports. Answering it needs seven things
 * per platform, and this module records the answer to each, including
 * where the answer is that nothing is available.
 *
 * The finding is the same for every social platform and it is not a
 * judgement call: production holds no credential for any of them. The
 * variable names configured on the production service are Microsoft,
 * Google sign-in, Pipedrive, Turnstile, Anthropic and database URLs. There
 * is no Meta, Facebook, Instagram, LinkedIn, YouTube Data or TikTok
 * credential of any kind. Nor is there network reachability from the build
 * environment to any platform API.
 *
 * So no authorised export or API method exists for any WSA social account
 * today, and the recoverable date range is zero days everywhere. That is
 * the honest state of NIA-G03, and it is worth stating precisely because
 * "six years of memory" was the thing originally asked for. Six years is
 * desirable. Nothing currently supports it, and inventing a range would
 * make every later comparison wrong.
 */

export type ImportMethod =
  | { kind: "none"; why: string }
  | { kind: "official_api"; credentialName: string; scopes: readonly string[] }
  | { kind: "manual_export"; who: string; format: string };

export interface PlatformImportPosition {
  platform: string;
  /** The exact WSA account, from the canonical social links record. */
  account: string;
  /** How data could lawfully be obtained. */
  method: ImportMethod;
  /** What the platform would make available, once access exists. */
  fieldsRecoverable: readonly string[] | null;
  /** Verified importable range. Null means none established. */
  verifiedRange: { from: string; to: string } | null;
  /** Platform retention limits, where established. */
  retentionLimit: string | null;
  /** Anything blocking, named. */
  blockers: readonly string[];
}

const NO_CREDENTIAL: ImportMethod = Object.freeze({
  kind: "none" as const,
  why:
    "No credential for this platform exists on the production service, and no controlled record grants one. " +
    "Nothing can be exported without one.",
});

/**
 * fieldsRecoverable is null rather than a guessed list. What a platform
 * actually returns depends on the account type, the permission granted and
 * the API version at the time of access. Listing plausible fields now
 * would be describing a platform's marketing pages, not WSA's data.
 */
export const PLATFORM_IMPORT_POSITIONS: readonly PlatformImportPosition[] = Object.freeze([
  {
    platform: "LinkedIn",
    account: "World Student Advisors company page",
    method: NO_CREDENTIAL,
    fieldsRecoverable: null,
    verifiedRange: null,
    retentionLimit: null,
    blockers: ["No credential", "Page admin access not evidenced", "NIA-G06 account ownership unresolved"],
  },
  {
    platform: "Facebook",
    account: "World Student Advisors Student Support Centre",
    method: NO_CREDENTIAL,
    fieldsRecoverable: null,
    verifiedRange: null,
    retentionLimit: null,
    blockers: ["No credential", "Business Manager ownership not evidenced", "NIA-G06 account ownership unresolved"],
  },
  {
    platform: "Facebook",
    account: "International Friendship Society, the WSA alumni network page",
    method: NO_CREDENTIAL,
    fieldsRecoverable: null,
    verifiedRange: null,
    retentionLimit: null,
    blockers: ["No credential", "Whether WSA or an individual owns this page is not evidenced"],
  },
  {
    platform: "Instagram",
    account: "@worldstudentadv",
    method: NO_CREDENTIAL,
    fieldsRecoverable: null,
    verifiedRange: null,
    retentionLimit: null,
    blockers: ["No credential", "Whether the account is linked to a Business Manager is not evidenced"],
  },
  {
    platform: "YouTube",
    account: "@WorldStudentAdvisors",
    method: NO_CREDENTIAL,
    fieldsRecoverable: null,
    verifiedRange: null,
    retentionLimit: null,
    blockers: [
      "No YouTube Data API credential. The configured Google client is the Student Portal sign-in and carries no analytics scope.",
      "Channel owner account not evidenced",
    ],
  },
]);

/** What is forbidden as a way of filling the gap. */
export const PROHIBITED_BACKFILL = Object.freeze([
  "Inferring a metric that was not exported",
  "Estimating reach or engagement from follower counts",
  "Scraping any platform",
  "Buying third-party historical social data",
  "Treating a screenshot or a chat recollection as a measurement",
]);

export const HISTORICAL_MEMORY_POSITION = Object.freeze({
  anyPlatformImportable: false,
  verifiedRangeAcrossEstate: null as null,
  summary:
    "No WSA social history is importable today. No platform has an authorised connection, so nothing can be exported.",
  whatWouldChangeIt:
    "An authorised connection through the platform's own authorisation flow, made by a WSA staff member the platform " +
    "confirms may grant that asset. Once one exists, what it can actually return becomes a question with an answer.",
  doNotSay:
    "That WSA holds six years of social memory. Six years is the goal, not the evidenced position, and the " +
    "recoverable range is currently zero days on every platform.",
});

/**
 * What has to be established once a real connection exists, before any
 * import runs.
 *
 * Recorded as the questions rather than as guesses at their answers,
 * because each is a property of the specific account and the scopes that
 * particular person was able to grant. A business-managed page and a
 * personal profile return different things, and the API version at the
 * time of access changes it again.
 */
export const ESTABLISH_BEFORE_IMPORT: readonly string[] = Object.freeze([
  "Available historical range for this exact account, from the platform itself.",
  "Available metrics and fields, named as the platform names them.",
  "Retention limitations the platform applies to that data.",
  "Account type restrictions, since a business asset and a personal profile differ.",
  "Export and API limitations, including rate and volume caps.",
]);

/** Import only what the platform genuinely provides. */
export const IMPORT_RULE =
  "Import only what the platform can genuinely provide for that account, and record the range imported. Where a " +
  "period or a metric is unavailable, record it as unavailable rather than filling it in.";
