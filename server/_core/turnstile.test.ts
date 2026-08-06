import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ENV is read once at module load in turnstile.ts via a live binding to
// process.env — set the secret before importing so isConfigured() sees it.
process.env.TURNSTILE_SECRET_KEY = "test-secret-key";

const { verifyTurnstileToken, requireTurnstile } = await import("./turnstile");

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe("verifyTurnstileToken", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("succeeds on a valid token", async () => {
    mockFetchOnce({ success: true });
    const result = await verifyTurnstileToken("a-real-token");
    expect(result.success).toBe(true);
    expect(result.errorCodes).toEqual([]);
  });

  it("rejects a missing token without calling Cloudflare at all", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await verifyTurnstileToken(undefined);
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain("missing-input-response");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects an empty-string token without calling Cloudflare", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await verifyTurnstileToken("   ");
    expect(result.success).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects an invalid token per Cloudflare's response", async () => {
    mockFetchOnce({ success: false, "error-codes": ["invalid-input-response"] });
    const result = await verifyTurnstileToken("bad-token");
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(["invalid-input-response"]);
  });

  it("rejects an expired token (Cloudflare's timeout-or-duplicate code)", async () => {
    mockFetchOnce({ success: false, "error-codes": ["timeout-or-duplicate"] });
    const result = await verifyTurnstileToken("expired-token");
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(["timeout-or-duplicate"]);
  });

  it("rejects a reused token — Cloudflare reports this identically to expired (timeout-or-duplicate)", async () => {
    mockFetchOnce({ success: false, "error-codes": ["timeout-or-duplicate"] });
    const result = await verifyTurnstileToken("already-used-token");
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(["timeout-or-duplicate"]);
  });

  it("treats a Cloudflare-side verification failure (HTTP error) as a failed verification", async () => {
    mockFetchOnce({}, false, 503);
    const result = await verifyTurnstileToken("some-token");
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(["siteverify-http-error"]);
  });

  it("treats a network failure reaching Cloudflare as a failed verification, never throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const result = await verifyTurnstileToken("some-token");
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(["siteverify-request-failed"]);
  });

  it("never includes the secret key in the returned result", async () => {
    mockFetchOnce({ success: false, "error-codes": ["invalid-input-response"] });
    const result = await verifyTurnstileToken("bad-token");
    expect(JSON.stringify(result)).not.toContain("test-secret-key");
  });
});

describe("requireTurnstile", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("resolves silently on a valid token", async () => {
    mockFetchOnce({ success: true });
    await expect(requireTurnstile("a-real-token")).resolves.toBeUndefined();
  });

  it("throws a generic, non-technical error on a missing token", async () => {
    await expect(requireTurnstile(undefined)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/verify you're human/i),
    });
  });

  it("throws the same generic error on an invalid token — no technical detail leaked", async () => {
    mockFetchOnce({ success: false, "error-codes": ["invalid-input-response"] });
    await expect(requireTurnstile("bad-token")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/verify you're human/i),
    });
  });

  it("throws the same generic error on an expired/reused token", async () => {
    mockFetchOnce({ success: false, "error-codes": ["timeout-or-duplicate"] });
    await expect(requireTurnstile("expired-token")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws the same generic error when Cloudflare's verification service itself fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    await expect(requireTurnstile("some-token")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("error message never exposes Cloudflare error codes or technical detail", async () => {
    mockFetchOnce({ success: false, "error-codes": ["invalid-input-response"] });
    try {
      await requireTurnstile("bad-token");
      expect.unreachable();
    } catch (e) {
      const message = (e as Error).message;
      expect(message).not.toContain("invalid-input-response");
      expect(message).not.toContain("test-secret-key");
    }
  });
});
