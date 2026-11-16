import { describe, expect, it, vi, beforeEach } from "vitest";

const invokeLLM = vi.fn();
vi.mock("../_core/llm", () => ({ invokeLLM: (...args: unknown[]) => invokeLLM(...args) }));
const checkAccessForStaffUser = vi.fn();
vi.mock("../access/enforcement", () => ({ checkAccessForStaffUser: (...args: unknown[]) => checkAccessForStaffUser(...args) }));

import { executeWorker } from "./execute";

const DASH = "\u2014";

/**
 * Tom Arrington, 16 September 2026: a real production answer from James
 * was discarded because it contained an em dash. A punctuation violation
 * must not destroy a valid answer; a genuine failure must still block.
 */
beforeEach(() => {
  vi.clearAllMocks();
  checkAccessForStaffUser.mockResolvedValue({ allowed: true, reason: "ok" });
});

describe("release check: mechanical style is corrected, genuine failures still block", () => {
  it("an answer with em dashes is shown with ordinary punctuation, and the reason says so", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content:
      `The application ${DASH} MSc Management at BPP University ${DASH} was submitted on 27 July 2026 and is at Application Submitted. The next step is the university's decision ${DASH} nothing is outstanding from the student.` } }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "Is this application ready to send?", authMethod: "entra_sso" });
    expect(r.outcome).toBe("answered");
    expect(r.visibleText).not.toContain(DASH);
    expect(r.visibleText).toContain("MSc Management at BPP University");
    expect(r.visibleText).toContain("27 July 2026");
    expect(r.reason).toContain("3 em dashes");
    expect(r.qualityCheck?.passed).toBe(true);
  });
  it("an answer without a dash is shown exactly as the model wrote it", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: "A plain answer with the next action named." } }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "Is this application ready to send?", authMethod: "entra_sso" });
    expect(r.outcome).toBe("answered");
    expect(r.visibleText).toBe("A plain answer with the next action named.");
    expect(r.reason).not.toContain("replaced");
  });
  it("guarantee language still blocks, dash or no dash", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: `We guarantee the visa will be approved ${DASH} every time.` } }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "Is this application ready to send?", authMethod: "entra_sso" });
    expect(r.outcome).toBe("blocked_quality");
    expect(r.visibleText).toBeNull();
    expect(r.reason).toContain("did not pass the release check");
    expect(r.qualityCheck?.blocking.map(f => f.code)).toContain("guarantee_language");
  });
  it("Markdown emphasis and headings are removed, because the panel renders text", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content:
      "## Where Vivian is\n\nVivian is at **CAS / Visa / Pre-Departure**, last updated 10 September 2026.\n\n**Her counsellor** is Glenice.\n\n**What should happen next**\n* The CAS request goes to the university.\n* The visa application follows." }, finish_reason: "stop" }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "Where is Vivian in the process?", authMethod: "entra_sso" });
    expect(r.outcome).toBe("answered");
    expect(r.visibleText).not.toMatch(/\*\*|^#/m);
    expect(r.visibleText).toContain("Where Vivian is\n\nVivian is at CAS / Visa / Pre-Departure, last updated 10 September 2026.");
    expect(r.visibleText).toContain("- The CAS request goes to the university.");
    expect(r.reason).toContain("Markdown marker");
  });
  it("a reply cut off at the length limit is withheld as incomplete, not shown as whole", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: "Vivian is at CAS / Visa / Pre-Departure. Her counsellor" }, finish_reason: "length" }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "Where is Vivian in the process?", authMethod: "entra_sso" });
    expect(r.outcome).toBe("blocked_incomplete");
    expect(r.visibleText).toBeNull();
    expect(r.reason).toContain("cut off");
  });
  it("a reply the adapter reports as finished is shown whole, however many blocks it came in", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: "Vivian is at CAS / Visa / Pre-Departure. Her counsellor is Glenice. The next step is the CAS request." }, finish_reason: "stop" }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "Where is Vivian in the process?", authMethod: "entra_sso" });
    expect(r.outcome).toBe("answered");
    expect(r.visibleText).toBe("Vivian is at CAS / Visa / Pre-Departure. Her counsellor is Glenice. The next step is the CAS request.");
  });
});
