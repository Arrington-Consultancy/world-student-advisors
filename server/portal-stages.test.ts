import { describe, expect, it } from "vitest";
import { STAGE_DISPLAY, FALLBACK_STAGE_DISPLAY, TOTAL_STAGES, resolveStageDisplay } from "./portal-stages";

describe("portal-stages — stage_id-keyed config, never stage names", () => {
  it("resolves every live stage_id (16-21) to its own label/nextAction/position", () => {
    for (const [stageId, expected] of Object.entries(STAGE_DISPLAY)) {
      expect(resolveStageDisplay(Number(stageId))).toEqual(expected);
    }
  });

  it("falls back safely for an unmapped stage_id, never throwing or exposing raw wording", () => {
    expect(resolveStageDisplay(999)).toEqual(FALLBACK_STAGE_DISPLAY);
    expect(resolveStageDisplay(0)).toEqual(FALLBACK_STAGE_DISPLAY);
    expect(resolveStageDisplay(-1)).toEqual(FALLBACK_STAGE_DISPLAY);
  });

  it("positions are a contiguous 1..TOTAL_STAGES sequence with no gaps or duplicates", () => {
    const positions = Object.values(STAGE_DISPLAY).map(s => s.position).sort((a, b) => a - b);
    expect(positions).toEqual(Array.from({ length: TOTAL_STAGES }, (_, i) => i + 1));
  });

  it("the fallback display is not part of the numbered sequence", () => {
    expect(FALLBACK_STAGE_DISPLAY.position).toBe(0);
  });
});
