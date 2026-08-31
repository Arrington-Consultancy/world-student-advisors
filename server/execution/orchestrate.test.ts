import { describe, expect, it, vi, beforeEach } from "vitest";

const invokeLLM = vi.fn();
vi.mock("../_core/llm", () => ({ invokeLLM: (...args: unknown[]) => invokeLLM(...args) }));

const checkAccessForStaffUser = vi.fn();
vi.mock("../access/enforcement", () => ({
  checkAccessForStaffUser: (...args: unknown[]) => checkAccessForStaffUser(...args),
}));

import { orchestrateCaseRequest, selectLead } from "./orchestrate";
import type { CaseData } from "../workforce/context";
import type { CaseStage } from "../workforce/caseModel";
import type { WorkerId } from "../workforce/types";

const CASE: CaseData = {
  caseId: "case-1",
  studentId: "student-1",
  source: "wsa",
  fields: { name: "A student", stage: "enquiry" },
};

function answer(text: string) {
  return { choices: [{ message: { content: text } }] };
}

beforeEach(() => {
  vi.clearAllMocks();
  checkAccessForStaffUser.mockResolvedValue({ allowed: true, reason: "ok" });
  invokeLLM.mockResolvedValue(answer("Next step: collect the missing transcript. Owner: the case adviser."));
});

describe("choosing one lead", () => {
  it("prefers the case's own recorded owner where that worker can execute", () => {
    const stage: CaseStage = {
      caseId: "case-1",
      currentStage: "Enquiry triage",
      owningWorkerId: "sophie",
      prerequisites: [],
      status: "on_track",
      nextControlledAction: "Route to discovery",
    };
    expect(selectLead(["daniel", "amelia"], stage)).toBe("sophie");
  });

  it("falls back to the first candidate that can execute", () => {
    expect(selectLead(["daniel", "sophie", "amelia"])).toBe("daniel");
  });

  it("returns no lead where nothing can execute, rather than picking one anyway", () => {
    // The governance and routing functions never execute, so a request
    // that only reaches them has no lead and must say so.
    expect(selectLead(["wsa_core_brain", "wsa_governance_assurance", "staff_receptionist"])).toBeNull();
  });

  it("does not make an unexecutable case owner the lead", () => {
    const stage: CaseStage = {
      caseId: "case-1",
      currentStage: "Discovery",
      owningWorkerId: "wsa_governance_assurance",
      prerequisites: [],
      status: "on_track",
      nextControlledAction: "Complete discovery",
    };
    expect(selectLead(["sophie"], stage)).toBe("sophie");
  });
});

describe("orchestrating a real request", () => {
  it("produces one answer owned by the lead", async () => {
    const result = await orchestrateCaseRequest({
      staffUserId: 1,
      requestText: "What needs doing next for this student?",
      caseId: "case-1",
      studentId: "student-1",
      availableCases: [CASE],
      candidateWorkerIds: ["sophie"],
    });

    expect(result.outcome).toBe("answered");
    expect(result.leadWorkerId).toBe("sophie");
    expect(result.visibleText).toContain("Next step");
  });

  it("refuses when no case record exists, rather than asking anyone to guess", async () => {
    const result = await orchestrateCaseRequest({
      staffUserId: 1,
      requestText: "What needs doing next?",
      caseId: "case-missing",
      studentId: "student-1",
      availableCases: [CASE],
      candidateWorkerIds: ["sophie"],
    });

    expect(result.outcome).toBe("no_case_record");
    expect(result.visibleText).toBeNull();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("will not touch another business's record even with a matching case id", async () => {
    const result = await orchestrateCaseRequest({
      staffUserId: 1,
      requestText: "What needs doing next?",
      caseId: "case-1",
      studentId: "student-1",
      availableCases: [{ ...CASE, source: "arrington_consultancy" }],
      candidateWorkerIds: ["sophie"],
    });
    expect(result.outcome).toBe("no_case_record");
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("reports every unavailable specialist as a named gap and runs none of them", async () => {
    const result = await orchestrateCaseRequest({
      staffUserId: 1,
      requestText: "What needs doing next for this student?",
      caseId: "case-1",
      studentId: "student-1",
      availableCases: [CASE],
      candidateWorkerIds: ["sophie", "wsa_core_brain", "wsa_governance_assurance", "staff_receptionist"],
    });

    expect(result.outcome).toBe("answered");
    const gapIds = result.gaps.map(g => g.workerId).sort();
    expect(gapIds).toEqual(["staff_receptionist", "wsa_core_brain", "wsa_governance_assurance"]);
    for (const gap of result.gaps) {
      expect(gap.reason.length).toBeGreaterThan(10);
      expect(gap.workerName.length).toBeGreaterThan(2);
    }
    // Only the lead ran. Three unapproved specialists were not invoked.
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });

  it("tells the lead which views are missing, so the gap cannot vanish from the answer", async () => {
    await orchestrateCaseRequest({
      staffUserId: 1,
      requestText: "What needs doing next for this student?",
      caseId: "case-1",
      studentId: "student-1",
      availableCases: [CASE],
      candidateWorkerIds: ["sophie", "wsa_governance_assurance"],
    });

    const userMessage = invokeLLM.mock.calls[0][0].messages[1].content as string;
    expect(userMessage).toContain("SPECIALISTS WHO COULD NOT CONTRIBUTE");
    expect(userMessage).toContain("Governance");
    expect(userMessage).toContain("do not cover the gap with your own opinion");
  });

  it("passes the recorded case position to the lead", async () => {
    await orchestrateCaseRequest({
      staffUserId: 1,
      requestText: "What needs doing next?",
      caseId: "case-1",
      studentId: "student-1",
      availableCases: [CASE],
      caseStage: {
        caseId: "case-1",
        currentStage: "Enquiry triage",
        owningWorkerId: "sophie",
        prerequisites: [{ description: "Transcript received", satisfied: false }],
        status: "blocked",
        nextControlledAction: "Chase the transcript",
      },
      candidateWorkerIds: ["sophie"],
    });

    const userMessage = invokeLLM.mock.calls[0][0].messages[1].content as string;
    expect(userMessage).toContain("Enquiry triage");
    expect(userMessage).toContain("Chase the transcript");
    expect(userMessage).toContain("Transcript received");
  });

  it("reports no authorised lead rather than answering without one", async () => {
    const result = await orchestrateCaseRequest({
      staffUserId: 1,
      requestText: "Check this student's visa position",
      caseId: "case-1",
      studentId: "student-1",
      availableCases: [CASE],
      candidateWorkerIds: ["wsa_core_brain", "wsa_governance_assurance"],
    });

    expect(result.outcome).toBe("no_authorised_lead");
    expect(result.visibleText).toBeNull();
    expect(result.gaps.map(g => g.workerId).sort()).toEqual(["wsa_core_brain", "wsa_governance_assurance"]);
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("enforces the staff member's own access before any worker runs", async () => {
    checkAccessForStaffUser.mockResolvedValue({ allowed: false, reason: "No access assignment." });
    const result = await orchestrateCaseRequest({
      staffUserId: 99,
      requestText: "What needs doing next?",
      caseId: "case-1",
      studentId: "student-1",
      availableCases: [CASE],
      candidateWorkerIds: ["sophie"],
    });

    expect(result.outcome).toBe("lead_failed");
    expect(result.reason).toContain("No access assignment");
    expect(invokeLLM).not.toHaveBeenCalled();
  });
});

/**
 * The property that stops a coordinated answer becoming a shared brain.
 */
describe("contributors stay isolated", () => {
  it("a contributor is never given another specialist's contribution", async () => {
    // Two executable workers would be needed to observe this directly.
    // With one approved worker, the assertion that holds is that the
    // orchestrator never passes contributions into a contributor call:
    // only the lead call carries them.
    await orchestrateCaseRequest({
      staffUserId: 1,
      requestText: "What needs doing next?",
      caseId: "case-1",
      studentId: "student-1",
      availableCases: [CASE],
      candidateWorkerIds: ["sophie", "wsa_core_brain"],
    });

    for (const call of invokeLLM.mock.calls) {
      const system = call[0].messages[0].content as string;
      // Each system prompt is built from exactly one brief. Sophie's
      // remit must never appear alongside another worker's.
      const remits = [
        "Student Enquiry and Triage",
        "Student Discovery",
        "Education Research",
      ].filter(r => system.includes(r));
      expect(remits.length).toBeLessThanOrEqual(1);
    }
  });

  it("no worker inherits authority by being asked as part of a group", async () => {
    const result = await orchestrateCaseRequest({
      staffUserId: 1,
      requestText: "What needs doing next?",
      caseId: "case-1",
      studentId: "student-1",
      availableCases: [CASE],
      candidateWorkerIds: ["sophie", "wsa_core_brain", "wsa_governance_assurance"],
    });

    // Being named alongside an authorised lead does not authorise anyone.
    const ran = result.contributingWorkerIds;
    for (const id of ["wsa_core_brain", "wsa_governance_assurance"] as WorkerId[]) {
      expect(ran).not.toContain(id);
    }
  });
});
