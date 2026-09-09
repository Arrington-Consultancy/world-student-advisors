import { describe, it, expect } from "vitest";
import {
  decideStaffSignup,
  decideVerification,
  signupResponseFor,
  SIGNUP_ACCEPTED_MESSAGE,
  SIGNUP_ALLOWED_DOMAIN,
  MIN_PASSWORD_LENGTH,
  type PendingSignup,
} from "../shared/staffSignup";

/**
 * Self-service staff signup.
 *
 * Tom's instruction was that staff sign up with their work email address "so
 * we know it's fine". The domain check alone does not establish that, because
 * anybody can type an address they do not own, so these tests treat the
 * domain rule and the verification link as two halves of one control and
 * exercise both.
 */

const GOOD = `newstarter@${SIGNUP_ALLOWED_DOMAIN}`;
const LONG = "correct horse battery staple";

describe("the work email rule", () => {
  it("accepts a WSA address with a long password", () => {
    expect(decideStaffSignup(GOOD, LONG, false).permitted).toBe(true);
  });

  it("REFUSES a personal address", () => {
    const d = decideStaffSignup("someone@gmail.com", LONG, false);
    expect(d.permitted).toBe(false);
    expect(d.code).toBe("domain_not_permitted");
  });

  it("REFUSES a lookalike domain", () => {
    for (const email of [
      `x@${SIGNUP_ALLOWED_DOMAIN}.evil.test`,
      `x@not${SIGNUP_ALLOWED_DOMAIN}`,
      `x@${SIGNUP_ALLOWED_DOMAIN}x`,
    ]) {
      expect(decideStaffSignup(email, LONG, false).code).toBe("domain_not_permitted");
    }
  });

  it("REFUSES an address with the domain only in the local part", () => {
    expect(decideStaffSignup(`${SIGNUP_ALLOWED_DOMAIN}@gmail.com`, LONG, false).code)
      .toBe("domain_not_permitted");
  });

  it("accepts the same address whatever the case or spacing", () => {
    expect(decideStaffSignup(`  NewStarter@${SIGNUP_ALLOWED_DOMAIN.toUpperCase()} `, LONG, false).permitted)
      .toBe(true);
  });

  it("REFUSES an empty or malformed address", () => {
    expect(decideStaffSignup("", LONG, false).code).toBe("email_missing");
    expect(decideStaffSignup("not-an-address", LONG, false).code).toBe("email_missing");
  });
});

describe("password rules", () => {
  it(`REFUSES anything under ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(decideStaffSignup(GOOD, "a".repeat(MIN_PASSWORD_LENGTH - 1), false).code)
      .toBe("password_too_short");
  });

  it("accepts exactly the minimum length", () => {
    expect(decideStaffSignup(GOOD, "a".repeat(MIN_PASSWORD_LENGTH), false).permitted).toBe(true);
  });

  it("REFUSES a password containing the person's own email name", () => {
    const d = decideStaffSignup(GOOD, "newstarter-2026-wsa", false);
    expect(d.permitted).toBe(false);
    expect(d.code).toBe("password_contains_email");
  });

  it("catches that whatever the case", () => {
    expect(decideStaffSignup(GOOD, "MyNEWSTARTERpassword", false).code).toBe("password_contains_email");
  });
});

describe("the signup form does not answer 'does this person work at WSA'", () => {
  it("says the same thing for a new address and one already registered", () => {
    const fresh = signupResponseFor(decideStaffSignup(GOOD, LONG, false));
    const taken = signupResponseFor(decideStaffSignup(GOOD, LONG, true));
    expect(fresh.shown).toBe(SIGNUP_ACCEPTED_MESSAGE);
    expect(taken.shown).toBe(SIGNUP_ACCEPTED_MESSAGE);
  });

  it("sends an email only for the genuinely new one", () => {
    expect(signupResponseFor(decideStaffSignup(GOOD, LONG, false)).sendEmail).toBe(true);
    expect(signupResponseFor(decideStaffSignup(GOOD, LONG, true)).sendEmail).toBe(false);
  });

  it("still tells somebody what they can fix about their own input", () => {
    const wrongDomain = signupResponseFor(decideStaffSignup("x@gmail.com", LONG, false));
    expect(wrongDomain.shown).not.toBe(SIGNUP_ACCEPTED_MESSAGE);
    expect(wrongDomain.shown).toContain(SIGNUP_ALLOWED_DOMAIN);
    expect(wrongDomain.sendEmail).toBe(false);
  });
});

describe("the verification link", () => {
  const NOW = new Date("2026-09-09T12:00:00Z");
  const live: PendingSignup = {
    email: GOOD,
    expiresAt: new Date("2026-09-10T12:00:00Z"),
    consumedAt: null,
  };

  it("works once, while it is live", () => {
    expect(decideVerification(live, NOW).permitted).toBe(true);
  });

  it("REFUSES an unknown token, so a guessed link creates nothing", () => {
    expect(decideVerification(null, NOW).code).toBe("token_unknown");
  });

  it("REFUSES a link that has already been used", () => {
    expect(decideVerification({ ...live, consumedAt: new Date("2026-09-09T11:00:00Z") }, NOW).code)
      .toBe("token_used");
  });

  it("REFUSES an expired link", () => {
    expect(decideVerification({ ...live, expiresAt: new Date("2026-09-09T11:59:59Z") }, NOW).code)
      .toBe("token_expired");
  });

  it("treats a spent link as spent even before it expires", () => {
    const spentButFresh = { ...live, consumedAt: new Date("2026-09-09T11:00:00Z") };
    expect(decideVerification(spentButFresh, NOW).permitted).toBe(false);
  });

  it("explains every refusal in words the person can act on", () => {
    for (const pending of [
      null,
      { ...live, consumedAt: new Date("2026-09-09T11:00:00Z") },
      { ...live, expiresAt: new Date("2026-09-09T11:00:00Z") },
    ]) {
      const d = decideVerification(pending, NOW);
      expect(d.permitted).toBe(false);
      expect(d.reason).toBeTruthy();
    }
  });
});
