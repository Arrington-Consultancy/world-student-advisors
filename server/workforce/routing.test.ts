import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { tokenise, matchesTerm, scoreTerms } from "./routing";
import { routeStaffRequest, routeStaffRequestAssisted } from "./router";
import { getWorker } from "./registry";

vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from "../_core/llm";

describe("term matching is on whole words", () => {
  it("does not let one word match inside another", () => {
    // The defect that sent "postgraduate application" to the social-media
    // specialist: "post" appeared inside "postgraduate".
    expect(matchesTerm(tokenise("postgraduate application deadline"), "post")).toBe(false);
    expect(matchesTerm(tokenise("what should we post today"), "post")).toBe(true);
  });

  it("treats simple plurals and endings as the same word", () => {
    expect(matchesTerm(tokenise("what courses are available"), "course")).toBe(true);
    expect(matchesTerm(tokenise("applying this week"), "apply")).toBe(true);
    expect(matchesTerm(tokenise("tuition fees"), "fees")).toBe(true);
  });

  it("requires a phrase to appear as consecutive words", () => {
    expect(matchesTerm(tokenise("paid media budget"), "paid media")).toBe(true);
    expect(matchesTerm(tokenise("media we paid for"), "paid media")).toBe(false);
  });

  it("scores a specific phrase above a vague single word", () => {
    const tokens = tokenise("google ads conversion tracking");
    expect(scoreTerms(tokens, ["google ads"])).toBeGreaterThan(scoreTerms(tokens, ["ads"]));
  });
});

describe("reception routes the questions staff actually ask", () => {
  const cases: [string, string][] = [
    // The exact request that reception failed to place in production.
    ["What English course are available", "amelia"],
    ["What English courses are available?", "amelia"],
    // Isolates the bare word "course": no other Amelia term appears, so
    // this fails if the single-word vocabulary is narrowed again.
    ["are there any courses at masters level", "amelia"],
    ["Can you check this student's UK visa evidence?", "priya"],
    ["postgraduate application deadline", "james"],
    ["what should we post on instagram this week", "nia"],
    ["how much are the tuition fees", "harper"],
    ["where is the document filed in sharepoint", "maya"],
    ["is this student suitable for engineering", "oliver"],
    ["Can you help gather background information on this new student's academic profile?", "daniel"],
    ["how is our google ads campaign doing", "alex"],
    ["can someone audit this case", "grace"],
  ];

  for (const [request, expected] of cases) {
    it(`routes "${request}" to ${expected}`, () => {
      const r = routeStaffRequest(request);
      expect(r.matched).toBe(true);
      expect(r.responsibleWorkerId).toBe(expected);
      expect(r.routedBy).toBe("keywords");
    });
  }

  it("still refuses to guess on something nobody owns", () => {
    const r = routeStaffRequest("the weather is nice today");
    expect(r.matched).toBe(false);
    expect(r.routedBy).toBe("none");
  });
});

describe("the assistant can classify but cannot answer or invent", () => {
  beforeEach(() => vi.mocked(invokeLLM).mockReset());

  const reply = (content: string) =>
    ({ choices: [{ index: 0, message: { role: "assistant" as const, content }, finish_reason: "end_turn" }] });

  it("is not consulted when keywords already matched", async () => {
    const r = await routeStaffRequestAssisted("Can you check this student's UK visa evidence?", 50);
    expect(r.responsibleWorkerId).toBe("priya");
    expect(r.routedBy).toBe("keywords");
    // A deterministic match must never be displaced by a model that could
    // answer differently tomorrow.
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("places a request keywords could not, and says it was the assistant", async () => {
    vi.mocked(invokeLLM).mockResolvedValue(reply("priya") as never);
    const r = await routeStaffRequestAssisted("does she need the biometric thing before flying", 50);
    expect(r.matched).toBe(true);
    expect(r.responsibleWorkerId).toBe("priya");
    expect(r.routedBy).toBe("assistant");
  });

  it("refuses an id that is not a real worker", async () => {
    vi.mocked(invokeLLM).mockResolvedValue(reply("gandalf") as never);
    const r = await routeStaffRequestAssisted("zzz qqq unplaceable phrase", 50);
    expect(r.matched).toBe(false);
  });

  it("refuses to route to the receptionist or the governance function", async () => {
    for (const id of ["staff_receptionist", "wsa_governance_assurance"]) {
      vi.mocked(invokeLLM).mockResolvedValue(reply(id) as never);
      const r = await routeStaffRequestAssisted("zzz qqq unplaceable phrase", 50);
      expect(r.matched).toBe(false);
    }
  });

  it("never lets model prose reach the staff member", async () => {
    // A model that ignores the instruction and writes a paragraph must
    // produce no match, not a rendered answer.
    vi.mocked(invokeLLM).mockResolvedValue(
      reply("English courses at partner universities typically start in September.") as never,
    );
    const r = await routeStaffRequestAssisted("zzz qqq unplaceable phrase", 50);
    expect(r.matched).toBe(false);
    expect(JSON.stringify(r)).not.toContain("September");
  });

  it("refuses a malformed answer rather than passing it on", async () => {
    // Covers the branch a failed call also lands in. The error path
    // itself is verified against the real module with no API key
    // configured, which returns the "unavailable" fallback and lets
    // nothing escape; a mock that rejects is not used here because
    // vitest reports its rejected promise as unhandled even when the
    // module catches it.
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [] } as never);
    const r = await routeStaffRequestAssisted("zzz qqq unplaceable phrase", 50);
    expect(r.matched).toBe(false);
    expect(r.routedBy).toBe("none");
  });

  it("sends no case or student data to the model, only the roster", async () => {
    vi.mocked(invokeLLM).mockResolvedValue(reply("none") as never);
    await routeStaffRequestAssisted("zzz qqq unplaceable phrase", 50);
    const call = vi.mocked(invokeLLM).mock.calls[0][0];
    const system = call.messages[0].content;
    expect(system).toContain("Owns:");
    expect(system).not.toMatch(/pipedrive|student record|case id|passport/i);
    expect(call.messages).toHaveLength(2);
  });

  it("still lets the register decide availability, not the model", async () => {
    vi.mocked(invokeLLM).mockResolvedValue(reply("priya") as never);
    const r = await routeStaffRequestAssisted("does she need the biometric thing before flying", 50);
    // The register decides, not the model. Priya is available for her
    // bounded scope since 31 August, and the assistant naming her cannot
    // change that either way.
    expect(r.availability).toBe(getWorker("priya").staffPortalExecutionAuthorised ? "available" : "not_available_for_live_case_work");
    expect(r.availability).toBe("available");
  });
});

describe("the assistant module holds no authority of its own", () => {
  it("exposes no way to execute a worker or answer a request", () => {
    const src = readFileSync("server/workforce/routerAssistant.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^[ \t]*\/\/.*$/gm, " ");
    expect(src).not.toMatch(/executeWorker|invokeWorker|answerRequest/);
  });
});
