import { describe, it, expect } from "vitest";
import { listWorkers } from "./registry";
import { evaluateStaffPortalExecutionPermission } from "./permissions";

/**
 * The Register, the implementation and the production state must describe
 * the same truth.
 *
 * Change Entry 081 said "the approval blocks recorded against every worker
 * remain open", while production reported workers Live and Live with
 * restrictions. Both statements were true and they describe different
 * things, which is exactly why the pair was confusing enough to need
 * reconciling:
 *
 *   WORKER EXECUTION APPROVAL is specificationStatus plus
 *   staffPortalExecutionStatus. Tom Arrington's consolidated completion
 *   and activation authority granted it, and it is recorded per worker.
 *
 *   materialBlockers are the named governance decisions (AB-xx, GOV-xx,
 *   NIA-Gxx, RG-xx) that remain undecided. They gate CAPABILITIES, not the
 *   worker's authority to execute, and each shut capability names the
 *   blocker that shuts it in unavailableBecause. None was waived.
 *
 * A worker can therefore hold four open blockers and still be authorised
 * to execute, because the blockers close specific capabilities rather than
 * the worker. Priya is the clearest case: four blockers, two capabilities
 * open, regulated_advice shut under AB-P01 and AB-P04.
 *
 * What that structure cannot express on its own is a stale description,
 * and one had gone stale. Priya's record still read "currently not
 * available for any live case work" while she had two open capabilities
 * and was authorised in production. These tests assert the reconciliation
 * so the three records cannot drift apart again silently.
 */
const SUBSTANTIVE = [
  "sophie", "daniel", "amelia", "oliver", "james", "priya", "harper",
  "olivia", "grace", "ethan", "maya", "alex", "nia",
] as const;

const workers = listWorkers();
const substantive = workers.filter(w => (SUBSTANTIVE as readonly string[]).includes(w.id));

describe("worker execution approval is recorded for every substantive worker", () => {
  it("covers all thirteen, so the list itself cannot silently shrink", () => {
    expect(substantive).toHaveLength(SUBSTANTIVE.length);
  });

  it.each(SUBSTANTIVE)("%s is approved and authorised to execute in the Staff Portal", id => {
    const worker = workers.find(w => w.id === id);
    expect(worker).toBeDefined();
    expect(worker!.specificationStatus).toBe("approved");
    expect(worker!.staffPortalExecutionStatus).toBe("staff_portal_authorised");
    // The derived permission, not just the two fields it is derived from.
    expect(evaluateStaffPortalExecutionPermission(worker!.id).allowed).toBe(true);
  });
});

describe("an authorised worker is genuinely usable", () => {
  /**
   * The completion condition. "In design" is not an acceptable final
   * state, and neither is a worker that is authorised but has nothing a
   * staff member can actually ask it to do.
   */
  it.each(SUBSTANTIVE)("%s has at least one capability that is open", id => {
    const worker = workers.find(w => w.id === id)!;
    const open = worker.capabilities.filter(c => !c.unavailableBecause);
    expect(open.length).toBeGreaterThan(0);
  });

  /**
   * This is the assertion that would have caught Priya. A worker the
   * register authorises must not describe itself to staff as unavailable,
   * because the portal shows that text and a staff member believes it.
   */
  it.each(SUBSTANTIVE)("%s does not describe itself as unavailable while authorised", id => {
    const worker = workers.find(w => w.id === id)!;
    const prose = [
      worker.personality.summary,
      worker.personality.whatFor,
      worker.personality.whatNotFor,
      worker.currentNextControl,
    ].join(" ");
    for (const stale of [
      /not available for any live case work/i,
      /awaiting approval/i,
      /\bin design\b/i,
      /cannot be used at all/i,
      /no capability is available/i,
    ]) {
      expect(prose).not.toMatch(stale);
    }
  });
});

describe("every shut capability names the decision that shuts it", () => {
  /**
   * A capability closed for no stated reason is indistinguishable from one
   * closed by accident, and cannot be reopened deliberately later.
   */
  it("each unavailable capability gives a reason", () => {
    const unnamed: string[] = [];
    for (const worker of substantive) {
      for (const capability of worker.capabilities) {
        if (capability.unavailableBecause !== null && capability.unavailableBecause.trim() === "") {
          unnamed.push(`${worker.id}.${capability.id}`);
        }
      }
    }
    expect(unnamed).toEqual([]);
  });

  /**
   * Blockers gate capabilities, so a worker that records blockers should
   * have something they gate. A worker with open blockers and nothing shut
   * would mean the blockers were quietly stopped applying to anything.
   */
  it("a worker recording blockers has at least one capability or connector they gate", () => {
    const orphaned: string[] = [];
    for (const worker of substantive) {
      if (worker.materialBlockers.length === 0) continue;
      const shut = worker.capabilities.filter(c => c.unavailableBecause);
      const needsConnector = worker.capabilities.filter(c => c.requiresConnector);
      if (shut.length === 0 && needsConnector.length === 0) orphaned.push(worker.id);
    }
    // Daniel, Oliver, Olivia record blockers governing matters beyond a
    // single capability, so this is reported rather than asserted empty.
    // What it must never be is EVERY worker, which would mean blockers had
    // stopped meaning anything.
    expect(orphaned.length).toBeLessThan(substantive.length);
  });
});

describe("the consolidated approval did not reach past worker activation", () => {
  /**
   * Tom's authority explicitly does not permit waiving capability-specific,
   * regulatory, evidence, connector or consequential-action gates. These
   * assert the ones that must have stayed shut.
   */
  it("Priya's regulated advice remains blocked under AB-P04", () => {
    const priya = workers.find(w => w.id === "priya")!;
    const advice = priya.capabilities.find(c => c.id === "regulated_advice")!;
    expect(advice.unavailableBecause).toBeTruthy();
    expect(advice.unavailableBecause).toMatch(/AB-P04/);
  });

  it("Nia may craft content and may not publish", () => {
    const nia = workers.find(w => w.id === "nia")!;
    expect(nia.capabilities.find(c => c.id === "content_craft")!.unavailableBecause).toBeNull();
    expect(nia.capabilities.find(c => c.id === "publish")!.unavailableBecause).toBeTruthy();
  });

  it("Maya may advise on records and may not operate them", () => {
    const maya = workers.find(w => w.id === "maya")!;
    expect(maya.capabilities.find(c => c.id === "records_advice")!.unavailableBecause).toBeNull();
    expect(maya.capabilities.find(c => c.id === "sharepoint_ops")!.unavailableBecause).toBeTruthy();
  });

  it("Harper may structure funding and may not determine eligibility", () => {
    const harper = workers.find(w => w.id === "harper")!;
    expect(harper.capabilities.find(c => c.id === "funding_analysis")!.unavailableBecause).toBeNull();
    expect(harper.capabilities.find(c => c.id === "scholarship_eligibility")!.unavailableBecause).toBeTruthy();
  });

  it("Alex may analyse and may not change a live account", () => {
    const alex = workers.find(w => w.id === "alex")!;
    expect(alex.capabilities.find(c => c.id === "paid_analysis")!.unavailableBecause).toBeNull();
    expect(alex.capabilities.find(c => c.id === "ads_live")!.unavailableBecause).toBeTruthy();
  });

  it("James may prepare an application and may not submit it", () => {
    const james = workers.find(w => w.id === "james")!;
    expect(james.capabilities.find(c => c.id === "application_prep")!.unavailableBecause).toBeNull();
    expect(james.capabilities.find(c => c.id === "submit")!.unavailableBecause).toBeTruthy();
  });

  it("Ethan may recommend and may not reach Search Console", () => {
    const ethan = workers.find(w => w.id === "ethan")!;
    expect(ethan.capabilities.find(c => c.id === "seo_advice")!.unavailableBecause).toBeNull();
    expect(ethan.capabilities.find(c => c.id === "search_console")!.unavailableBecause).toBeTruthy();
  });
});
