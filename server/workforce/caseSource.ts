/**
 * Which system is authoritative for a student's case at a given point.
 *
 * WSA splits this by stage: Pipedrive owns the enquiry-to-application
 * part of the journey, SharePoint owns everything after it. That split is
 * a decision from Tom Arrington (30 August 2026), and it is the shape this
 * module implements.
 *
 * What this module deliberately does NOT do is invent the handover point.
 *
 * Two of the three facts needed are evidenced. Pipedrive genuinely holds
 * enquiry capture: server/pipedrive.ts creates a Person, a Lead and a Note
 * for every public sign-up, and has done so in production for months.
 * SharePoint genuinely holds WSA's controlled records: the governance
 * library is where the Core Operating System, the Worker Register and the
 * Change Log live. Both of those are transcriptions of what is actually
 * true today.
 *
 * The third fact — the exact stage at which authority passes from one to
 * the other — is not evidenced anywhere. There is no controlled WSA
 * Student Journey defining an operational stage sequence; a SharePoint
 * search returns website copy, podcast scripts and YouTube descriptions,
 * which are marketing material rather than a governance record. Guessing
 * it would be the worst kind of invention, because it would look right:
 * a worker would confidently read the wrong system and report a student's
 * position from stale data without anything appearing to fail.
 *
 * So an unrecognised stage resolves to "ambiguous" and asks for a human,
 * rather than defaulting to either system. Filling HANDOVER_STAGE in is a
 * controlled-record decision, not a code change.
 */

export type CaseSystem = "pipedrive" | "sharepoint";

export interface CaseSourceDecision {
  /** Null when no system can be established without guessing. */
  system: CaseSystem | null;
  ambiguous: boolean;
  reason: string;
  /** What the answer rests on, so a reviewer can check it rather than trust it. */
  evidence: string;
}

/**
 * Stages whose authoritative system is established by what production
 * actually does today, rather than by a document nobody has written.
 *
 * Kept deliberately short. Every entry here is a fact somebody can verify
 * in minutes; anything requiring interpretation belongs in the controlled
 * record instead.
 */
const EVIDENCED_STAGE_SOURCE: Readonly<Record<string, { system: CaseSystem; evidence: string }>> = Object.freeze({
  enquiry: {
    system: "pipedrive",
    evidence:
      "server/pipedrive.ts createStudentLead writes a Person, a Lead and a pinned Note for every public sign-up. " +
      "Enquiry capture demonstrably lives in the CRM.",
  },
  triage: {
    system: "pipedrive",
    evidence:
      "The sign-up form records the recommended counsellor on the Lead and adds followers for visibility, " +
      "so triage is decided and held in the CRM.",
  },
  controlled_record: {
    system: "sharepoint",
    evidence:
      "The WSA governance library holds the Core Operating System, Worker Register, Access Matrix and Change Log. " +
      "Controlled records demonstrably live in SharePoint.",
  },
});

/**
 * The stage at which case authority passes from Pipedrive to SharePoint.
 *
 * Null until a controlled record defines it. Compared by identity rather
 * than filled with a plausible default, for the same reason the CRM scope
 * map is empty: a sensible-looking guess here is indistinguishable from a
 * decision, and nobody would know to question it.
 */
export const HANDOVER_STAGE: string | null = null;

export const HANDOVER_NOT_DEFINED =
  "The stage at which case authority passes from Pipedrive to SharePoint is not defined in any controlled WSA record. " +
  "A SharePoint search for a Student Journey returns marketing material only. Defining it is a controlled-record " +
  "decision for Tom Arrington, not a code change.";

/**
 * Which system to trust for this stage. Returns ambiguous rather than a
 * guess whenever the answer is not established.
 */
export function resolveCaseSource(stage: string): CaseSourceDecision {
  const normalised = stage.trim().toLowerCase();
  if (normalised === "") {
    return {
      system: null,
      ambiguous: true,
      reason: "No stage was given, so no authoritative system can be established.",
      evidence: "",
    };
  }

  const evidenced = EVIDENCED_STAGE_SOURCE[normalised];
  if (evidenced) {
    return {
      system: evidenced.system,
      ambiguous: false,
      reason: `${normalised} is authoritative in ${evidenced.system}.`,
      evidence: evidenced.evidence,
    };
  }

  return {
    system: null,
    ambiguous: true,
    reason:
      `"${normalised}" sits after enquiry and triage but its authoritative system is not established. ` +
      HANDOVER_NOT_DEFINED,
    evidence: "",
  };
}

/**
 * Whether a worker may state a student's position from this system without
 * a human confirming first.
 *
 * The distinction matters because reading the wrong system does not fail
 * loudly: it returns real data that is simply out of date, and the answer
 * reads as authoritative. So an ambiguous stage blocks the statement
 * rather than the read.
 */
export function mayStateCasePosition(stage: string): { allowed: boolean; reason: string } {
  const decision = resolveCaseSource(stage);
  if (decision.ambiguous) {
    return {
      allowed: false,
      reason:
        `A position cannot be stated for stage "${stage}" without knowing which system is authoritative. ` +
        "Reading the wrong one returns real but stale data, which is worse than returning nothing. " +
        HANDOVER_NOT_DEFINED,
    };
  }
  return { allowed: true, reason: `${decision.system} is authoritative for ${stage}. ${decision.evidence}` };
}
