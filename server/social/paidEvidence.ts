/**
 * Nia referencing Alex's paid-performance evidence, read only.
 *
 * The operating model this implements: Nia owns organic social content
 * memory. Alex owns paid-media spend, paid performance measurement and
 * paid optimisation. Where permissions allow, Nia may reference Alex's
 * paid evidence attached to a social content item, so the social memory
 * can answer how that content performed overall.
 *
 * Three things make that safe, and all three are structural rather than
 * matters of care:
 *
 * First, there is no write path. This module exports no function that
 * creates, updates, deletes, budgets, boosts or spends. Not gated behind
 * a permission check, absent. A permission check can be mis-wired; a
 * function that does not exist cannot be called, and a source test below
 * asserts none is ever added.
 *
 * Second, evidence cannot exist here without provenance. The type makes
 * the source record mandatory, so a paid figure cannot be handed to a
 * reader stripped of the fact that it is Alex's, from a named record, on
 * a named date. Nia never becomes the source of truth for paid, because
 * nothing she can return omits whose truth it is.
 *
 * Third, both gates must open. The signed-in staff member must hold
 * paid_media read access in their own right, and Alex's controlled record
 * must authorise release. Nia is not a route around either. A staff member
 * who cannot see paid data directly cannot see it by asking her.
 *
 * Today this returns nothing, and the reason is in Alex's own record
 * rather than in a missing integration: WSA_Alex_Paid_Media_Google_Ads_
 * Specialist_v0.2 lists current budgets and spend under "Unverified from
 * controlled SharePoint evidence", and AB-A01 to AB-A12 are open. There is
 * no verified paid-performance evidence in any controlled record to pass.
 */
import { decideForProfile } from "../access/enforcement";
import { getWorker } from "../workforce/registry";
import type { StaffAccessProfile } from "../access/accessControl";

/**
 * Paid performance is read as business_analytics, the existing class the
 * Access Control Standard describes as "operational, partner, performance,
 * marketing and governance visibility". It is not company_financial: that
 * class means ledgers, banking, payroll and director records, and it
 * carries the finance overlay. Campaign performance attached to a post is
 * marketing performance.
 *
 * The class is chosen from the existing table rather than added to it. A
 * new class would be a change to the Access Matrix, which is a controlled
 * amendment and is not made here.
 */
const PAID_PERFORMANCE_CLASS = "business_analytics";

/** Where a paid figure came from. Never optional, never stripped. */
export interface PaidProvenance {
  /** The worker whose controlled domain owns this. Always Alex. */
  owningWorker: "alex";
  owningWorkerName: string;
  /** The controlled record the figure was read from. */
  sourceRecord: string;
  /** When that record was read. */
  sourceDate: string;
  /** Stated on every reference so a reader cannot mistake Nia for the owner. */
  note: string;
}

export interface PaidEvidenceReference {
  /** The Master Social Content Ledger item this relates to. */
  contentId: string;
  metric: string;
  value: string;
  periodStart: string;
  periodEnd: string;
  provenance: PaidProvenance;
}

export type PaidEvidenceResult =
  | { available: true; contentId: string; evidence: readonly PaidEvidenceReference[] }
  | { available: false; reason: string; deniedBy: "staff_access" | "worker_release" | "no_verified_evidence" };

/**
 * Whether Alex's controlled record currently authorises releasing paid
 * evidence to another worker.
 *
 * Read off the Worker Register rather than written here, so this cannot
 * drift from the controlled record. Alex is not approved and holds no live
 * advertising authority, so nothing is released. When that changes in the
 * Register, this follows it; it cannot be opened by editing this file.
 */
export function alexAuthorisesRelease(): boolean {
  const alex = getWorker("alex");
  return alex.specificationStatus === "approved";
}

/**
 * The evidence Alex's controlled records currently hold for release.
 *
 * Empty, and empty because his own v0.2 record says so rather than because
 * nothing has been wired up. Listing current budgets and spend as
 * unverified is a finding, not a gap to be filled in by inference.
 */
const RELEASABLE_EVIDENCE: readonly PaidEvidenceReference[] = Object.freeze([]);

export const NO_VERIFIED_PAID_EVIDENCE =
  "No verified paid-performance evidence exists in any controlled record. Alex v0.2 lists current live campaign " +
  "status, budgets and spend, conversion actions and end-to-end attribution as unverified from controlled evidence, " +
  "and AB-A01 to AB-A12 remain open.";

/**
 * Reference paid evidence for one social content item.
 *
 * Gates run in order, and each reports what it is: a staff member refused
 * for their own access should not be told the data does not exist, and a
 * staff member with full access should not be told they lack permission
 * when the truth is that Alex has nothing verified to give.
 */
export function referencePaidEvidenceForContent(input: {
  profile: StaffAccessProfile | null;
  contentId: string;
  now?: Date;
}): PaidEvidenceResult {
  const { profile, contentId } = input;

  // The signed-in person's own access, judged by the same model as any
  // other read. Nia is not a side door: asking her for paid data is a
  // paid_media read and is refused exactly as a direct one would be.
  if (!profile) {
    return {
      available: false,
      deniedBy: "staff_access",
      reason: "No staff access profile. Paid-media evidence requires an authenticated staff member.",
    };
  }
  const decision = decideForProfile(
    profile,
    { action: "read", functionalScope: "paid_media", businessDataClass: PAID_PERFORMANCE_CLASS },
    input.now,
  );
  if (!decision.allowed) {
    return {
      available: false,
      deniedBy: "staff_access",
      reason: `Paid-media evidence refused: ${decision.reason}`,
    };
  }

  // Alex's side. Staff permission alone never releases another worker's
  // controlled material.
  if (!alexAuthorisesRelease()) {
    const alex = getWorker("alex");
    return {
      available: false,
      deniedBy: "worker_release",
      reason:
        `${alex.canonicalName} does not authorise release of paid-media evidence ` +
        `(specificationStatus: ${alex.specificationStatus}). Paid measurement remains his.`,
    };
  }

  const evidence = RELEASABLE_EVIDENCE.filter(e => e.contentId === contentId);
  if (evidence.length === 0) {
    return { available: false, deniedBy: "no_verified_evidence", reason: NO_VERIFIED_PAID_EVIDENCE };
  }
  return { available: true, contentId, evidence };
}

/** What Nia may never do with paid, stated for the Staff Portal to show. */
export const NIA_PAID_BOUNDARY = Object.freeze({
  mayReference:
    "Relevant Alex-owned paid-performance evidence attached to a social content item, where the staff member is " +
    "permitted to see it and Alex's record permits release. Always carrying its provenance.",
  mayRecord:
    "That a post was boosted, as a confounder on the organic result. Control Pack §7 already provides for this.",
  mayNot: Object.freeze([
    "Change paid-spend records",
    "Optimise paid campaigns",
    "Authorise boosts",
    "Set budgets",
    "Spend money",
    "Become the source of truth for paid performance",
  ]),
  owner: "Alex, Paid Media and Google Ads",
});
