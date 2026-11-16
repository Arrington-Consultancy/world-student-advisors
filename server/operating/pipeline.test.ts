/**
 * One-system pipeline tests.
 * Clauses 33, 13 and 14 of the WSA AI Operational Standard v1.0.
 */
import { describe, it, expect } from "vitest";
import { runPipeline, decideActions, type PipelineRequest, type ProposedAction } from "./pipeline";
import { WORKER_FUNCTIONAL_SCOPE } from "../access/workerScope";
import type { StaffAccessProfile } from "../access/accessControl";
import type { WorkerContribution } from "./collaboration";
import type { WorkerId } from "../workforce/types";

const NOW = new Date("2026-08-30T12:00:00.000Z");

function profile(o: Partial<StaffAccessProfile> = {}): StaffAccessProfile {
  return {
    staffUserId: 4004, baseAccessLevel: 4,
    functionalScopes: ["admissions", "visa_compliance"],
    caseScope: "assigned_caseload",
    actionPermissions: ["read", "update", "comment_handoff"],
    sensitiveOverlays: [], temporaryGrants: [], status: "active", teamId: "admissions",
    assignedByStaffUserId: null, assignedAt: null, assignmentReason: null, ...o,
  };
}

function contribution(workerId: WorkerId, o: Partial<WorkerContribution> = {}): WorkerContribution {
  return {
    workerId, position: `${workerId} view.`, confidence: "likely",
    evidenceQuality: "verified", functionalScope: WORKER_FUNCTIONAL_SCOPE[workerId], ...o,
  };
}

function request(o: Partial<PipelineRequest> = {}): PipelineRequest {
  return {
    profile: profile(),
    routedToWorkerId: "james",
    functionalScope: "admissions",
    case: { assignedStaffUserIds: [4004], teamId: "admissions" },
    collaboration: {
      caseId: "c1", leadWorkerId: "james",
      contributions: [contribution("james", { position: "The application is complete." })],
    },
    ...o,
  };
}

function action(o: Partial<ProposedAction> = {}): ProposedAction {
  return {
    actionId: "A1", action: "update", functionalScope: "admissions",
    description: "Update the case status.", preparedPayload: "status=ready", ...o,
  };
}

describe("§33 the flow runs in order and refuses to skip a stage", () => {
  it("completes the whole flow for an authorised, clean request", () => {
    const r = runPipeline(request(), NOW);
    expect(r.outcome).toBe("answered");
    expect(r.reachedStage).toBe("complete");
    expect(r.visibleText).toContain("The application is complete.");
  });

  it("stops at access before any specialist work is assembled", () => {
    const r = runPipeline(request({ profile: profile({ functionalScopes: ["finance"] }) }), NOW);
    expect(r.reachedStage).toBe("access");
    expect(r.outcome).toBe("refused");
    expect(r.collaboration).toBeNull();
  });

  it("stops at access when the case is outside the staff member's caseload", () => {
    const r = runPipeline(request({ case: { assignedStaffUserIds: [9999], teamId: "admissions" } }), NOW);
    expect(r.reachedStage).toBe("access");
    expect(r.collaboration).toBeNull();
  });

  it("stops at collaboration when the contribution set is invalid", () => {
    const r = runPipeline(request({ collaboration: { caseId: "c1", leadWorkerId: "james", contributions: [] } }), NOW);
    expect(r.reachedStage).toBe("collaboration");
    expect(r.outcome).toBe("refused");
    expect(r.qualityCheck).toBeNull();
  });

  it("escalates rather than answering when no specialist could answer", () => {
    const r = runPipeline(request({
      collaboration: { caseId: "c1", leadWorkerId: "james", contributions: [contribution("james", { cannotAnswer: true })] },
    }), NOW);
    expect(r.outcome).toBe("escalated");
    expect(r.reachedStage).toBe("collaboration");
    expect(r.visibleText).toBeNull();
  });

  it("never lets text that failed the quality check reach a staff member", () => {
    const r = runPipeline(request({
      collaboration: {
        caseId: "c1", leadWorkerId: "james",
        contributions: [contribution("james", { position: "We guarantee your visa will be approved." })],
      },
    }), NOW);
    expect(r.outcome).toBe("escalated");
    expect(r.reachedStage).toBe("quality_check");
    expect(r.visibleText).toBeNull();
    expect(r.escalationRequired).toMatch(/guarantee/i);
  });

  it("reports honestly how far the flow got", () => {
    const stages = [
      runPipeline(request({ profile: profile({ status: "disabled" }) }), NOW).reachedStage,
      runPipeline(request({ collaboration: { caseId: null, leadWorkerId: "james", contributions: [] } }), NOW).reachedStage,
      runPipeline(request(), NOW).reachedStage,
    ];
    expect(stages).toEqual(["access", "collaboration", "complete"]);
  });
});

describe("§10 within the pipeline: check first, then humanise", () => {
  it("applies a humanisation pass that preserved substance", () => {
    const r = runPipeline(request({
      collaboration: {
        caseId: "c1", leadWorkerId: "james",
        contributions: [contribution("james", { position: "The application is complete." })],
      },
      humanisedText: "The application's complete. James owns this combined recommendation.",
    }), NOW);
    expect(r.humanisation?.accepted).toBe(true);
    expect(r.visibleText).toBe("The application's complete. James owns this combined recommendation.");
  });

  it("falls back to the checked text when humanisation changed substance", () => {
    const r = runPipeline(request({
      collaboration: {
        caseId: "c1", leadWorkerId: "james",
        contributions: [contribution("james", { position: "You need 3 references." })],
      },
      humanisedText: "You need 5 references. James owns this combined recommendation.",
    }), NOW);
    expect(r.humanisation?.accepted).toBe(false);
    expect(r.visibleText).toContain("3 references");
    expect(r.outcome).toBe("answered");
  });

  it("does not run humanisation at all when the quality check blocked", () => {
    const r = runPipeline(request({
      collaboration: {
        caseId: "c1", leadWorkerId: "james",
        contributions: [contribution("james", { position: "We guarantee approval." })],
      },
      humanisedText: "anything at all",
    }), NOW);
    expect(r.humanisation).toBeNull();
  });
});

describe("§9 an unresolved disagreement survives the whole pipeline", () => {
  const disagreeing = request({
    collaboration: {
      caseId: "c1", leadWorkerId: "james",
      contributions: [
        contribution("james", { position: "submit now", disagreesWith: ["priya"] }),
        contribution("priya", { position: "wait for the visa evidence" }),
      ],
    },
  });

  it("still answers, and keeps both positions visible", () => {
    const r = runPipeline(disagreeing, NOW);
    expect(r.outcome).toBe("answered");
    expect(r.visibleText).toContain("submit now");
    expect(r.visibleText).toContain("wait for the visa evidence");
  });

  it("carries the need for a manager decision out of the pipeline", () => {
    const r = runPipeline(disagreeing, NOW);
    expect(r.escalationRequired).toMatch(/manager should decide/i);
  });
});

describe("§13 and §14 routine actions are taken, consequential ones are prepared", () => {
  it("executes a routine action within authority", () => {
    const r = runPipeline(request({ proposedActions: [action({ action: "update" })] }), NOW);
    expect(r.actionDecisions[0].disposition).toBe("executed");
    expect(r.outcome).toBe("answered");
  });

  it("prepares a consequential action rather than taking it", () => {
    const r = runPipeline(request({
      profile: profile({ actionPermissions: ["read", "export_download"] }),
      proposedActions: [action({ action: "export_download", preparedPayload: "csv ready" })],
    }), NOW);
    expect(r.actionDecisions[0].disposition).toBe("prepared_for_approval");
    expect(r.actionDecisions[0].preparedPayload).toBe("csv ready");
    expect(r.outcome).toBe("answered_pending_approval");
  });

  const consequential = ["export_download", "external_send", "submit", "delete_destructive", "financial_action", "access_admin", "credential_admin"] as const;
  for (const a of consequential) {
    it(`never executes ${a} even with the permission held`, () => {
      const decisions = decideActions(
        profile({ baseAccessLevel: 1, functionalScopes: ["admissions"], actionPermissions: ["read", a] }),
        [action({ action: a })],
        NOW,
      );
      expect(decisions[0].disposition).toBe("prepared_for_approval");
    });
  }

  it("refuses an action the staff member does not hold at all", () => {
    const r = runPipeline(request({ proposedActions: [action({ action: "approve" })] }), NOW);
    expect(r.actionDecisions[0].disposition).toBe("refused");
    expect(r.actionDecisions[0].preparedPayload).toBeNull();
  });

  it("refuses rather than preparing, so nobody is asked to approve an unheld action", () => {
    const decisions = decideActions(profile({ actionPermissions: ["read"] }), [action({ action: "submit" })], NOW);
    expect(decisions[0].disposition).toBe("refused");
    expect(decisions[0].preparedPayload).toBeNull();
  });

  it("prepares the payload in full so the human does not redo the work", () => {
    const decisions = decideActions(
      profile({ actionPermissions: ["read", "submit"] }),
      [action({ action: "submit", preparedPayload: "Full UCAS payload, 42 fields, ready to send." })],
      NOW,
    );
    expect(decisions[0].preparedPayload).toBe("Full UCAS payload, 42 fields, ready to send.");
  });

  it("handles a mix of routine, consequential and refused in one request", () => {
    const decisions = decideActions(
      profile({ actionPermissions: ["read", "update", "export_download"] }),
      [
        action({ actionId: "routine", action: "update" }),
        action({ actionId: "consequential", action: "export_download" }),
        action({ actionId: "unheld", action: "delete_destructive" }),
      ],
      NOW,
    );
    expect(decisions.map(d => d.disposition)).toEqual(["executed", "prepared_for_approval", "refused"]);
  });

  it("takes no action at all when the pipeline refused at the access stage", () => {
    const r = runPipeline(request({
      profile: profile({ functionalScopes: ["finance"] }),
      proposedActions: [action({ action: "update" })],
    }), NOW);
    expect(r.actionDecisions).toEqual([]);
  });

  it("takes no action when the quality check blocked the output", () => {
    const r = runPipeline(request({
      collaboration: {
        caseId: "c1", leadWorkerId: "james",
        contributions: [contribution("james", { position: "We guarantee approval." })],
      },
      proposedActions: [action({ action: "update" })],
    }), NOW);
    expect(r.actionDecisions).toEqual([]);
  });
});

describe("a disabled account gets nothing from any stage", () => {
  it("is refused at access and produces no output or action", () => {
    const r = runPipeline(request({
      profile: profile({ status: "disabled" }),
      proposedActions: [action()],
    }), NOW);
    expect(r.outcome).toBe("refused");
    expect(r.visibleText).toBeNull();
    expect(r.actionDecisions).toEqual([]);
    expect(r.collaboration).toBeNull();
  });
});
