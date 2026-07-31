import { describe, expect, it } from "vitest";

// Mirror of the gating patterns in client/src/components/GatedVideoCard.tsx.
// Brief Section 14: only these four items are public without portal registration.
const PUBLIC_TITLE_PATTERNS = [
  /student journey/i,
  /personal statement/i,
  /apply for a phd/i,
  /work while you study/i,
];

function isPublicContent(title: string): boolean {
  return PUBLIC_TITLE_PATTERNS.some((re) => re.test(title));
}

describe("content gating (brief S14)", () => {
  it("keeps exactly the four brief-listed items public", () => {
    expect(isPublicContent("The Student Journey: From First Enquiry to Graduation")).toBe(true);
    expect(isPublicContent("Writing a Personal Statement: What UK Universities Expect")).toBe(true);
    expect(isPublicContent("How to Apply for a PhD: A Complete Guide for International Students")).toBe(true);
    expect(isPublicContent("Can You Work While You Study? UK Rules for International Students")).toBe(true);
  });

  it("gates all other Learning Hub / Podcast / Events videos", () => {
    const gatedTitles = [
      "UK Student Visa 2026–27 Guide",
      "Credibility Interviews: How to Prepare for Your CAS & UKVI Student Visa Interview",
      "Guide for International Students: UK Visa, Bank Statements, CAS & Health Charge",
      "Your Personal Guide to Applying for a UK English Study Visa",
      "How to Pass Your UK University Interview",
      "Ten Steps to UK University Success",
      "Study in Hungary 2026–2027: University of Debrecen Guide",
      "An Outstanding UK Study Opportunity: the University of Lincoln",
      "I Would Like to Introduce Aberystwyth University",
      "Introducing Juliet Nnajiofor-Uyi. Lagos, Nigeria",
      "Credibility Interviews: How to Prepare",
      "University CV: What Are They Looking For?",
    ];
    for (const title of gatedTitles) {
      expect(isPublicContent(title), `should be gated: ${title}`).toBe(false);
    }
  });
});
