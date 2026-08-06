import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  success: boolean;
  /** Cloudflare's own error-codes (e.g. "missing-input-response",
   * "invalid-input-response", "timeout-or-duplicate" for an expired OR
   * already-used token — Cloudflare doesn't distinguish the two). Safe to
   * log; never contains the token or the secret key. */
  errorCodes: string[];
}

/**
 * Calls Cloudflare's siteverify endpoint directly. Exported separately from
 * requireTurnstile() so callers/tests can inspect the raw result without
 * dealing with a thrown error. Never logs or returns the secret key or the
 * token itself — only Cloudflare's generic error-code strings.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  if (!ENV.turnstileSecretKey) {
    console.warn("[Turnstile] TURNSTILE_SECRET_KEY is not configured — rejecting all tokens.");
    return { success: false, errorCodes: ["not-configured"] };
  }

  if (!token || !token.trim()) {
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  const body = new URLSearchParams({ secret: ENV.turnstileSecretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (error) {
    console.warn("[Turnstile] siteverify request failed:", error instanceof Error ? error.message : String(error));
    return { success: false, errorCodes: ["siteverify-request-failed"] };
  }

  if (!response.ok) {
    console.warn(`[Turnstile] siteverify returned HTTP ${response.status}`);
    return { success: false, errorCodes: ["siteverify-http-error"] };
  }

  let data: { success?: boolean; "error-codes"?: string[] };
  try {
    data = await response.json();
  } catch {
    return { success: false, errorCodes: ["siteverify-bad-response"] };
  }

  return { success: Boolean(data.success), errorCodes: data["error-codes"] ?? [] };
}

/**
 * Call as the very first line of every Turnstile-protected mutation, before
 * any Pipedrive call, email send, AI/LLM call, or database write. Throws a
 * generic, non-technical BAD_REQUEST on any failure — missing token,
 * invalid token, expired/reused token, or a Cloudflare-side verification
 * failure are all indistinguishable to the caller by design (point 8: no
 * technical details exposed).
 */
export async function requireTurnstile(token: string | undefined, remoteIp?: string): Promise<void> {
  const result = await verifyTurnstileToken(token, remoteIp);
  if (!result.success) {
    console.warn("[Turnstile] Verification failed:", result.errorCodes.join(", ") || "unknown");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "We couldn't verify you're human. Please try again.",
    });
  }
}
