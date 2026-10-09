import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import {
  buildCommitteeEmail,
  quranicSchoolRegistrationSchema,
  submitQuranicSchoolRegistration,
} from "./quranicCompetition";
import { QURANIC_FAILED_SUBMISSION_TYPE, NIGERIAN_STATES, SCHOOL_TYPES } from "../../shared/quranicCompetition";

/**
 * A school's registration for His Royal Highness's Annual Quranic
 * Memorisation Competition.
 *
 * The one thing this must never do is let a school believe it has
 * registered when nothing reached the Committee. So the tests follow the
 * failure path as closely as the success path: an email that is not sent
 * becomes an honest error to the school, a preserved record and a staff
 * alert, and never a silent success.
 */

const VALID = {
  schoolName: "Al-Huda Islamiyya School",
  schoolType: "Islamiyya school" as const,
  town: "Agege",
  state: "Lagos" as const,
  contactName: "Malam Ibrahim Musa",
  contactRole: "Head teacher",
  phone: "+234 803 123 4567",
  email: "",
  expectedEntrants: "about 12",
  ageGroups: "8 to 12 and 13 to 16",
  takenPartBefore: "no" as const,
  message: "We would like to know the categories.",
};

describe("what a registration must contain", () => {
  it("accepts a complete registration, with email optional", () => {
    const parsed = quranicSchoolRegistrationSchema.parse(VALID);
    expect(parsed.schoolName).toBe(VALID.schoolName);
    expect(parsed.email).toBe("");
  });

  it("trims what the school typed", () => {
    const parsed = quranicSchoolRegistrationSchema.parse({ ...VALID, schoolName: "  Al-Huda  ", town: " Agege " });
    expect(parsed.schoolName).toBe("Al-Huda");
    expect(parsed.town).toBe("Agege");
  });

  it("requires the school, its place, a contact and a number", () => {
    for (const key of ["schoolName", "town", "contactName", "contactRole", "phone", "expectedEntrants"] as const) {
      expect(quranicSchoolRegistrationSchema.safeParse({ ...VALID, [key]: "   " }).success, `${key} is required`).toBe(false);
    }
  });

  it("rejects a number with no digits to speak of, and an email that is not one", () => {
    expect(quranicSchoolRegistrationSchema.safeParse({ ...VALID, phone: "call me" }).success).toBe(false);
    expect(quranicSchoolRegistrationSchema.safeParse({ ...VALID, email: "not-an-email" }).success).toBe(false);
    expect(quranicSchoolRegistrationSchema.safeParse({ ...VALID, email: "school@example.com" }).success).toBe(true);
  });

  it("accepts only the listed school types and Nigerian states", () => {
    expect(quranicSchoolRegistrationSchema.safeParse({ ...VALID, schoolType: "Academy" }).success).toBe(false);
    expect(quranicSchoolRegistrationSchema.safeParse({ ...VALID, state: "Lagos State" }).success).toBe(false);
    expect(SCHOOL_TYPES).toContain("Tahfeez school");
    expect(NIGERIAN_STATES).toContain("Federal Capital Territory");
    expect(NIGERIAN_STATES).toHaveLength(37);
  });

  it("the failed-submission form type fits the database column", () => {
    expect(QURANIC_FAILED_SUBMISSION_TYPE.length).toBeLessThanOrEqual(30);
  });
});

describe("the email the Committee receives", () => {
  const email = buildCommitteeEmail(VALID, new Date("2026-10-09T10:15:00Z"));

  it("names the school in the subject", () => {
    expect(email.title).toBe("Quranic Memorisation Competition: school registration from Al-Huda Islamiyya School");
  });

  it("carries every answer, as given", () => {
    for (const value of [VALID.schoolName, VALID.schoolType, VALID.town, VALID.state, VALID.contactName, VALID.contactRole, VALID.phone, VALID.expectedEntrants, VALID.ageGroups, VALID.message]) {
      expect(email.content).toContain(value);
    }
    expect(email.content).toContain("Email: Not given");
    expect(email.content).toContain("Taken part before: No, this would be the school's first year");
    expect(email.content).toContain("Received: 2026-10-09 10:15 UTC");
  });

  it("says plainly that it is not a WSA enquiry and is not in Pipedrive", () => {
    expect(email.content).toContain("not a WSA student enquiry");
    expect(email.content).toContain("has not been added to Pipedrive");
    expect(email.content).toContain("Competition Committee's address only");
  });

  it("contains no em dash", () => {
    expect(email.title + email.content).not.toContain("—");
  });
});

describe("sending it", () => {
  it("succeeds when the Committee email is sent, and alerts nobody else", async () => {
    const notifyCommittee = vi.fn().mockResolvedValue(true);
    const alertStaff = vi.fn();
    const preserve = vi.fn();
    const result = await submitQuranicSchoolRegistration(VALID, { notifyCommittee, alertStaff, preserve });
    expect(result).toEqual({ success: true });
    expect(notifyCommittee).toHaveBeenCalledTimes(1);
    expect(notifyCommittee.mock.calls[0][0].title).toContain("Al-Huda Islamiyya School");
    expect(alertStaff).not.toHaveBeenCalled();
    expect(preserve).not.toHaveBeenCalled();
  });

  it("when the email is not sent: an honest error, a preserved record and a staff alert", async () => {
    const notifyCommittee = vi.fn().mockResolvedValue(false);
    const alertStaff = vi.fn().mockResolvedValue(true);
    const preserve = vi.fn().mockResolvedValue(undefined);
    const result = await submitQuranicSchoolRegistration(VALID, { notifyCommittee, alertStaff, preserve });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("could not send your registration");
    expect(preserve).toHaveBeenCalledWith(expect.objectContaining({ formType: QURANIC_FAILED_SUBMISSION_TYPE, payload: VALID }));
    expect(alertStaff).toHaveBeenCalledTimes(1);
    expect(alertStaff.mock.calls[0][0].title).toContain("FAILED to send");
  });

  it("treats a thrown error the same way", async () => {
    const notifyCommittee = vi.fn().mockRejectedValue(new Error("Graph down"));
    const alertStaff = vi.fn().mockResolvedValue(true);
    const preserve = vi.fn().mockResolvedValue(undefined);
    const result = await submitQuranicSchoolRegistration(VALID, { notifyCommittee, alertStaff, preserve });
    expect(result.success).toBe(false);
    expect(preserve).toHaveBeenCalledWith(expect.objectContaining({ errorMessage: "Graph down" }));
    expect(alertStaff).toHaveBeenCalledTimes(1);
  });
});

describe("where it goes", () => {
  it("resolves a Committee address, a holding one until Farooq supplies the Committee's", async () => {
    const { ENV } = await import("../_core/env");
    expect(ENV.quranicCompetitionCommitteeEmails.length).toBeGreaterThan(0);
    if (!process.env.QURANIC_COMPETITION_COMMITTEE_EMAILS) {
      expect(ENV.quranicCompetitionCommitteeEmails).toEqual(["tim.hunt@worldstudentadvisors.com"]);
      expect(ENV.quranicCompetitionCommitteeConfigured).toBe(false);
    }
  });

  it("the Committee notifier sends to that list and not to the staff list", () => {
    const src = readFileSync("server/_core/notification.ts", "utf8");
    const fn = src.slice(src.indexOf("export async function notifyQuranicCompetitionCommittee"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("ENV.quranicCompetitionCommitteeEmails");
    expect(body).not.toContain("staffNotifyEmails");
  });

  it("the router guards the procedure with the honeypot and Turnstile, and nothing touches Pipedrive", () => {
    const router = readFileSync("server/routers.ts", "utf8");
    const start = router.indexOf("registerQuranicCompetitionSchool:");
    const proc = router.slice(start, router.indexOf("portal: router({", start));
    expect(proc).toContain("if (input.website) return { success: true as const };");
    expect(proc).toContain("await requireTurnstile(input.turnstileToken, ctx.req.ip);");
    expect(proc).toContain("submitQuranicSchoolRegistration(registration)");
    expect(proc).not.toContain("createStudentLead");
    expect(proc).not.toContain("createPortalUser");
  });
});
