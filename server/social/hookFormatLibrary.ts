/**
 * Hook & Format Library: what openings, lengths, structures, visual
 * patterns and CTAs actually work, by platform and audience.
 *
 * Nia's brief §8 names this as one of her ten controlled records. The
 * Social Brain Supporting Control Pack v0.1 has no section for it, which
 * left it as the one register with nowhere to live. This module is the
 * record, and Control Pack v0.2 adds it as §10 with the same field
 * controls declared here.
 *
 * A status note, because it matters and is easy to overstate: Nia's brief
 * is a WORKING DRAFT and is NOT APPROVED, as is the Control Pack. So this
 * is a controlled record at working-draft level, matching the authority it
 * comes from. It is not an approved record and does not become one by
 * being implemented.
 *
 * The single hard control is provenance. A pattern in this library is a
 * claim that something works, and a claim about what works with no post
 * behind it is the most dangerous thing a social memory can hold: it reads
 * as learning, it gets repeated, and a quarter of content gets built on
 * it. So a pattern that cannot name the Content IDs and the measured
 * evidence that justified it is rejected as structurally invalid rather
 * than stored with a caveat.
 */

export type PatternType = "hook" | "length" | "structure" | "visual_pattern" | "cta";
export type Confidence = "high" | "medium" | "low" | "unknown";
export type PatternStatus = "candidate" | "supported" | "superseded" | "retired";

/** Where a pattern is allowed to have come from. Nothing else counts. */
export type DerivationSource =
  /** Stated in Nia's own controlled brief or Control Pack. */
  | "approved_nia_authority"
  /** A verified historic WSA post, imported under the controlled process. */
  | "verified_historic_material"
  /** Evidence captured after a post went live, through the Social Brain. */
  | "verified_future_evidence"
  /** Learning derived by Nia following her approved §17 loop. */
  | "controlled_learning";

export interface HookFormatPattern {
  patternId: string;
  patternType: PatternType;
  /** Exact account, not a generic platform name. Pack §1 convention. */
  platformAccount: string;
  audienceSegment: string;
  /** What the pattern actually is. */
  description: string;
  /** Master Social Content Ledger IDs that justify it. Never empty. */
  supportingContentIds: readonly string[];
  /** The measured evidence, named with its real source. Never empty. */
  supportingEvidence: readonly string[];
  observedEffect: string;
  confidence: Confidence;
  /** Where it did not hold. Recorded so the library cannot only flatter itself. */
  counterEvidence: readonly string[];
  derivedFrom: DerivationSource;
  firstObserved: string;
  lastRevalidated: string;
  revalidationTrigger: string;
  status: PatternStatus;
}

export interface PatternRejection {
  valid: false;
  reasons: readonly string[];
}
export interface PatternAccepted {
  valid: true;
}
export type PatternValidation = PatternAccepted | PatternRejection;

/**
 * Whether a pattern may enter the library.
 *
 * Every rule here exists to stop an unsupported claim being stored as
 * learning. A pattern with no Content ID has no post behind it; a pattern
 * with no evidence has no measurement behind it; a pattern claiming high
 * confidence off a single post is a coincidence being promoted to a rule.
 */
export function validatePattern(pattern: HookFormatPattern): PatternValidation {
  const reasons: string[] = [];

  if (pattern.supportingContentIds.length === 0) {
    reasons.push(
      "No supporting Content ID. A pattern must trace back to the posts that justified it (brief §8, §9 repurposing lineage).",
    );
  }
  if (pattern.supportingEvidence.length === 0) {
    reasons.push(
      "No supporting evidence. Control Pack §7 requires real platform metrics, named with their source.",
    );
  }
  if (!pattern.platformAccount.trim()) {
    reasons.push("No platform account. Control Pack §1 requires the exact account, not a generic platform name.");
  }
  if (!pattern.firstObserved.trim() || !pattern.lastRevalidated.trim()) {
    reasons.push("No observation or revalidation date. Control Pack §4 makes the checked date mandatory.");
  }
  if (!pattern.revalidationTrigger.trim()) {
    reasons.push("No revalidation trigger. A pattern that never expires becomes folklore.");
  }
  if (pattern.confidence === "high" && pattern.supportingContentIds.length < 3) {
    reasons.push(
      "High confidence claimed from fewer than three posts. Brief §17 forbids turning one result into a universal rule.",
    );
  }

  return reasons.length ? { valid: false, reasons } : { valid: true };
}

/**
 * The library itself.
 *
 * Empty, and empty for a reason that is not an oversight: the Master
 * Social Content Ledger holds no posts, so no pattern can name a Content
 * ID, so no pattern can pass validatePattern. The emptiness is the
 * validation rule working, not a gap in it.
 */
export const HOOK_FORMAT_PATTERNS: readonly HookFormatPattern[] = Object.freeze([]);

export const HOOK_FORMAT_LIBRARY = Object.freeze({
  name: "Hook & Format Library",
  briefSection: "§8",
  controlPackSection: "§10 (added at Control Pack v0.2)",
  status: "WORKING DRAFT, NOT APPROVED",
  holds:
    "What openings, lengths, structures, visual patterns and CTAs work by platform and audience, each traceable to the posts and measured evidence that justified it.",
  populated: false,
  emptyReason:
    "No pattern can exist yet. Every pattern must name the Content IDs that justified it, and the Master Social " +
    "Content Ledger holds no posts, so there is nothing for a pattern to cite. This is the provenance rule working " +
    "rather than a gap in it.",
});
