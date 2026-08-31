import { describe, expect, it } from "vitest";
import { routeStaffRequest, assertRoutingDomainsCoverRealWorkers } from "./router";
import { getWorker } from "./registry";

describe("routing domain integrity", () => {
  it("every routing keyword domain points at a real registry entry", () => {
    expect(() => assertRoutingDomainsCoverRealWorkers()).not.toThrow();
  });
});

describe("routeStaffRequest — representative cases across student, admissions, visa, funding, QA and marketing work", () => {
  it("student discovery request routes to Daniel", () => {
    const result = routeStaffRequest("Can you help gather background information on this new student's academic profile?");
    expect(result.responsibleWorkerId).toBe("daniel");
  });

  it("admissions request routes to James", () => {
    const result = routeStaffRequest("What's the application deadline and entry requirements for this admissions submission?");
    expect(result.responsibleWorkerId).toBe("james");
  });

  it("visa request routes to Priya, who is now available for her bounded scope", () => {
    const result = routeStaffRequest("Can you check this student's UK visa evidence?");
    expect(result.responsibleWorkerId).toBe("priya");
    expect(result.responsibleWorkerName).toMatch(/Priya/);
    expect(result.availability).toBe("available");
    // Available, and still bounded. Reception offering her must never be
    // read as her being able to give immigration advice.
    expect(getWorker("priya").currentNextControl).toMatch(/AB-P04/);
  });

  it("funding request routes to Harper", () => {
    const result = routeStaffRequest("Is this scholarship claim actually verified, and what's the funding gap?");
    expect(result.responsibleWorkerId).toBe("harper");
  });

  it("QA request routes to Grace", () => {
    const result = routeStaffRequest("Can someone independently audit this case for missing evidence?");
    expect(result.responsibleWorkerId).toBe("grace");
  });

  it("marketing (SEO) request routes to Ethan", () => {
    const result = routeStaffRequest("What does Search Console evidence say about our organic search performance?");
    expect(result.responsibleWorkerId).toBe("ethan");
  });

  it("marketing (paid media) request routes to Alex", () => {
    const result = routeStaffRequest("Can you review our Google Ads campaign conversion tracking?");
    expect(result.responsibleWorkerId).toBe("alex");
  });
});

describe("routeStaffRequest — does not invent ownership or substitute a different worker", () => {
  it("an unrecognisable request is not routed anywhere, and is escalated rather than guessed", () => {
    const result = routeStaffRequest("Can you write me a poem about the weather in Lagos?");
    expect(result.matched).toBe(false);
    expect(result.responsibleWorkerId).toBeUndefined();
    expect(result.safeNextAction).toMatch(/escalate/i);
  });

  it("does not silently substitute Sophie (or any available-sounding worker) for the correct-but-unavailable owner", () => {
    const result = routeStaffRequest("Can you check this student's UK visa evidence?");
    expect(result.responsibleWorkerId).toBe("priya");
    expect(result.responsibleWorkerId).not.toBe("sophie");
  });

  it("reports availability from the register, so an authorised worker shows available and the rest do not", () => {
    const cases = [
      "new student enquiry",
      "student discovery profile",
      "course research needed",
      "compare suitability of these two options",
      "admissions application deadline",
      "visa compliance check",
      "scholarship funding gap",
      "pre-arrival orientation",
      "quality audit of this case",
      "seo organic search",
      "google ads paid media",
      "sharepoint records control",
    ];
    for (const text of cases) {
      const result = routeStaffRequest(text);
      if (!result.matched) continue;
      // Availability is read off the register per worker, never asserted
      // wholesale. Reception must not offer a worker that cannot work,
      // and must not withhold one that can.
      const expected =
        getWorker(result.responsibleWorkerId!).staffPortalExecutionAuthorised
          ? "available"
          : "not_available_for_live_case_work";
      expect(result.availability).toBe(expected);
    }
    expect(routeStaffRequest("new student enquiry").availability).toBe("available");
    expect(routeStaffRequest("course research needed").availability).toBe("available");
  });
});
