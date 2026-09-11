/**
 * The remit router.
 *
 * Replaces asking "which worker's vocabulary does this sentence overlap
 * with" by asking "what is this person trying to end up holding, and whose
 * approved remit produces that". The failures that prompted this were all
 * the same shape: nine ordinary requests from live testing that a keyword
 * table either dropped or sent to the wrong specialist, and one of them,
 * "give a list of cold leads", produced a confident claim that WSA has no
 * process for something WSA is hiring a person to do.
 *
 * THE PRIORITY, IN THIS ORDER, AS TOM SET IT:
 *
 *   1. The explicit requested outcome.
 *   2. Approved remit and exclusions.
 *   3. Current case context.
 *   4. Pipeline position, as supporting context only.
 *   5. Keywords, as supporting evidence and tiebreak only.
 *
 * Order is the design, not a preference. The pipeline chain used to decide
 * ambiguous requests, and it is wrong for the commonest hard case: "is the
 * application ready even though discovery is missing" is a question about
 * the application, and an earlier incomplete stage is not a reason to send
 * it to Daniel. Pipeline position is evidence about context; it never
 * overrides what somebody asked for.
 *
 * SUBJECT OWNERSHIP IS NOT AUTHORITY TO CONCLUDE. "Can this particular
 * student bring his wife" is Priya's subject, and Priya may not answer it.
 * The router routes it to her and attaches the human gate, because sending
 * it somewhere else would lose the expertise and answering it would breach
 * the bounded scope approved on 31 August 2026.
 *
 * THE ROUTER NEVER GRANTS ANYTHING. It names an owner. Every permission,
 * case scope and worker scope is resolved server-side on the request that
 * follows, exactly as before.
 */
import {
  OUTCOMES,
  REMITS,
  isUnowned,
  outcomeDefinition,
  producersOf,
  remitFor,
  subjectOwnersOf,
  type OutcomeId,
} from "./remit";
import { conceptsIn } from "./intent";
import { capabilityStateFor, operationalStateOf, type OperationalState } from "./operationalState";
import { getWorker } from "./registry";
import { ROUTING_MODEL_VERSION } from "./provenance";
import { tokenise, scoreTerms } from "./routing";
import type { WorkerId } from "./types";

/** Which of the five levels actually settled the decision. */
export type PriorityLevel =
  | "requested_outcome"
  | "approved_remit"
  | "case_context"
  | "pipeline_position"
  | "keyword_tiebreak"
  | "unresolved";

/**
 * Why a request did not reach a worker who could take it.
 *
 * These are the categories the Routing Gap Log groups by, so they have to
 * describe genuinely different failures with genuinely different fixes.
 * "Recognised subject but no approved remit" is a governance question for
 * Tom; "router misclassification" is a defect in this file. Collapsing
 * them would make the log unreadable exactly where it matters.
 */
export type RoutingFailureType =
  | "no_recognised_intent"
  | "subject_without_approved_remit"
  | "remit_but_worker_inactive"
  | "remit_but_capability_closed"
  | "permission_failure"
  | "connector_failure"
  | "ambiguity_needs_clarification"
  | "router_misclassification_corrected";

export type RoutingConfidence = "high" | "medium" | "low" | "none";

export interface RemitRoutingDecision {
  /** True only when a worker who can currently take the work was identified. */
  matched: boolean;
  outcome: OutcomeId | null;
  outcomeDescription: string | null;
  responsibleWorkerId: WorkerId | null;
  /** Every worker the remit model put in the running, before the tiebreak. */
  candidates: WorkerId[];
  decidedAt: PriorityLevel;
  confidence: RoutingConfidence;
  operationalState: OperationalState | null;
  /**
   * Set where the subject belongs to this worker but the conclusion does
   * not. The worker is still the right destination.
   */
  humanGate: string | null;
  failure: RoutingFailureType | null;
  /** What the staff member is told. Never a claim the router cannot support. */
  status: string;
  safeNextAction: string;
  /** Written to the gap log so a fixed defect is distinguishable from a live one. */
  modelVersion: string;
}

/** Every outcome the request could be asking for, most specific first. */
export function outcomesIn(requestText: string): OutcomeId[] {
  const concepts = conceptsIn(requestText);
  const hits: { id: OutcomeId; specificity: number }[] = [];

  for (const outcome of OUTCOMES) {
    if (outcome.blockedBy?.some(c => concepts.has(c))) continue;
    const satisfied = outcome.requires.some(group => group.every(c => concepts.has(c)));
    if (satisfied) hits.push({ id: outcome.id, specificity: outcome.specificity });
  }

  return hits.sort((a, b) => b.specificity - a.specificity).map(h => h.id);
}

/** Context the caller already legitimately holds. Never supplied by the browser. */
export interface CaseContext {
  /** An identifier, never the record itself. */
  caseReference?: string;
  /** Pipeline stage the case is currently at, where it is known. */
  pipelineStage?: number;
  /** A worker already working this case. */
  currentWorkerId?: WorkerId;
}

function unresolved(
  failure: RoutingFailureType,
  status: string,
  safeNextAction: string,
  outcome: OutcomeId | null,
  candidates: WorkerId[] = [],
): RemitRoutingDecision {
  return {
    matched: false,
    outcome,
    outcomeDescription: outcome ? outcomeDefinition(outcome).description : null,
    responsibleWorkerId: null,
    candidates,
    decidedAt: "unresolved",
    confidence: "none",
    operationalState: null,
    humanGate: null,
    failure,
    status,
    safeNextAction,
    modelVersion: ROUTING_MODEL_VERSION,
  };
}

/**
 * Level 5 only. Kept because a genuine tie between two producers has to
 * break somewhere, and a word the request actually used is better evidence
 * than alphabetical order. It never selects a worker the remit model did
 * not already put in the running.
 */
function keywordTiebreak(requestText: string, candidates: WorkerId[]): WorkerId {
  const tokens = tokenise(requestText);
  let best = candidates[0];
  let bestScore = -1;
  for (const id of candidates) {
    const worker = getWorker(id);
    const terms = [worker.roleTitle, ...worker.roleTitle.split(/\s*&\s*|\s+and\s+/)];
    const score = scoreTerms(tokens, terms);
    if (score > bestScore) { best = id; bestScore = score; }
  }
  return best;
}

/**
 * Route a plain-language staff request.
 *
 * Deterministic. The same sentence gives the same answer today and next
 * month, which a routing decision that gets written to an audit log has to.
 */
export function routeByRemit(requestText: string, context: CaseContext = {}): RemitRoutingDecision {
  // LEVEL 1: the explicit requested outcome.
  const outcomes = outcomesIn(requestText);
  if (outcomes.length === 0) {
    return unresolved(
      "no_recognised_intent",
      "I could not work out what you are asking for.",
      "Say what you want to end up with, or pick a specialist from the list below.",
      null,
    );
  }

  const outcome = outcomes[0];

  // An outcome the controlled records show nobody produces. This is the
  // one case where the strong wording is honest, and it is only honest
  // because the remit model can point at the record that says so.
  if (isUnowned(outcome)) {
    const definition = outcomeDefinition(outcome);
    const nextStep =
      outcome === "crm_reporting"
        ? "No specialist is approved to run counts or reports over the CRM yet, so this is recorded for Tom as a workforce gap. For now, Pipedrive Insights gives the figure directly."
        : "This is a gap in the workforce rather than a gap in what you asked. It has been recorded for Tom to review.";
    return unresolved(
      "subject_without_approved_remit",
      `I understood this as ${definition.description.toLowerCase()}. No approved WSA worker owns that.`,
      nextStep,
      outcome,
    );
  }

  // LEVEL 2: approved remit and exclusions.
  const excluded = new Set(
    REMITS.filter(r => r.excludes.some(e => e.outcome === outcome)).map(r => r.workerId),
  );
  let candidates = producersOf(outcome).filter(id => !excluded.has(id));

  // Subject ownership without authority to conclude. The subject owner is
  // a destination in their own right, not a fallback.
  const subjectOwners = subjectOwnersOf(outcome).filter(id => !excluded.has(id));
  let humanGate: string | null = null;
  if (candidates.length === 0 && subjectOwners.length > 0) {
    candidates = subjectOwners;
    const worker = getWorker(subjectOwners[0]);
    humanGate =
      `${worker.canonicalName} owns this subject and is not authorised to answer it for a particular person. ` +
      `She can set out what the published rule says and what an authorised human has to decide. ` +
      `The determination itself goes to ${worker.escalationRoute}.`;
  }

  if (candidates.length === 0) {
    const definition = outcomeDefinition(outcome);
    return unresolved(
      "subject_without_approved_remit",
      `I understood this as ${definition.description.toLowerCase()}, and no approved remit covers it.`,
      "Recorded for review. Use the current human process in the meantime.",
      outcome,
    );
  }

  let decidedAt: PriorityLevel = candidates.length === 1 ? "approved_remit" : "case_context";
  if (outcomes.length === 1 && candidates.length === 1) decidedAt = "requested_outcome";

  // LEVEL 3: current case context.
  if (candidates.length > 1 && context.currentWorkerId && candidates.includes(context.currentWorkerId)) {
    candidates = [context.currentWorkerId];
    decidedAt = "case_context";
  }

  // LEVEL 4: pipeline position, as supporting context only. It narrows a
  // field that is already ambiguous; it never reopens one that is not.
  if (candidates.length > 1 && context.pipelineStage !== undefined) {
    const atStage = candidates.filter(id => remitFor(id)?.pipelineStage === context.pipelineStage);
    if (atStage.length > 0 && atStage.length < candidates.length) {
      candidates = atStage;
      decidedAt = "pipeline_position";
    }
  }

  // LEVEL 5: keywords, tiebreak only.
  let responsibleWorkerId = candidates[0];
  if (candidates.length > 1) {
    responsibleWorkerId = keywordTiebreak(requestText, candidates);
    decidedAt = "keyword_tiebreak";
  }

  const confidence: RoutingConfidence =
    decidedAt === "requested_outcome" || decidedAt === "approved_remit"
      ? "high"
      : decidedAt === "keyword_tiebreak"
        ? "low"
        : "medium";

  // Operational state: can this worker take the job at all?
  const state = operationalStateOf(responsibleWorkerId);
  const worker = getWorker(responsibleWorkerId);
  const definition = outcomeDefinition(outcome);

  if (state.state !== "approved_active") {
    return {
      ...unresolved(
        state.state === "draft_not_approved" ? "subject_without_approved_remit" : "remit_but_worker_inactive",
        state.staffExplanation ?? "This worker cannot take the request at the moment.",
        `Use the current authorised human process. Escalation: ${worker.escalationRoute}.`,
        outcome,
        candidates,
      ),
      // The remit was recognised even though nobody can take it. Saying so
      // is the difference between "WSA has no process for this" and "the
      // person who does this cannot be reached from here today".
      outcomeDescription: definition.description,
      operationalState: state.state,
      confidence,
    };
  }

  // Capability state: the worker is active, but is the particular thing
  // being asked for switched on? This is where Nia's account actions sit.
  //
  // A human-gated route is deliberately exempt. The closed capability is
  // the REASON the gate exists, and the gate is the more useful statement
  // of the same fact: it names the worker, what she can do with it, and
  // who makes the decision. Reporting a closed capability instead would
  // send "can this particular student bring his wife" back with no owner,
  // which loses the visa expertise the question needs.
  const capability = capabilityStateFor(responsibleWorkerId, outcome);
  if (!capability.open && !humanGate) {
    return {
      ...unresolved(
        "remit_but_capability_closed",
        `${worker.canonicalName} owns this work, and "${capability.capabilityName}" is not open to her. ` +
        `${capability.closedBecause ?? ""}`.trim(),
        `She can still help with the parts that are open. Anything that needs that capability goes to ${worker.escalationRoute}.`,
        outcome,
        candidates,
      ),
      outcomeDescription: definition.description,
      operationalState: state.state,
      confidence,
    };
  }

  return {
    matched: true,
    outcome,
    outcomeDescription: definition.description,
    responsibleWorkerId,
    candidates,
    decidedAt,
    confidence,
    operationalState: state.state,
    humanGate,
    failure: null,
    status: humanGate ?? "Available.",
    safeNextAction: humanGate
      ? `Ask ${worker.canonicalName} what the rule says and what has to be decided. The decision itself is not hers to make.`
      : `Open ${worker.canonicalName}'s workspace.`,
    modelVersion: ROUTING_MODEL_VERSION,
  };
}
