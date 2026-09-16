import { describe, expect, it } from "vitest";
import { directoryFor, HIDDEN_FROM_DIRECTORY } from "../../shared/staffDirectory";
import { listWorkers } from "./registry";

/**
 * Tom Arrington, 16 September 2026: Ask WSA AI is the default; manual
 * selection is behind "Choose a specialist" and shows only what the member
 * can reach. Presentation only: these tests also pin that the function
 * never invents reachability and never removes a worker from the roster.
 */
describe("Staff Portal specialist directory", () => {
  const roster = listWorkers().map(w => ({ id: w.id, name: w.canonicalName, reachableByYou: false }));

  it("hides the receptionist, governance and core brain functions, and nothing else, when no scope is resolved", () => {
    const { workers, mode } = directoryFor(roster);
    expect(mode).toBe("all");
    expect(workers.map(w => w.id)).toEqual(roster.filter(w => !HIDDEN_FROM_DIRECTORY.has(w.id)).map(w => w.id));
    expect(workers.length).toBe(13);
  });

  it("shows only the specialists the member can reach when any are reachable", () => {
    const mine = roster.map(w => ({ ...w, reachableByYou: w.id === "james" || w.id === "priya" }));
    const { workers, mode } = directoryFor(mine);
    expect(mode).toBe("reachable");
    expect(workers.map(w => w.id).sort()).toEqual(["james", "priya"]);
  });

  it("never lets a hidden function through, even if marked reachable", () => {
    const odd = roster.map(w => ({ ...w, reachableByYou: true }));
    const { workers } = directoryFor(odd);
    for (const w of workers) expect(HIDDEN_FROM_DIRECTORY.has(w.id)).toBe(false);
    expect(workers.length).toBe(13);
  });

  it("does not reorder or rename anyone: the roster order from the register is kept", () => {
    const mine = roster.map(w => ({ ...w, reachableByYou: ["ethan", "sophie", "alex"].includes(w.id) }));
    const ids = directoryFor(mine).workers.map(w => w.id);
    const expected = roster.filter(w => ["ethan", "sophie", "alex"].includes(w.id)).map(w => w.id);
    expect(ids).toEqual(expected);
  });
});
