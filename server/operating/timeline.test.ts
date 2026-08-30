/**
 * Timeline, live status and deadline risk tests.
 * Clauses 21, 24, 25, 26 and 27 of the WSA AI Operational Standard v1.0.
 */
import { describe, it, expect } from "vitest";
import {
  milestoneState, shouldEscalateSlippage, buildCaseStatus, buildTimeline, orderEvents,
  BECOMING_DUE_DAYS, TRIVIAL_LATENESS_DAYS, CRITICAL_OVERDUE_DAYS,
  type Milestone, type TimelineEvent,
} from "./timeline";

const NOW = new Date("2026-08-30T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);

function milestone(o: Partial<Milestone> = {}): Milestone {
  return {
    milestoneId: "M1", caseId: "c1", description: "Interview preparation complete",
    dueAt: at(10), completedAt: null, material: true,
    humanOwnerStaffUserId: 5, specialistWorkerId: "olivia", ...o,
  };
}

function event(o: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    eventId: "E1", caseId: "c1", kind: "stage_entered", at: NOW,
    actor: { type: "worker", workerId: "james" }, summary: "Entered admissions review.", ...o,
  };
}

describe("§25 deadline risk bands", () => {
  it("far future is upcoming", () => {
    expect(milestoneState(milestone({ dueAt: at(BECOMING_DUE_DAYS + 1) }), NOW)).toBe("upcoming");
  });

  it("inside the becoming-due window is becoming_due", () => {
    expect(milestoneState(milestone({ dueAt: at(BECOMING_DUE_DAYS) }), NOW)).toBe("becoming_due");
    expect(milestoneState(milestone({ dueAt: at(1) }), NOW)).toBe("becoming_due");
  });

  it("due exactly now is becoming_due, not overdue", () => {
    expect(milestoneState(milestone({ dueAt: NOW }), NOW)).toBe("becoming_due");
  });

  it("recently past due is overdue", () => {
    expect(milestoneState(milestone({ dueAt: at(-1) }), NOW)).toBe("overdue");
  });

  it("a material milestone long overdue is critical", () => {
    expect(milestoneState(milestone({ dueAt: at(-CRITICAL_OVERDUE_DAYS) }), NOW)).toBe("critical");
    expect(milestoneState(milestone({ dueAt: at(-30) }), NOW)).toBe("critical");
  });

  it("an immaterial milestone never becomes critical however late", () => {
    expect(milestoneState(milestone({ dueAt: at(-90), material: false }), NOW)).toBe("overdue");
  });

  it("a completed milestone is complete even if it was completed late", () => {
    expect(milestoneState(milestone({ dueAt: at(-40), completedAt: at(-1) }), NOW)).toBe("complete");
  });
});

describe("§24 trivial lateness must not create escalation", () => {
  it("does not escalate lateness within the trivial threshold", () => {
    expect(shouldEscalateSlippage(milestone({ dueAt: at(-TRIVIAL_LATENESS_DAYS) }), NOW)).toBe(false);
  });

  it("escalates once past the trivial threshold", () => {
    expect(shouldEscalateSlippage(milestone({ dueAt: at(-TRIVIAL_LATENESS_DAYS - 0.5) }), NOW)).toBe(true);
  });

  it("never escalates an immaterial milestone", () => {
    expect(shouldEscalateSlippage(milestone({ dueAt: at(-60), material: false }), NOW)).toBe(false);
  });

  it("never escalates a completed milestone", () => {
    expect(shouldEscalateSlippage(milestone({ dueAt: at(-60), completedAt: at(-1) }), NOW)).toBe(false);
  });

  it("does not escalate something not yet due", () => {
    expect(shouldEscalateSlippage(milestone({ dueAt: at(3) }), NOW)).toBe(false);
  });

  it("still escalates specialist slippage even though a human owns the journey", () => {
    const m = milestone({ dueAt: at(-10), humanOwnerStaffUserId: 5, specialistWorkerId: "olivia" });
    expect(shouldEscalateSlippage(m, NOW)).toBe(true);
  });
});

describe("§26 and §27 one timeline, history and forward plan", () => {
  it("orders history oldest first", () => {
    const t = buildTimeline(
      [event({ eventId: "B", at: at(-1) }), event({ eventId: "A", at: at(-5) })],
      [], NOW,
    );
    expect(t.history.map(e => e.eventId)).toEqual(["A", "B"]);
  });

  it("breaks a same-instant tie stably by event id", () => {
    const a = orderEvents([event({ eventId: "Z" }), event({ eventId: "A" })]);
    const b = orderEvents([event({ eventId: "A" }), event({ eventId: "Z" })]);
    expect(a.map(e => e.eventId)).toEqual(["A", "Z"]);
    expect(b.map(e => e.eventId)).toEqual(a.map(e => e.eventId));
  });

  it("puts outstanding milestones in the forward plan, soonest first", () => {
    const t = buildTimeline([], [
      milestone({ milestoneId: "later", dueAt: at(20) }),
      milestone({ milestoneId: "sooner", dueAt: at(2) }),
    ], NOW);
    expect(t.forward.map(f => f.milestone.milestoneId)).toEqual(["sooner", "later"]);
    expect(t.nextMilestone?.milestoneId).toBe("sooner");
  });

  it("keeps completed milestones out of the forward plan", () => {
    const t = buildTimeline([], [milestone({ completedAt: at(-1) })], NOW);
    expect(t.forward).toEqual([]);
    expect(t.nextMilestone).toBeNull();
  });

  it("serves both jobs from one structure", () => {
    const t = buildTimeline([event({ at: at(-3) })], [milestone({ dueAt: at(4) })], NOW);
    expect(t.history).toHaveLength(1);
    expect(t.forward).toHaveLength(1);
  });
});

describe("§21 status comes from recorded events, never from chat history", () => {
  const events = [
    event({ eventId: "E1", kind: "stage_entered", stage: "Enquiry", at: at(-20) }),
    event({ eventId: "E2", kind: "stage_completed", stage: "Enquiry", at: at(-15) }),
    event({ eventId: "E3", kind: "stage_entered", stage: "Admissions", at: at(-14), actor: { type: "worker", workerId: "james" } }),
  ];

  it("reports the current stage and completed stages", () => {
    const s = buildCaseStatus({ caseId: "c1", events, milestones: [], openEscalations: [], blockers: [] }, NOW);
    expect(s.currentStage).toBe("Admissions");
    expect(s.completedStages).toEqual(["Enquiry"]);
  });

  it("distinguishes the human journey owner from the specialist task owner", () => {
    const s = buildCaseStatus({
      caseId: "c1", events, milestones: [milestone({ humanOwnerStaffUserId: 5, specialistWorkerId: "olivia" })],
      openEscalations: [], blockers: [],
    }, NOW);
    expect(s.humanJourneyOwnerStaffUserId).toBe(5);
    expect(s.currentSpecialistWorkerId).toBe("james");
  });

  it("follows a handoff to the receiving specialist", () => {
    const s = buildCaseStatus({
      caseId: "c1",
      events: [...events, event({ eventId: "E4", kind: "handoff", at: at(-2), actor: { type: "worker", workerId: "priya" } })],
      milestones: [], openEscalations: [], blockers: [],
    }, NOW);
    expect(s.currentSpecialistWorkerId).toBe("priya");
  });

  it("lists outstanding milestones in due order and omits completed ones", () => {
    const s = buildCaseStatus({
      caseId: "c1", events: [],
      milestones: [
        milestone({ milestoneId: "done", completedAt: at(-1) }),
        milestone({ milestoneId: "late", dueAt: at(-9) }),
        milestone({ milestoneId: "soon", dueAt: at(3) }),
      ],
      openEscalations: [], blockers: [],
    }, NOW);
    expect(s.outstandingMilestones.map(x => x.milestone.milestoneId)).toEqual(["late", "soon"]);
    expect(s.outstandingMilestones[0].state).toBe("critical");
  });

  it("surfaces blockers and pending human decisions without reading prose", () => {
    const s = buildCaseStatus({
      caseId: "c1", events, milestones: [], blockers: ["Awaiting passport copy"],
      openEscalations: [{ escalationId: "ESC-1", decisionRequired: "Decide whether to submit early." }],
    }, NOW);
    expect(s.blockers).toEqual(["Awaiting passport copy"]);
    expect(s.pendingHumanDecisions).toEqual(["Decide whether to submit early."]);
  });

  it("reports the last recorded event time", () => {
    const s = buildCaseStatus({ caseId: "c1", events, milestones: [], openEscalations: [], blockers: [] }, NOW);
    expect(s.lastEventAt?.getTime()).toBe(at(-14).getTime());
  });

  it("handles a case with no events at all", () => {
    const s = buildCaseStatus({ caseId: "c1", events: [], milestones: [], openEscalations: [], blockers: [] }, NOW);
    expect(s.currentStage).toBeNull();
    expect(s.lastEventAt).toBeNull();
  });
});
