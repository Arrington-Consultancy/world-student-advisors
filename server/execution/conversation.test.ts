import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Conversation memory, tested for the things that could go wrong rather
 * than for the fact that it remembers.
 *
 * Memory is the easy half. The half worth testing is that adding it did
 * not quietly open three doors: a forged transcript, one person reading
 * another's thread, and blocked text returning as something the worker
 * "already said".
 */

const conversationSource = readFileSync(
  path.resolve(import.meta.dirname, "./conversation.ts"),
  "utf8",
);
const executeSource = readFileSync(path.resolve(import.meta.dirname, "./execute.ts"), "utf8");
const routersSource = readFileSync(path.resolve(import.meta.dirname, "../routers.ts"), "utf8");
const chatSource = readFileSync(
  path.resolve(import.meta.dirname, "../../client/src/components/workforce/WorkerChat.tsx"),
  "utf8",
);

describe("the client cannot supply the transcript", () => {
  /**
   * The whole design rests on this. If the browser could post back what a
   * worker previously said, anyone able to reach the endpoint could invent
   * a prior answer and steer the worker with it, and no downstream control
   * could tell the forgery from the real thing.
   */
  it("the ask endpoint accepts an id and no transcript", () => {
    const schema = routersSource.slice(
      routersSource.indexOf("ask: publicProcedure"),
      routersSource.indexOf(".mutation", routersSource.indexOf("ask: publicProcedure")),
    );
    expect(schema).toContain("conversationId");
    // Anything that would let a caller describe past turns.
    expect(schema).not.toMatch(/history\s*:/);
    expect(schema).not.toMatch(/turns\s*:/);
    expect(schema).not.toMatch(/messages\s*:/);
    expect(schema).not.toMatch(/transcript\s*:/);
  });

  it("the server reads history from the store, not from the input", () => {
    expect(routersSource).toContain("readConversation(input.conversationId, session.staffUserId, workerId)");
    // The history handed to the worker must be the one just read.
    expect(routersSource).toMatch(/executeWorker\(\{[\s\S]{0,220}history,/);
  });

  it("the browser sends the id only, never the turns it drew", () => {
    expect(chatSource).toMatch(/ask\.mutate\(\s*\{\s*token,\s*workerId,\s*request:\s*trimmed,\s*conversationId\s*\}/);
    // The drawn thread must not travel with the request.
    const mutateCall = chatSource.slice(chatSource.indexOf("ask.mutate("), chatSource.indexOf("onSuccess"));
    expect(mutateCall).not.toContain("turns");
  });
});

describe("a conversation belongs to one person and one worker", () => {
  it("both are part of the query, so no path can read the rows and forget to compare", () => {
    const read = conversationSource.slice(
      conversationSource.indexOf("export async function readConversation"),
      conversationSource.indexOf("export async function recordExchange"),
    );
    expect(read).toContain("eq(workerConversationTurns.conversationId, conversationId)");
    expect(read).toContain("eq(workerConversationTurns.workerId, workerId)");
    expect(read).toContain("staffUserId");
    // Ownership is in the WHERE clause, not a check after the fact.
    expect(read).toMatch(/\.where\([\s\S]*workerId[\s\S]*\)/);
  });

  it("an unverifiable id yields an empty history rather than somebody's thread", () => {
    const read = conversationSource.slice(
      conversationSource.indexOf("export async function readConversation"),
      conversationSource.indexOf("export async function recordExchange"),
    );
    expect(read).toContain("if (!conversationId) return [];");
    expect(read).toContain("if (!db) return [];");
  });
});

describe("prior turns enter as messages, never as system text", () => {
  /**
   * A staff member's words concatenated into the system prompt read as
   * instructions to the model. A worker whose brief can be edited by
   * whoever types into it is not governed at all.
   */
  it("history is mapped to user and assistant roles between system and the new message", () => {
    expect(executeSource).toContain('role: turn.role === "staff" ? ("user" as const) : ("assistant" as const)');
    const call = executeSource.slice(executeSource.indexOf("const response = await invokeLLM"));
    expect(call).toMatch(/\{ role: "system", content: system \},\s*\.\.\.priorMessages,\s*\{ role: "user", content: user \}/);
  });

  it("composeSystemPrompt is never given the history", () => {
    expect(executeSource).toMatch(/composeSystemPrompt\(promptInputs\)/);
    expect(executeSource).not.toMatch(/composeSystemPrompt\([^)]*history/);
  });
});

describe("only an answered exchange becomes memory", () => {
  /**
   * The Priya case is the sharp one. An answer withheld for making a
   * determination about a person must not reappear a turn later as
   * something she already said, which is exactly what storing refusals
   * would do: launder blocked content back into her own context.
   */
  it("the exchange is recorded only where the worker answered", () => {
    expect(routersSource).toMatch(
      /if \(result\.outcome === "answered" && result\.visibleText\) \{\s*conversationId = await recordExchange\(/,
    );
  });

  it("question and answer are written together, so history holds no orphan turn", () => {
    const record = conversationSource.slice(conversationSource.indexOf("export async function recordExchange"));
    expect(record).toMatch(/\.values\(\[[\s\S]*role: "staff"[\s\S]*role: "worker"[\s\S]*\]\)/);
  });

  it("the browser also declines to draw a refused turn into the thread", () => {
    expect(chatSource).toMatch(/if \(result\.outcome === "answered" && result\.visibleText\)/);
  });
});

describe("the remembered window is bounded", () => {
  it("keeps a fixed number of recent turns so a prompt cannot grow without limit", async () => {
    const { MAX_REMEMBERED_TURNS } = await import("./conversation");
    expect(MAX_REMEMBERED_TURNS).toBeGreaterThan(0);
    expect(MAX_REMEMBERED_TURNS).toBeLessThanOrEqual(40);
    expect(conversationSource).toContain(".limit(MAX_REMEMBERED_TURNS)");
  });

  it("takes the newest turns and gives them to the model oldest first", () => {
    const read = conversationSource.slice(
      conversationSource.indexOf("export async function readConversation"),
      conversationSource.indexOf("export async function recordExchange"),
    );
    // Newest-first so the limit keeps recent turns, then reversed for the model.
    expect(read).toContain("orderBy(desc(workerConversationTurns.id))");
    expect(read).toContain("rows.reverse()");
  });
});

describe("the migration matches the table the code uses", () => {
  const sql = readFileSync(
    path.resolve(import.meta.dirname, "../../drizzle/0010_worker_conversation_turns.sql"),
    "utf8",
  );

  it("creates the table with the columns ownership depends on", () => {
    expect(sql).toContain("CREATE TABLE `worker_conversation_turns`");
    for (const column of ["conversationId", "staffUserId", "workerId", "role", "content"]) {
      expect(sql).toContain(`\`${column}\``);
    }
  });

  it("carries a statement breakpoint for every statement after the first", () => {
    // The failure mode from migration 0009: without these, drizzle-kit
    // sends the whole file as one query and mysql2 refuses it silently.
    const statements = sql.replace(/^--.*$/gm, "").split(";").map(p => p.trim()).filter(Boolean);
    const breakpoints = (sql.match(/^--> statement-breakpoint$/gm) ?? []).length;
    expect(breakpoints).toBe(statements.length - 1);
  });

  it("is recorded in the journal, which is what the migrator actually reads", () => {
    const journal = JSON.parse(
      readFileSync(path.resolve(import.meta.dirname, "../../drizzle/meta/_journal.json"), "utf8"),
    );
    const entry = journal.entries.find((e: { tag: string }) => e.tag === "0010_worker_conversation_turns");
    expect(entry).toBeDefined();
    expect(entry.idx).toBe(10);
  });
});
