/**
 * Shared types for the WSA AI Workforce platform.
 *
 * Source of truth for everything here is controlled WSA SharePoint evidence
 * — WSA_AI_Worker_Register_v0.39.docx and
 * WSA_Worker_Personality_Connector_Access_Matrix_v0.2.docx, both inspected
 * 29 August 2026 — not this codebase's own judgement about what a worker
 * "should" be able to do. specificationStatus and staffPortalExecutionStatus
 * are deliberately separate fields: a worker's brief can be Approved while
 * its Staff Portal deployment remains undecided (Sophie), and a worker can
 * be design-complete while still formally NOT APPROVED (everyone else).
 */

/** Canonical worker IDs. Matches the Worker Register's canonical names. */
export type WorkerId =
  | "wsa_core_brain"
  | "sophie"
  | "daniel"
  | "amelia"
  | "oliver"
  | "james"
  | "priya"
  | "harper"
  | "olivia"
  | "grace"
  | "ethan"
  | "maya"
  | "alex"
  | "nia"
  | "wsa_governance_assurance"
  | "staff_receptionist";

/**
 * A worker's design/approval status, as recorded in the controlled Worker
 * Register — never inferred, never upgraded by this codebase.
 */
export type SpecificationStatus =
  /** Formally approved by Tom Arrington at the worker-specification level. */
  | "approved"
  /** Design complete and QC-passed, but formally blocked pending named open governance decisions. */
  | "approval_blocked"
  /** Design in progress or QC-passed, but not yet approved. */
  | "not_approved"
  /** Not a worker brief in the approval sense — an active governance function (WSA Core Brain, Governance & Assurance). */
  | "active"
  /** Not a worker brief at all — a platform function this build implements directly (the receptionist/router). */
  | "infrastructure";

/**
 * Whether this worker can be opened as a live AI chat inside the Staff
 * Portal specifically. Independent of specificationStatus — Sophie is
 * "approved" but still "pending_channel_decision" because her Register
 * entry's next control is "Deploy as Custom GPT and connector-test", an
 * unresolved deployment-channel decision this codebase must not resolve
 * on its own.
 */
export type StaffPortalExecutionStatus =
  /** The deployment-channel decision is made and the Staff Portal is it. */
  | "staff_portal_authorised"
  | "pending_channel_decision"
  | "prohibited"
  | "not_configured"
  | "available_routing_only"
  | "not_applicable";

/**
 * The exact text a worker carries when the controlled record records no
 * CRM decision for it.
 *
 * WSA_Worker_Personality_Connector_Access_Matrix_v0.2 has SharePoint and
 * Google Drive columns only, and its own authority note says it "does not
 * itself grant a Microsoft, Google, portal, CRM, advertising or government
 * permission". So no worker has an evidenced Pipedrive scope, and the
 * permission engine treats this sentinel as a hard denial rather than as a
 * missing field to be filled in with a sensible guess.
 *
 * This is deliberately a shared constant rather than free text: the
 * permission engine compares against it by identity, so a worker cannot be
 * granted CRM access by someone rewording its intent line.
 */
export const NO_CONTROLLED_CRM_DECISION =
  "No controlled CRM decision. The Worker Personality and Connector Access Matrix v0.2 defines SharePoint and Google Drive only and expressly does not grant a CRM permission.";

export interface ConnectorIntent {
  /** Paraphrased from the Access Matrix's SharePoint column. Intent, not granted access. */
  sharePoint: string;
  /** Paraphrased from the Access Matrix's Google Drive column. Intent, not granted access. */
  googleDrive: string;
  /**
   * Intent for the Pipedrive CRM. Required so a new worker cannot be added
   * without the question being answered. Until the controlled Access
   * Matrix gains a CRM column, every worker carries
   * NO_CONTROLLED_CRM_DECISION and is denied.
   */
  pipedrive: string;
  /** The Access Matrix's stated hard boundary for this worker. */
  hardBoundary: string;
}

export interface PersonalityConfig {
  /** One-line personality description from the Access Matrix. Never alters permissions, facts or evidence standards. */
  summary: string;
  /** What staff should come to this worker for. */
  whatFor: string;
  /** What this worker explicitly does not do — from the Matrix's hard boundary plus Register scope notes. */
  whatNotFor: string;
}

/**
 * The independent assurance step that has to happen before a worker
 * design can be put to the approval authority.
 */
export type GatekeeperReviewState =
  /** Reviewed by Governance and Assurance and cleared to proceed to Tom. */
  | "passed_cleared_for_approval"
  /** Not yet independently reviewed. */
  | "pending"
  /** A governance or infrastructure function, not a worker design. */
  | "not_applicable";

/**
 * One thing a worker can do, and whether it can do it now.
 *
 * Capabilities exist so that a missing connector disables the capability
 * that needs it and nothing else. A research worker whose optional data
 * source is unavailable should still answer from controlled evidence and
 * staff input; switching the whole worker off for that is a bug, not a
 * safety control.
 */
export interface WorkerCapability {
  id: string;
  name: string;
  /** What it does, for staff. */
  description: string;
  /**
   * Whether this capability can run from authorised staff input, case
   * context, controlled SharePoint evidence and internal records alone.
   */
  worksWithoutConnector: boolean;
  /** The connector it genuinely needs, where it needs one. */
  requiresConnector: ConnectorName | null;
  /** Named reason this capability is unavailable, or null when it is available. */
  unavailableBecause: string | null;
}

export interface WorkerRegistryEntry {
  id: WorkerId;
  /** Exact canonical name as it appears in the Worker Register. */
  canonicalName: string;
  /** Exact role/function title as it appears in the Worker Register. */
  roleTitle: string;
  /** Worker-specification version currently on record (e.g. "v0.4"). */
  specificationVersion: string;
  specificationStatus: SpecificationStatus;
  staffPortalExecutionStatus: StaffPortalExecutionStatus;
  /**
   * Whether the mandatory independent Governance and Assurance Gatekeeper
   * review has actually been done for this worker.
   *
   * This exists because the Worker Register's per-worker status lines said
   * the Gatekeeper review was the next control, when
   * WSA_Governance_Assurance_Gatekeeper_Review_Result_v1.0 of 29 August
   * had already completed it: AMBER, no system-wide STOP, packet cleared
   * to proceed to Tom. A worker waiting on a human decision is not a
   * worker still in design, and the portal was saying the wrong one.
   */
  gatekeeperReview: GatekeeperReviewState;
  /** Verbatim-paraphrased "next control" from the Worker Register. */
  currentNextControl: string;
  /** Named open blockers (AB-xx / GOV-xx codes etc.) where evidenced. Empty array only where the Register records none outstanding. */
  materialBlockers: string[];
  personality: PersonalityConfig;
  connectorIntent: ConnectorIntent;
  /**
   * Worker IDs this worker may hand a case off to, where the Register or
   * Matrix gives explicit textual evidence of the relationship. Left empty
   * rather than inferred — the full handoff graph is not yet a controlled
   * record (see WSA Student Journey, not inspected in this build pass).
   */
  evidencedHandoffs: WorkerId[];
  /** Always Tom Arrington in every controlled document inspected — the sole named approval/escalation authority. */
  escalationRoute: string;
  /**
   * Whether this worker may actually be opened for live Staff Portal
   * execution right now. Server-computed from specificationStatus +
   * staffPortalExecutionStatus — never set directly, never true merely
   * because the code exists.
   */
  staffPortalExecutionAuthorised: boolean;
  /** Whether this worker may invoke any connector action right now. False for every worker until real credentials exist and are tested — see connectorConfigurationPlan.md. */
  connectorUseAuthorised: boolean;
  /** Whether this worker may perform a write/create/update/delete/send connector action right now. */
  writesAuthorised: boolean;
  /**
   * What this worker can actually do, capability by capability.
   *
   * Empty for governance and infrastructure functions, which are not
   * case-working workers.
   */
  capabilities: readonly WorkerCapability[];
  /** SharePoint web URL of the controlled brief this entry is sourced from, for traceability. */
  controlledBriefReference: string;
}

/** Connector identifiers the permission engine and connector abstractions share. */
export type ConnectorName =
  | "sharepoint"
  | "google_drive"
  | "pipedrive"
  | "linkedin"
  | "facebook"
  | "youtube"
  | "whatsapp";

/** Coarse-grained connector operations the permission engine reasons about. */
export type ConnectorOperation = "search" | "read" | "create" | "update" | "delete" | "external_send";

export type ConnectorState =
  | "unconfigured"
  | "permission_missing"
  | "unavailable"
  | "operational"
  | "degraded";
