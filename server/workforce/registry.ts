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
 * At the time this was written: Sophie is the only worker with
 * specificationStatus "approved", and no worker (including Sophie) has
 * staffPortalExecutionAuthorised true. Do not flip either without a
 * corresponding update to the controlled Worker Register and, for
 * execution, a resolved deployment-channel decision plus tested connector
 * credentials.
 */
import type { WorkerId, WorkerRegistryEntry } from "./types";
import { NO_CONTROLLED_CRM_DECISION } from "./types";

const SHAREPOINT_SITE = "https://worldstudentadvisors123.sharepoint.com/sites/WSASharePoint/Shared Documents";
const APPROVED_STANDARDS = `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/02_Approved_Standards`;
const WORKING_DRAFTS = `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts`;

const TOM_ARRINGTON = "Tom Arrington (WSA policy owner and approval authority)";

/**
 * Computes the two authorisation flags from status alone, so nothing can
 * set them directly and no worker can become "authorised" by any route
 * other than its recorded statuses actually changing.
 */
function deriveAuthorisation(
  specificationStatus: WorkerRegistryEntry["specificationStatus"],
  staffPortalExecutionStatus: WorkerRegistryEntry["staffPortalExecutionStatus"],
): { staffPortalExecutionAuthorised: boolean; connectorUseAuthorised: boolean; writesAuthorised: boolean } {
  // No worker is currently authorised for live Staff Portal case-work
  // execution or any connector action, regardless of specificationStatus.
  // Connector use requires technically-configured, acceptance-tested
  // credentials (Access Matrix section 5) which do not exist yet for any
  // system in this build. See connectorConfigurationPlan.md.
  void specificationStatus;
  void staffPortalExecutionStatus;
  return { staffPortalExecutionAuthorised: false, connectorUseAuthorised: false, writesAuthorised: false };
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
    controlledBriefReference: `${APPROVED_STANDARDS}/WSA_Core_Operating_System_v1.1_APPROVED.docx`,
  }),

  entry({
    id: "sophie",
    canonicalName: "Sophie",
    roleTitle: "Student Enquiry & Triage",
    specificationVersion: "v1.1",
    specificationStatus: "approved",
    staffPortalExecutionStatus: "pending_channel_decision",
    currentNextControl:
      "Deploy as Custom GPT and connector-test. Unresolved deployment-channel decision. Do not assume a Staff Portal deployment replaces this.",
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
    controlledBriefReference: `${APPROVED_STANDARDS}/WSA_Sophie_Staff_Operating_Guide_v1.0_APPROVED.docx`,
  }),

  entry({
    id: "daniel",
    canonicalName: "Daniel",
    roleTitle: "Student Discovery",
    specificationVersion: "v0.4",
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl:
      "Independent Gatekeeper review plus a consolidated approval decision; the triage-QC entry proposal remains open and non-operative.",
    materialBlockers: ["Independent Gatekeeper review pending", "Triage-QC entry decision open"],
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
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "amelia",
    canonicalName: "Amelia",
    roleTitle: "Education Research",
    specificationVersion: "v0.3",
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl:
      "Independent Gatekeeper review plus a consolidated approval decision; education-option/research-governance definition remains open.",
    materialBlockers: ["Independent Gatekeeper review pending", "Education-option/research governance open"],
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
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "oliver",
    canonicalName: "Oliver",
    roleTitle: "Education Suitability",
    specificationVersion: "v0.2",
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl: "Independent Gatekeeper review plus a consolidated approval decision; suitability governance remains open.",
    materialBlockers: ["Independent Gatekeeper review pending", "Suitability governance open"],
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
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "james",
    canonicalName: "James",
    roleTitle: "Admissions & Application",
    specificationVersion: "v0.3 + Control Pack v0.1",
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl:
      "Ready for Tom Arrington's design approval after Independent Gatekeeper review (formal test 30/30 pass). Live submissions remain deployment-gated regardless.",
    materialBlockers: ["Independent Gatekeeper review pending", "Tom Arrington design approval pending", "Live submissions deployment-gated"],
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
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "priya",
    canonicalName: "Priya",
    roleTitle: "Visa & Compliance",
    specificationVersion: "v0.2",
    specificationStatus: "approval_blocked",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl: "Resolve AB-P01 to AB-P04. No production regulated advice or visa submission authorised.",
    materialBlockers: [
      "AB-P01: immigration-advice authority by jurisdiction/activity",
      "AB-P02: approved Decision and Escalation Framework",
      "AB-P03: approved Knowledge and Evidence Standard",
      "AB-P04: authorised human ownership for visa submission, regulated-advice escalation, refusals and adverse decisions",
    ],
    personality: {
      summary: "Cautious, exact and calm under pressure. Never bluffs on immigration authority.",
      whatFor: "Explaining confirmed visa/compliance rules, interpretation and uncertainty, once approved.",
      whatNotFor: "Regulated advice or submission remains authority-gated; currently not available for any live case work.",
    },
    connectorIntent: {
      sharePoint: "Minimum necessary visa/compliance case evidence within verified authority.",
      googleDrive: "None by default.",
      pipedrive: NO_CONTROLLED_CRM_DECISION,
      hardBoundary: "Regulated advice/submission remains authority-gated.",
    },
    evidencedHandoffs: [],
    escalationRoute: TOM_ARRINGTON,
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "harper",
    canonicalName: "Harper",
    roleTitle: "Scholarships & Funding",
    specificationVersion: "v0.2",
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl: "Consolidated Harper decisions AB-H01 to AB-H15 plus privacy/human-authority gates remain open.",
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
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "olivia",
    canonicalName: "Olivia",
    roleTitle: "Pre-arrival & Student Success",
    specificationVersion: "v0.2",
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl: "GOV-O1 to GOV-O3 and deployment dependencies DD-O1 to DD-O3 remain open.",
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
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "grace",
    canonicalName: "Grace",
    roleTitle: "Quality Assurance & Case Audit",
    specificationVersion: "v0.8",
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl:
      "Governance resolved and narrow regression passed; Independent Gatekeeper/approval and live deployment gates remain. Not authorised for live identifiable student deployment.",
    materialBlockers: ["Independent Gatekeeper/approval pending", "Live deployment gates pending"],
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
    controlledBriefReference: `${APPROVED_STANDARDS}/WSA_Grace_Governance_Dependency_Classification_v1.0_APPROVED.docx`,
  }),

  entry({
    id: "ethan",
    canonicalName: "Ethan",
    roleTitle: "SEO & Organic Growth",
    specificationVersion: "v0.3",
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl:
      "Governance decisions AB-E03, AB-E06, AB-E07 and AB-E11 policy are approved; AB-E11 deployment remains blocked pending designated implementation/high-risk-action roles. AB-E01, E02, E04, E05, E08, E09, E10, E12 remain open.",
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
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts/`,
  }),

  entry({
    id: "maya",
    canonicalName: "Maya",
    roleTitle: "SharePoint & Records Control",
    specificationVersion: "v0.2",
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl:
      "RG-01 Current Record & Version Integrity, RG-02 Records Transaction & Incident and RG-03 Destructive Action & Approval Evidence remain critical approval blockers. RG-04 Verification & Audit is High. Least-privilege access is a deployment dependency; retention/legal-hold policy requires external privacy/legal/contractual evidence.",
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
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts/WSA_Maya_SharePoint_Records_Control_Specialist_v0.2_WORKING_DRAFT.docx`,
  }),

  entry({
    id: "alex",
    canonicalName: "Alex",
    roleTitle: "Paid Media & Google Ads",
    specificationVersion: "v0.2",
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl:
      "AB-A01 to AB-A12 remain open; consolidated approval packet prepared. No live advertising authority. No Google Ads, Pipedrive, Zapier, website or conversion-tracking changes authorised.",
    materialBlockers: ["AB-A01 to AB-A12 open", "No live advertising authority"],
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
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/01_Working_Drafts/`,
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
    specificationStatus: "not_approved",
    staffPortalExecutionStatus: "prohibited",
    currentNextControl:
      "Resolve NIA-G01 to NIA-G07, confirm social account/platform ownership and human-team relationship, " +
      "then independent Governance & Assurance review before activation.",
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
    controlledBriefReference: `${SHAREPOINT_SITE}/01_ADMIN_&_GOVERNANCE/AI_Operating_System/07_Control_Room/`,
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
export const ESTATE_LEVEL_NEXT_CONTROL =
  "The worker estate has reached design-level testing. Next control: independent Governance & Assurance review. No additional WSA Core Brain self-approval is permitted.";
