import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  decideStaffSignIn,
  liveApprovals,
  normaliseEmail,
  MICROSOFT_ALLOWED_DOMAIN,
  type ApprovedAddress,
} from "../shared/staffSignIn";

/**
 * The Staff Portal sign-in gate.
 *
 * With Microsoft, two independent controls protect the portal and this gate
 * is the second of them. With Google, anybody can create an account, so
 * this gate is the only one. These tests are written for the Google case
 * accordingly: every refusal is exercised on its own, and the mutation of
 * each check is expected to fail the suite.
 */

const APPROVED: ApprovedAddress[] = [
  { email: "colleague@gmail.com", revokedAt: null },
  { email: "former@gmail.com", revokedAt: new Date("2026-09-01") },
];

const verified = (email: string) => ({ email, emailVerified: true });

describe("Google sign-in", () => {
  it("admits an approved, verified address", () => {
    expect(decideStaffSignIn("google", verified("colleague@gmail.com"), APPROVED).permitted).toBe(true);
  });

  it("REFUSES an address nobody approved", () => {
    const d = decideStaffSignIn("google", verified("stranger@gmail.com"), APPROVED);
    expect(d.permitted).toBe(false);
    expect(d.code).toBe("not_approved");
  });

  it("REFUSES an approval that has been revoked", () => {
    const d = decideStaffSignIn("google", verified("former@gmail.com"), APPROVED);
    expect(d.permitted).toBe(false);
    expect(d.code).toBe("approval_revoked");
  });

  it("REFUSES an unverified email even when the address is approved", () => {
    const d = decideStaffSignIn(
      "google",
      { email: "colleague@gmail.com", emailVerified: false },
      APPROVED,
    );
    expect(d.permitted).toBe(false);
    expect(d.code).toBe("email_not_verified");
  });

  it("REFUSES a token with no email at all", () => {
    expect(decideStaffSignIn("google", { email: null, emailVerified: true }, APPROVED).code)
      .toBe("email_missing");
  });

  it("admits nobody when the approval list is empty, which is the state before Tom approves anyone", () => {
    expect(decideStaffSignIn("google", verified("colleague@gmail.com"), []).code).toBe("not_approved");
  });
});

describe("matching is exact", () => {
  it("ignores case and surrounding space, because those are the same address", () => {
    expect(decideStaffSignIn("google", verified("  Colleague@Gmail.COM "), APPROVED).permitted).toBe(true);
  });

  it("REFUSES a Gmail dot variant, failing closed rather than guessing", () => {
    expect(decideStaffSignIn("google", verified("col.league@gmail.com"), APPROVED).code).toBe("not_approved");
  });

  it("REFUSES a plus-address variant", () => {
    expect(decideStaffSignIn("google", verified("colleague+wsa@gmail.com"), APPROVED).code).toBe("not_approved");
  });

  it("REFUSES an address that merely contains an approved one", () => {
    expect(decideStaffSignIn("google", verified("xcolleague@gmail.com"), APPROVED).code).toBe("not_approved");
    expect(decideStaffSignIn("google", verified("colleague@gmail.com.evil.test"), APPROVED).code)
      .toBe("not_approved");
  });

  it("REFUSES a domain approval attempt, since there are no wildcards", () => {
    const wild: ApprovedAddress[] = [{ email: "@gmail.com", revokedAt: null }];
    expect(decideStaffSignIn("google", verified("anyone@gmail.com"), wild).code).toBe("not_approved");
  });
});

describe("Microsoft sign-in is unchanged", () => {
  it("admits a tenant address without needing an approval row", () => {
    expect(decideStaffSignIn("microsoft", verified(`tom@${MICROSOFT_ALLOWED_DOMAIN}`), []).permitted).toBe(true);
  });

  it("REFUSES an address outside the tenant domain", () => {
    const d = decideStaffSignIn("microsoft", verified("someone@gmail.com"), []);
    expect(d.permitted).toBe(false);
    expect(d.code).toBe("domain_not_permitted");
  });

  it("does not let a Google approval widen the Microsoft domain rule", () => {
    const approved: ApprovedAddress[] = [{ email: "someone@gmail.com", revokedAt: null }];
    expect(decideStaffSignIn("microsoft", verified("someone@gmail.com"), approved).code)
      .toBe("domain_not_permitted");
  });
});

describe("normalisation is shared by approving and checking", () => {
  it("is the same function, so the two can never disagree", () => {
    expect(normaliseEmail("  Someone@Example.COM ")).toBe("someone@example.com");
  });
});

describe("the approval list", () => {
  it("lists only live approvals, keeping revoked rows as record", () => {
    expect(liveApprovals(APPROVED).map(a => a.email)).toEqual(["colleague@gmail.com"]);
    expect(APPROVED).toHaveLength(2);
  });
});

describe("every refusal explains itself", () => {
  it("carries a reason a person can act on", () => {
    for (const claims of [
      { email: "stranger@gmail.com", emailVerified: true },
      { email: "former@gmail.com", emailVerified: true },
      { email: "colleague@gmail.com", emailVerified: false },
      { email: null, emailVerified: true },
    ]) {
      const d = decideStaffSignIn("google", claims, APPROVED);
      expect(d.permitted).toBe(false);
      expect(d.reason).toBeTruthy();
      expect(d.code).toBeTruthy();
    }
  });
});

/**
 * The order of operations in completeGoogleStaffSignIn.
 *
 * The security property is not that an unapproved person is refused a
 * session. It is that they leave no trace: no staff_users row is created for
 * them at all. A dormant row for an unapproved stranger would surface in
 * Staff access as somebody to assign permissions to, and the whole point of
 * the approval list is that such a person never gets that far.
 *
 * Asserted on the source, because the alternative is a live Google sign-in.
 */
describe("the gate runs before any account is created", () => {
  const source = readFileSync("server/staffIdentityAuth.ts", "utf8");
  const fn = source.slice(source.indexOf("export async function completeGoogleStaffSignIn"));

  it("checks the approval list before upserting a staff row", () => {
    const gate = fn.indexOf("decideStaffSignIn");
    const upsert = fn.indexOf("upsertStaffUserFromGoogleClaims");
    expect(gate).toBeGreaterThan(-1);
    expect(upsert).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(upsert);
  });

  it("throws on refusal rather than continuing", () => {
    expect(fn).toMatch(/if \(!decision\.permitted\) \{[\s\S]{0,200}throw new Error/);
  });

  it("re-reads approval on every request, so revocation is immediate", () => {
    expect(source).toContain('staffUser.authProvider === "google" && !(await isCurrentlyApproved(staffUser.email))');
  });

  it("keys the Google identity on the stable sub, never the mutable email", () => {
    const upsert = source.slice(source.indexOf("export async function upsertStaffUserFromGoogleClaims"));
    expect(upsert).toContain("eq(staffUsers.googleSubjectId, claims.sub)");
  });

  it("requires email_verified in the verified claims", () => {
    expect(source).toContain("emailVerified: payload.email_verified === true");
  });
});
