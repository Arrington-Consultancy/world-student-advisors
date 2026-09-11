import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  decideStaffSignup,
  decidePasswordReset,
  decidePasswordChoice,
  decideVerification,
  signupResponseFor,
  resetResponseFor,
  mayResend,
  SIGNUP_ACCEPTED_MESSAGE,
  RESET_ACCEPTED_MESSAGE,
  SIGNUP_ALLOWED_DOMAIN,
  MIN_PASSWORD_LENGTH,
  RESEND_INTERVAL_MINUTES,
  type PendingSignup,
} from "../shared/staffSignup";

/**
 * Self-service staff signup and password reset.
 *
 * Tom's instruction was that staff sign up with their work email address "so
 * we know it's fine", then "get an email to their inbox and set the password
 * there", with a forgot password route alongside. The domain check alone does
 * not establish who somebody is, because anybody can type an address they do
 * not own, so these tests treat the domain rule and the emailed link as two
 * halves of one control and exercise both.
 */

const GOOD = `newstarter@${SIGNUP_ALLOWED_DOMAIN}`;
const LONG_ENOUGH = "correct horse battery staple";

describe("the work email rule", () => {
  it("accepts a WSA address", () => {
    expect(decideStaffSignup(GOOD, false).permitted).toBe(true);
  });

  it("REFUSES a personal address", () => {
    const d = decideStaffSignup("someone@gmail.com", false);
    expect(d.permitted).toBe(false);
    expect(d.code).toBe("domain_not_permitted");
  });

  it("REFUSES a lookalike domain", () => {
    for (const email of [
      `x@${SIGNUP_ALLOWED_DOMAIN}.evil.test`,
      `x@not${SIGNUP_ALLOWED_DOMAIN}`,
      `x@${SIGNUP_ALLOWED_DOMAIN}x`,
    ]) {
      expect(decideStaffSignup(email, false).code).toBe("domain_not_permitted");
    }
  });

  it("REFUSES an address with the domain only in the local part", () => {
    expect(decideStaffSignup(`${SIGNUP_ALLOWED_DOMAIN}@gmail.com`, false).code)
      .toBe("domain_not_permitted");
  });

  it("accepts the same address whatever the case or spacing", () => {
    expect(decideStaffSignup(`  NewStarter@${SIGNUP_ALLOWED_DOMAIN.toUpperCase()} `, false).permitted)
      .toBe(true);
  });

  it("REFUSES an empty or malformed address", () => {
    expect(decideStaffSignup("", false).code).toBe("email_missing");
    expect(decideStaffSignup("not-an-address", false).code).toBe("email_missing");
  });
});

describe("the signup form never asks for a password", () => {
  /**
   * This is the correction that shaped the current design. When the form
   * collected a password, whoever filled it in chose the password for an
   * address they might not own: submit a colleague's address, and if they
   * followed the link out of curiosity they would be sitting in an account
   * whose password a stranger knew.
   *
   * The test is on the signature, because that is what makes the hole
   * impossible rather than merely unused. decideStaffSignup takes an address
   * and a boolean, and there is nowhere for a password to enter.
   */
  it("takes an address and a registration flag, and nothing else", () => {
    expect(decideStaffSignup.length).toBe(2);
  });

  it("has no password refusal code to return, because it never sees one", () => {
    const codes = new Set<string | undefined>();
    for (const email of ["", "x@gmail.com", GOOD, `${SIGNUP_ALLOWED_DOMAIN}@gmail.com`]) {
      for (const registered of [true, false]) {
        codes.add(decideStaffSignup(email, registered).code);
      }
    }
    expect([...codes].filter(Boolean).sort())
      .toEqual(["already_registered", "domain_not_permitted", "email_missing"]);
  });
});

describe("password rules, applied where the password is actually chosen", () => {
  it(`REFUSES anything under ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(decidePasswordChoice(GOOD, "a".repeat(MIN_PASSWORD_LENGTH - 1)).code)
      .toBe("password_too_short");
  });

  it("accepts exactly the minimum length", () => {
    expect(decidePasswordChoice(GOOD, "a".repeat(MIN_PASSWORD_LENGTH)).permitted).toBe(true);
  });

  it("accepts a long passphrase", () => {
    expect(decidePasswordChoice(GOOD, LONG_ENOUGH).permitted).toBe(true);
  });

  it("REFUSES a password containing the person's own email name", () => {
    const d = decidePasswordChoice(GOOD, "newstarter-2026-wsa");
    expect(d.permitted).toBe(false);
    expect(d.code).toBe("password_contains_email");
  });

  it("catches that whatever the case", () => {
    expect(decidePasswordChoice(GOOD, "MyNEWSTARTERpassword").code).toBe("password_contains_email");
  });

  it("judges the address from the stored request, not one supplied alongside", () => {
    // The server passes the address off the pending row. If it ever passed
    // one from the browser, somebody could claim a different address and slip
    // their own local part past the rule.
    expect(decidePasswordChoice(GOOD, "newstarterlongenough").code).toBe("password_contains_email");
    expect(decidePasswordChoice(`other@${SIGNUP_ALLOWED_DOMAIN}`, "newstarterlongenough").permitted)
      .toBe(true);
  });
});

describe("the forgot password route", () => {
  const passwordAccount = { authProvider: "password", isActive: true };

  it("sends a link for a live password account", () => {
    expect(decidePasswordReset(GOOD, passwordAccount).permitted).toBe(true);
  });

  it("REFUSES a Microsoft account, so no password route is minted around the tenant", () => {
    // The important one. A Microsoft account signs in through Entra, where
    // MFA and conditional access live and where Tom can revoke somebody
    // centrally. Letting a reset set a password on it would create a second
    // way in that none of that sits in front of.
    const d = decidePasswordReset(GOOD, { authProvider: "microsoft", isActive: true });
    expect(d.permitted).toBe(false);
    expect(d.code).toBe("not_a_password_account");
  });

  it("REFUSES a Google account for the same reason", () => {
    expect(decidePasswordReset(GOOD, { authProvider: "google", isActive: true }).code)
      .toBe("not_a_password_account");
  });

  it("REFUSES an address with no account", () => {
    expect(decidePasswordReset(GOOD, null).code).toBe("no_account");
  });

  it("REFUSES a deactivated account", () => {
    expect(decidePasswordReset(GOOD, { authProvider: "password", isActive: false }).code)
      .toBe("account_inactive");
  });

  it("REFUSES a personal address before it looks at any account", () => {
    expect(decidePasswordReset("someone@gmail.com", passwordAccount).code)
      .toBe("domain_not_permitted");
  });
});

describe("neither form answers 'does this person work at WSA'", () => {
  it("says the same thing for a new address and one already registered", () => {
    const fresh = signupResponseFor(decideStaffSignup(GOOD, false));
    const taken = signupResponseFor(decideStaffSignup(GOOD, true));
    expect(fresh.shown).toBe(SIGNUP_ACCEPTED_MESSAGE);
    expect(taken.shown).toBe(SIGNUP_ACCEPTED_MESSAGE);
  });

  it("sends a LINK only for the genuinely new one", () => {
    expect(signupResponseFor(decideStaffSignup(GOOD, false)).email).toBe("link");
    expect(signupResponseFor(decideStaffSignup(GOOD, true)).email).not.toBe("link");
  });

  it("says the same thing on reset whether the account exists, is Microsoft, or is off", () => {
    const shown = [
      decidePasswordReset(GOOD, { authProvider: "password", isActive: true }),
      decidePasswordReset(GOOD, { authProvider: "microsoft", isActive: true }),
      decidePasswordReset(GOOD, { authProvider: "password", isActive: false }),
      decidePasswordReset(GOOD, null),
    ].map(d => resetResponseFor(d).shown);
    expect(new Set(shown).size).toBe(1);
    expect(shown[0]).toBe(RESET_ACCEPTED_MESSAGE);
  });

  it("sends a reset LINK only to a live password account", () => {
    const sends = [
      decidePasswordReset(GOOD, { authProvider: "password", isActive: true }),
      decidePasswordReset(GOOD, { authProvider: "microsoft", isActive: true }),
      decidePasswordReset(GOOD, { authProvider: "password", isActive: false }),
      decidePasswordReset(GOOD, null),
    ].map(d => resetResponseFor(d).email);
    expect(sends).toEqual(["link", "signs_in_with_sso", "none", "none"]);
  });

  it("still tells somebody what they can fix about their own input", () => {
    for (const response of [
      signupResponseFor(decideStaffSignup("x@gmail.com", false)),
      resetResponseFor(decidePasswordReset("x@gmail.com", null)),
    ]) {
      expect(response.shown).not.toBe(SIGNUP_ACCEPTED_MESSAGE);
      expect(response.shown).not.toBe(RESET_ACCEPTED_MESSAGE);
      expect(response.shown).toContain(SIGNUP_ALLOWED_DOMAIN);
      expect(response.email).toBe("none");
    }
  });
});

describe("an address that belongs to somebody never dead-ends", () => {
  /**
   * THE FAULT THIS EXISTS FOR. Tom already had a Microsoft account, so
   * signing up refused him as already_registered and resetting refused him
   * as not_a_password_account. Both showed "check your WSA email" and sent
   * nothing at all, so both routes dead-ended with no way to find that out
   * from the screen. Production confirmed it: three Microsoft accounts, zero
   * rows in staff_signup_requests, no email ever attempted.
   *
   * Silence towards a stranger is a control. Silence towards the person who
   * owns the mailbox is a dead end.
   */
  it("emails somebody who already has an account instead of going quiet", () => {
    expect(signupResponseFor(decideStaffSignup(GOOD, true)).email).toBe("already_has_account");
  });

  it("emails a Microsoft account that asked to reset a password it does not have", () => {
    const microsoft = decidePasswordReset(GOOD, { authProvider: "microsoft", isActive: true });
    expect(resetResponseFor(microsoft).email).toBe("signs_in_with_sso");
  });

  it("does the same for a Google account", () => {
    const google = decidePasswordReset(GOOD, { authProvider: "google", isActive: true });
    expect(resetResponseFor(google).email).toBe("signs_in_with_sso");
  });

  it("STILL says the same words on screen, which is what blocks enumeration", () => {
    // The fix must not undo the control. Somebody fishing sees one response
    // and receives nothing, because the email goes to a mailbox they do not
    // control. Screen sameness is the property that matters, not silence.
    const shown = [
      signupResponseFor(decideStaffSignup(GOOD, false)).shown,
      signupResponseFor(decideStaffSignup(GOOD, true)).shown,
    ];
    expect(new Set(shown).size).toBe(1);

    const resetShown = [
      resetResponseFor(decidePasswordReset(GOOD, { authProvider: "password", isActive: true })).shown,
      resetResponseFor(decidePasswordReset(GOOD, { authProvider: "microsoft", isActive: true })).shown,
      resetResponseFor(decidePasswordReset(GOOD, null)).shown,
    ];
    expect(new Set(resetShown).size).toBe(1);
  });

  it("sends NOTHING to an address with no account, since nobody is there", () => {
    expect(resetResponseFor(decidePasswordReset(GOOD, null)).email).toBe("none");
  });

  it("sends NOTHING to a suspended or disabled account", () => {
    // Deliberate. Somebody who has been suspended or has left should not be
    // walked through getting back in.
    expect(resetResponseFor(decidePasswordReset(GOOD, { authProvider: "password", isActive: false })).email)
      .toBe("none");
  });
});

describe("the resend throttle", () => {
  const NOW = new Date("2026-09-09T12:00:00Z");

  it("allows the first email, when there is nothing live", () => {
    expect(mayResend(null, NOW)).toBe(true);
  });

  it("REFUSES a second email straight away, so the form cannot bomb an inbox", () => {
    expect(mayResend(new Date(NOW.getTime() - 1000), NOW)).toBe(false);
  });

  it("allows another once the interval has passed", () => {
    const past = new Date(NOW.getTime() - RESEND_INTERVAL_MINUTES * 60 * 1000);
    expect(mayResend(past, NOW)).toBe(true);
  });
});

describe("the emailed link", () => {
  const NOW = new Date("2026-09-09T12:00:00Z");
  const live: PendingSignup = {
    email: GOOD,
    purpose: "signup",
    expiresAt: new Date("2026-09-10T12:00:00Z"),
    consumedAt: null,
  };

  it("works once, while it is live", () => {
    expect(decideVerification(live, NOW).permitted).toBe(true);
  });

  it("REFUSES an unknown token, so a guessed link sets no password", () => {
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

  it("applies the same rules to a reset link as to a signup link", () => {
    const reset: PendingSignup = { ...live, purpose: "reset" };
    expect(decideVerification(reset, NOW).permitted).toBe(true);
    expect(decideVerification({ ...reset, consumedAt: NOW }, NOW).code).toBe("token_used");
    expect(decideVerification({ ...reset, expiresAt: new Date("2026-09-09T11:00:00Z") }, NOW).code)
      .toBe("token_expired");
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

/**
 * Migrations 0012 and 0013, checked from the repository rather than from a
 * database.
 *
 * These exist because the journal entry for 0012 was genuinely missing when
 * its workflow was written. drizzle-kit reads the journal, not the directory
 * listing, so a migration file with no journal entry is applied by nothing
 * and reported by nothing: the migrator says it is up to date and the table
 * never appears. The flow would then fail in production against a table that
 * does not exist, with the repository looking entirely correct.
 */
describe("the migrations are applicable, not merely present", () => {
  const read = (tag: string) =>
    readFileSync(path.resolve(import.meta.dirname, `../drizzle/${tag}.sql`), "utf8");
  const journal = () =>
    JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../drizzle/meta/_journal.json"), "utf8"));

  const sql0012 = read("0012_staff_password_signup");
  const sql0013 = read("0013_signup_link_sets_password");

  it("0012 creates staff_signup_requests with the columns the flow reads and writes", () => {
    expect(sql0012).toContain("CREATE TABLE IF NOT EXISTS `staff_signup_requests`");
    for (const column of ["email", "verificationTokenHash", "expiresAt", "consumedAt"]) {
      expect(sql0012).toContain("`" + column + "`");
    }
  });

  it("stores the link's token only as a hash", () => {
    // The plain token exists in the emailed link and nowhere else. If this
    // column ever held a usable token, the link would stop being proof that
    // somebody can read that mailbox, which is the entire second half of the
    // control.
    expect(sql0012).toContain("`verificationTokenHash` VARCHAR(255) NOT NULL");
    expect(sql0012).not.toContain("`verificationToken`");
  });

  it("0013 frees passwordHash on the pending row, since no password is collected at signup", () => {
    expect(sql0013).toContain("MODIFY COLUMN `passwordHash` VARCHAR(255) NULL");
  });

  it("0013 adds purpose, so a reset link cannot create an account", () => {
    expect(sql0013).toContain("ADD COLUMN `purpose` VARCHAR(16) NOT NULL DEFAULT 'signup'");
  });

  it("neither migration drops or renames anything", () => {
    for (const sql of [sql0012, sql0013]) {
      const body = sql.replace(/^--.*$/gm, "");
      expect(body).not.toMatch(/\b(DROP|DELETE|TRUNCATE|RENAME)\b/i);
    }
  });

  it("carries a statement breakpoint for every statement after the first", () => {
    // The failure mode from migration 0009: without these, drizzle-kit
    // sends the whole file as one query and mysql2 refuses it silently.
    for (const sql of [sql0012, sql0013]) {
      const statements = sql.replace(/^--.*$/gm, "").split(";").map(s => s.trim()).filter(Boolean);
      const breakpoints = (sql.match(/^--> statement-breakpoint$/gm) ?? []).length;
      expect(breakpoints).toBe(statements.length - 1);
    }
  });

  it("both are recorded in the journal, which is what the migrator actually reads", () => {
    const entries = journal().entries as { idx: number; tag: string }[];
    expect(entries.find(e => e.tag === "0012_staff_password_signup")?.idx).toBe(12);
    expect(entries.find(e => e.tag === "0013_signup_link_sets_password")?.idx).toBe(13);
  });

  it("the journal has no gap, duplicate or out-of-order entry", () => {
    const entries = journal().entries as { idx: number; tag: string; when: number }[];
    expect(entries[entries.length - 1].tag).toBe("0016_information_resolutions");
    // drizzle orders by idx; a duplicate or a gap means one migration is
    // silently skipped or applied twice.
    entries.forEach((e, i) => expect(e.idx).toBe(i));
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].when).toBeGreaterThan(entries[i - 1].when);
    }
  });
});
