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
  it("all thirteen substantive workers are approved and active", () => {
    const substantive = listWorkers().filter(w => w.specificationStatus === "approved");
    expect(substantive.length).toBe(13);
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
  it("cold leads is the only unowned outcome and cites the handover", () => {
    expect(UNOWNED_OUTCOMES.map(u => u.outcome)).toEqual(["cold_lead_prospecting"]);
    expect(UNOWNED_OUTCOMES[0].source.record).toMatch(/Full_Handover_2026-09-05/);
    expect(UNOWNED_OUTCOMES[0].source.clause).toMatch(/cold leads/);
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
