import { describe, expect, it, vi, beforeEach } from "vitest";

const invokeLLM = vi.fn();
vi.mock("../_core/llm", () => ({ invokeLLM: (...args: unknown[]) => invokeLLM(...args) }));
const checkAccessForStaffUser = vi.fn();
vi.mock("../access/enforcement", () => ({ checkAccessForStaffUser: (...args: unknown[]) => checkAccessForStaffUser(...args) }));
const gatherConnectorEvidence = vi.fn();
vi.mock("./evidence", async () => {
  const actual = await vi.importActual<typeof import("./evidence")>("./evidence");
  return { ...actual, gatherConnectorEvidence: (...args: unknown[]) => gatherConnectorEvidence(...args) };
});

import { executeWorker } from "./execute";

/**
 * The production exchange of 18 September 2026, replayed through the
 * execution layer with the model played by a double. Tom Arrington: a
 * short affirmative must be read against the worker's own immediately
 * preceding offer, and a worker must not say an output was produced unless
 * it appears in the conversation.
 */
const FIRST_QUESTION = "Where is Vivian Onuh in the admissions process?";
const OFFER =
  "If you want, I can pull together a clean picture of her admissions history, the offer conditions and what is outstanding, as a handover note.";
const WORKER_REPLY = `Vivian is at Offer Received. Her counsellor is Glenice, and the last update on her record was 10 September 2026. ${OFFER}`;
const HISTORY = [
  { role: "staff" as const, content: FIRST_QUESTION },
  { role: "worker" as const, content: WORKER_REPLY },
];
const RECORD = {
  blocks: [{ source: "pipedrive" as const, label: "CRM person 369, identified from the name \"Vivian Onuh\"", data: { name: "Vivian Onuh", stageLabel: "Offer Received", counsellor: "Glenice Owino", lastUpdated: "2026-09-10", fields: { offerConditions: "IELTS 6.5" } } }],
  notes: [],
  studentLists: [],
};
const HANDOVER =
  "Handover note for Vivian Onuh.\n- Stage: Offer Received, last updated 10 September 2026.\n- Counsellor: Glenice Owino.\n- Offer conditions: IELTS 6.5, still outstanding.\n- Next step: the university confirms the conditions once the IELTS result is in.\nTell me if you want this sent on to Glenice.";
const FALSE_CLAIM = "I have already produced the handover note above. Which part would you like me to expand on?";

const lastUserMessage = (call: unknown[]) => {
  const messages = (call[0] as { messages: { role: string; content: string }[] }).messages;
  return messages.filter(m => m.role === "user").pop()?.content ?? "";
};

beforeEach(() => {
  vi.clearAllMocks();
  checkAccessForStaffUser.mockResolvedValue({ allowed: true, reason: "ok" });
  gatherConnectorEvidence.mockResolvedValue(RECORD);
});

describe("the exchange of 18 September 2026", () => {
  it("\"yes\" is framed against the worker's own offer, with the student's record gathered again", async () => {
    invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: HANDOVER }, finish_reason: "stop" }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "yes", authMethod: "entra_sso", history: HISTORY });
    expect(r.outcome).toBe("answered");
    expect(r.visibleText).toContain("Handover note for Vivian Onuh");
    // The evidence layer was told what the staff member said before, newest first.
    expect(gatherConnectorEvidence.mock.calls[0][0]).toMatchObject({ requestText: "yes", priorRequests: [FIRST_QUESTION] });
    // The model saw the reply, the offer it answers, and the reading.
    const user = lastUserMessage(invokeLLM.mock.calls[0]);
    expect(user).toContain("STAFF REQUEST:\nyes");
    expect(user).toContain(OFFER);
    expect(user).toContain("ACCEPTS");
    expect(user).toContain("Nothing you offered has been produced yet");
    // The prior turns went in as real messages.
    const messages = (invokeLLM.mock.calls[0][0] as { messages: { role: string; content: string }[] }).messages;
    expect(messages.map(m => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(messages[2].content).toBe(WORKER_REPLY);
    // The record travelled with the follow-up.
    expect(user).toContain("Offer Received");
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });

  it("a false claim that the note already exists is put back once, and the rewrite is what the staff member sees", async () => {
    invokeLLM
      .mockResolvedValueOnce({ choices: [{ message: { content: FALSE_CLAIM }, finish_reason: "stop" }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: HANDOVER }, finish_reason: "stop" }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "yes", authMethod: "entra_sso", history: HISTORY });
    expect(r.outcome).toBe("answered");
    expect(r.visibleText).toBe(HANDOVER);
    expect(r.reason).toContain("rewritten once because it said work already existed");
    expect(invokeLLM).toHaveBeenCalledTimes(2);
    const correction = lastUserMessage(invokeLLM.mock.calls[1]);
    expect(correction).toContain("Nothing earlier in this conversation contains that work");
    expect(correction).toContain("do the offered work now, in full");
  });

  it("a false claim that survives the rewrite is withheld, with the reason named", async () => {
    invokeLLM
      .mockResolvedValueOnce({ choices: [{ message: { content: FALSE_CLAIM }, finish_reason: "stop" }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: "As I mentioned earlier, the note has been prepared. Let me know which section you want." }, finish_reason: "stop" }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "yes", authMethod: "entra_sso", history: HISTORY });
    expect(r.outcome).toBe("blocked_quality");
    expect(r.visibleText).toBeNull();
    expect(r.qualityCheck?.blocking.map(f => f.code)).toContain("false_completion_claim");
    expect(r.reason).toContain("already produced or sent");
  });

  it.each(["yes please", "do that", "go ahead"])("%j is read as accepting the same offer", async text => {
    invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: HANDOVER }, finish_reason: "stop" }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: text, authMethod: "entra_sso", history: HISTORY });
    expect(r.outcome).toBe("answered");
    const user = lastUserMessage(invokeLLM.mock.calls[0]);
    expect(user).toContain(`STAFF REQUEST:\n${text}`);
    expect(user).toContain(OFFER);
    expect(user).toContain("ACCEPTS");
  });

  it("\"no thanks\" is read as declining: the model is told not to produce the work", async () => {
    invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: "Understood, I will leave the handover note. Is there anything else you need on Vivian's case?" }, finish_reason: "stop" }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "no thanks", authMethod: "entra_sso", history: HISTORY });
    expect(r.outcome).toBe("answered");
    const user = lastUserMessage(invokeLLM.mock.calls[0]);
    expect(user).toContain("DECLINES");
    expect(user).toContain("do not produce the offered work");
  });

  it("a new question in the same conversation is not framed as a follow-up and evidence follows the new name", async () => {
    invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: "Grace is at Application Preparation. Her counsellor is Manet. The next step is her document checklist." }, finish_reason: "stop" }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "What about Grace Okoro?", authMethod: "entra_sso", history: HISTORY });
    expect(r.outcome).toBe("answered");
    const user = lastUserMessage(invokeLLM.mock.calls[0]);
    expect(user).not.toContain("FOLLOW-UP CONTEXT");
    expect(gatherConnectorEvidence.mock.calls[0][0]).toMatchObject({ requestText: "What about Grace Okoro?" });
  });

  it("a first message with no history is never a follow-up, and a prior-completion claim in it is withheld", async () => {
    invokeLLM
      .mockResolvedValueOnce({ choices: [{ message: { content: "As I mentioned earlier, the checklist has been sent." }, finish_reason: "stop" }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: "As I set out before, it has already been provided." }, finish_reason: "stop" }] });
    const r = await executeWorker({ staffUserId: 1, workerId: "james", requestText: "Is Vivian Onuh's application ready to send?", authMethod: "entra_sso" });
    expect(r.outcome).toBe("blocked_quality");
    expect(r.qualityCheck?.blocking.map(f => f.code)).toContain("false_completion_claim");
  });
});
