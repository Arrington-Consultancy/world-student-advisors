import { describe, expect, it } from "vitest";
import { SOCIAL_LINKS } from "../client/src/lib/socialLinks";

/**
 * Validates that the canonical WSA social links are well-formed and reachable.
 * Facebook/LinkedIn may return 4xx to bots for logged-out requests, so we
 * assert the URL structure strictly and reachability loosely (non-5xx).
 */
describe("WSA social links", () => {
  it("has the user-confirmed URLs", () => {
    expect(SOCIAL_LINKS.facebookShare).toBe("https://www.facebook.com/share/19GkxG3W7U/");
    expect(SOCIAL_LINKS.friendshipSociety).toBe("https://www.facebook.com/share/19KTePKnay/");
    expect(SOCIAL_LINKS.linkedin).toBe("https://www.linkedin.com/company/world-student-advisors/");
  });

  it("all links are valid https URLs", () => {
    for (const url of Object.values(SOCIAL_LINKS)) {
      const parsed = new URL(url);
      expect(parsed.protocol).toBe("https:");
      expect(parsed.hostname.length).toBeGreaterThan(3);
    }
  });

  it("facebook share links resolve without server error", { timeout: 30000 }, async () => {
    for (const url of [SOCIAL_LINKS.facebookShare, SOCIAL_LINKS.friendshipSociety]) {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      expect(res.status).toBeLessThan(500);
    }
  });
});

