import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: (...args: unknown[]) => create(...args) };
  },
}));
vi.mock("./env", () => ({ ENV: { anthropicApiKey: "test-key" } }));

import { invokeLLM, mapStopReason } from "./llm";

/**
 * 16 September 2026: a staff member received an answer that stopped at
 * "Her counsellor". The adapter returned only the first text block of a
 * response that had two. Every text block is the answer, in order, and
 * the stop reason is reported so a caller can tell a finished answer from
 * one cut off at the length limit.
 */
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("invokeLLM", () => {
  it("joins every text block in order", async () => {
    create.mockResolvedValue({
      content: [
        { type: "text", text: "Vivian is at CAS / Visa / Pre-Departure. Her counsellor" },
        { type: "text", text: " is Glenice. The next step is the CAS request." },
      ],
      stop_reason: "end_turn",
    });
    const r = await invokeLLM({ messages: [{ role: "user", content: "Where is Vivian?" }] });
    expect(r.choices[0].message.content).toBe("Vivian is at CAS / Visa / Pre-Departure. Her counsellor is Glenice. The next step is the CAS request.");
    expect(r.choices[0].finish_reason).toBe("stop");
  });
  it("reports a reply cut off at the length limit as length, with all of its text", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: "Her counsellor" }], stop_reason: "max_tokens" });
    const r = await invokeLLM({ messages: [{ role: "user", content: "Where is Vivian?" }] });
    expect(r.choices[0].message.content).toBe("Her counsellor");
    expect(r.choices[0].finish_reason).toBe("length");
  });
  it("a single finished block is reported as stop and returned whole", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: "A plain answer." }], stop_reason: "end_turn" });
    const r = await invokeLLM({ messages: [{ role: "user", content: "Hello" }] });
    expect(r.choices[0].message.content).toBe("A plain answer.");
    expect(r.choices[0].finish_reason).toBe("stop");
    expect(console.warn).not.toHaveBeenCalled();
  });
  it("ignores non-text blocks and still returns the text", async () => {
    create.mockResolvedValue({ content: [{ type: "thinking", thinking: "..." }, { type: "text", text: "Done." }], stop_reason: "end_turn" });
    const r = await invokeLLM({ messages: [{ role: "user", content: "Hello" }] });
    expect(r.choices[0].message.content).toBe("Done.");
  });
});

describe("mapStopReason", () => {
  it("maps the Anthropic vocabulary to the one the callers read", () => {
    expect(mapStopReason("end_turn")).toBe("stop");
    expect(mapStopReason("stop_sequence")).toBe("stop");
    expect(mapStopReason("max_tokens")).toBe("length");
    expect(mapStopReason(null)).toBeNull();
    expect(mapStopReason("refusal")).toBe("refusal");
  });
});
