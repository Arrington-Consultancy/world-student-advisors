import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { isGap, acceptableCaseReference, READS_BACK_INTO_ROUTING } from "./routingGap";
import { routeStaffRequest } from "./router";

const HERE = import.meta.dirname;
const gapSrc = readFileSync(path.resolve(HERE, "routingGap.ts"), "utf8");
const routerSrc = readFileSync(path.resolve(HERE, "router.ts"), "utf8");
const remitRouterSrc = readFileSync(path.resolve(HERE, "remitRouter.ts"), "utf8");
const remitSrc = readFileSync(path.resolve(HERE, "remit.ts"), "utf8");
const routers = readFileSync(path.resolve(HERE, "../routers.ts"), "utf8");
const reception = readFileSync(path.resolve(HERE, "../../client/src/components/workforce/Receptionist.tsx"), "utf8");
const migration = readFileSync(path.resolve(HERE, "../../drizzle/0015_routing_gap_log.sql"), "utf8");

describe("what counts as a gap", () => {
  it("an unmatched request is a gap", () => {
    expect(isGap(routeStaffRequest("give me some cold leads"))).toBe(true);
    expect(isGap(routeStaffRequest("write me a poem about lagos"))).toBe(true);
  });
  it("a recognised remit with a closed capability is a gap", () => {
    expect(isGap(routeStaffRequest("schedule that post for monday"))).toBe(true);
  });
  it("a confident route to an available worker is not", () => {
    expect(isGap(routeStaffRequest("what unis have we got"))).toBe(false);
  });
});

describe("data minimisation", () => {
  it("a case reference must look like an identifier", () => {
    expect(acceptableCaseReference("CASE-2026-0142")).toBe("CASE-2026-0142");
    expect(acceptableCaseReference("Amara Okafor, passport 1234")).toBeNull();
    expect(acceptableCaseReference("a".repeat(61))).toBeNull();
    expect(acceptableCaseReference(null)).toBeNull();
  });
  it("the table holds an identifier-sized reference and no student fields", () => {
    expect(migration).toMatch(/`caseReference` VARCHAR\(60\)/);
    for (const forbidden of ["email", "phone", "passport", "dateOfBirth", "studentName"]) {
      expect(migration.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

describe("the log never becomes governance", () => {
  it("nothing in routing imports the gap log", () => {
    expect(READS_BACK_INTO_ROUTING).toBe(false);
    expect(routerSrc).not.toMatch(/routingGap/);
    expect(remitRouterSrc).not.toMatch(/routingGap/);
    expect(remitSrc).not.toMatch(/routingGap|getDb/);
  });
  it("a staff correction is recorded as a misclassification, never as a remit", () => {
    expect(gapSrc).toMatch(/router_misclassification_corrected/);
    expect(gapSrc).not.toMatch(/REMITS\.push|produces\.push/);
  });
  it("the review outcomes are the four Tom named", () => {
    expect(routers).toMatch(/z\.enum\(\["router_defect", "worker_or_access_defect", "out_of_scope", "governance_proposal"\]\)/);
  });
  it("the review view is behind access_admin", () => {
    const start = routers.indexOf("routingGaps: publicProcedure");
    expect(routers.slice(start, start + 400)).toMatch(/requireAccessAdmin\(input\.token\)/);
  });
});

describe("every failed route is written, with the fields Tom listed", () => {
  it("the route procedure writes a gap with exact wording and identity", () => {
    const start = routers.indexOf("    route: publicProcedure");
    const body = routers.slice(start, start + 2500);
    expect(body).toMatch(/isGap\(result\)/);
    expect(body).toMatch(/recordRoutingGap\(\s*input\.request,\s*result/);
    expect(body).toMatch(/staffUserId, authMethod: session\.authMethod/);
  });
  it("the row carries intent, candidates, confidence, failure type, reason and router version", () => {
    for (const field of ["interpretedIntent: result.outcome", "candidateWorkerIds: result.candidates.join", "confidence: result.confidence", "failureType", "failureReason", "routerVersion: result.modelVersion"]) {
      expect(gapSrc).toContain(field);
    }
  });
  it("the correction re-runs the router rather than trusting the browser's account of it", () => {
    const start = routers.indexOf("routingCorrect: publicProcedure");
    expect(routers.slice(start, start + 2000)).toMatch(/const result = routeStaffRequest\(input\.request\)/);
  });
});

describe("the specialist directory", () => {
  it("a reachable worker is a whole-card button with a chevron and a focus ring", () => {
    const card = reception.slice(reception.indexOf("function DirectoryCard"), reception.indexOf("export function Receptionist"));
    expect(card).toMatch(/<button[\s\S]*onClick=\{\(\) => onOpen\(worker\)\}/);
    expect(card).toMatch(/cursor-pointer/);
    expect(card).toMatch(/focus-visible:ring-2/);
    expect(card).toMatch(/<ChevronRight/);
  });
  it("an unreachable worker is inert and says why", () => {
    const card = reception.slice(reception.indexOf("function DirectoryCard"), reception.indexOf("export function Receptionist"));
    expect(card).toMatch(/const reachable = worker\.reachableByYou && worker\.canOpenForLiveExecution/);
    expect(card).toMatch(/aria-disabled="true"/);
    expect(card).toMatch(/Not in your access/);
  });
  it("reachability is decided on the server from the resolved profile", () => {
    const start = routers.indexOf("listWorkers: publicProcedure");
    expect(routers.slice(start, start + 1800)).toMatch(/reachableByYou: scopes\.has\(WORKER_FUNCTIONAL_SCOPE\[w\.id\]\)/);
  });
  it("a corrected route carries the same verbatim request into the chosen worker", () => {
    expect(reception).toMatch(/initialRequest=\{submitted \|\| undefined\}/);
    expect(reception).toMatch(/correctedWorkerId: worker\.id/);
  });
});
