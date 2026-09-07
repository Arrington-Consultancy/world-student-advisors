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

/**
 * A file the caller wants the model to look at, carried on a user message.
 *
 * Request-scoped by construction: it exists only for the duration of this
 * call. Nothing here writes it anywhere, so an attachment cannot outlive the
 * question it was attached to. See shared/attachments.ts for the limits and
 * why they are enforced on the server as well as in the browser.
 */
export type Attachment = {
  /** An allowed image or PDF media type. Validated by the caller before it gets here. */
  mediaType: string;
  /** The file's bytes, base64 encoded, with no data URI prefix. */
  data: string;
};

export type Message = {
  role: Role;
  content: string;
  /**
   * Files to send alongside this message's text. Only meaningful on a user
   * message; ignored on system and assistant messages, because a model's own
   * prior turn cannot have carried a file and system text must stay text.
   */
  attachments?: readonly Attachment[];
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

/**
 * A message in Anthropic's shape. Text stays a plain string when there are
 * no attachments, so every existing caller produces byte-identical requests
 * to before and this change cannot alter their behaviour.
 *
 * Attachments are placed BEFORE the text. The model reads them as the
 * material the question is about, and the staff member's words stay the last
 * thing it sees.
 */
export function toAnthropicMessage(m: Message): Anthropic.MessageParam {
  const role = m.role as "user" | "assistant";
  const files = m.role === "user" ? m.attachments ?? [] : [];
  if (files.length === 0) {
    return { role, content: m.content };
  }

  const blocks: Anthropic.ContentBlockParam[] = files.map(file =>
    file.mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: file.data },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
            data: file.data,
          },
        },
  );
  blocks.push({ type: "text", text: m.content });
  return { role, content: blocks };
}

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
    .map(m => toAnthropicMessage(m));

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

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  return {
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: textBlock?.text ?? "" },
        finish_reason: "stop",
      },
    ],
  };
}
