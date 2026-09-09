/**
 * Proves the production ANTHROPIC_API_KEY works, by making one real call.
 *
 * WHY THIS EXISTS. Tom rotated the key on 9 September 2026 and asked whether
 * it works. Nothing else in this repository would tell him: the test suite
 * never calls the model, the acceptance suite deliberately does not either,
 * and a wrong key fails silently until a member of staff asks a worker a
 * question and gets "the model could not be reached".
 *
 * WHAT IT PROVES, and what it does not. It calls the same invokeLLM every
 * worker uses, through the same client and the same key, so a pass means the
 * key is valid, has credit, and can reach Anthropic from the production
 * environment. It does not check any worker's behaviour; that is what the
 * acceptance suite is for.
 *
 * THE KEY IS NEVER PRINTED, in any branch. Not on success, not in an error,
 * not truncated, not as a length. Anthropic's own error messages can quote
 * request detail, so the failure path prints the error's first line and the
 * status only, and says where to look rather than pasting what it found.
 *
 * One short prompt with a tiny max_tokens, so confirming the key costs
 * essentially nothing.
 */
import { invokeLLM } from "../server/_core/llm";

function fail(message: string): never {
  console.error(`FAILED: ${message}`);
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  fail("ANTHROPIC_API_KEY is not set in this environment. Nothing was called.");
}

console.log("=== Anthropic key check ===");
console.log("  key present: yes (value never printed)");
console.log("  calling the model with one short prompt...\n");

try {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "Reply with exactly one word." },
      { role: "user", content: "Say the word: working" },
    ],
    maxTokens: 16,
  });

  const text = response.choices[0]?.message?.content ?? "";
  if (text.trim() === "") {
    fail("The call succeeded but the model returned nothing. The key reached Anthropic; something else is wrong.");
  }

  console.log(`  the model replied: "${text.trim()}"`);
  console.log("\nThe production ANTHROPIC_API_KEY is valid and working.");
  process.exit(0);
} catch (error) {
  // Only the first line, and never the key. An Anthropic SDK error can carry
  // request detail, and this output goes to a workflow log.
  const message = error instanceof Error ? error.message : String(error);
  const firstLine = message.split("\n")[0].slice(0, 200);
  const status = (error as { status?: number })?.status;

  console.error("=== The key did NOT work ===");
  console.error(`  ${status ? `HTTP ${status}: ` : ""}${firstLine}`);
  if (status === 401) {
    console.error("\n  401 means the key is rejected: wrong value, revoked, or from another account.");
    console.error("  Re-check ANTHROPIC_API_KEY in Railway, production environment.");
  } else if (status === 429) {
    console.error("\n  429 means the key is valid but rate limited or out of credit.");
  }
  process.exit(1);
}
