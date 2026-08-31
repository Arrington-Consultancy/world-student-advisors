import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * The executive password is the entire remaining control.
 *
 * Tom Arrington accepted a permanent, unrestricted, MFA-free credential
 * knowingly, which means the only thing left between whoever learns the
 * password and full Level 1 access to every student record is the password
 * itself. So the rule that decides what is acceptable deserves tests, and
 * they run the real script rather than a copy of its logic, because a copy
 * would pass while the deployed artifact drifted.
 *
 * These tests never see a real password. Every value here is invented.
 */
const SCRIPT = path.resolve(import.meta.dirname, "../../scripts/hash-executive-password.mjs");

function accepts(password: string): boolean {
  try {
    const out = execFileSync("node", [SCRIPT], {
      env: { ...process.env, EXECUTIVE_PASSWORD: password },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    // A password is accepted only if a real bcrypt hash comes back.
    return /^\$2[aby]\$\d\d\$.{53}$/.test(out.trim());
  } catch {
    return false;
  }
}

describe("what the executive password rule refuses", () => {
  it("refuses anything shorter than sixteen characters", () => {
    expect(accepts("Short1A")).toBe(false);
    expect(accepts("Fifteen-Chars12")).toBe(false);
  });

  it("refuses an empty password, which is what an unset secret looks like", () => {
    expect(accepts("")).toBe(false);
  });

  it("refuses length achieved by repetition rather than variety", () => {
    // Sixteen characters and two character classes, and not a password.
    expect(accepts("abababababababab")).toBe(false);
    expect(accepts("aaaaaaaaaaaaaaaaaaaa")).toBe(false);
  });

  it("refuses a single character class, whose search space is smaller than its length suggests", () => {
    expect(accepts("thisisallonecaselong")).toBe(false);
  });

  it("refuses guessable words even when embedded mid-string", () => {
    // This is the case the first version of the rule got wrong. It anchored
    // on word boundaries, and a boundary never fires inside a word, so
    // "MyPassword12345678" passed while a bare "password" was caught.
    expect(accepts("MyPassword12345678")).toBe(false);
    expect(accepts("SuperPassw0rdSafe123")).toBe(false);
    expect(accepts("TheArringtonWayIsBest")).toBe(false);
    expect(accepts("Qwerty123456789Abc")).toBe(false);
    expect(accepts("WSA-Portal-Access-2026")).toBe(false);
  });

  it("refuses surrounding whitespace, which is lost in transit and cannot be typed reliably", () => {
    expect(accepts(" LeadingSpaceAbcDefGh ")).toBe(false);
  });
});

describe("what it accepts, and why composition rules were dropped", () => {
  it("accepts a strong password containing digits", () => {
    expect(accepts("Tr0ubadour-Quarry-Lantern-92")).toBe(true);
  });

  /**
   * The first version of this rule demanded a digit. That is a composition
   * rule, and NIST SP 800-63B recommends against composition rules because
   * they push people towards predictable shapes while adding almost
   * nothing: sixteen mixed-case letters is about 10^27 combinations, and
   * against bcrypt at cost 12 a digit changes nothing that matters.
   *
   * It was dropped because it rejected a genuinely strong sixteen-character
   * passphrase, which is the moment a rule has to justify itself rather
   * than be obeyed. This test exists so nobody reinstates it by reflex.
   */
  it("accepts a strong passphrase with no digit at all", () => {
    expect(accepts("CascadeIronwoodValeMist")).toBe(true);
    expect(accepts("Thornfield Harbour Quiet")).toBe(true);
  });
});

describe("the script itself never leaks", () => {
  it("prints the hash and nothing else, so a caller can capture it without it reaching a log", () => {
    const out = execFileSync("node", [SCRIPT], {
      env: { ...process.env, EXECUTIVE_PASSWORD: "Tr0ubadour-Quarry-Lantern-92" },
      encoding: "utf8",
    });
    expect(out).toMatch(/^\$2[aby]\$\d\d\$.{53}$/);
    expect(out).not.toContain("\n");
  });

  it("never echoes the rejected password back in its error output", () => {
    const secret = "MyPassword12345678";
    let stderr = "";
    try {
      execFileSync("node", [SCRIPT], {
        env: { ...process.env, EXECUTIVE_PASSWORD: secret },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      stderr = String((err as { stderr?: string }).stderr ?? "");
    }
    // It must say what is wrong without quoting what was tried.
    expect(stderr).toContain("rejected");
    expect(stderr).not.toContain(secret);
  });
});
