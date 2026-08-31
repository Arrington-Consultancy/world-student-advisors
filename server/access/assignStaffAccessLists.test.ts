import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  FUNCTIONAL_SCOPES,
  ACTION_PERMISSIONS,
  SENSITIVE_OVERLAYS,
} from "./accessControl";

/**
 * scripts/assign-staff-access.mjs keeps its own copy of the approved
 * access lists, because it is plain .mjs and cannot import this
 * TypeScript module. A copy is a liability, and this file is the guard.
 *
 * It is not hypothetical. social_media was added to the approved
 * functional scopes when Nia was built, and was never added to the
 * script. For as long as that lasted, no staff member could be granted
 * social_media through the controlled assignment route, so Nia refused
 * every named user with "functional scope social_media is not granted to
 * this staff member". Nothing was wrong with the worker or with the
 * permission engine; the assignment path simply could not express the
 * permission she required, and nothing anywhere said so.
 *
 * A missing scope fails closed, which is the right direction, but it
 * fails silently and it looks exactly like a deliberate access decision.
 * That is why this compares the lists rather than trusting them.
 */
const SCRIPT = path.resolve(import.meta.dirname, "../../scripts/assign-staff-access.mjs");
const source = readFileSync(SCRIPT, "utf8");

/** Pulls one `const NAME = [ ... ];` list out of the script as strings. */
function listFromScript(name: string): string[] {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!match) throw new Error(`${name} was not found in assign-staff-access.mjs`);
  return [...match[1].matchAll(/"([a-z_]+)"/g)].map(m => m[1]);
}

describe("the assignment script's copies match the approved lists", () => {
  it("has every functional scope, and no invented one", () => {
    expect(listFromScript("FUNCTIONAL_SCOPES").sort()).toEqual([...FUNCTIONAL_SCOPES].sort());
  });

  it("has every action permission, and no invented one", () => {
    expect(listFromScript("ACTION_PERMISSIONS").sort()).toEqual([...ACTION_PERMISSIONS].sort());
  });

  it("has every sensitive overlay, and no invented one", () => {
    expect(listFromScript("SENSITIVE_OVERLAYS").sort()).toEqual([...SENSITIVE_OVERLAYS].sort());
  });

  /**
   * Named specifically, because a general "the lists match" assertion
   * would go green again the moment someone regenerated both from the
   * same wrong source. This one names the scope that was actually lost.
   */
  it("can grant social_media, the scope Nia requires", () => {
    expect(FUNCTIONAL_SCOPES).toContain("social_media");
    expect(listFromScript("FUNCTIONAL_SCOPES")).toContain("social_media");
  });
});

describe("every worker's scope is one a staff member can actually be granted", () => {
  it("leaves no worker unreachable through the controlled assignment route", async () => {
    // The real property. A worker whose required scope cannot be assigned
    // is a worker nobody can ever use, however correct the worker is.
    const { WORKER_FUNCTIONAL_SCOPE } = await import("./workerScope");
    const grantable = new Set(listFromScript("FUNCTIONAL_SCOPES"));
    const unreachable = Object.entries(WORKER_FUNCTIONAL_SCOPE)
      .filter(([, scope]) => !grantable.has(scope))
      .map(([worker, scope]) => `${worker} needs ${scope}`);
    expect(unreachable).toEqual([]);
  });
});
