import { describe, it, expect } from "vitest";
import {
  decidePublication,
  publishableStories,
  SUCCESS_STORIES,
  type SuccessStory,
} from "../shared/successStories";

/**
 * The consent and evidence gate from the approved Student Success Story and
 * Proof Direction.
 *
 * Every condition is tested by removing exactly one thing from an otherwise
 * publishable story, so each check has to be doing its own work. A gate that
 * still passes when one of its conditions is deleted is not a gate, and the
 * material it would let through is a real student's immigration status,
 * finances or photograph.
 *
 * The fixture is openly fictional and lives only here. It is never exported,
 * never imported by the page, and never added to SUCCESS_STORIES, so no test
 * data can become published content.
 */

/** A fictional story that satisfies every condition. Test scaffolding, not a WSA student. */
function completeStory(): SuccessStory {
  return {
    id: "fixture-only",
    identity: { kind: "named", displayName: "Test Fixture" },
    country: "Testland",
    goal: "A goal recorded in the case file.",
    decision: "The decision the adviser recorded.",
    supportProvided: "The support the case record shows was given.",
    outcome: "The outcome the evidence shows.",
    course: "Test Course",
    institution: "Test University",
    destination: "United Kingdom",
    adviser: "Recorded Adviser",
    quotation: "Words the student actually said.",
    photograph: { src: "/fixture.jpg", alt: "Fixture" },
    evidence: {
      reference: "CASE-FIXTURE-1",
      evidenceDate: "2026-01-01",
      reviewOwner: "Named Reviewer",
    },
    consent: {
      recorded: true,
      scope: ["website"],
      finalWordingApproved: true,
      finalVisualApproved: true,
      studentWasChild: false,
      parentOrGuardianConsent: false,
      withdrawn: false,
    },
    intendedLocations: ["website"],
    humanApprovalToPublish: true,
  };
}

describe("the shipped store", () => {
  it("contains no student stories, so nothing can be published by accident", () => {
    expect(SUCCESS_STORIES).toHaveLength(0);
  });

  it("yields nothing to the website", () => {
    expect(publishableStories(SUCCESS_STORIES, "website")).toHaveLength(0);
  });
});

describe("a story that satisfies every condition", () => {
  it("is publishable", () => {
    expect(decidePublication(completeStory(), "website").publishable).toBe(true);
  });
});

describe("consent", () => {
  it("REFUSES a story with no recorded consent", () => {
    const story = completeStory();
    story.consent.recorded = false;
    const decision = decidePublication(story, "website");
    expect(decision.publishable).toBe(false);
    expect(decision.code).toBe("consent_not_recorded");
  });

  it("REFUSES a withdrawn story even though every other condition still passes", () => {
    const story = completeStory();
    story.consent.withdrawn = true;
    const decision = decidePublication(story, "website");
    expect(decision.publishable).toBe(false);
    expect(decision.code).toBe("consent_withdrawn");
  });

  it("REFUSES a location the student did not consent to", () => {
    const story = completeStory();
    story.consent.scope = ["website"];
    const decision = decidePublication(story, "social");
    expect(decision.publishable).toBe(false);
    expect(decision.code).toBe("location_outside_consent_scope");
  });

  it("REFUSES when the student has not approved the final wording", () => {
    const story = completeStory();
    story.consent.finalWordingApproved = false;
    expect(decidePublication(story, "website").code).toBe("final_wording_not_approved");
  });

  it("REFUSES when the student has not approved the final visual", () => {
    const story = completeStory();
    story.consent.finalVisualApproved = false;
    expect(decidePublication(story, "website").code).toBe("final_visual_not_approved");
  });
});

describe("a child's story", () => {
  it("REFUSES without parent or guardian consent, even with the student's own consent recorded", () => {
    const story = completeStory();
    story.consent.studentWasChild = true;
    story.consent.parentOrGuardianConsent = false;
    const decision = decidePublication(story, "website");
    expect(decision.publishable).toBe(false);
    expect(decision.code).toBe("guardian_consent_missing");
  });

  it("is publishable once guardian consent is recorded", () => {
    const story = completeStory();
    story.consent.studentWasChild = true;
    story.consent.parentOrGuardianConsent = true;
    expect(decidePublication(story, "website").publishable).toBe(true);
  });
});

describe("evidence", () => {
  it("REFUSES a story whose facts trace to no case record", () => {
    const story = completeStory();
    story.evidence.reference = "";
    expect(decidePublication(story, "website").code).toBe("evidence_not_traceable");
  });

  it("REFUSES a reference of only whitespace, which is not a record", () => {
    const story = completeStory();
    story.evidence.reference = "   ";
    expect(decidePublication(story, "website").code).toBe("evidence_not_traceable");
  });

  it("REFUSES a story with no named review owner", () => {
    const story = completeStory();
    story.evidence.reviewOwner = "";
    expect(decidePublication(story, "website").code).toBe("review_owner_missing");
  });
});

describe("human release", () => {
  it("REFUSES a story no authorised human has approved, however complete the consent", () => {
    const story = completeStory();
    story.humanApprovalToPublish = false;
    const decision = decidePublication(story, "website");
    expect(decision.publishable).toBe(false);
    expect(decision.code).toBe("human_approval_missing");
  });

  it("means student consent alone does not publish a story", () => {
    const story = completeStory();
    story.humanApprovalToPublish = false;
    expect(story.consent.recorded).toBe(true);
    expect(decidePublication(story, "website").publishable).toBe(false);
  });
});

describe("withdrawal outranks everything", () => {
  it("is the reported reason even when consent is also missing", () => {
    const story = completeStory();
    story.consent.withdrawn = true;
    story.consent.recorded = false;
    expect(decidePublication(story, "website").code).toBe("consent_withdrawn");
  });
});

describe("filtering", () => {
  it("passes only the cleared stories through, and drops the rest", () => {
    const cleared = completeStory();
    const blocked = completeStory();
    blocked.id = "blocked";
    blocked.humanApprovalToPublish = false;

    const result = publishableStories([cleared, blocked], "website");
    expect(result.map(s => s.id)).toEqual(["fixture-only"]);
  });

  it("returns nothing when every story is blocked", () => {
    const blocked = completeStory();
    blocked.consent.recorded = false;
    expect(publishableStories([blocked], "website")).toHaveLength(0);
  });

  it("refuses every refusable story with a reason, never silently", () => {
    const blocked = completeStory();
    blocked.consent.recorded = false;
    const decision = decidePublication(blocked, "website");
    expect(decision.reason).toBeTruthy();
    expect(decision.code).toBeTruthy();
  });
});
