import { randomUUID } from "node:crypto";
import { and, eq, desc, asc } from "drizzle-orm";
import { getDb } from "../db";
import { workerConversationTurns } from "../../drizzle/schema";
import type { WorkerId } from "../workforce/types";

/**
 * Conversation memory for a worker, bounded and owned.
 *
 * A worker used to receive exactly one message per exchange, so answering
 * its own follow-up question produced "this message doesn't contain a
 * clear request" — correctly, because in isolation it did not. This module
 * is what makes a second message a continuation rather than a new start.
 *
 * Three properties are load bearing, and each is enforced here rather than
 * left to the caller.
 *
 * THE CLIENT NEVER SUPPLIES THE TRANSCRIPT. It holds an opaque id. If the
 * browser could post back "what the worker said last time", anyone able to
 * reach the endpoint could invent a prior answer and use it to walk a
 * worker outside its brief, and nothing downstream could tell the
 * difference. Everything read here was written here.
 *
 * A CONVERSATION BELONGS TO ONE PERSON AND ONE WORKER. Both are checked on
 * resume. Another staff member cannot continue somebody's thread, and
 * Nia's thread cannot be read into Priya's context. That is the context
 * isolation boundary, extended over time rather than punched through.
 *
 * ONLY ANSWERED EXCHANGES ARE REMEMBERED. Refused and withheld text never
 * becomes history. This matters most for Priya: an answer blocked for
 * making a determination about a person must not reappear one turn later
 * as something she already said.
 */

/** Ten exchanges. Enough to hold a thread, bounded so a prompt cannot grow without limit. */
export const MAX_REMEMBERED_TURNS = 20;

export interface ConversationTurn {
  role: "staff" | "worker";
  content: string;
}

/**
 * Reads the turns a worker may see for this request.
 *
 * Returns an empty history for anything it cannot positively verify:
 * no id, no database, an id that does not exist, or an id belonging to
 * another person or another worker. Failing to an empty history is the
 * safe direction — the worker starts fresh, which is the behaviour that
 * existed before this module and is never worse than leaking a thread.
 */
export async function readConversation(
  conversationId: string | undefined,
  staffUserId: number | null,
  workerId: WorkerId,
): Promise<ConversationTurn[]> {
  if (!conversationId) return [];
  const db = await getDb();
  if (!db) return [];

  // Ownership is part of the query rather than a check afterwards, so
  // there is no path that reads the rows first and forgets to compare.
  const rows = await db
    .select()
    .from(workerConversationTurns)
    .where(
      and(
        eq(workerConversationTurns.conversationId, conversationId),
        eq(workerConversationTurns.workerId, workerId),
        staffUserId === null
          ? eq(workerConversationTurns.staffUserId, -999999)
          : eq(workerConversationTurns.staffUserId, staffUserId),
      ),
    )
    .orderBy(desc(workerConversationTurns.id))
    .limit(MAX_REMEMBERED_TURNS);

  // Newest-first above so the limit keeps the most recent turns; the model
  // needs them oldest-first.
  return rows.reverse().map(r => ({ role: r.role, content: r.content }));
}

/**
 * Records one completed exchange and returns the conversation id.
 *
 * Called only where the worker actually answered. The staff message and
 * the worker's reply are written together, so history can never hold a
 * question with no answer or an answer with no question.
 */
export async function recordExchange(params: {
  conversationId: string | undefined;
  staffUserId: number | null;
  workerId: WorkerId;
  staffMessage: string;
  workerReply: string;
}): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const conversationId = params.conversationId ?? randomUUID();
  await db.insert(workerConversationTurns).values([
    {
      conversationId,
      staffUserId: params.staffUserId,
      workerId: params.workerId,
      role: "staff" as const,
      content: params.staffMessage,
    },
    {
      conversationId,
      staffUserId: params.staffUserId,
      workerId: params.workerId,
      role: "worker" as const,
      content: params.workerReply,
    },
  ]);
  return conversationId;
}

/** The visible thread, for rendering a conversation the staff member returns to. */
export async function listConversation(
  conversationId: string,
  staffUserId: number | null,
  workerId: WorkerId,
): Promise<ConversationTurn[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(workerConversationTurns)
    .where(
      and(
        eq(workerConversationTurns.conversationId, conversationId),
        eq(workerConversationTurns.workerId, workerId),
        staffUserId === null
          ? eq(workerConversationTurns.staffUserId, -999999)
          : eq(workerConversationTurns.staffUserId, staffUserId),
      ),
    )
    .orderBy(asc(workerConversationTurns.id));
  return rows.map(r => ({ role: r.role, content: r.content }));
}
