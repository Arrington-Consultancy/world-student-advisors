/**
 * Where every statement in the remit model came from.
 *
 * The risk this exists to stop is specific and it has already happened
 * once in this build in the opposite direction: a routing conclusion was
 * drawn from Worker Register v0.45 when Change Entry 086 had superseded
 * it, and nothing in the code said which record it was reading. A model
 * that cannot name its source cannot be checked, and a model that cannot
 * be checked quietly becomes the authority.
 *
 * So every remit, every exclusion and every approval state here cites a
 * controlled WSA record by name, version, date and clause. This file is
 * derived evidence. WSA SharePoint is the source of truth, and where
 * SharePoint holds something newer, SharePoint wins and this model is
 * wrong until it is reconciled.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO. It does not resolve a
 * disagreement. If the controlled record and this model differ,
 * `reconcile` reports the difference and the model stays flagged as
 * unreconciled. It never concludes that the code is right because the code
 * is what is running.
 */

/** One controlled WSA record, as it exists in SharePoint. */
export interface ControlledSource {
  /** Filename or document title, exactly as SharePoint holds it. */
  record: string;
  /** Version as the record states it about itself. */
  version: string;
  /** The date the record carries, not the date it was read. */
  dated: string;
  /** The section or clause the statement is taken from. */
  clause: string;
}

/**
 * The controlled records this model was built from, and the versions that
 * were current when it was.
 *
 * A newer version of any of these makes this model stale. That is a fact
 * about the model, not a judgement about the record, and `reconcile`
 * states it that way.
 */
export const CONTROLLED_BASELINE: readonly { record: string; version: string; dated: string }[] = [
  {
    record: "WSA_Consolidated_Worker_Approval_Record_v1.0_APPROVED.docx",
    version: "1.0",
    dated: "31 August 2026",
  },
  {
    record: "WSA_AI_Worker_Register_v0.45.docx",
    version: "0.45",
    dated: "31 August 2026",
  },
  {
    record: "WSA_Change_Log_v0.86.docx",
    version: "0.86",
    dated: "3 September 2026",
  },
  {
    record: "WSA_Staff_Portal_AI_Workforce_Website_Paid_Media_Full_Handover_2026-09-05.docx",
    version: "Full Handover",
    dated: "5 September 2026",
  },
];

/** When a human last reconciled this model against the records above. */
export const LAST_RECONCILED = "11 September 2026";

export const APPROVAL_RECORD: ControlledSource = {
  record: "WSA_Consolidated_Worker_Approval_Record_v1.0_APPROVED.docx",
  version: "1.0",
  dated: "31 August 2026",
  clause: "Section 2, workers approved under this authority",
};

export const PRIYA_BOUNDED_SCOPE: ControlledSource = {
  record: "WSA_Consolidated_Worker_Approval_Record_v1.0_APPROVED.docx",
  version: "1.0",
  dated: "31 August 2026",
  clause: "Section 4, Priya: the bounded scope approved",
};

export const NIA_BOUNDED_SCOPE: ControlledSource = {
  record: "WSA_Consolidated_Worker_Approval_Record_v1.0_APPROVED.docx",
  version: "1.0",
  dated: "31 August 2026",
  clause: "Section 5, Nia: the bounded scope approved",
};

export const REGISTER_EXECUTION_STATE: ControlledSource = {
  record: "WSA_AI_Worker_Register_v0.45.docx",
  version: "0.45",
  dated: "31 August 2026",
  clause: "Section 2, worker execution approval and capability gates",
};

export const HANDOVER_ROLE_SCOPE: ControlledSource = {
  record: "WSA_Staff_Portal_AI_Workforce_Website_Paid_Media_Full_Handover_2026-09-05.docx",
  version: "Full Handover",
  dated: "5 September 2026",
  clause: "Role-specific SharePoint access, per worker read and write statement",
};

export const HANDOVER_THIRTEEN_WORKERS: ControlledSource = {
  record: "WSA_Staff_Portal_AI_Workforce_Website_Paid_Media_Full_Handover_2026-09-05.docx",
  version: "Full Handover",
  dated: "5 September 2026",
  clause: "The thirteen approved AI workers",
};

export const HANDOVER_PROSPECTING_GAP: ControlledSource = {
  record: "WSA_Staff_Portal_AI_Workforce_Website_Paid_Media_Full_Handover_2026-09-05.docx",
  version: "Full Handover",
  dated: "5 September 2026",
  clause: "New staff member starting 14 September 2026, role includes converting cold leads",
};

/**
 * The router's own version.
 *
 * Written into every Routing Gap Log row, because a gap recorded against
 * one version of the routing model and a gap recorded after it was
 * corrected are different facts. Without this, a fixed defect and a live
 * one look identical in the log and nobody can tell whether a correction
 * worked.
 *
 * Raise this whenever the remit model, the concept vocabulary or the
 * routing priority changes. It is not the application version.
 */
export const ROUTING_MODEL_VERSION = "remit-1.2";

export interface Discrepancy {
  record: string;
  /** The version this model was built against. */
  modelBuiltAgainst: string;
  /** The version the controlled record actually holds now. */
  controlledRecordHolds: string;
  effect: string;
}

/**
 * Compare this model's baseline against what the controlled records
 * currently hold, and report the differences.
 *
 * `current` is supplied by whatever actually inspected SharePoint. This
 * function has no connector and never asserts what a record says; it only
 * says whether the model has been reconciled against what it was given.
 *
 * A record absent from `current` is reported as unverified rather than as
 * agreeing, because "I could not see it" and "it is unchanged" are the two
 * statements this build has already conflated once.
 */
export function reconcile(
  current: readonly { record: string; version: string }[],
): { reconciled: boolean; discrepancies: Discrepancy[]; unverified: string[] } {
  const discrepancies: Discrepancy[] = [];
  const unverified: string[] = [];

  for (const baseline of CONTROLLED_BASELINE) {
    const observed = current.find(c => c.record === baseline.record);
    if (!observed) {
      unverified.push(baseline.record);
      continue;
    }
    if (observed.version !== baseline.version) {
      discrepancies.push({
        record: baseline.record,
        modelBuiltAgainst: baseline.version,
        controlledRecordHolds: observed.version,
        effect:
          "The controlled record is newer than the model was built against. The controlled record wins. " +
          "Treat the remit model as unreconciled for this record until a human has read the newer version.",
      });
    }
  }

  return {
    reconciled: discrepancies.length === 0 && unverified.length === 0,
    discrepancies,
    unverified,
  };
}
