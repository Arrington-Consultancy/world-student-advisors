/**
 * Student-facing stage display, keyed by the real, live Pipedrive Deal
 * stage_id — confirmed 2026-08-09 against /stages (the account's one
 * pipeline, pipeline_id=3). Never keyed by stage name: Glenice is actively
 * reviewing/renaming the Lead→Deal→Enrol→Invoice process, so names are
 * expected to change under this. An unmapped stage_id (added or
 * renumbered since) falls back to FALLBACK_STAGE_DISPLAY rather than ever
 * exposing raw internal Pipedrive wording to a student.
 */
export interface StageDisplay {
  label: string;
  nextAction: string;
  /** Position in the 1..TOTAL_STAGES progress sequence. 0 means "not on
   * the sequence" — the pre-conversion Lead state and the unknown-stage
   * fallback both use 0; a client must not render either as a numbered step. */
  position: number;
}

export const STAGE_DISPLAY: Record<number, StageDisplay> = {
  16: { label: "Destination Guidance", nextAction: "Confirming your destination", position: 1 },
  17: { label: "Application Discussion", nextAction: "Preparing your application", position: 2 },
  18: { label: "Application Preparation", nextAction: "Finalising your application", position: 3 },
  19: { label: "Application Submitted", nextAction: "Awaiting a university decision", position: 4 },
  20: { label: "Offers & Conditions", nextAction: "Reviewing your offer", position: 5 },
  21: { label: "CAS / Visa / Pre-Departure", nextAction: "Preparing for your visa and travel", position: 6 },
};

export const TOTAL_STAGES = Object.keys(STAGE_DISPLAY).length;

export const FALLBACK_STAGE_DISPLAY: StageDisplay = {
  label: "In progress",
  nextAction: "Your counsellor will be in touch with the next steps",
  position: 0,
};

export function resolveStageDisplay(stageId: number): StageDisplay {
  return STAGE_DISPLAY[stageId] ?? FALLBACK_STAGE_DISPLAY;
}
