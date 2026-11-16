import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CREDIBILITY_CONCERNS, DOCUMENT_NAMING, JOURNEY_SOURCE, JOURNEY_STEPS,
  MOCK_INTERVIEW_ASSESSMENT, MOCK_INTERVIEW_RECORDING_REQUIRES_CONSENT, NEVER,
  PARTNER_MATCHING, QUALIFICATION_GATES, READINESS_BANDS, STAGES, STUDENT_SAFE,
  isQualifiedForDeal, isWellNamedDocument,
} from "./studentJourney";

/**
 * The student journey record, checked against the two ways a transcription
 * like this goes wrong: it quietly becomes an authority it was never given,
 * or it leaks to the people it was explicitly not written for.
 */

describe("what this record is, and is not", () => {
  it("records itself as intent rather than an approved standard", () => {
    // The source opens "WSA intends to build". Anything that reads this as
    // settled policy is reading it wrong, so it says so in its own data.
    expect(JOURNEY_SOURCE.status).toBe("working_draft_statement_of_intent");
    expect(JOURNEY_SOURCE.dated).toBe("14 September 2026");
    expect(JOURNEY_SOURCE.confidential).toBe(true);
  });

  it("authorises nothing: it imports nothing and calls no permission machinery", () => {
    const src = readFileSync(new URL("./studentJourney.ts", import.meta.url), "utf8");
    // Comments are allowed to name the thing that does authorise execution —
    // saying where authority actually lives is the point. The code is not.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    for (const forbidden of ["evaluateStaffPortalExecutionPermission", "executeAction", "grantPermission"]) {
      expect(code, forbidden).not.toContain(forbidden);
    }
    // A pure record: it pulls in no module, so it can enable nothing.
    expect(code).not.toMatch(/^\s*import\s/m);
  });
});

describe("the journey and its stages", () => {
  it("runs Lead to Arrival in the source's order", () => {
    expect(JOURNEY_STEPS).toEqual([
      "lead", "claudia_qualifies", "student_deal", "counsellor", "application",
      "offer", "finance", "cas", "visa", "arrival",
    ]);
  });

  it("has eight stages, numbered in order, each with a named owner", () => {
    expect(STAGES).toHaveLength(8);
    expect(STAGES.map(s => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const s of STAGES) {
      // "the team" owns nothing. Every stage names a person or a role.
      expect(s.owner.length, s.stage).toBeGreaterThan(3);
      expect(s.purpose.length, s.stage).toBeGreaterThan(40);
    }
  });

  it("puts Claudia on lead qualification and a counsellor on everything after", () => {
    expect(STAGES[0].owner).toContain("Claudia Ingado");
    expect(STAGES[0].owner).toContain("Student Recruitment and Relationship Manager");
    for (const s of STAGES.slice(1)) expect(s.owner, s.stage).toContain("Counsellor");
  });
});

describe("a Lead becomes a Deal only on all four gates", () => {
  it("names the four the source names", () => {
    expect(QUALIFICATION_GATES).toEqual([
      "course_identified", "university_identified", "finance_established",
      "student_committed_to_proceeding",
    ]);
  });

  it("refuses three out of four, whichever three", () => {
    expect(isQualifiedForDeal(QUALIFICATION_GATES)).toBe(true);
    for (const missing of QUALIFICATION_GATES) {
      const three = QUALIFICATION_GATES.filter(g => g !== missing);
      expect(isQualifiedForDeal(three), `missing ${missing}`).toBe(false);
    }
    expect(isQualifiedForDeal([])).toBe(false);
  });

  it("is not fooled by the same gate counted four times", () => {
    expect(isQualifiedForDeal(["finance_established", "finance_established", "finance_established", "finance_established"])).toBe(false);
  });
});

describe("document naming", () => {
  it("accepts every example the source accepts", () => {
    for (const name of DOCUMENT_NAMING.accepted) {
      expect(isWellNamedDocument(name, "Olu Obi"), name).toBe(true);
    }
  });

  it("rejects every example the source rejects", () => {
    for (const name of DOCUMENT_NAMING.rejected) {
      expect(isWellNamedDocument(name, "Olu Obi"), name).toBe(false);
    }
  });

  it("rejects the right name against the wrong student", () => {
    expect(isWellNamedDocument("Olu Obi - CV", "Ada Nwosu")).toBe(false);
  });

  it("rejects a name with nothing after the separator", () => {
    expect(isWellNamedDocument("Olu Obi -", "Olu Obi")).toBe(false);
    expect(isWellNamedDocument("Olu Obi - ", "Olu Obi")).toBe(false);
  });
});

describe("course and partner matching", () => {
  it("must show where a recommendation came from and when", () => {
    expect(PARTNER_MATCHING.mustShowSourceDocumentAndDate).toBe(true);
    expect(PARTNER_MATCHING.mustNotUseOutdatedOrSupersededInformation).toBe(true);
  });

  it("leaves the final choice to people and prefers WSA direct partners", () => {
    expect(PARTNER_MATCHING.finalSelectionIsHuman).toBe(true);
    expect(PARTNER_MATCHING.prioritiseDirectPartners).toBe(true);
  });

  it("reads only the PARTNERS section", () => {
    expect(PARTNER_MATCHING.source).toContain("PARTNERS");
  });

  it("returns a fee and a total cost, not just a course name", () => {
    for (const field of ["tuition fee", "estimated overall study cost", "key entry requirements"]) {
      expect(PARTNER_MATCHING.returns).toContain(field);
    }
  });
});

describe("the lines the source draws hardest", () => {
  it("never writes the student's story or their answers", () => {
    const joined = NEVER.join(" | ");
    expect(joined).toContain("manufacture a student's personal story");
    expect(joined).toContain("provide artificial answers");
    expect(joined).toContain("write model answers");
  });

  it("never promises an interview can be avoided, or predicts selection", () => {
    const joined = NEVER.join(" | ");
    expect(joined).toContain("guarantee a UKVI interview will be avoided");
    expect(joined).toContain("predict whether a student will be selected");
  });

  it("keeps the internal report and the student note as two different things", () => {
    expect(CREDIBILITY_CONCERNS.length).toBeGreaterThan(5);
    expect(CREDIBILITY_CONCERNS.join(" ")).toContain("unexplained gaps");
  });
});

describe("the mock interview", () => {
  it("assesses the eight things the source lists", () => {
    expect(MOCK_INTERVIEW_ASSESSMENT).toHaveLength(8);
    expect(MOCK_INTERVIEW_ASSESSMENT.map(c => c.criterion)).toEqual([
      "naturalness", "depth_of_knowledge", "evidence_of_research",
      "personal_credibility", "consistency", "rehearsal_risk",
      "ai_or_stock_answer_risk", "failure_to_answer",
    ]);
  });

  it("records only with the student's consent", () => {
    expect(MOCK_INTERVIEW_RECORDING_REQUIRES_CONSENT).toBe(true);
  });

  it("treats an AI-sounding answer as a warning, never as proof", () => {
    const risk = MOCK_INTERVIEW_ASSESSMENT.find(c => c.criterion === "ai_or_stock_answer_risk")!;
    expect(risk.asks).toContain("never proof");
  });

  it("has three readiness bands and no fourth", () => {
    expect(Object.keys(READINESS_BANDS)).toEqual(["GREEN", "AMBER", "RED"]);
  });
});

/**
 * The source says the methodology, dashboard logic, assessment prompts and
 * scoring criteria are not to be given to students, universities, partners
 * or competitors. The way that promise gets broken is not a decision, it is
 * an import: one line in a client file and the whole thing ships to every
 * browser that loads the site.
 */
describe("confidentiality", () => {
  const clientFiles: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry)) clientFiles.push(full);
    }
  })(new URL("../../client/src", import.meta.url).pathname);

  it("is not imported by anything that ships to a browser", () => {
    expect(clientFiles.length).toBeGreaterThan(50);
    for (const file of clientFiles) {
      expect(readFileSync(file, "utf8"), file).not.toContain("studentJourney");
    }
  });

  it("none of its internal wording appears in client source", () => {
    const leaks = [
      "rehearsal_risk", "ai_or_stock_answer_risk",
      "Not currently interview ready", "Potentially credible but further preparation required",
    ];
    for (const file of clientFiles) {
      const src = readFileSync(file, "utf8");
      for (const leak of leaks) expect(src, `${leak} in ${file}`).not.toContain(leak);
    }
  });

  it("offers one cleared sentence for a student, which promises nothing", () => {
    expect(STUDENT_SAFE).toContain("The answers have to be yours");
    expect(STUDENT_SAFE).toContain("nobody can tell you in advance");
    for (const word of ["guarantee", "guaranteed", "will pass", "success rate"]) {
      expect(STUDENT_SAFE.toLowerCase()).not.toContain(word);
    }
  });
});
