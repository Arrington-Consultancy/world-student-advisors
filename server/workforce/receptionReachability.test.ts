import { describe, it, expect } from "vitest";
import { routeStaffRequest } from "./router";
import { evaluateStaffPortalExecutionPermission } from "./permissions";

/**
 * Every substantive worker must be reachable through the front door.
 *
 * Reception is how a staff member finds a worker. A worker nobody can be
 * routed to is a worker nobody will use, however correct it is in
 * isolation, and the failure is silent: Reception simply says it cannot
 * identify an owner, which reads like the request being unusual rather
 * than the routing table having a hole in it.
 *
 * Production acceptance found four such holes at once. Oliver, Olivia and
 * Grace could not be reached by an ordinary phrasing of their own work,
 * and "website search ranking" routed to Amelia, because she owns
 * "ranking" for university league tables and Ethan had no term for search
 * ranking at all. None of it was visible from the worker's own record,
 * which said Live.
 *
 * The requests below are deliberately ordinary. They are how someone
 * would actually type the question, not keyword strings reverse-engineered
 * from the routing table, which would prove nothing.
 */
const REQUESTS: ReadonlyArray<readonly [string, string]> = [
  ["A new student has emailed us asking for help, can someone triage this enquiry", "sophie"],
  ["Help me understand what this student is actually looking for and their background", "daniel"],
  ["Help me research English courses for this student", "amelia"],
  ["Which of these two universities is the better fit for this student", "oliver"],
  ["What is the application deadline and what do we need for admissions", "james"],
  ["What does the visa rule say about maintenance funds", "priya"],
  ["What scholarship and funding options could close this student's funding gap", "harper"],
  ["The student has their offer, what do they need before they arrive and enrol", "olivia"],
  ["Can you quality check this case file before it goes out", "grace"],
  ["How can we improve the website search ranking for this page", "ethan"],
  ["How should we structure our SharePoint records and retention", "maya"],
  ["How are our paid advertising campaigns performing", "alex"],
  ["I want help creating a social media post", "nia"],
];

describe("Reception reaches every substantive worker", () => {
  it.each(REQUESTS)("routes %s to the right owner", (request, expected) => {
    const routed = routeStaffRequest(request);
    expect(routed.matched).toBe(true);
    expect(routed.responsibleWorkerId).toBe(expected);
  });

  it("covers every worker the Register authorises to execute", () => {
    // The property, rather than the list: if a worker is activated later,
    // this fails until Reception can actually reach it.
    const executable = new Set(
      REQUESTS.map(([, id]) => id).filter(id => evaluateStaffPortalExecutionPermission(id as never).allowed),
    );
    const authorised = REQUESTS.map(([, id]) => id);
    expect(executable.size).toBe(new Set(authorised).size);
  });
});

describe("Reception does not guess", () => {
  it("refuses to invent an owner for work no worker owns", () => {
    const routed = routeStaffRequest("please reconcile the VAT return and file the statutory accounts");
    expect(routed.matched && routed.availability === "available").toBe(false);
  });

  /**
   * Amelia owns "ranking" for university league tables and Ethan owns
   * search ranking. Both must keep their own, or fixing one breaks the
   * other — which is what happened once already when "entry requirement"
   * moved to Amelia and took an admissions request with it.
   */
  it("keeps university ranking with Amelia and search ranking with Ethan", () => {
    expect(routeStaffRequest("what is this university's ranking and entry profile").responsibleWorkerId).toBe("amelia");
    expect(routeStaffRequest("our search ranking has dropped on that landing page").responsibleWorkerId).toBe("ethan");
  });
});
