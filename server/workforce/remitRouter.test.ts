import { describe, it, expect } from "vitest";
import { routeByRemit, outcomesIn } from "./remitRouter";
import { routeStaffRequest } from "./router";
import { REMITS, OUTCOMES, UNOWNED_OUTCOMES, producersOf } from "./remit";
import { normalise, conceptsIn, PROTECTED_WORDS, KNOWN_ABBREVIATIONS } from "./intent";
import { operationalStateOf, OUTCOME_CAPABILITY_MAP } from "./operationalState";
import { CONTROLLED_BASELINE, reconcile, ROUTING_MODEL_VERSION } from "./provenance";
import { listWorkers, getWorker } from "./registry";

/**
 * The nine production failures, as mandatory regression cases.
 *
 * Every one of these was typed into the live Staff Portal on 11 September
 * 2026 and either dropped or misrouted by the keyword router. They are the
 * specification for the remit router: not "does it route", but "does it
 * route THESE, for the reason it should".
 */
const PRODUCTION_CASES: [string, string | null, string?][] = [
  ["is the application ready even though discovery is missing?", "james", "the outcome asked for, not the earlier incomplete stage"],
  ["what scholarships could this student apply for", "harper", "scholarships, though 'apply' is in the sentence"],
  ["can this student afford the course", "harper"],
  ["website not ranking", "ethan", "search ranking, not league ranking"],
  ["what unis have we got", "amelia"],
  ["can this guy afford it", "harper"],
  ["can this particular student bring his wife?", "priya", "subject area plus human gate"],
  ["draft a post about the January intake", "nia", "approved drafting capability"],
  ["hey. give a list of cold leads", null, "genuinely unowned"],
];

/** Deliberately messy: spelling, shorthand, fragments, conversational. */
const MESSY_CASES: [string, string | null][] = [
  ["wat unis we got", "amelia"],
  ["scholrships for this studnt?", "harper"],
  ["app ready to send?", "james"],
  ["site not showing up on google", "ethan"],
  ["cold leads pls", null],
  ["can he afford it tho", "harper"],
  ["is the aplication complete", "james"],
  ["hey quick one, which unis do we work with", "amelia"],
  ["whats the visa rule on dependants", "priya"],
  ["write me an instagram caption for january", "nia"],
  ["give me some cold leads", null],
];

describe("the nine production failures now route correctly", () => {
  for (const [text, expected, why] of PRODUCTION_CASES) {
    it(`"${text}" -> ${expected ?? "nobody"}${why ? ` (${why})` : ""}`, () => {
      const d = routeByRemit(text);
      if (expected === null) {
        expect(d.matched).toBe(false);
        expect(d.responsibleWorkerId).toBeNull();
      } else {
        expect(d.responsibleWorkerId).toBe(expected);
      }
    });
  }

  it("the same answers come through the public router", () => {
    for (const [text, expected] of PRODUCTION_CASES) {
      const r = routeStaffRequest(text);
      expect(r.responsibleWorkerId ?? null).toBe(expected);
      expect(r.modelVersion).toBe(ROUTING_MODEL_VERSION);
    }
  });
});

describe("deliberately messy wording", () => {
  for (const [text, expected] of MESSY_CASES) {
    it(`"${text}" -> ${expected ?? "nobody"}`, () => {
      expect(routeByRemit(text).responsibleWorkerId ?? null).toBe(expected);
    });
  }
});

describe("the five-level priority", () => {
  it("level 1: the explicit outcome wins over pipeline position", () => {
    // Discovery is stage 2 and incomplete; the question is about stage 5.
    const d = routeByRemit("is the application ready even though discovery is missing?", { pipelineStage: 2 });
    expect(d.responsibleWorkerId).toBe("james");
    expect(d.decidedAt).not.toBe("pipeline_position");
  });

  it("level 2: an exclusion removes a worker even where words overlap", () => {
    // Nia's brief excludes SEO. "post" is hers; the outcome is Ethan's.
    const d = routeByRemit("our web page is not ranking in google search for the post");
    expect(d.responsibleWorkerId).toBe("ethan");
    expect(d.candidates).not.toContain("nia");
  });

  it("level 3 and 4 only narrow an already ambiguous field", () => {
    // A single-producer outcome is never reopened by context.
    const d = routeByRemit("can this student afford the course", { currentWorkerId: "james", pipelineStage: 5 });
    expect(d.responsibleWorkerId).toBe("harper");
  });

  it("level 5: keywords never select a worker the remit model did not consider", () => {
    for (const [text, expected] of PRODUCTION_CASES) {
      const d = routeByRemit(text);
      if (d.responsibleWorkerId) expect(d.candidates).toContain(d.responsibleWorkerId);
      if (expected) expect(d.decidedAt).not.toBe("keyword_tiebreak");
    }
  });
});

describe("subject ownership is separate from authority to conclude", () => {
  it("Priya receives the personalised question with a human gate, and does not lose it", () => {
    const d = routeByRemit("can this particular student bring his wife?");
    expect(d.responsibleWorkerId).toBe("priya");
    expect(d.matched).toBe(true);
    expect(d.humanGate).toMatch(/not authorised to answer it for a particular person/);
    expect(d.humanGate).toMatch(/authorised human/);
  });

  it("the same subject without a named person is her approved rule explanation", () => {
    const d = routeByRemit("whats the visa rule on dependants");
    expect(d.responsibleWorkerId).toBe("priya");
    expect(d.humanGate).toBeNull();
  });

  it("the gate is carried through the public router as status and next action", () => {
    const r = routeStaffRequest("can this particular student bring his wife?");
    expect(r.responsibleWorkerId).toBe("priya");
    expect(r.humanGate).not.toBeNull();
    expect(r.safeNextAction).toMatch(/not hers to make/);
  });
});

describe("three operational states, from the controlled records", () => {
  it("all ten substantive workers are approved and active; the three retired by merger are not listed", () => {
    const substantive = listWorkers().filter(w => w.specificationStatus === "approved");
    expect(substantive.length).toBe(10);
    expect(listWorkers({ includeRetired: true }).filter(w => w.staffPortalExecutionStatus === "retired_merged").map(w => w.id).sort()).toEqual(["daniel", "oliver", "olivia"]);
    for (const w of substantive) expect(operationalStateOf(w.id).state).toBe("approved_active");
  });

  it("Nia is approved for drafting and her account capability is shut", () => {
    expect(routeByRemit("draft a post about the January intake").matched).toBe(true);
    const d = routeByRemit("schedule that post for monday");
    expect(d.matched).toBe(false);
    expect(d.failure).toBe("remit_but_capability_closed");
    expect(d.candidates).toContain("nia");
    expect(d.status).toMatch(/Nia owns this work/);
    expect(d.status).toMatch(/NIA-G01/);
  });

  it("a recognised remit whose worker cannot take it is never called unowned", () => {
    const d = routeByRemit("schedule that post for monday");
    expect(d.status).not.toMatch(/No approved WSA worker owns/);
    expect(d.outcome).toBe("social_account_action");
  });

  it("every capability the map names exists on that worker", () => {
    for (const [outcome, cap] of Object.entries(OUTCOME_CAPABILITY_MAP)) {
      const owners = producersOf(outcome as never);
      const subjectOwners = REMITS.filter(r => r.identifiesButMayNotConclude.includes(outcome as never)).map(r => r.workerId);
      for (const w of [...owners, ...subjectOwners]) {
        expect(getWorker(w).capabilities.some(c => c.id === cap)).toBe(true);
      }
    }
  });
});

describe("unowned outcomes are evidenced, not convenient", () => {
  it("exactly two unowned outcomes, each citing the controlled record that shows nobody produces it", () => {
    expect(UNOWNED_OUTCOMES.map(u => u.outcome).sort()).toEqual(["cold_lead_prospecting", "management_information"]);
    const prospecting = UNOWNED_OUTCOMES.find(u => u.outcome === "cold_lead_prospecting")!;
    expect(prospecting.source.record).toMatch(/Full_Handover_2026-09-05/);
    expect(prospecting.source.clause).toMatch(/cold leads/);
    // CRM reporting: the per-worker read/write statement of 5 September names
    // no worker who counts or reports over the CRM.
    const reporting = UNOWNED_OUTCOMES.find(u => u.outcome === "management_information")!;
    expect(reporting.source.record).toMatch(/Full_Handover_2026-09-05/);
    expect(reporting.source.clause).toMatch(/per worker read and write statement/);
  });

  it("no remit produces an unowned outcome", () => {
    for (const u of UNOWNED_OUTCOMES) expect(producersOf(u.outcome)).toEqual([]);
  });

  it("the strong wording is used only for an evidenced gap", () => {
    expect(routeByRemit("give me some cold leads").status).toMatch(/No approved WSA worker owns that/);
    expect(routeByRemit("write me a poem about the weather in lagos").status).not.toMatch(/No approved WSA worker owns/);
    expect(routeByRemit("write me a poem about the weather in lagos").failure).toBe("no_recognised_intent");
  });
});

describe("the concept layer is lexical tolerance, not a keyword table", () => {
  it("repairs a misspelling toward a known word only", () => {
    expect(normalise("scholrship")).toEqual(["scholarship"]);
    expect(normalise("aplication")).toEqual(["application"]);
  });

  it("never repairs ordinary English into a WSA concept", () => {
    // The hazard found on the first run: "could" is one edit from "cold".
    expect(normalise("could")).toEqual(["could"]);
    expect(conceptsIn("what scholarships could this student apply for").has("cold")).toBe(false);
    for (const word of Array.from(PROTECTED_WORDS)) expect(normalise(word)).toEqual([word.length > 3 ? normalise(word)[0] : word]);
  });

  it("does not repair short words at all", () => {
    expect(normalise("fee")).toEqual(["fee"]);
    expect(normalise("fe")).toEqual(["fe"]);
  });

  it("the shorthand list stays small and is shorthand", () => {
    expect(Object.keys(KNOWN_ABBREVIATIONS).length).toBeLessThan(40);
    for (const [short, long] of Object.entries(KNOWN_ABBREVIATIONS)) expect(short.length).toBeLessThan(long.length + 1);
  });

  it("outcome ordering is by specificity, most specific first", () => {
    const ids = outcomesIn("is the application ready even though discovery is missing?");
    expect(ids[0]).toBe("application_readiness");
  });
});

describe("provenance: the code model cites, it does not decide", () => {
  it("every remit and exclusion names a controlled record, version, date and clause", () => {
    for (const r of REMITS) {
      for (const src of [r.source, r.approvalSource, ...r.excludes.map(e => e.source)]) {
        expect(src.record).toMatch(/\.docx$/);
        expect(src.version.length).toBeGreaterThan(0);
        expect(src.dated).toMatch(/2026/);
        expect(src.clause.length).toBeGreaterThan(5);
      }
    }
  });

  it("every remit covers a real worker and every outcome it produces exists", () => {
    const ids = new Set(listWorkers().map(w => w.id));
    const outcomes = new Set(OUTCOMES.map(o => o.id));
    for (const r of REMITS) {
      expect(ids.has(r.workerId)).toBe(true);
      for (const o of [...r.produces, ...r.identifiesButMayNotConclude, ...r.excludes.map(e => e.outcome)]) {
        expect(outcomes.has(o)).toBe(true);
      }
    }
  });

  it("Nia's and Priya's remits cite their bounded scopes specifically", () => {
    expect(REMITS.find(r => r.workerId === "nia")!.source.clause).toMatch(/Section 5, Nia/);
    expect(REMITS.find(r => r.workerId === "priya")!.source.clause).toMatch(/Section 4, Priya/);
  });

  it("a newer controlled record is a discrepancy, and the record wins", () => {
    const current = CONTROLLED_BASELINE.map(b => ({ record: b.record, version: b.version }));
    expect(reconcile(current).reconciled).toBe(true);
    current[1] = { record: current[1].record, version: "0.46" };
    const out = reconcile(current);
    expect(out.reconciled).toBe(false);
    expect(out.discrepancies[0].controlledRecordHolds).toBe("0.46");
    expect(out.discrepancies[0].effect).toMatch(/controlled record wins/i);
  });

  it("a record it could not see is unverified, not agreed", () => {
    const out = reconcile([]);
    expect(out.reconciled).toBe(false);
    expect(out.unverified.length).toBe(CONTROLLED_BASELINE.length);
  });
});

/**
 * Tom, 11 September 2026: "how many cold leads have we had in the last 12
 * months" was refused as prospecting. It is a count over records WSA
 * already holds. Nobody is approved to answer it either, but the two gaps
 * are different gaps, they are recorded differently, and the person asking
 * is told where the figure lives today.
 */
describe("a count over existing records is management information, not prospecting", () => {
  it("classifies the live question as management_information and hands it to the resolver", () => {
    const r = routeByRemit("how many cold leads have we had in the last 12 months");
    expect(r.outcome).toBe("management_information");
    expect(r.resolution).toBe("information");
    expect(r.failure).toBeNull();
    expect(r.responsibleWorkerId).toBeNull();
  });
  it("recognises counts of enquiries, students and applications too", () => {
    expect(routeByRemit("how many enquiries did we get last month").outcome).toBe("management_information");
    expect(routeByRemit("number of students at the CAS stage").outcome).toBe("management_information");
    expect(routeByRemit("how many applications went out this year").outcome).toBe("management_information");
  });
  it("still treats a request for new cold leads as prospecting", () => {
    expect(routeByRemit("give me some cold leads").outcome).toBe("cold_lead_prospecting");
    expect(routeByRemit("find cold leads for the January intake").outcome).toBe("cold_lead_prospecting");
  });
  it("routes no information question to any worker: the resolver answers, the gap is recorded, no remit is invented", () => {
    expect(routeByRemit("how many enquiries did we get last month").responsibleWorkerId).toBeNull();
  });
});

/**
 * Tom Arrington, 16 and 17 September 2026. A question about one student's
 * CRM record reached nobody by rule ("How is managing this lead? <name>"),
 * and "ar ethere any toms on pipedrive" reached nobody at all. These are
 * Sophie's by rule now, and a count over the CRM still is not.
 */
describe("a named student's CRM record is Sophie's, by rule (remit-1.3)", () => {
  const CASES: [string, string][] = [
    ["ar ethere any toms on pipedrive", "sophie"],
    ["are there any Toms on Pipedrive?", "sophie"],
    ["How is managing this lead?  Joyce Kitakang Federal Ministry of Environment Department of Forestry, Utako District, Abuja, Nigeria", "sophie"],
    ["Who is managing this lead? Joyce Kitakang", "sophie"],
    ["Who is the counsellor for Joyce Kitakang?", "sophie"],
    ["What stage is Joyce Kitakang at?", "sophie"],
    ["is Grace Okoro on the crm", "sophie"],
    ["who has this student", "sophie"],
    ["how is this lead getting on", "sophie"],
  ];
  for (const [text, expected] of CASES) {
    it(`"${text.slice(0, 60)}" -> ${expected}`, () => {
      const d = routeByRemit(text);
      expect(d.outcome).toBe("student_record_lookup");
      expect(d.responsibleWorkerId).toBe(expected);
      expect(routeStaffRequest(text).responsibleWorkerId).toBe(expected);
    });
  }

  it("a count over the CRM is still management information, not a record lookup", () => {
    expect(routeByRemit("how many leads are on pipedrive").outcome).toBe("management_information");
    expect(routeByRemit("how many students on the crm this month").outcome).toBe("management_information");
    expect(routeByRemit("how many people are on pipedrive").outcome).not.toBe("student_record_lookup");
  });

  it("does not take questions the other specialists own", () => {
    expect(routeByRemit("is the application ready even though discovery is missing?").responsibleWorkerId).toBe("james");
    expect(routeByRemit("can this particular student bring his wife?").responsibleWorkerId).toBe("priya");
    expect(routeByRemit("what unis do we have for this student").responsibleWorkerId).toBe("amelia");
    expect(routeByRemit("what scholarships could this student apply for").responsibleWorkerId).toBe("harper");
  });

  it("the routing model version was raised with the remit change", () => {
    expect(ROUTING_MODEL_VERSION).toBe("remit-1.3");
  });
});
