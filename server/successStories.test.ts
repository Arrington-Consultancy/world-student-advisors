import { describe, it, expect } from "vitest";
import {
  decidePublication,
  publishableStories,
  outstandingWithdrawals,
  SUCCESS_STORIES,
  type SuccessStory,
} from "../shared/successStories";

/**
 * The consent and evidence gate from
 * WSA_Student_Success_Story_and_Proof_Direction_2026-09-04_APPROVED.docx.
 *
 * Every condition is tested by removing exactly one thing from an otherwise
 * publishable story, so each check has to be doing its own work. A gate that
 * still passes when one of its conditions is deleted is not a gate, and the
 * material it would let through is a real student's immigration status,
 * finances or photograph.
 *
 * The fixture is openly fictional and lives only here. It is never exported,
 * never imported by the page and never added to SUCCESS_STORIES, so no test
 * data can become published content.
 */

const NOW = new Date("2026-09-04T12:00:00Z");

/** A fictional story satisfying every condition. Test scaffolding, not a WSA student. */
function completeStory(): SuccessStory {
  return {
    id: "fixture-only",
    identity: { kind: "named", displayName: "Test Fixture" },
    country: "Testland",
    goal: "A goal recorded in the case file.",
    decision: "The decision the adviser recorded.",
    supportProvided: "The support the case record shows was given.",
    outcome: "The outcome the evidence shows.",
    nextStep: "What the student said they hope to do next.",
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
      duration: { from: "2026-01-01", until: "2027-01-01" },
      finalWordingApproved: true,
      finalVisualApproved: true,
      studentWasChild: false,
      parentOrGuardianConsent: false,
    },
    publication: { status: "approved", publishedLocations: [] },
    outcomeClaimsVerified: true,
    includesSensitiveData: false,
    sensitiveDataAuthority: "",
    claimsRegulatedImmigrationAdvice: false,
    regulatedAdviceAuthority: "",
    humanApprovalToPublish: true,
  };
}

describe("the shipped store", () => {
  it("contains no student stories, so nothing can be published by accident", () => {
    expect(SUCCESS_STORIES).toHaveLength(0);
  });

  it("yields nothing to the website", () => {
    expect(publishableStories(SUCCESS_STORIES, "website", NOW)).toHaveLength(0);
  });
});

describe("the approved state", () => {
  it("publishes a story that satisfies every condition", () => {
    expect(decidePublication(completeStory(), "website", NOW).publishable).toBe(true);
  });

  it("carries no refusal code when it passes", () => {
    const decision = decidePublication(completeStory(), "website", NOW);
    expect(decision.code).toBeUndefined();
  });
});

describe("consent", () => {
  it("REFUSES a story with no recorded consent", () => {
    const story = completeStory();
    story.consent.recorded = false;
    expect(decidePublication(story, "website", NOW).code).toBe("consent_not_recorded");
  });

  it("REFUSES a location the student did not consent to", () => {
    const story = completeStory();
    story.consent.scope = ["website"];
    expect(decidePublication(story, "social", NOW).code).toBe("location_outside_consent_scope");
  });

  it("REFUSES when the student has not approved the final wording", () => {
    const story = completeStory();
    story.consent.finalWordingApproved = false;
    expect(decidePublication(story, "website", NOW).code).toBe("final_wording_not_approved");
  });

  it("REFUSES when the student has not approved the final visual", () => {
    const story = completeStory();
    story.consent.finalVisualApproved = false;
    expect(decidePublication(story, "website", NOW).code).toBe("final_visual_not_approved");
  });
});

describe("consent duration", () => {
  it("REFUSES once the recorded duration has ended", () => {
    const story = completeStory();
    story.consent.duration = { from: "2025-01-01", until: "2026-01-01" };
    expect(decidePublication(story, "website", NOW).code).toBe("consent_expired");
  });

  it("allows a story still inside its duration", () => {
    const story = completeStory();
    story.consent.duration = { from: "2026-01-01", until: "2026-12-31" };
    expect(decidePublication(story, "website", NOW).publishable).toBe(true);
  });

  it("allows an explicitly indefinite consent", () => {
    const story = completeStory();
    story.consent.duration = { from: "2026-01-01", until: null };
    expect(decidePublication(story, "website", NOW).publishable).toBe(true);
  });

  it("REFUSES an unparseable end date rather than treating it as open ended", () => {
    const story = completeStory();
    story.consent.duration = { from: "2026-01-01", until: "not a date" };
    expect(decidePublication(story, "website", NOW).code).toBe("consent_expired");
  });
});

describe("a child's story", () => {
  it("REFUSES without parent or guardian approval, even with the student's own consent recorded", () => {
    const story = completeStory();
    story.consent.studentWasChild = true;
    story.consent.parentOrGuardianConsent = false;
    expect(decidePublication(story, "website", NOW).code).toBe("guardian_consent_missing");
  });

  it("is publishable once guardian approval is recorded", () => {
    const story = completeStory();
    story.consent.studentWasChild = true;
    story.consent.parentOrGuardianConsent = true;
    expect(decidePublication(story, "website", NOW).publishable).toBe(true);
  });
});

describe("sensitive personal data", () => {
  it("REFUSES immigration, financial, health or safeguarding detail with no specific authority", () => {
    const story = completeStory();
    story.includesSensitiveData = true;
    story.sensitiveDataAuthority = "";
    expect(decidePublication(story, "website", NOW).code).toBe("sensitive_data_without_authority");
  });

  it("REFUSES an authority of only whitespace, which is not an authority", () => {
    const story = completeStory();
    story.includesSensitiveData = true;
    story.sensitiveDataAuthority = "   ";
    expect(decidePublication(story, "website", NOW).code).toBe("sensitive_data_without_authority");
  });

  it("allows it once specific authority is recorded", () => {
    const story = completeStory();
    story.includesSensitiveData = true;
    story.sensitiveDataAuthority = "AUTH-REF-1";
    expect(decidePublication(story, "website", NOW).publishable).toBe(true);
  });
});

describe("regulated immigration advice", () => {
  it("REFUSES a claim WSA gives regulated immigration advice without controlled authority", () => {
    const story = completeStory();
    story.claimsRegulatedImmigrationAdvice = true;
    story.regulatedAdviceAuthority = "";
    expect(decidePublication(story, "website", NOW).code).toBe(
      "regulated_advice_claim_without_authority",
    );
  });

  it("allows the claim where the controlled authority expressly permits it", () => {
    const story = completeStory();
    story.claimsRegulatedImmigrationAdvice = true;
    story.regulatedAdviceAuthority = "CONTROLLED-AUTH-1";
    expect(decidePublication(story, "website", NOW).publishable).toBe(true);
  });
});

describe("outcome claims", () => {
  it("REFUSES unverified visa, admission, employment or career claims", () => {
    const story = completeStory();
    story.outcomeClaimsVerified = false;
    expect(decidePublication(story, "website", NOW).code).toBe("outcome_claims_unverified");
  });
});

describe("evidence", () => {
  it("REFUSES a story whose facts trace to no case record", () => {
    const story = completeStory();
    story.evidence.reference = "";
    expect(decidePublication(story, "website", NOW).code).toBe("evidence_not_traceable");
  });

  it("REFUSES a reference of only whitespace, which is not a record", () => {
    const story = completeStory();
    story.evidence.reference = "   ";
    expect(decidePublication(story, "website", NOW).code).toBe("evidence_not_traceable");
  });

  it("REFUSES a story with no named review owner", () => {
    const story = completeStory();
    story.evidence.reviewOwner = "";
    expect(decidePublication(story, "website", NOW).code).toBe("review_owner_missing");
  });
});

describe("human release", () => {
  it("REFUSES a story no authorised human has approved, however complete the consent", () => {
    const story = completeStory();
    story.humanApprovalToPublish = false;
    const decision = decidePublication(story, "website", NOW);
    expect(decision.publishable).toBe(false);
    expect(decision.code).toBe("human_approval_missing");
  });

  it("means student consent alone does not publish a story", () => {
    const story = completeStory();
    story.humanApprovalToPublish = false;
    expect(story.consent.recorded).toBe(true);
    expect(decidePublication(story, "website", NOW).publishable).toBe(false);
  });
});

describe("withdrawal", () => {
  it("REFUSES a withdrawn story even though every other condition still passes", () => {
    const story = completeStory();
    story.withdrawal = { requestedDate: "2026-09-01", removalComplete: false };
    const decision = decidePublication(story, "website", NOW);
    expect(decision.publishable).toBe(false);
    expect(decision.code).toBe("consent_withdrawn");
  });

  it("REFUSES on a withdrawn publication status alone", () => {
    const story = completeStory();
    story.publication.status = "withdrawn";
    expect(decidePublication(story, "website", NOW).code).toBe("consent_withdrawn");
  });

  it("stays refused after removal is complete, so a withdrawal is never reversed by tidying up", () => {
    const story = completeStory();
    story.withdrawal = {
      requestedDate: "2026-09-01",
      removalComplete: true,
      completedDate: "2026-09-02",
    };
    expect(decidePublication(story, "website", NOW).code).toBe("consent_withdrawn");
  });

  it("is the reported reason even when consent is also missing", () => {
    const story = completeStory();
    story.withdrawal = { requestedDate: "2026-09-01", removalComplete: false };
    story.consent.recorded = false;
    expect(decidePublication(story, "website", NOW).code).toBe("consent_withdrawn");
  });

  it("surfaces a requested withdrawal that has not been actioned everywhere", () => {
    const story = completeStory();
    story.withdrawal = { requestedDate: "2026-09-01", removalComplete: false };
    expect(outstandingWithdrawals([story]).map(s => s.id)).toEqual(["fixture-only"]);
  });

  it("stops surfacing it once removal is complete in every location", () => {
    const story = completeStory();
    story.withdrawal = {
      requestedDate: "2026-09-01",
      removalComplete: true,
      completedDate: "2026-09-02",
    };
    expect(outstandingWithdrawals([story])).toHaveLength(0);
  });

  it("does not surface a story with no withdrawal at all", () => {
    expect(outstandingWithdrawals([completeStory()])).toHaveLength(0);
  });
});

describe("filtering", () => {
  it("passes only the cleared stories through, and drops the rest", () => {
    const cleared = completeStory();
    const blocked = completeStory();
    blocked.id = "blocked";
    blocked.humanApprovalToPublish = false;

    expect(publishableStories([cleared, blocked], "website", NOW).map(s => s.id)).toEqual([
      "fixture-only",
    ]);
  });

  it("returns nothing when every story is blocked", () => {
    const blocked = completeStory();
    blocked.consent.recorded = false;
    expect(publishableStories([blocked], "website", NOW)).toHaveLength(0);
  });

  it("refuses every refusable story with a reason, never silently", () => {
    const blocked = completeStory();
    blocked.consent.recorded = false;
    const decision = decidePublication(blocked, "website", NOW);
    expect(decision.reason).toBeTruthy();
    expect(decision.code).toBeTruthy();
  });
});
