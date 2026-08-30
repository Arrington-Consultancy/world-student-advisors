/**
 * Manager Attention, next-action intelligence and notification discipline.
 *
 * Implements clauses 20, 22, 28 and 29 of the WSA AI Operational Standard
 * v1.0 (APPROVED). Pure: no database, no notifications sent, no email. It
 * decides what belongs in front of a manager and which channel a matter
 * deserves. Actually delivering anything is separately gated, and nothing
 * here may claim a human was told.
 *
 * §29's test is "What needs my attention today?", and its warning is
 * "avoid vanity dashboards". So this deliberately does not compute
 * counts of things that are fine. Every item returned is something a human
 * has to do; work that is on track produces nothing.
 *
 * §20 is also explicit that the portal, not the notification, is where a
 * matter is reviewed and closed. Channel selection therefore never
 * removes an item from the attention view: an alert is a pointer to the
 * controlled record, not a replacement for it.
 *
 * Every attention item is filtered through the same access model that
 * governs any other read, so a manager's attention view cannot become a
 * side channel that shows them work they would not be allowed to open.
 */
import { evaluateAccess, type FunctionalScope, type StaffAccessProfile } from "../access/accessControl";
import { isAwaitingHuman, ESCALATION_SENSITIVE_CATEGORY, type Escalation } from "./escalation";
import { milestoneState, shouldEscalateSlippage, type Milestone } from "./timeline";
import type { WorkerId } from "../workforce/types";

export type AttentionKind =
  | "unresolved_escalation"
  | "permission_request"
  | "consequential_action_awaiting_approval"
  | "blocked_case"
  | "worker_disagreement"
  | "evidence_insufficient"
  | "high_risk_delay"
  | "unrouted_escalation";

/** §28 — routine stays in the portal, important notifies, urgent may also alert directly. */
export type NotificationChannel = "portal_only" | "notification" | "direct_alert";

export interface AttentionItem {
  kind: AttentionKind;
  caseId: string | null;
  functionalScope: FunctionalScope;
  summary: string;
  /** What the human actually has to decide or do. */
  actionRequired: string;
  raisedAt: Date;
  channel: NotificationChannel;
  /** Sorting weight. Higher is more urgent. */
  urgency: number;
  sourceId: string;
  workersInvolved: readonly WorkerId[];
}

export interface PendingApproval {
  approvalId: string;
  caseId: string | null;
  functionalScope: FunctionalScope;
  /** The consequential action awaiting a human (§14). */
  action: string;
  requestedAt: Date;
  workersInvolved: readonly WorkerId[];
}

export interface PermissionRequest {
  requestId: string;
  subjectStaffUserId: number;
  functionalScope: FunctionalScope;
  requested: string;
  reason: string;
  requestedAt: Date;
}

export interface BlockedCase {
  caseId: string;
  functionalScope: FunctionalScope;
  blockedReason: string;
  blockedSince: Date;
}

export interface AttentionInput {
  escalations: readonly Escalation[];
  pendingApprovals: readonly PendingApproval[];
  permissionRequests: readonly PermissionRequest[];
  blockedCases: readonly BlockedCase[];
  milestones: readonly Milestone[];
  /** Escalations that could not be routed to any authorised human (§18). */
  unroutedEscalationIds: readonly string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * §28 — channel discipline. An urgent, high-risk matter may use a direct
 * alert; an important one creates a notification; everything else stays in
 * the portal. Nothing is ever removed from the attention list by this
 * choice.
 */
function channelFor(kind: AttentionKind, urgency: number): NotificationChannel {
  if (urgency >= 90) return "direct_alert";
  if (urgency >= 60) return "notification";
  return "portal_only";
}

function ageDays(from: Date, now: Date): number {
  return Math.max(0, (now.getTime() - from.getTime()) / DAY_MS);
}

/**
 * Builds the unfiltered attention list. Everything here is genuinely
 * outstanding: nothing on track produces an item.
 */
export function collectAttentionItems(input: AttentionInput, now: Date): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const e of input.escalations) {
    if (!isAwaitingHuman(e)) continue;

    const unrouted = input.unroutedEscalationIds.includes(e.escalationId);
    const sensitive = ESCALATION_SENSITIVE_CATEGORY[e.reason] !== undefined;
    const age = ageDays(e.raisedAt, now);

    // An unrouted escalation is the most urgent thing in the system: it
    // means nobody authorised has been told, so it cannot be waiting on
    // anyone in particular.
    const urgency = unrouted ? 100 : sensitive ? 90 : Math.min(85, 50 + age * 5);

    items.push({
      kind: unrouted ? "unrouted_escalation" : e.reason === "worker_disagreement" ? "worker_disagreement"
        : e.reason === "evidence_insufficient" ? "evidence_insufficient" : "unresolved_escalation",
      caseId: e.caseId,
      functionalScope: e.functionalScope,
      summary: unrouted
        ? `Escalation ${e.escalationId} could not be routed to any authorised human.`
        : `Escalation ${e.escalationId} is ${e.status}.`,
      actionRequired: e.decisionRequired,
      raisedAt: e.raisedAt,
      channel: channelFor("unresolved_escalation", urgency),
      urgency,
      sourceId: e.escalationId,
      workersInvolved: e.workersInvolved,
    });
  }

  for (const a of input.pendingApprovals) {
    const urgency = Math.min(88, 55 + ageDays(a.requestedAt, now) * 6);
    items.push({
      kind: "consequential_action_awaiting_approval",
      caseId: a.caseId,
      functionalScope: a.functionalScope,
      summary: `A consequential action is prepared and waiting: ${a.action}.`,
      actionRequired: `Approve or reject: ${a.action}.`,
      raisedAt: a.requestedAt,
      channel: channelFor("consequential_action_awaiting_approval", urgency),
      urgency,
      sourceId: a.approvalId,
      workersInvolved: a.workersInvolved,
    });
  }

  for (const p of input.permissionRequests) {
    const urgency = Math.min(70, 45 + ageDays(p.requestedAt, now) * 4);
    items.push({
      kind: "permission_request",
      caseId: null,
      functionalScope: p.functionalScope,
      summary: `Access change requested for staff user ${p.subjectStaffUserId}: ${p.requested}.`,
      actionRequired: `Decide the access request. Reason given: ${p.reason}.`,
      raisedAt: p.requestedAt,
      channel: channelFor("permission_request", urgency),
      urgency,
      sourceId: p.requestId,
      workersInvolved: [],
    });
  }

  for (const b of input.blockedCases) {
    const urgency = Math.min(80, 40 + ageDays(b.blockedSince, now) * 5);
    items.push({
      kind: "blocked_case",
      caseId: b.caseId,
      functionalScope: b.functionalScope,
      summary: `Case ${b.caseId} is blocked: ${b.blockedReason}.`,
      actionRequired: `Unblock the case or reassign it. Blocked since ${b.blockedSince.toISOString().slice(0, 10)}.`,
      raisedAt: b.blockedSince,
      channel: channelFor("blocked_case", urgency),
      urgency,
      sourceId: b.caseId,
      workersInvolved: [],
    });
  }

  // §24 and §25 — only slippage that actually warrants management.
  for (const m of input.milestones) {
    if (!shouldEscalateSlippage(m, now)) continue;
    const state = milestoneState(m, now);
    const urgency = state === "critical" ? 92 : 65;
    items.push({
      kind: "high_risk_delay",
      caseId: m.caseId,
      functionalScope: "operations",
      summary: `${m.description} is ${state}.`,
      actionRequired: `Recover or re-plan: ${m.description}. Due ${m.dueAt.toISOString().slice(0, 10)}.`,
      raisedAt: m.dueAt,
      channel: channelFor("high_risk_delay", urgency),
      urgency,
      sourceId: m.milestoneId,
      workersInvolved: m.specialistWorkerId ? [m.specialistWorkerId] : [],
    });
  }

  return items.sort((a, b) => b.urgency - a.urgency || a.raisedAt.getTime() - b.raisedAt.getTime());
}

export interface ManagerAttentionView {
  items: readonly AttentionItem[];
  /** Items withheld because the manager is not authorised to see them. */
  withheldCount: number;
  /** True when there is genuinely nothing for this manager to do. */
  clear: boolean;
}

/**
 * §29 — builds one manager's attention view. Filtered through the same
 * access model as any other read, so the view can never show a manager
 * something they could not open.
 */
export function buildManagerAttention(
  profile: StaffAccessProfile,
  input: AttentionInput,
  now: Date,
): ManagerAttentionView {
  const all = collectAttentionItems(input, now);
  const visible: AttentionItem[] = [];
  let withheld = 0;

  for (const item of all) {
    const escalation = input.escalations.find(e => e.escalationId === item.sourceId);
    const sensitiveCategory = escalation ? ESCALATION_SENSITIVE_CATEGORY[escalation.reason] : undefined;

    const decision = evaluateAccess(
      profile,
      { action: "read", functionalScope: item.functionalScope, sensitiveCategory },
      now,
    );

    if (decision.allowed) visible.push(item);
    else withheld += 1;
  }

  return { items: visible, withheldCount: withheld, clear: visible.length === 0 };
}

// ── §22 next-action intelligence ────────────────────────────────────────
export interface NextAction {
  /** What should happen next. */
  action: string;
  /** The specialist it should route to, where one owns it. */
  routeToWorkerId: WorkerId | null;
  /** Set instead when a human input is what is actually blocking progress. */
  blockedOnHuman: string | null;
  caseId: string;
  dueAt: Date | null;
}

export interface NextActionInput {
  caseId: string;
  milestones: readonly Milestone[];
  blockers: readonly string[];
  openEscalations: readonly Escalation[];
}

/**
 * §22 — answers "what needs doing next?" from authorised live records.
 *
 * A blocker outranks a milestone. There is no point routing work to a
 * specialist when the thing actually stopping progress is a human
 * decision, and saying so is more useful than naming a task that cannot
 * start.
 */
export function determineNextAction(input: NextActionInput, now: Date): NextAction | null {
  const awaiting = input.openEscalations.filter(isAwaitingHuman);
  if (awaiting.length > 0) {
    const first = awaiting.sort((a, b) => a.raisedAt.getTime() - b.raisedAt.getTime())[0];
    return {
      action: `Waiting on a human decision: ${first.decisionRequired}`,
      routeToWorkerId: null,
      blockedOnHuman: first.decisionRequired,
      caseId: input.caseId,
      dueAt: null,
    };
  }

  if (input.blockers.length > 0) {
    return {
      action: `Blocked: ${input.blockers[0]}`,
      routeToWorkerId: null,
      blockedOnHuman: input.blockers[0],
      caseId: input.caseId,
      dueAt: null,
    };
  }

  const outstanding = input.milestones
    .filter(m => milestoneState(m, now) !== "complete")
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  if (outstanding.length === 0) return null;

  const next = outstanding[0];
  return {
    action: next.description,
    routeToWorkerId: next.specialistWorkerId,
    blockedOnHuman: null,
    caseId: input.caseId,
    dueAt: next.dueAt,
  };
}
