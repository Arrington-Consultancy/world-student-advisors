/**
 * Case timeline, live status and deadline risk.
 *
 * Implements clauses 21, 24, 25, 26 and 27 of the WSA AI Operational
 * Standard v1.0 (APPROVED). Pure: no database, no clock of its own. Every
 * function that depends on the current time takes it as an argument, so
 * the same inputs always produce the same output and the risk bands can be
 * tested at their exact boundaries rather than approximately.
 *
 * §26 and §27 make one timeline serve two jobs: historical record and
 * forward operational plan. They are modelled as one ordered sequence
 * rather than two lists, because a manager asking "where is this" should
 * not have to reconcile two views that can disagree.
 *
 * §21 exists so nobody reconstructs status from chat history. The status
 * view is therefore derived entirely from recorded events and milestones,
 * never from prose.
 */
import type { WorkerId } from "../workforce/types";

export type TimelineEventKind =
  | "stage_entered"
  | "stage_completed"
  | "decision"
  | "escalation_raised"
  | "escalation_closed"
  | "approval_granted"
  | "approval_refused"
  | "handoff"
  | "status_change"
  | "evidence_recorded"
  | "action_taken";

/** §26 — what happened, when, and who or which worker did it. */
export interface TimelineEvent {
  eventId: string;
  caseId: string;
  kind: TimelineEventKind;
  at: Date;
  /** Exactly one actor. A worker acted, or a human did. */
  actor: { type: "worker"; workerId: WorkerId } | { type: "human"; staffUserId: number; displayName: string };
  summary: string;
  /** Set where the event concerns a named stage. */
  stage?: string;
  /** §30 — material events carry their permission result. */
  permissionAllowed?: boolean;
}

export type MilestoneState = "upcoming" | "becoming_due" | "overdue" | "critical" | "complete";

/** §25 — a milestone with a due date and a materiality weight. */
export interface Milestone {
  milestoneId: string;
  caseId: string;
  description: string;
  dueAt: Date;
  completedAt: Date | null;
  /** Whether missing this is materially damaging, which drives escalation (§24). */
  material: boolean;
  /** The human who owns the overall journey, distinct from any specialist worker (§23). */
  humanOwnerStaffUserId: number | null;
  /** The specialist that owns the task itself (§23). */
  specialistWorkerId: WorkerId | null;
}

/**
 * §25 risk bands. Thresholds are explicit and named rather than magic
 * numbers so that "becoming due" means the same thing everywhere, and so
 * §24's requirement that trivial lateness must not create escalation has
 * a single place to be tuned.
 */
export const BECOMING_DUE_DAYS = 7;
/** §24 — lateness below this is trivial and must not escalate. */
export const TRIVIAL_LATENESS_DAYS = 2;
/** Beyond this an overdue material milestone is critical. */
export const CRITICAL_OVERDUE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / DAY_MS;
}

/**
 * Classifies one milestone against the clock. A completed milestone is
 * complete regardless of when it was completed: a late-but-done item is
 * history, not an outstanding risk.
 */
export function milestoneState(m: Milestone, now: Date): MilestoneState {
  if (m.completedAt !== null) return "complete";

  const daysUntilDue = daysBetween(now, m.dueAt);

  if (daysUntilDue >= 0) {
    return daysUntilDue <= BECOMING_DUE_DAYS ? "becoming_due" : "upcoming";
  }

  const daysOverdue = -daysUntilDue;

  // Only a material milestone can reach critical. An immaterial one is
  // late and visible, but it is not a management problem however long it
  // has been outstanding, which is what §24's risk thresholds are for.
  if (!m.material) return "overdue";

  return daysOverdue >= CRITICAL_OVERDUE_DAYS ? "critical" : "overdue";
}

/**
 * §24 — whether this milestone should reach management. Deliberately
 * narrower than "is it late": an immaterial milestone never escalates, and
 * a material one only escalates once it is past the trivial threshold.
 * A human owning the overall journey does not suppress this, because §24
 * says specialist work falling materially behind may need management
 * attention even where a human owns the journey.
 */
export function shouldEscalateSlippage(m: Milestone, now: Date): boolean {
  if (m.completedAt !== null) return false;
  if (!m.material) return false;
  const daysOverdue = -daysBetween(now, m.dueAt);
  return daysOverdue > TRIVIAL_LATENESS_DAYS;
}

export interface CaseStatusView {
  caseId: string;
  /** §21 — where the case is now. */
  currentStage: string | null;
  completedStages: readonly string[];
  /** §23 — the human accountable for the journey. */
  humanJourneyOwnerStaffUserId: number | null;
  /** §23 — the specialist owning the current task. */
  currentSpecialistWorkerId: WorkerId | null;
  outstandingMilestones: readonly { milestone: Milestone; state: MilestoneState }[];
  /** §21 — what is stopping progress. */
  blockers: readonly string[];
  pendingHumanDecisions: readonly string[];
  lastEventAt: Date | null;
}

export interface BuildStatusInput {
  caseId: string;
  events: readonly TimelineEvent[];
  milestones: readonly Milestone[];
  /** Open escalation summaries for this case, from escalation.ts. */
  openEscalations: readonly { escalationId: string; decisionRequired: string }[];
  blockers: readonly string[];
}

/**
 * §21 — builds the status view a manager sees, entirely from recorded
 * events and milestones. Nothing here reads free text to work out where a
 * case is.
 */
export function buildCaseStatus(input: BuildStatusInput, now: Date): CaseStatusView {
  const ordered = orderEvents(input.events);

  const completedStages: string[] = [];
  let currentStage: string | null = null;
  let currentSpecialistWorkerId: WorkerId | null = null;
  let humanJourneyOwnerStaffUserId: number | null = null;

  for (const e of ordered) {
    if (e.kind === "stage_entered" && e.stage) {
      currentStage = e.stage;
      if (e.actor.type === "worker") currentSpecialistWorkerId = e.actor.workerId;
    }
    if (e.kind === "stage_completed" && e.stage) {
      if (!completedStages.includes(e.stage)) completedStages.push(e.stage);
      if (currentStage === e.stage) currentStage = null;
    }
    if (e.kind === "handoff" && e.actor.type === "worker") {
      currentSpecialistWorkerId = e.actor.workerId;
    }
  }

  for (const m of input.milestones) {
    if (m.humanOwnerStaffUserId !== null) {
      humanJourneyOwnerStaffUserId = m.humanOwnerStaffUserId;
      break;
    }
  }

  const outstandingMilestones = input.milestones
    .map(milestone => ({ milestone, state: milestoneState(milestone, now) }))
    .filter(x => x.state !== "complete")
    .sort((a, b) => a.milestone.dueAt.getTime() - b.milestone.dueAt.getTime());

  return {
    caseId: input.caseId,
    currentStage,
    completedStages,
    humanJourneyOwnerStaffUserId,
    currentSpecialistWorkerId,
    outstandingMilestones,
    blockers: input.blockers,
    pendingHumanDecisions: input.openEscalations.map(e => e.decisionRequired),
    lastEventAt: ordered.length > 0 ? ordered[ordered.length - 1].at : null,
  };
}

/**
 * Orders events chronologically, breaking ties by event id so the sequence
 * is stable. Two events recorded in the same millisecond would otherwise
 * order differently between runs, which makes a timeline untrustworthy as
 * a record.
 */
export function orderEvents(events: readonly TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const t = a.at.getTime() - b.at.getTime();
    return t !== 0 ? t : a.eventId.localeCompare(b.eventId);
  });
}

export interface CombinedTimeline {
  /** §26 — what already happened, oldest first. */
  history: readonly TimelineEvent[];
  /** §27 — what should happen next, soonest first. */
  forward: readonly { milestone: Milestone; state: MilestoneState }[];
  /** The single next thing that matters, or null when nothing is outstanding. */
  nextMilestone: Milestone | null;
}

/**
 * §26 and §27 — one timeline serving as both historical record and
 * forward plan. History is everything already recorded; forward is every
 * outstanding milestone in due order.
 */
export function buildTimeline(
  events: readonly TimelineEvent[],
  milestones: readonly Milestone[],
  now: Date,
): CombinedTimeline {
  const history = orderEvents(events);
  const forward = milestones
    .map(milestone => ({ milestone, state: milestoneState(milestone, now) }))
    .filter(x => x.state !== "complete")
    .sort((a, b) => a.milestone.dueAt.getTime() - b.milestone.dueAt.getTime());

  return { history, forward, nextMilestone: forward.length > 0 ? forward[0].milestone : null };
}
