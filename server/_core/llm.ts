import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

// ------------------------------------------------------------
// Rewritten 29/07/2026 to call Anthropic directly instead of Manus's Forge
// API (a markup/aggregator proxy at forge.manus.im). Keeps the exact
// external shape the two callers in server/interviewCoach.ts already use
// (messages in, response.choices[0].message.content out) so nothing else
// needed to change. Anthropic has no native OpenAI-style json_schema
// response_format, so a json_schema request is implemented as a single
// forced tool call — same pattern used for Arrington Consultancy's Market
// Ready Test AI report generator.
// ------------------------------------------------------------

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  maxTokens?: number;
  max_tokens?: number;
  model?: string;
};

export type InvokeResult = {
  choices: Array<{
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: string | null;
  }>;
};

const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_MAX_TOKENS = 4096;

const assertApiKey = () => {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
};

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  }
  return _client;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const { messages, model, maxTokens, max_tokens } = params;
  const responseFormat = params.responseFormat ?? params.response_format;

  const systemMessages = messages.filter(m => m.role === "system").map(m => m.content);
  const conversation = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const anthropic = getClient();
  const resolvedMaxTokens = max_tokens ?? maxTokens ?? DEFAULT_MAX_TOKENS;

  if (responseFormat?.type === "json_schema") {
    const { json_schema } = responseFormat;
    const response = await anthropic.messages.create({
      model: model || DEFAULT_MODEL,
      max_tokens: resolvedMaxTokens,
      system: systemMessages.join("\n\n") || undefined,
      messages: conversation,
      tools: [
        {
          name: json_schema.name,
          description: `Submit output matching the required schema.`,
          input_schema: json_schema.schema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: json_schema.name },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      throw new Error("Model did not return the expected tool call");
    }

    return {
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: JSON.stringify(toolUse.input) },
          finish_reason: "stop",
        },
      ],
    };
  }

  // Plain text (or json_object, treated the same way — the caller is
  // responsible for asking the model to output JSON in the prompt).
  const response = await anthropic.messages.create({
    model: model || DEFAULT_MODEL,
    max_tokens: resolvedMaxTokens,
    system: systemMessages.join("\n\n") || undefined,
    messages: conversation,
  });

  // EVERY text block, in order. The API may return the answer as several
  // text blocks and says so; taking only the first one handed a staff
  // member an answer that stopped mid-sentence ("Her counsellor") while
  // the rest of it sat unread in the second block. 16 September 2026.
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  const content = textBlocks.map(block => block.text).join("");
  const finishReason = mapStopReason(response.stop_reason);
  if (textBlocks.length !== 1 || finishReason !== "stop") {
    // Shape only, never the text: this is the evidence trail for a reply
    // that arrives incomplete or in pieces.
    console.warn(`[LLM] response shape: ${textBlocks.length} text block(s), stop_reason=${response.stop_reason ?? "null"}, ${content.length} characters`);
  }

  return {
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: finishReason,
      },
    ],
  };
}

/**
 * Anthropic's stop_reason in the OpenAI-style vocabulary the callers read.
 * "length" is the one that matters: it means the text is cut off, and a
 * caller that shows it as if it were whole shows a broken answer.
 */
export function mapStopReason(stopReason: string | null | undefined): string | null {
  switch (stopReason) {
    case "end_turn":
    case "stop_sequence":
    case "tool_use":
      return "stop";
    case "max_tokens":
      return "length";
    case null:
    case undefined:
      return null;
    default:
      return stopReason;
  }
}
