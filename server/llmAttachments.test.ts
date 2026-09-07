import { describe, it, expect } from "vitest";
import { toAnthropicMessage, type Message } from "./_core/llm";

/**
 * How an attachment reaches the model, and what must not change while it
 * does.
 *
 * The riskiest thing about this change is not the new path, it is the old
 * one. Every existing caller of invokeLLM sends plain text, and if adding
 * attachments altered the shape of those requests it would quietly change
 * the behaviour of the interview coach, the social brain and every worker
 * answer, with nothing failing loudly. So the first test here is that a
 * message without attachments still produces a bare string.
 */

const IMAGE: Message = {
  role: "user",
  content: "What does this say?",
  attachments: [{ mediaType: "image/png", data: "AAAA" }],
};

describe("messages without attachments", () => {
  it("still produce a plain string, so no existing caller changes", () => {
    const result = toAnthropicMessage({ role: "user", content: "Hello" });
    expect(result).toEqual({ role: "user", content: "Hello" });
    expect(typeof result.content).toBe("string");
  });

  it("does the same when attachments is an empty array", () => {
    const result = toAnthropicMessage({ role: "user", content: "Hello", attachments: [] });
    expect(typeof result.content).toBe("string");
  });
});

describe("an image attachment", () => {
  it("becomes a base64 image block", () => {
    const blocks = toAnthropicMessage(IMAGE).content as Array<Record<string, unknown>>;
    expect(blocks[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: "AAAA" },
    });
  });

  it("puts the staff member's words LAST, after the file", () => {
    const blocks = toAnthropicMessage(IMAGE).content as Array<Record<string, unknown>>;
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toEqual({ type: "text", text: "What does this say?" });
  });
});

describe("a PDF attachment", () => {
  it("becomes a document block, not an image block", () => {
    const blocks = toAnthropicMessage({
      role: "user",
      content: "Summarise this",
      attachments: [{ mediaType: "application/pdf", data: "JVBER" }],
    }).content as Array<Record<string, unknown>>;
    expect(blocks[0]).toEqual({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: "JVBER" },
    });
  });
});

describe("several attachments", () => {
  it("keeps them in order, with the text still last", () => {
    const blocks = toAnthropicMessage({
      role: "user",
      content: "Compare these",
      attachments: [
        { mediaType: "image/png", data: "ONE" },
        { mediaType: "application/pdf", data: "TWO" },
      ],
    }).content as Array<Record<string, unknown>>;
    expect(blocks).toHaveLength(3);
    expect((blocks[0].source as Record<string, unknown>).data).toBe("ONE");
    expect((blocks[1].source as Record<string, unknown>).data).toBe("TWO");
    expect(blocks[2].type).toBe("text");
  });
});

describe("attachments on the wrong role", () => {
  it("IGNORES them on an assistant turn, because a model's prior turn carried no file", () => {
    const result = toAnthropicMessage({
      role: "assistant",
      content: "Earlier answer",
      attachments: [{ mediaType: "image/png", data: "AAAA" }],
    });
    expect(result.content).toBe("Earlier answer");
    expect(typeof result.content).toBe("string");
  });
});
