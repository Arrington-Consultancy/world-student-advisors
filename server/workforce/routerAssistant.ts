/**
 * The receptionist's assistant pass: a model, constrained to picking a
 * name off the register.
 *
 * Reception was purely a keyword table, which is why it answered an
 * ordinary question with "no controlled worker could be confidently
 * identified". Keywords cannot cover how people actually ask for things,
 * and widening them forever is a losing game.
 *
 * So a model runs, but only where it cannot do harm. Three constraints,
 * all structural:
 *
 * It classifies, it does not answer. The model is asked for one worker id
 * and nothing else, through a forced schema. No free text it produces is
 * ever shown to a staff member, so it cannot become the general-purpose
 * assistant the receptionist is explicitly not allowed to be, and it
 * cannot give advice a specialist owns.
 *
 * Its answer is checked against the register. A returned id that is not a
 * real worker becomes no match, so it cannot invent an owner. The
 * register, not the model, then decides whether that worker is actually
 * available.
 *
 * It sees only the roster. The prompt carries the worker list and the
 * staff member's own sentence. No student record, no controlled brief, no
 * case data.
 *
 * If it is unconfigured, slow or wrong-shaped, the result is no match.
 * The failure mode is the honest one it already had, never a guess.
 */
import { invokeLLM } from "../_core/llm";
import { listWorkers } from "./registry";
import type { WorkerId } from "./types";

export const ASSISTANT_TIMEOUT_MS = 8000;

/** Workers a request can be routed to: the case-working specialists. */
function routableWorkers() {
  return listWorkers().filter(w => w.id !== "staff_receptionist" && w.id !== "wsa_governance_assurance");
}

function buildRoster(): string {
  return routableWorkers()
    .map(w => `${w.id}: ${w.canonicalName}, ${w.roleTitle}. Owns: ${w.personality.whatFor}`)
    .join("\n");
}

const SYSTEM = [
  "You route an internal staff request to whichever specialist owns that kind of work.",
  "You are a router. You never answer the request, never give advice, and never explain a subject.",
  "Reply with exactly one worker id from the list, or the word none.",
  "Choose none only when no listed specialist plausibly owns the request.",
  "Ownership is about the subject of the request, not about who is available.",
].join(" ");

export interface AssistantRouting {
  workerId: WorkerId | null;
  /** Why there is no id, when there is none. Never shown as an answer. */
  note: string;
}

/**
 * Ask the model which specialist owns this request.
 *
 * Returns a worker id only when the model names a real one. Every other
 * outcome, including an error, is null.
 */
export async function routeWithAssistant(
  requestText: string,
  timeoutMs: number = ASSISTANT_TIMEOUT_MS,
): Promise<AssistantRouting> {
  const valid = new Set(routableWorkers().map(w => w.id as string));

  // Both sides of the race get a no-op catch, and the timer is always
  // cleared. Without that, the loser of the race rejects with nobody
  // listening, which Node reports as an unhandled rejection, and the
  // 8-second timer keeps the event loop busy long after the answer
  // arrived.
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    // Everything that can fail lives inside the try, including building
    // the request. The timer is always cleared and the losing side of the
    // race always has a handler, so neither can surface as an unhandled
    // rejection or keep the event loop busy after an answer arrives.
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("assistant routing timed out")), timeoutMs);
    });
    timeout.catch(() => {});

    const call = invokeLLM({
      messages: [
        { role: "system", content: `${SYSTEM}\n\nSpecialists:\n${buildRoster()}` },
        { role: "user", content: requestText },
      ],
      maxTokens: 20,
    });
    call.catch(() => {});

    const result = await Promise.race([call, timeout]);

    const raw = result.choices?.[0]?.message?.content ?? "";
    // Take the first bare token. A model that returns a sentence anyway
    // still cannot smuggle prose through, because only an exact id counts.
    const candidate = raw.trim().toLowerCase().replace(/[^a-z_]/g, "");
    if (valid.has(candidate)) return { workerId: candidate as WorkerId, note: "" };
    return { workerId: null, note: "No listed specialist owns this request." };
  } catch {
    return { workerId: null, note: "The routing assistant was unavailable, so no owner was inferred." };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
