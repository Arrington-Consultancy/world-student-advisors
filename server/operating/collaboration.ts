/**
 * Multi-worker collaboration, lead ownership and combined recommendation.
 *
 * Implements clauses 7, 8, 9 and 17 of the WSA AI Operational Standard
 * v1.0 (APPROVED, 30 August 2026), which adopts the Universal AI Operating
 * Standard at the WSA operating layer.
 *
 * Pure: no database, no network, no session, no environment. It decides
 * the shape of a collaborative answer; it does not fetch anything, run any
 * worker, or grant anything. Wiring is a later, separately gated step.
 *
 * Three rules do the real work here:
 *
 * §8 "Every multi-worker task should have one lead owner responsible for
 * the final combined output." A contribution set without exactly one lead
 * cannot produce a recommendation. Not a warning: it fails.
 *
 * §6 "Workers must not silently absorb another specialist's
 * responsibilities." A contribution outside the contributing worker's own
 * functional scope is rejected rather than quietly folded in, so the lead
 * cannot become a super-worker by collecting opinions it was not entitled
 * to give itself.
 *
 * §9 and §17 "Material disagreement or uncertainty must remain visible
 * where it is unresolved." A recommendation never smooths over an
 * unresolved conflict. Where specialists materially disagree, or the
 * evidence is insufficient, the output says so and asks for the
 * appropriate human check instead of inventing certainty.
 */
import { getWorker } from "../workforce/registry";
import { WORKER_FUNCTIONAL_SCOPE } from "../access/workerScope";
import type { WorkerId } from "../workforce/types";
import type { FunctionalScope } from "../access/accessControl";

/**
 * How firmly a contributing specialist holds its position. This is the
 * worker's confidence in its own contribution, not a measure of how good
 * the underlying evidence is — evidenceQuality carries that separately, so
 * a confident view resting on weak evidence stays visible as exactly that.
 */
export type Confidence = "certain" | "likely" | "unproven";

/** §17 — evidence quality is recorded independently of confidence. */
export type EvidenceQuality = "verified" | "partial" | "insufficient";

export interface WorkerContribution {
  workerId: WorkerId;
  /** The specialist view, in the contributor's own lane. */
  position: string;
  confidence: Confidence;
  evidenceQuality: EvidenceQuality;
  /**
   * The functional scope this contribution belongs to. Compared against
   * the contributor's own registered scope; a mismatch is rejected.
   */
  functionalScope: FunctionalScope;
  /**
   * Worker ids whose positions this contributor materially disagrees with.
   * Declared explicitly rather than inferred from text, because inferring
   * disagreement from prose is exactly the kind of guess that produces a
   * confident wrong answer.
   */
  disagreesWith?: readonly WorkerId[];
  /** Set when the contributor cannot answer safely within its own lane. */
  cannotAnswer?: boolean;
}

export interface CollaborationRequest {
  caseId: string | null;
  /** The specialist the router selected as owner of the overall task (§8). */
  leadWorkerId: WorkerId;
  contributions: readonly WorkerContribution[];
}

export type CollaborationOutcome =
  | "recommendation"
  | "recommendation_with_unresolved_disagreement"
  | "human_check_required"
  | "invalid";

export interface Disagreement {
  between: readonly WorkerId[];
  positions: readonly { workerId: WorkerId; position: string }[];
}

export interface CollaborationResult {
  outcome: CollaborationOutcome;
  /** Present unless the outcome is "invalid". */
  leadWorkerId: WorkerId | null;
  /** One combined recommendation, never a list of disconnected comments (§9). */
  recommendation: string | null;
  /** §9, §17 — unresolved conflict stays visible. Never empty when the outcome names disagreement. */
  unresolvedDisagreements: readonly Disagreement[];
  /** §17 — what the system does not know, stated plainly. */
  uncertainties: readonly string[];
  /** §17 — set when a human manager must look before this is relied upon. */
  humanCheckReason: string | null;
  /** Contributions that were refused, and why. Reported rather than dropped silently. */
  rejectedContributions: readonly { workerId: WorkerId; reason: string }[];
  /** Every worker whose view is genuinely represented in the recommendation. */
  contributingWorkerIds: readonly WorkerId[];
}

function invalid(reason: string): CollaborationResult {
  return {
    outcome: "invalid",
    leadWorkerId: null,
    recommendation: null,
    unresolvedDisagreements: [],
    uncertainties: [],
    humanCheckReason: reason,
    rejectedContributions: [],
    contributingWorkerIds: [],
  };
}

/**
 * Builds one combined recommendation from a set of specialist
 * contributions, or explains why it cannot.
 *
 * The lead worker owns the combined output. Contributors remain
 * responsible only for their own contribution (§8), which is why a
 * rejected contribution never becomes the lead's problem to defend: it is
 * reported as rejected, not silently absorbed.
 */
export function combineContributions(request: CollaborationRequest): CollaborationResult {
  // §8 — one lead, and the lead must actually be a real worker.
  let lead;
  try {
    lead = getWorker(request.leadWorkerId);
  } catch {
    return invalid(`Unknown lead worker "${request.leadWorkerId}".`);
  }

  if (request.contributions.length === 0) {
    return invalid("A collaborative task needs at least one specialist contribution.");
  }

  const seen = new Set<WorkerId>();
  const rejected: { workerId: WorkerId; reason: string }[] = [];
  const accepted: WorkerContribution[] = [];

  for (const c of request.contributions) {
    if (seen.has(c.workerId)) {
      rejected.push({ workerId: c.workerId, reason: "Duplicate contribution from the same worker." });
      continue;
    }
    seen.add(c.workerId);

    let contributor;
    try {
      contributor = getWorker(c.workerId);
    } catch {
      rejected.push({ workerId: c.workerId, reason: "Unknown worker." });
      continue;
    }

    // §6 — a specialist may only contribute inside its own lane.
    const ownScope = WORKER_FUNCTIONAL_SCOPE[c.workerId];
    if (c.functionalScope !== ownScope) {
      rejected.push({
        workerId: c.workerId,
        reason: `${contributor.canonicalName} contributed in "${c.functionalScope}" but owns "${ownScope}". A specialist may not absorb another lane.`,
      });
      continue;
    }

    accepted.push(c);
  }

  if (accepted.length === 0) {
    return {
      outcome: "human_check_required",
      leadWorkerId: request.leadWorkerId,
      recommendation: null,
      unresolvedDisagreements: [],
      uncertainties: ["No contribution survived the worker-boundary check."],
      humanCheckReason: "Every specialist contribution was rejected, so there is nothing to recommend from.",
      rejectedContributions: rejected,
      contributingWorkerIds: [],
    };
  }

  // §8 — the lead must actually be one of the workers whose position is
  // represented. Checking only that the lead NAMES a real worker is not
  // enough: a set naming James as lead with a contribution only from Priya
  // would otherwise produce a full recommendation in James's name over a
  // position that is entirely Priya's. That is both a recommendation with
  // nobody genuinely accountable for it — the thing §8 exists to prevent —
  // and a misattribution in a governance record.
  //
  // The two failure modes are reported differently on purpose. A lead
  // absent from the set is the caller building the request wrong, which is
  // structural. A lead that contributed but was rejected or abstained is a
  // real collaboration that cannot be owned, which is a human's call.
  if (!request.contributions.some(c => c.workerId === request.leadWorkerId)) {
    return invalid(
      `${lead.canonicalName} is named as lead but made no contribution. ` +
      "A recommendation cannot be attributed to a specialist that did not contribute to it.",
    );
  }

  // §17 — a worker that says it cannot answer is a form of uncertainty,
  // not a silent gap. It contributes no position but is still visible.
  const abstained = accepted.filter(c => c.cannotAnswer === true);
  const answering = accepted.filter(c => c.cannotAnswer !== true);

  const uncertainties: string[] = [];
  for (const c of abstained) {
    uncertainties.push(`${getWorker(c.workerId).canonicalName} could not answer safely within its own lane.`);
  }
  for (const c of answering) {
    if (c.evidenceQuality === "insufficient") {
      uncertainties.push(`${getWorker(c.workerId).canonicalName} holds a position on insufficient evidence.`);
    } else if (c.evidenceQuality === "partial") {
      uncertainties.push(`${getWorker(c.workerId).canonicalName} holds a position on partial evidence.`);
    }
    if (c.confidence === "unproven") {
      uncertainties.push(`${getWorker(c.workerId).canonicalName} records its position as unproven.`);
    }
  }

  const disagreements = findDisagreements(answering);

  if (answering.length === 0) {
    return {
      outcome: "human_check_required",
      leadWorkerId: request.leadWorkerId,
      recommendation: null,
      unresolvedDisagreements: [],
      uncertainties,
      humanCheckReason: "No specialist was able to answer within its own lane.",
      rejectedContributions: rejected,
      contributingWorkerIds: accepted.map(c => c.workerId),
    };
  }

  // Others answered, but did the lead? Deliberately checked after the
  // "nobody answered at all" case above, which is the broader and more
  // informative reason when it applies — saying the lead could not answer
  // would wrongly imply that somebody else could.
  // The lead contributed, but did its contribution survive and did it
  // actually answer? If not, there is no one to own the combined output.
  if (!answering.some(c => c.workerId === request.leadWorkerId)) {
    const wasRejected = rejected.some(r => r.workerId === request.leadWorkerId);
    return {
      outcome: "human_check_required",
      leadWorkerId: request.leadWorkerId,
      recommendation: null,
      unresolvedDisagreements: disagreements,
      uncertainties,
      humanCheckReason: wasRejected
        ? `${lead.canonicalName} is the lead but its contribution was rejected, so nobody is accountable for a combined recommendation.`
        : `${lead.canonicalName} is the lead but could not answer within its own lane, so nobody is accountable for a combined recommendation.`,
      rejectedContributions: rejected,
      contributingWorkerIds: accepted.map(c => c.workerId),
    };
  }

  // §17 — insufficient evidence across the board is not something to
  // paper over with a confident-sounding summary.
  const allInsufficient = answering.every(c => c.evidenceQuality === "insufficient");
  if (allInsufficient) {
    return {
      outcome: "human_check_required",
      leadWorkerId: request.leadWorkerId,
      recommendation: null,
      unresolvedDisagreements: disagreements,
      uncertainties,
      humanCheckReason:
        "Every contributing specialist is working from insufficient evidence. A human manager should check before this is relied upon.",
      rejectedContributions: rejected,
      contributingWorkerIds: accepted.map(c => c.workerId),
    };
  }

  const recommendation = writeRecommendation(lead.canonicalName, answering, disagreements, uncertainties);

  return {
    outcome: disagreements.length > 0 ? "recommendation_with_unresolved_disagreement" : "recommendation",
    leadWorkerId: request.leadWorkerId,
    recommendation,
    unresolvedDisagreements: disagreements,
    uncertainties,
    humanCheckReason:
      disagreements.length > 0
        ? "Specialists disagree materially and the conflict is unresolved. The appropriate human manager should decide."
        : null,
    rejectedContributions: rejected,
    contributingWorkerIds: answering.map(c => c.workerId),
  };
}

/**
 * Pairs up declared disagreements. Only mutual-facing conflicts between
 * two contributors that are both present are reported, so a stale
 * reference to a worker that did not contribute cannot manufacture a
 * disagreement that nobody is actually having.
 */
function findDisagreements(contributions: readonly WorkerContribution[]): Disagreement[] {
  const byId = new Map(contributions.map(c => [c.workerId, c]));
  const pairs = new Map<string, Disagreement>();

  for (const c of contributions) {
    for (const other of c.disagreesWith ?? []) {
      const target = byId.get(other);
      if (!target || other === c.workerId) continue;
      const key = [c.workerId, other].sort().join("|");
      if (pairs.has(key)) continue;
      pairs.set(key, {
        between: [c.workerId, other].sort() as WorkerId[],
        positions: [
          { workerId: c.workerId, position: c.position },
          { workerId: other, position: target.position },
        ],
      });
    }
  }

  return Array.from(pairs.values());
}

/**
 * Composes the combined text. Deliberately plain: this is the substance,
 * and the separate humanisation pass (§10) may improve how it reads but
 * must not change what it says.
 */
function writeRecommendation(
  leadName: string,
  answering: readonly WorkerContribution[],
  disagreements: readonly Disagreement[],
  uncertainties: readonly string[],
): string {
  const parts: string[] = [];

  const agreed = answering.filter(c => !disagreements.some(d => d.between.includes(c.workerId)));
  if (agreed.length > 0) {
    parts.push(agreed.map(c => c.position).join(" "));
  }

  if (disagreements.length > 0) {
    for (const d of disagreements) {
      const names = d.positions.map(p => `${getWorker(p.workerId).canonicalName} says ${p.position}`);
      parts.push(`This is unresolved: ${names.join(", whereas ")}.`);
    }
    parts.push("That difference has not been settled, so it needs a manager's decision rather than a pick between them.");
  }

  if (uncertainties.length > 0) {
    parts.push(`Worth knowing: ${uncertainties.join(" ")}`);
  }

  parts.push(`${leadName} owns this combined recommendation.`);

  return parts.join(" ");
}
