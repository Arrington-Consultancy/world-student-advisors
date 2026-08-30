/**
 * Collaboration, lead ownership and combined recommendation tests.
 * Clauses 7, 8, 9 and 17 of the WSA AI Operational Standard v1.0.
 */
import { describe, it, expect } from "vitest";
import { combineContributions, type WorkerContribution } from "./collaboration";
import { WORKER_FUNCTIONAL_SCOPE } from "../access/workerScope";
import type { WorkerId } from "../workforce/types";

function contribution(workerId: WorkerId, overrides: Partial<WorkerContribution> = {}): WorkerContribution {
  return {
    workerId,
    position: `${workerId} position.`,
    confidence: "likely",
    evidenceQuality: "verified",
    functionalScope: WORKER_FUNCTIONAL_SCOPE[workerId],
    ...overrides,
  };
}

describe("§8 one lead worker owns the combined output", () => {
  it("names the lead on a successful recommendation", () => {
    const r = combineContributions({ caseId: "c1", leadWorkerId: "james", contributions: [contribution("james")] });
    expect(r.outcome).toBe("recommendation");
    expect(r.leadWorkerId).toBe("james");
    expect(r.recommendation).toContain("James owns this combined recommendation.");
  });

  it("refuses an unknown lead worker", () => {
    const r = combineContributions({ caseId: null, leadWorkerId: "nobody" as WorkerId, contributions: [contribution("james")] });
    expect(r.outcome).toBe("invalid");
    expect(r.recommendation).toBeNull();
  });

  it("refuses a task with no contributions at all", () => {
    const r = combineContributions({ caseId: null, leadWorkerId: "james", contributions: [] });
    expect(r.outcome).toBe("invalid");
  });

  it("keeps contributors responsible only for their own contribution", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("james"), contribution("priya")],
    });
    expect(r.contributingWorkerIds).toEqual(["james", "priya"]);
    expect(r.leadWorkerId).toBe("james");
  });
});

describe("§6 a specialist may not absorb another lane", () => {
  it("rejects a contribution made outside the contributor's own scope", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("james"), contribution("priya", { functionalScope: "admissions" })],
    });
    expect(r.rejectedContributions).toHaveLength(1);
    expect(r.rejectedContributions[0].workerId).toBe("priya");
    expect(r.rejectedContributions[0].reason).toMatch(/may not absorb another lane/);
    expect(r.contributingWorkerIds).toEqual(["james"]);
  });

  it("reports the rejection rather than silently dropping it", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("james"), contribution("harper", { functionalScope: "admissions" })],
    });
    expect(r.rejectedContributions.map(x => x.workerId)).toContain("harper");
  });

  it("rejects a duplicate contribution from the same worker", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("james"), contribution("james", { position: "second bite" })],
    });
    expect(r.rejectedContributions[0].reason).toMatch(/Duplicate/);
    expect(r.contributingWorkerIds).toEqual(["james"]);
  });

  it("rejects an unknown worker", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("james"), { ...contribution("james"), workerId: "ghost" as WorkerId }],
    });
    expect(r.rejectedContributions.some(x => x.reason === "Unknown worker.")).toBe(true);
  });

  it("asks for a human check when every contribution was rejected", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("priya", { functionalScope: "admissions" })],
    });
    expect(r.outcome).toBe("human_check_required");
    expect(r.recommendation).toBeNull();
  });
});

describe("§9 collaborative output is one recommendation, not disconnected comments", () => {
  it("combines agreeing specialists into a single recommendation", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [
        contribution("james", { position: "The application is complete." }),
        contribution("priya", { position: "Visa evidence is in order." }),
      ],
    });
    expect(r.outcome).toBe("recommendation");
    expect(r.recommendation).toContain("The application is complete.");
    expect(r.recommendation).toContain("Visa evidence is in order.");
    expect(r.unresolvedDisagreements).toEqual([]);
  });
});

describe("§9 and §17 unresolved disagreement stays visible", () => {
  const disagreeing = {
    caseId: "c1",
    leadWorkerId: "james" as WorkerId,
    contributions: [
      contribution("james", { position: "submit now", disagreesWith: ["priya"] }),
      contribution("priya", { position: "wait for the visa evidence" }),
    ],
  };

  it("reports the disagreement rather than picking a side", () => {
    const r = combineContributions(disagreeing);
    expect(r.outcome).toBe("recommendation_with_unresolved_disagreement");
    expect(r.unresolvedDisagreements).toHaveLength(1);
    expect(r.unresolvedDisagreements[0].between).toEqual(["james", "priya"]);
  });

  it("puts both positions in the recommendation text", () => {
    const r = combineContributions(disagreeing);
    expect(r.recommendation).toContain("submit now");
    expect(r.recommendation).toContain("wait for the visa evidence");
    expect(r.recommendation).toMatch(/unresolved/i);
  });

  it("asks for a manager decision", () => {
    const r = combineContributions(disagreeing);
    expect(r.humanCheckReason).toMatch(/human manager should decide/i);
  });

  it("does not double-count a mutually declared disagreement", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [
        contribution("james", { disagreesWith: ["priya"] }),
        contribution("priya", { disagreesWith: ["james"] }),
      ],
    });
    expect(r.unresolvedDisagreements).toHaveLength(1);
  });

  it("ignores a declared disagreement with a worker that did not contribute", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("james", { disagreesWith: ["olivia"] })],
    });
    expect(r.unresolvedDisagreements).toEqual([]);
    expect(r.outcome).toBe("recommendation");
  });

  it("ignores a worker declaring disagreement with itself", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("james", { disagreesWith: ["james"] })],
    });
    expect(r.unresolvedDisagreements).toEqual([]);
  });
});

describe("§17 uncertainty is stated, never invented away", () => {
  it("surfaces a worker that cannot answer within its lane", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("james"), contribution("priya", { cannotAnswer: true })],
    });
    expect(r.uncertainties.join(" ")).toMatch(/Priya could not answer safely/);
    expect(r.outcome).toBe("recommendation");
  });

  it("requires a human check when nobody could answer", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("james", { cannotAnswer: true })],
    });
    expect(r.outcome).toBe("human_check_required");
    expect(r.humanCheckReason).toMatch(/No specialist was able to answer/);
  });

  it("requires a human check when every contributor has insufficient evidence", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [
        contribution("james", { evidenceQuality: "insufficient" }),
        contribution("priya", { evidenceQuality: "insufficient" }),
      ],
    });
    expect(r.outcome).toBe("human_check_required");
    expect(r.recommendation).toBeNull();
    expect(r.humanCheckReason).toMatch(/insufficient evidence/);
  });

  it("still recommends when only some evidence is weak, but says so", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [
        contribution("james", { evidenceQuality: "verified" }),
        contribution("priya", { evidenceQuality: "partial" }),
      ],
    });
    expect(r.outcome).toBe("recommendation");
    expect(r.uncertainties.join(" ")).toMatch(/partial evidence/);
    expect(r.recommendation).toMatch(/Worth knowing/);
  });

  it("records confidence separately from evidence quality", () => {
    const r = combineContributions({
      caseId: "c1",
      leadWorkerId: "james",
      contributions: [contribution("james", { confidence: "unproven", evidenceQuality: "verified" })],
    });
    expect(r.uncertainties.join(" ")).toMatch(/records its position as unproven/);
  });
});
