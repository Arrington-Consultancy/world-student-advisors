/**
 * The WSA AI Worker Registry.
 *
 * This is a server-only constant, never exposed for client mutation. Every
 * field is sourced from controlled WSA SharePoint evidence inspected
 * 29 August 2026 (WSA_AI_Worker_Register_v0.39.docx, with Nia added from v0.42 on 30 August 2026,
 * WSA_Worker_Personality_Connector_Access_Matrix_v0.2.docx). Ordinary Staff
 * Portal users cannot edit worker scope, prompts or status — the only way
 * this registry changes is a code change reviewed the same way any other
 * production change is, after the controlled SharePoint record itself
 * changes.
 *
 * Sophie is the only worker with specificationStatus "approved". Her
 * deployment-channel decision is now resolved to the Staff Portal by
 * Tom Arrington's recorded instruction, so she is the one worker with
 * staffPortalExecutionAuthorised true.
 *
 * No worker has connectorUseAuthorised or writesAuthorised true, and that
 * is a separate question from execution: no connector credential is
 * configured or acceptance-tested for any system in this build. Do not
 * flip any of these without a corresponding update to the controlled
 * Worker Register.
 */
import type { WorkerId, WorkerRegistryEntry } from "./types";
import { NO_CONTROLLED_CRM_DECISION } from "./types";

const SHAREPOINT_SITE = "https://worldstudentadvisors123.sharepoint.com/sites/WSASharePoint/Shared Documents";
/**
 * The AI Operating System tree lives under 17_Senior Management Team.
 *
 * These references previously said 01_ADMIN_&_GOVERNANCE/AI_Operating_System.
 * That folder does not exist: 01_ADMIN_&_GOVERNANCE is real, but its
 * children are 00_Archive, 00_Business plans, 01_Company_&_Legal,
 * 02_Policies_&_Compliances, 03_British Council_&_Accreditation,
 * 04_HR_&_People Governance, 05_Board_&_Advisory, 06_Risk_&_Issues,
 * 07_Templates_&_Standards, 08_MS365_123Reg and 09_Apps. Every controlled
 * brief, standard and Change Log version is under 17_Senior Management
 * Team/AI_Operating_System instead, read from the live tenant on
 * 1 September 2026.
 *
 * A wrong path here is not cosmetic. These strings are what a person
 * follows to check a worker against its brief, and they are the obvious
 * source for a future SharePoint location designation. Pointing either at
 * a folder that does not exist wastes the reader's time at best, and at
 * worst designates a worker's read scope onto the wrong tree.
 */
const APPROVED_STANDARDS = `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/02_Approved_Standards`;
const WORKING_DRAFTS = `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts`;

const TOM_ARRINGTON = "Tom Arrington (WSA policy owner and approval authority)";

/**
 * Computes the two authorisation flags from status alone, so nothing can
 * set them directly and no worker can become "authorised" by any route
 * other than its recorded statuses actually changing.
 */
/**
 * Exported so both halves of the rule can be tested. With one approved
 * worker in the estate, a test that only looks at real entries cannot
 * tell whether the deployment-channel half is enforced or merely
 * coincidental.
 */
export function deriveAuthorisation(
  specificationStatus: WorkerRegistryEntry["specificationStatus"],
  staffPortalExecutionStatus: WorkerRegistryEntry["staffPortalExecutionStatus"],
): { staffPortalExecutionAuthorised: boolean; connectorUseAuthorised: boolean; writesAuthorised: boolean } {
  // Execution authority and connector authority are different questions,
  // and conflating them was making the whole estate look dead.
  //
  // A worker may execute when its specification is approved AND the
  // deployment-channel decision names the Staff Portal. Both come from
  // controlled records; neither can be set from code alone.
  //
  // Connector authority is separate and remains closed for every worker,
  // because no connector credential is technically configured or
  // acceptance-tested for any system in this build (Access Matrix section
  // 5, connectorConfigurationPlan.md). That correctly disables the
  // capabilities that need a connector without disabling a worker whose
  // approved function runs from staff input, case context and controlled
  // SharePoint evidence.
  const staffPortalExecutionAuthorised =
    specificationStatus === "approved" && staffPortalExecutionStatus === "staff_portal_authorised";

  return { staffPortalExecutionAuthorised, connectorUseAuthorised: false, writesAuthorised: false };
}

function entry(
  base: Omit<
    WorkerRegistryEntry,
    "staffPortalExecutionAuthorised" | "connectorUseAuthorised" | "writesAuthorised"
  >,
): WorkerRegistryEntry {
  return { ...base, ...deriveAuthorisation(base.specificationStatus, base.staffPortalExecutionStatus) };
}

const REGISTRY_LIST: WorkerRegistryEntry[] = [
  entry({
    id: "wsa_core_brain",
    canonicalName: "WSA Core Brain",
    roleTitle: "AI operating-system governance",
    specificationVersion: "Core Operating System v1.1",
    specificationStatus: "active",
    staffPortalExecutionStatus: "not_applicable",
    currentNextControl: "Maintain controlled standards and the WSA Change Log.",
    materialBlockers: [],
    personality: {
      summary: "Calm, constitutional, practical. Challenges weak governance without sounding theatrical.",
      whatFor: "The governing authority behind every WSA AI worker and standard, not a worker staff open directly.",
      whatNotFor: "Does not make case decisions or grant itself production permissions.",
    },
    connectorIntent: {
      sharePoint: "Broad read of WSA governance and worker controls; controlled governance write-back.",
      googleDrive: "Read only when legacy/migration evidence is materially relevant.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "No case decisions or silent production permissions.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "not_applicable",
    capabilities: [],
    controlledBriefReference: `${APPROVED_STANDARDS}/WSA_Core_Operating_System_v1.1_APPROVED.docx`,
  }),

  entry({
    id: "sophie",
    canonicalName: "Sophie",
    roleTitle: "Student Enquiry & Triage",
    specificationVersion: "v1.1",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Deployment channel resolved to the Staff Portal by Tom Arrington's recorded decision. Live in the Staff " +
      "Portal for enquiry and triage. Connector actions remain closed, so a case record is prepared for a human " +
      "to file rather than written directly.",
    materialBlockers: ["Deployment channel not yet decided (Custom GPT vs. Staff Portal)"],
    personality: {
      summary: "Warm, brisk and reassuring. Makes first contact feel human without becoming sales-led.",
      whatFor: "First contact and triage for a new student enquiry.",
      whatNotFor: "No suitability, admissions or visa advice.",
    },
    connectorIntent: {
      sharePoint: "Relevant enquiry/triage records; designated triage write-back.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "No suitability, admissions or visa advice.",
    },
    evidencedHandoffs: ["daniel"],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "triage",
        name: "Take and triage an enquiry",
        description:
          "Establish the facts of one student enquiry, identify risks, urgency and missing information, and name the correct next specialist or human owner.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
      {
        id: "record",
        name: "Write the case record",
        description:
          "Record the enquiry and its outcome to the controlled record.",
        worksWithoutConnector: false,
        requiresConnector: "sharepoint",
        unavailableBecause:
          "SharePoint connector is not configured, so the case record is prepared for a human to file rather than written directly.",
      },
    ],
    controlledBriefReference: `${APPROVED_STANDARDS}/WSA_Sophie_Staff_Operating_Guide_v1.0_APPROVED.docx`,
  }),

  entry({
    id: "daniel",
    canonicalName: "Daniel",
    roleTitle: "Student Discovery",
    specificationVersion: "v0.4",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Independent Gatekeeper review passed (29 August 2026). Awaiting Tom Arrington's consolidated approval decision; the triage-QC entry proposal remains open and non-operative.",
    materialBlockers: ["Tom Arrington's consolidated approval decision pending", "Triage-QC entry decision open"],
    personality: {
      summary: "Curious, patient and organised. Asks useful questions without interrogating the student.",
      whatFor: "Structured discovery of a student's academic position, goals and circumstances.",
      whatNotFor: "No research conclusions or recommendations.",
    },
    connectorIntent: {
      sharePoint: "Discovery profile inputs and designated discovery output.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "No research conclusions or recommendations.",
    },
    evidencedHandoffs: ["amelia"],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "discovery",
        name: "Build a student profile from what staff provide",
        description:
          "Gather and structure a student's background, prior study and circumstances from staff input and case context.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
    ],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "amelia",
    canonicalName: "Amelia",
    roleTitle: "Education Research",
    specificationVersion: "v0.3",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    // The education-option definition was recorded as open. It is resolved
    // by the existing worker architecture rather than by a new decision:
    // Amelia identifies and structures factual education options and the
    // authoritative evidence attached to them, Oliver owns comparative
    // suitability and trade-offs, James owns admissions execution. That is
    // the narrowest reading consistent with the approved workflow, and it
    // takes nothing from either neighbour.
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority. " +
      "Live for controlled education research: identifying and structuring factual education options and " +
      "their authoritative evidence, with source and date. Suitability remains Oliver's and admissions " +
      "remain James's. Web research is unavailable pending connector authorisation.",
    materialBlockers: ["Web research unavailable: no authorised research connector"],
    personality: {
      summary: "Meticulous, neutral researcher. Quietly sceptical of weak or stale evidence.",
      whatFor: "Locating and structuring authoritative education research evidence.",
      whatNotFor: "No suitability ranking or application decision.",
    },
    connectorIntent: {
      sharePoint: "Approved discovery/research records; research-pack write-back.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "No suitability ranking or application decision.",
    },
    evidencedHandoffs: ["oliver"],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "research_controlled",
        name: "Answer from controlled WSA education evidence",
        description:
          "Course, programme and institution information drawn from controlled WSA records and staff-supplied material.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
      {
        id: "research_web",
        name: "Current external course and institution checks",
        description:
          "Verify current entry requirements, fees and dates against live institution sources.",
        worksWithoutConnector: false,
        requiresConnector: null,
        unavailableBecause:
          "Approved web research is not yet enabled for this build. The controlled-evidence capability is unaffected.",
      },
    ],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "oliver",
    canonicalName: "Oliver",
    roleTitle: "Education Suitability",
    specificationVersion: "v0.2",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority. " +
      "Live for comparative suitability across already-researched options. The decision itself remains the " +
      "student's and the recommendation an authorised human's.",
    materialBlockers: ["Tom Arrington's consolidated approval decision pending", "Suitability governance open"],
    personality: {
      summary: "Balanced, analytical and plain-spoken. Explains trade-offs rather than selling a winner.",
      whatFor: "Weighing suitability trade-offs across researched options before a student decides.",
      whatNotFor: "No final student decision, application or visa advice.",
    },
    connectorIntent: {
      sharePoint: "QC-passed discovery and research packs; suitability output.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "No final student decision, application or visa advice.",
    },
    evidencedHandoffs: ["james"],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "suitability",
        name: "Compare options against a student's evidenced profile",
        description:
          "Weigh education options for one student using Amelia's controlled evidence and the recorded student profile.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
    ],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "james",
    canonicalName: "James",
    roleTitle: "Admissions & Application",
    specificationVersion: "v0.3 + Control Pack v0.1",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority, on " +
      "formal test 30/30 pass. Live for application completeness tracking and preparation. Submission stays " +
      "blocked: it is a consequential external action and no submission authority was granted.",
    materialBlockers: ["Submission unavailable: consequential external action, not authorised"],
    personality: {
      summary: "Precise, dependable admissions operator. Formal with institutions, clear with staff and students.",
      whatFor: "Application completeness and admissions requirements tracking.",
      whatNotFor: "No unsupported submission or portal action.",
    },
    connectorIntent: {
      sharePoint: "Application evidence, admissions records and authorised application outputs.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "No unsupported submission or portal action.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "application_prep",
        name: "Prepare an application and check entry requirements",
        description:
          "Assemble and check an application package against recorded entry requirements.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
      {
        id: "submit",
        name: "Submit an application",
        description:
          "Live submission to an institution.",
        worksWithoutConnector: false,
        requiresConnector: null,
        unavailableBecause:
          "Live submission authority is deployment-gated and separately approved.",
      },
    ],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "priya",
    canonicalName: "Priya",
    roleTitle: "Visa & Compliance",
    specificationVersion: "v0.2",
    // Approved for a bounded scope on 31 August 2026, not for her full
    // remit. Tom's consolidated authority names what she may do: official
    // rule research, evidence-based explanation, identifying requirements
    // and uncertainty, and preparing material for authorised human review.
    //
    // AB-P03's absence is answered at constitutional level rather than
    // waived. Core Operating System v1.1 section 8 already binds every
    // worker: information that changes regularly must be verified before
    // it is relied upon, uncertainty must be labelled, and a worker must
    // not guess where verification is reasonably possible. Her brief
    // applies that as official sources only, cited and dated.
    //
    // AB-P01's line between information and regulated advice is drawn
    // where it is actually drawn: stating what a published rule says is
    // information; applying it to one person's circumstances is advice.
    // The second stays blocked, and is enforced on her output rather than
    // asked of the model.
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority, for " +
      "a bounded scope only: official rule research with source and date, evidence and requirement " +
      "identification, uncertainty, and case preparation for authorised human review. Regulated advice on a " +
      "person's circumstances, representations, submissions and adverse-decision handling remain blocked " +
      "under AB-P04.",
    materialBlockers: [
      "AB-P01: immigration-advice authority by jurisdiction/activity",
      "AB-P02: approved Decision and Escalation Framework",
      "AB-P03: approved Knowledge and Evidence Standard",
      "AB-P04: authorised human ownership for visa submission, regulated-advice escalation, refusals and adverse decisions",
    ],
    personality: {
      summary: "Cautious, exact and calm under pressure. Never bluffs on immigration authority.",
      whatFor: "Explaining confirmed visa/compliance rules, interpretation and uncertainty, once approved.",
      whatNotFor:
        "Applying a rule to one person's circumstances, predicting an outcome, or advising a course of " +
        "action. That is regulated advice and stays with a named authorised human under AB-P04. She may " +
        "state what a published rule says, with its official source and the date it was checked.",
    },
    connectorIntent: {
      sharePoint: "Minimum necessary visa/compliance case evidence within verified authority.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "Regulated advice/submission remains authority-gated.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "rules_explanation",
        name: "Explain confirmed official immigration rules",
        description:
          "Evidence-based explanation of published official rules, with source and date, and an explicit stop where the position is uncertain. Information about the published position, never advice on a person's circumstances.",
        worksWithoutConnector: true,
        requiresConnector: null,
        // Opened 31 August 2026 under Tom Arrington's consolidated
        // authority, which names official rule research and evidence-based
        // explanation as permitted.
        //
        // AB-P03's absence is answered rather than waived. There is still
        // no approved Knowledge and Evidence Standard, but Core Operating
        // System v1.1 section 8 already binds every worker: information
        // that changes regularly must be verified before it is relied
        // upon, and a worker must not guess where verification is
        // reasonably possible. Her output is checked for that: a rule
        // stated without naming its official source and the date is
        // withheld before a staff member reads it.
        //
        // AB-P01's line is drawn where it actually falls. Stating what a
        // published rule says is information. Applying it to one person is
        // advice, and that is the separate regulated_advice capability,
        // which stays shut.
        unavailableBecause: null,
      },
      {
        id: "case_preparation",
        name: "Visa and compliance case preparation",
        description:
          "Identify what an authorised human must determine for this case, what evidence and documents must be " +
          "obtained, and what is genuinely uncertain. States no rule and gives no advice, so it needs no source " +
          "hierarchy and is not a regulated activity. Enforced on the output in server/workforce/priyaScope.ts, " +
          "not merely instructed in the brief.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause: null,
      },
      {
        id: "regulated_advice",
        name: "Regulated immigration advice and representations",
        description:
          "Advice, representations, submissions and adverse-decision handling.",
        worksWithoutConnector: false,
        requiresConnector: null,
        unavailableBecause:
          "Reserved regulated activity. Blocked by AB-P01 immigration-advice authority and AB-P04 named authorised human ownership.",
      },
    ],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "harper",
    canonicalName: "Harper",
    roleTitle: "Scholarships & Funding",
    specificationVersion: "v0.2",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority. " +
      "Live for funding-gap structuring from authorised staff input and case records. Scholarship " +
      "eligibility determination stays blocked: AB-H01 to AB-H15 govern it and remain open.",
    materialBlockers: ["AB-H01 to AB-H15 open, requiring Tom Arrington's approval"],
    personality: {
      summary: "Practical, numerate and student-first. Treats affordability as reality, not a sales obstacle.",
      whatFor: "Verifying scholarship eligibility and structuring funding-gap analysis, once approved.",
      whatNotFor: "No investment advice, visa financial-evidence advice or unsupported scholarship action.",
    },
    connectorIntent: {
      sharePoint: "Funding profile, verified scholarship evidence and funding-gap outputs.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "No investment advice, visa financial-evidence advice or unsupported scholarship action.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "funding_analysis",
        name: "Structure a funding-gap analysis",
        description:
          "Set out a student's funding position and gap from figures staff supply.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
      {
        id: "scholarship_eligibility",
        name: "Confirm scholarship eligibility",
        description:
          "Determine eligibility against a specific scheme's current rules.",
        worksWithoutConnector: false,
        requiresConnector: null,
        unavailableBecause:
          "AB-H01 to AB-H15 remain open, so eligibility determinations are not authorised.",
      },
    ],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "olivia",
    canonicalName: "Olivia",
    roleTitle: "Pre-arrival & Student Success",
    specificationVersion: "v0.2",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority. " +
      "Live for practical pre-arrival readiness on a confirmed student. Safeguarding, payments and every " +
      "consequential action remain gated regardless of approval.",
    materialBlockers: ["GOV-O1 to GOV-O3 open", "DD-O1 to DD-O3 deployment dependencies open"],
    personality: {
      summary: "Reassuring, practical and organised. Focuses on what the student needs to do next.",
      whatFor: "Practical transition and readiness support once a student is confirmed, once approved.",
      whatNotFor: "Safeguarding, payments and consequential actions remain gated regardless of approval.",
    },
    connectorIntent: {
      sharePoint: "Minimum necessary pre-arrival/student-success records.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "Safeguarding, payments and consequential actions remain gated.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "prearrival",
        name: "Plan pre-arrival and readiness steps",
        description:
          "Practical transition and readiness support for a confirmed student.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
    ],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "grace",
    canonicalName: "Grace",
    roleTitle: "Quality Assurance & Case Audit",
    specificationVersion: "v0.8",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority. " +
      "Live for independent audit of completed case work against the standards and evidence rules. She " +
      "reports defects to the authorised human and never becomes the case owner.",
    materialBlockers: [],
    personality: {
      summary: "Independent, exacting and fair. Finds defects without trying to become the case owner.",
      whatFor: "Independent audit of case work for defects, contradictions and missing evidence, once approved.",
      whatNotFor: "Does not rewrite a case simply because she disagrees with style; not the case owner.",
    },
    connectorIntent: {
      sharePoint: "Read access to records needed for authorised audit; controlled QA findings write-back.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "No rewriting the case simply because she disagrees with style.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "case_audit",
        name: "Audit case work for defects",
        description:
          "Independent review of a case for defects, contradictions and missing evidence.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
    ],
    controlledBriefReference: `${APPROVED_STANDARDS}/WSA_Grace_Governance_Dependency_Classification_v1.0_APPROVED.docx`,
  }),

  entry({
    id: "ethan",
    canonicalName: "Ethan",
    roleTitle: "SEO & Organic Growth",
    specificationVersion: "v0.3",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority. " +
      "Live for organic search analysis and recommendation from controlled evidence. Implementation and " +
      "high-risk website actions stay blocked under AB-E11 pending designated roles, and Search Console " +
      "data is unavailable pending connector authorisation.",
    materialBlockers: [
      "AB-E01, AB-E02, AB-E04, AB-E05, AB-E08, AB-E09, AB-E10, AB-E12 open",
      "AB-E11 deployment blocked pending role designation",
    ],
    personality: {
      summary: "Evidence-led, curious and commercially aware without chasing vanity metrics.",
      whatFor: "Sustainable organic search evidence and website/SEO governance, once approved.",
      whatNotFor: "Implementation and high-risk website actions require designated authority, not granted here.",
    },
    connectorIntent: {
      sharePoint: "Website/SEO governance and approved performance evidence.",
      googleDrive: "Read access where current website/Search Console legacy evidence is stored; no student-case data.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "Implementation and high-risk website actions require designated authority.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "seo_advice",
        name: "SEO and organic-growth guidance from evidence supplied",
        description:
          "Advice on organic search and site content using material staff provide.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
      {
        id: "search_console",
        name: "Read live Search Console performance",
        description:
          "Current organic search performance data.",
        worksWithoutConnector: false,
        requiresConnector: null,
        unavailableBecause:
          "No Search Console connector is configured.",
      },
    ],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "maya",
    canonicalName: "Maya",
    roleTitle: "SharePoint & Records Control",
    specificationVersion: "v0.2",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    // RG-01 to RG-04 govern records OPERATIONS: version integrity,
    // transactions and incidents, destructive actions, and verification.
    // None of them governs advising on how records should be structured,
    // which is what stays open here. The operation itself needs a
    // SharePoint credential she does not hold, so the critical blockers
    // are not waived, they simply do not reach the live capability.
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority. " +
      "Live for records-control advice, structure and discoverability. Every records operation stays " +
      "blocked: RG-01 to RG-04 remain open and no SharePoint credential is configured. Retention and " +
      "legal-hold determinations require external privacy, legal and contractual evidence.",
    materialBlockers: ["RG-01 (critical)", "RG-02 (critical)", "RG-03 (critical)", "RG-04 (high)", "Least-privilege access deployment dependency", "Retention/legal-hold policy pending external evidence"],
    personality: {
      summary: "Methodical records controller. Conservative around destructive actions and version uncertainty.",
      whatFor: "Records-control scope across authorised SharePoint locations, once approved.",
      whatNotFor: "No blind retries, destructive action or retention decision without authority.",
    },
    connectorIntent: {
      sharePoint: "Records-control scope across authorised SharePoint locations.",
      googleDrive: "Read/migration access only when moving or reconciling authorised legacy records.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "No blind retries, destructive action or retention decision without authority.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "records_advice",
        name: "Records-control guidance",
        description:
          "Advice on version integrity, structure and records control.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
      {
        id: "sharepoint_ops",
        name: "Act on SharePoint records directly",
        description:
          "Read, move or repair controlled records.",
        worksWithoutConnector: false,
        requiresConnector: "sharepoint",
        unavailableBecause:
          "SharePoint connector is not configured.",
      },
    ],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts/WSA_Maya_SharePoint_Records_Control_Specialist_v0.2_WORKING_DRAFT.docx`,
  }),

  entry({
    id: "alex",
    canonicalName: "Alex",
    roleTitle: "Paid Media & Google Ads",
    specificationVersion: "v0.2",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority. " +
      "Live for paid-media performance analysis and recommendation from evidence he is given. No live " +
      "advertising authority: Google Ads, Pipedrive, Zapier, website and conversion-tracking changes all " +
      "remain unauthorised, and AB-A01 to AB-A12 remain open.",
    materialBlockers: ["Live advertising changes unavailable: AB-A01 to AB-A12 open, no account authority"],
    personality: {
      summary: "Commercially sharp, measured and evidence-led. Optimises for suitable students, not cheap leads.",
      whatFor: "Evaluating paid-media performance evidence against suitable student acquisition, once approved.",
      whatNotFor: "No live ad/account changes until live authority is granted and tested.",
    },
    connectorIntent: {
      sharePoint: "Paid-media governance, approved measurement evidence and authorised campaign records.",
      googleDrive: "Read access to relevant legacy marketing/website evidence only.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "No live ad/account changes until live authority is granted and tested.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "passed_cleared_for_approval",
    capabilities: [
      {
        id: "paid_analysis",
        name: "Analyse paid-media evidence supplied by staff",
        description:
          "Assess campaign performance from figures and briefs staff provide.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
      {
        id: "ads_live",
        name: "Read or change live Google Ads",
        description:
          "Live account access, spend and optimisation.",
        worksWithoutConnector: false,
        requiresConnector: null,
        unavailableBecause:
          "No Google Ads connector, and AB-A01 to AB-A12 remain open.",
      },
    ],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/01_Working_Drafts/`,
  }),

  /**
   * Transcribed from WSA_AI_Worker_Register_v0.42.docx, read 30 August 2026.
   *
   * The Register records her verbatim as "WORKING DRAFT - QC PASSED - NOT
   * APPROVED - NO LIVE PUBLISHING AUTHORITY", with NIA-G01 to NIA-G07
   * unresolved. Her next control is to resolve those, confirm social
   * account ownership and the relationship to the human social team, then
   * independent Governance & Assurance review before activation.
   *
   * Her AI-content control is deliberately described as a quality and
   * AI-slop suspicion gate, not a claim of scientific AI-authorship
   * detection. That distinction is the Register's own and matters: a tool
   * that claimed to detect AI authorship would be confidently wrong about
   * real people's writing, whereas one that flags slop is right about the
   * thing it actually measures.
   */
  entry({
    id: "nia",
    canonicalName: "Nia",
    roleTitle: "Social Media & Content Intelligence",
    specificationVersion: "v0.1 + Social Brain Control Pack v0.1",
    // NIA-G01 to NIA-G07 all govern ACCOUNT-LEVEL authority: draft on the
    // account, schedule, publish, edit, delete, reply. Every one of them
    // needs a platform connection that does not exist. None of them
    // governs writing and critiquing a draft inside the Staff Portal,
    // which publishes nothing and touches no account.
    //
    // So her drafting capability opens and her account capability stays
    // shut, which is the distinction Tom drew when he named her in the
    // connector paragraph. The gates are not waived; they do not reach
    // the capability being opened.
    specificationStatus: "approved",
    staffPortalExecutionStatus: "staff_portal_authorised",
    currentNextControl:
      "Approved 31 August 2026 under Tom Arrington's consolidated completion and activation authority, for " +
      "drafting and critique inside the Staff Portal only. Every account-level action stays blocked: " +
      "NIA-G01 to NIA-G07 remain open, no platform connection exists, and social account ownership and the " +
      "relationship to the human social team are still unconfirmed.",
    materialBlockers: [
      "NIA-G01 to NIA-G07 open. Account-level draft, schedule, publish, edit, delete and reply authority undecided",
      "Social account/platform ownership not yet confirmed",
      "Relationship to the human social team not yet defined",
      "Independent Governance & Assurance review pending",
    ],
    personality: {
      summary:
        "Editorially sharp and evidence-led. Dry and playful where it makes content better, never at a student's expense.",
      whatFor:
        "Organic social content: creating it, improving it, and holding it to a standard. Country-by-country African " +
        "market intelligence rather than one flattened audience. Persistent memory of every post, platform and video timeline.",
      whatNotFor:
        "No SEO (Ethan), no paid media (Alex), no education research or suitability (Amelia, Oliver), no scholarship " +
        "or funding assessment (Harper), no visa or compliance advice (Priya). She may use their approved evidence; " +
        "she may not invent a fact because a post needs one.",
    },
    connectorIntent: {
      sharePoint: "The WSA Social Brain: content ledger, asset and version register, video timecode and retention register.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary:
        "No live publishing authority. No account-level action on any platform until NIA-G01 to NIA-G07 are resolved.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "pending",
    capabilities: [
      {
        id: "content_craft",
        name: "Create, critique and adapt organic social content",
        description:
          "Draft and improve content, run the AI-slop and human-voice gates, and adapt per platform.",
        worksWithoutConnector: true,
        requiresConnector: null,
        unavailableBecause:
          null,
      },
      {
        id: "publish",
        name: "Publish, schedule or reply on a social account",
        description:
          "Live account action.",
        worksWithoutConnector: false,
        requiresConnector: null,
        unavailableBecause:
          "No social connector is authorised, and NIA-G01 publishing authority remains open.",
      },
    ],
    controlledBriefReference: `${WORKING_DRAFTS}/WSA_Nia_Social_Media_Content_Intelligence_Specialist_v0.1_WORKING_DRAFT.docx`,
  }),

  entry({
    id: "wsa_governance_assurance",
    canonicalName: "WSA AI Governance & Assurance",
    roleTitle: "AI-system governance assurance",
    specificationVersion: "First baseline, approved handoff 25 August 2026",
    specificationStatus: "active",
    staffPortalExecutionStatus: "not_configured",
    currentNextControl:
      "Re-check after control-record reconciliation and Constitution provenance resolution. Does not replace WSA Core Brain or Grace, does not operate student cases, cannot modify its own authority, cannot approve its own governance changes.",
    materialBlockers: ["Control-record reconciliation pending", "Constitution provenance resolution pending"],
    personality: {
      summary: "Sceptical, calm and independent. Tests claims instead of accepting builder confidence.",
      whatFor: "Independent audit of whether governance controls (like Mandatory Material Write-Back) are actually operating.",
      whatNotFor: "Cannot approve its own authority or become the builder; does not operate student cases.",
    },
    connectorIntent: {
      sharePoint: "Read across controlled governance evidence; write authorised assurance records.",
      googleDrive: "Read only when required to audit a claim dependent on Drive evidence.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "Cannot approve its own authority or become the builder.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "not_applicable",
    capabilities: [],
    controlledBriefReference: `${SHAREPOINT_SITE}/17_Senior Management Team/AI_Operating_System/07_Control_Room/`,
  }),

  entry({
    id: "staff_receptionist",
    canonicalName: "Staff Receptionist & Routing Coordinator",
    roleTitle: "Front-door routing",
    specificationVersion: "v0.2 (Access Matrix)",
    specificationStatus: "infrastructure",
    staffPortalExecutionStatus: "available_routing_only",
    currentNextControl: "Routing only, as built in this platform pass. Does not become a substantive adviser or transmit consequential actions.",
    materialBlockers: [],
    personality: {
      summary: "Friendly, quick and unflustered. Sounds like a very capable front-desk colleague, not a chatbot menu.",
      whatFor: "Identifying which worker owns a request, its current availability, and the safe next action.",
      whatNotFor: "Does not become a substantive adviser and does not silently transmit consequential actions.",
    },
    connectorIntent: {
      sharePoint: "Current Worker Register, minimum routing metadata and authorised routing record.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "Routes only. Does not become a substantive adviser or silently transmit consequential actions.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    gatekeeperReview: "not_applicable",
    capabilities: [],
    controlledBriefReference: `${APPROVED_STANDARDS}/WSA_Worker_Personality_Connector_Access_Matrix_v0.2.docx`,
  }),
];

export const WORKER_REGISTRY: ReadonlyMap<WorkerId, WorkerRegistryEntry> = new Map(
  REGISTRY_LIST.map(w => [w.id, Object.freeze(w)]),
);

export function getWorker(id: WorkerId): WorkerRegistryEntry {
  const worker = WORKER_REGISTRY.get(id);
  if (!worker) throw new Error(`Unknown worker id: ${id}`);
  return worker;
}

export function listWorkers(): WorkerRegistryEntry[] {
  return Array.from(WORKER_REGISTRY.values());
}

/** The estate-wide control recorded in the Worker Register as of v0.39 — not a per-worker blocker, so it lives here rather than on any one entry. */
/**
 * Worker Register v0.42 recorded the next estate-level control as the
 * independent Governance & Assurance review. That was true when written
 * and was overtaken on 29 August 2026, when
 * WSA_Governance_Assurance_Gatekeeper_Review_Result_v1.0 returned AMBER
 * with no system-wide STOP and "CONSOLIDATED APPROVAL PACKET: MAY PROCEED
 * TO TOM", having inspected twelve worker documents by name.
 *
 * The estate is not waiting on assurance. It is waiting on the approval
 * authority. Register v0.43 carries this correction; no worker's approval
 * status changes because of it.
 */
export const ESTATE_LEVEL_NEXT_CONTROL =
  "Independent Governance & Assurance Gatekeeper review passed on 29 August 2026 (AMBER, no system-wide STOP, consolidated approval packet may proceed to Tom). Next control: Tom Arrington's consolidated approval decision. No additional WSA Core Brain self-approval is permitted.";
