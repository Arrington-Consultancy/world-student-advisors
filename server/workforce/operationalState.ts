/**
 * Whether an approved worker can actually take the job, right now.
 *
 * Tom's point, 11 September 2026: do not blur "a remit exists in a draft"
 * with "an approved live worker exists". Those are different claims and
 * staff act on them differently. A third claim sits between them and is
 * the one most likely to be got wrong: a worker whose remit is approved
 * and whose particular capability is closed.
 *
 * So three states, and the router must be able to say which one it is
 * looking at rather than collapsing them into available and unavailable.
 *
 * WHAT THE CONTROLLED RECORDS ACTUALLY SAY, reconciled 11 September 2026.
 * All thirteen substantive workers are approved and active for Staff
 * Portal execution. WSA_Consolidated_Worker_Approval_Record_v1.0
 * (31 August 2026) approved them; Worker Register v0.45 section 2 states
 * the reconciliation directly, that execution approval is recorded per
 * worker while the recorded blockers are "named governance decisions that
 * gate CAPABILITIES rather than the worker's authority to execute"; and
 * the Controlled Worker Handover of 5 September 2026 lists the same
 * thirteen as approved. Change Entry 086 concerns staff access and says
 * in terms that the Worker Register is unchanged.
 *
 * NIA IS THE CASE THAT PROVES THE DISTINCTION MATTERS. She is approved and
 * active, and her drafting capability is open, and her account capability
 * is shut. "Draft a post about the January intake" is work she is approved
 * to do. "Schedule that for Monday" is the same remit and a closed
 * capability, and the honest answer to it names the human route rather
 * than implying she will get to it.
 *
 * No worker is currently in the third state. The state exists anyway,
 * because the router must not have to be rewritten the first time one is,
 * and because a model that can only express the states it currently needs
 * is how "Draft" and "approved" got blurred in the first place.
 */
import { getWorker } from "./registry";
import { evaluateStaffPortalExecutionPermission } from "./permissions";
import { APPROVAL_RECORD, REGISTER_EXECUTION_STATE, type ControlledSource } from "./provenance";
import type { OutcomeId } from "./remit";
import type { WorkerId } from "./types";

export type OperationalState =
  /** Approved, and the Staff Portal is an authorised place for it to execute. */
  | "approved_active"
  /** Approved, but it cannot currently execute here. A recognisable remit that cannot take the job. */
  | "approved_not_active"
  /** Not approved. A remit that exists in a draft is not a worker staff may be routed to. */
  | "draft_not_approved";

export interface WorkerOperationalState {
  workerId: WorkerId;
  state: OperationalState;
  /** What to tell a staff member, in plain words, when this worker cannot take the work. */
  staffExplanation: string | null;
  source: ControlledSource;
}

/**
 * Derived from the registry, which is itself derived from the Register.
 * Nothing here decides an approval; it reads one and classifies it.
 */
export function operationalStateOf(workerId: WorkerId): WorkerOperationalState {
  const worker = getWorker(workerId);
  const approved =
    worker.specificationStatus === "approved" || worker.specificationStatus === "active";

  if (!approved) {
    return {
      workerId,
      state: "draft_not_approved",
      staffExplanation:
        `This is the ${worker.roleTitle} area of work. ${worker.canonicalName} is not an approved worker yet, ` +
        `so this does not go to her through the Staff Portal. Use the current human process and raise it with ` +
        `${worker.escalationRoute}.`,
      source: APPROVAL_RECORD,
    };
  }

  const execution = evaluateStaffPortalExecutionPermission(workerId);
  if (!execution.allowed) {
    return {
      workerId,
      state: "approved_not_active",
      staffExplanation:
        `This is ${worker.canonicalName}'s area of work and her remit covers it, but she cannot take it in the ` +
        `Staff Portal at the moment. ${worker.currentNextControl} Escalation: ${worker.escalationRoute}.`,
      source: REGISTER_EXECUTION_STATE,
    };
  }

  return { workerId, state: "approved_active", staffExplanation: null, source: REGISTER_EXECUTION_STATE };
}

/**
 * Which registry capability an outcome needs.
 *
 * This is the join that lets the router check the capability rather than
 * only the worker. An outcome absent from this map needs no particular
 * capability beyond the worker being active.
 */
const OUTCOME_CAPABILITY: Partial<Record<OutcomeId, string>> = {
  application_submission: "submit",
  scholarship_eligibility: "scholarship_eligibility",
  live_ads_change: "ads_live",
  social_account_action: "publish",
  organic_search_performance: "seo_advice",
  records_structure: "records_advice",
  immigration_rule: "rules_explanation",
  visa_case_preparation: "case_preparation",
  personal_immigration_determination: "regulated_advice",
};

export interface CapabilityState {
  /** Whether the capability the outcome needs is currently open. */
  open: boolean;
  capabilityId: string | null;
  capabilityName: string | null;
  /** The recorded reason it is shut, straight from the registry entry. */
  closedBecause: string | null;
}

export function capabilityStateFor(workerId: WorkerId, outcome: OutcomeId): CapabilityState {
  const capabilityId = OUTCOME_CAPABILITY[outcome];
  if (!capabilityId) return { open: true, capabilityId: null, capabilityName: null, closedBecause: null };

  const capability = getWorker(workerId).capabilities.find(c => c.id === capabilityId);
  if (!capability) return { open: true, capabilityId: null, capabilityName: null, closedBecause: null };

  return {
    open: capability.worksWithoutConnector && !capability.unavailableBecause,
    capabilityId: capability.id,
    capabilityName: capability.name,
    closedBecause: capability.unavailableBecause ?? null,
  };
}

/** Exposed so a test can assert the map only names capabilities that exist. */
export const OUTCOME_CAPABILITY_MAP = OUTCOME_CAPABILITY;
