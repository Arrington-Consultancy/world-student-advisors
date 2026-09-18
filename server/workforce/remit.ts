/**
 * The structured remit model: what each approved worker is asked FOR.
 *
 * This is the thing the router routes on, and it is deliberately not a
 * keyword table. A keyword table answers "which worker's vocabulary does
 * this sentence overlap with", which is why "hey. give a list of cold
 * leads" produced a confident "No one owns that yet" and why "what unis
 * have we got" reached nobody: overlap is not ownership.
 *
 * A remit answers a different question. Every entry here names the
 * OUTCOMES a worker produces, drawn from its approved brief and from the
 * bounded scopes recorded in WSA_Consolidated_Worker_Approval_Record_v1.0
 * (31 August 2026) and the per-worker read/write statement in the
 * Controlled Worker Handover of 5 September 2026. An outcome is a thing a
 * staff member wants to end up holding. Ownership is then a question about
 * the outcome rather than about the sentence.
 *
 * THREE THINGS ARE KEPT SEPARATE HERE, and conflating any two of them has
 * already produced a live defect:
 *
 * 1. Subject ownership. Whose area does this fall in.
 * 2. Authority to conclude. Whether that worker may reach the particular
 *    answer being asked for. Priya owns immigration rules and may not
 *    apply one to a named person; both are true at once.
 * 3. Operational state. Whether the worker, and the particular capability,
 *    can currently take the job. See operationalState.ts.
 *
 * EXCLUSIONS ARE PART OF THE REMIT, not an afterthought. Nia's brief says
 * no SEO, no paid media, no education research, no funding, no visa. An
 * exclusion removes a worker from consideration even where the wording
 * overlaps, which is what stops "post about our scholarship deadline"
 * landing on Harper because it said scholarship, or on Nia because it said
 * post, without the outcome deciding first.
 */
import type { WorkerId } from "./types";
import {
  APPROVAL_RECORD,
  HANDOVER_PROSPECTING_GAP,
  HANDOVER_ROLE_SCOPE,
  NIA_BOUNDED_SCOPE,
  PRIYA_BOUNDED_SCOPE,
  type ControlledSource,
} from "./provenance";

/**
 * A thing a staff member wants to end up holding.
 *
 * Ids are stable and are written to the Routing Gap Log as the interpreted
 * intent, so a recurring gap can be grouped by what people were actually
 * trying to get rather than by how they happened to phrase it.
 */
export type OutcomeId =
  | "enquiry_triage"
  | "student_profile"
  | "discovery_gap"
  | "institution_inventory"
  | "course_facts"
  | "league_ranking"
  | "option_comparison"
  | "application_readiness"
  | "application_requirements"
  | "application_submission"
  | "immigration_rule"
  | "visa_case_preparation"
  | "personal_immigration_determination"
  | "scholarship_options"
  | "scholarship_eligibility"
  | "affordability"
  | "funding_gap"
  | "prearrival_plan"
  | "case_audit"
  | "organic_search_performance"
  | "seo_recommendation"
  | "records_structure"
  | "paid_media_analysis"
  | "live_ads_change"
  | "social_content_draft"
  | "social_content_critique"
  | "social_market_intelligence"
  | "social_account_action"
  | "cold_lead_prospecting"
  | "management_information"
  | "student_record_lookup";

/**
 * Concepts are the vocabulary the request is reduced to before anything is
 * decided. They are NOT synonyms for a worker: several workers share
 * `student`, and `scholarship` appears in an outcome owned by Harper and
 * in an exclusion held by Nia. A concept means one idea, and outcomes are
 * defined as combinations of ideas.
 */
export type Concept =
  | "enquiry" | "triage" | "new"
  | "student" | "profile" | "background" | "know"
  | "university" | "course" | "inventory" | "list" | "available"
  | "requirement" | "fee" | "deadline" | "ranking" | "league"
  | "compare" | "suitable" | "better" | "choose"
  | "application" | "ready" | "complete" | "submit" | "send"
  | "visa" | "immigration" | "rule" | "dependant" | "eligible"
  | "scholarship" | "funding" | "afford" | "cost" | "money" | "gap"
  | "arrival" | "enrol" | "accommodation"
  | "audit" | "quality" | "check" | "case"
  | "website" | "search" | "seo" | "traffic"
  | "records" | "sharepoint" | "filing" | "version"
  | "paid" | "advert" | "campaign" | "spend" | "lead" | "conversion"
  | "social" | "post" | "content" | "draft" | "critique" | "platform"
  | "publish" | "schedule" | "reply" | "market" | "audience"
  | "cold" | "prospect" | "outreach"
  | "count" | "report" | "trend" | "most" | "channel_source"
  | "person_specific"
  | "crm" | "counsellor" | "managing" | "stage" | "named_person"
  | "hypothetical" | "who_handles";

/** An outcome and what has to be present in a request for it to be the one being asked for. */
export interface OutcomeDefinition {
  id: OutcomeId;
  /** Plain-language description, used in the gap log and in what staff are told. */
  description: string;
  /**
   * Every concept in one of these groups must be present for the outcome
   * to be claimed. Several groups means several ways of asking for the
   * same thing, not a looser test.
   */
  requires: Concept[][];
  /** Present in the request and this outcome is not the one. */
  blockedBy?: Concept[];
  /**
   * Higher wins when two outcomes both match. Specificity, not importance:
   * "is this application ready" is a more specific ask than "tell me about
   * this application", so it resolves first.
   */
  specificity: number;
}

export const OUTCOMES: readonly OutcomeDefinition[] = [
  {
    id: "enquiry_triage",
    description: "Take a new student enquiry and decide what happens with it next",
    requires: [["new", "enquiry"], ["enquiry", "triage"]],
    specificity: 6,
  },
  {
    id: "student_profile",
    description: "Build or complete what WSA knows about a student",
    requires: [["student", "profile"], ["student", "background"]],
    specificity: 5,
  },
  {
    id: "discovery_gap",
    description: "Identify what is still missing from a student's discovery",
    requires: [["know", "student"], ["gap", "profile"]],
    specificity: 4,
  },
  {
    id: "institution_inventory",
    description: "Which universities and courses WSA works with",
    requires: [["university", "inventory"], ["course", "inventory"], ["university", "list"], ["university", "available"]],
    specificity: 6,
  },
  {
    id: "course_facts",
    description: "Published facts about a course: entry requirements, fees, dates",
    requires: [["course", "requirement"], ["course", "fee"], ["university", "requirement"], ["course", "deadline"]],
    blockedBy: ["application"],
    specificity: 6,
  },
  {
    id: "league_ranking",
    description: "Where a university sits in published league tables",
    requires: [["university", "ranking"], ["league", "ranking"]],
    blockedBy: ["website", "search"],
    specificity: 7,
  },
  {
    id: "option_comparison",
    description: "Which of the researched options suits this student better",
    requires: [["compare", "course"], ["compare", "university"], ["better", "course"], ["better", "university"], ["suitable", "student"], ["choose", "course"], ["choose", "university"]],
    specificity: 7,
  },
  {
    id: "application_readiness",
    description: "Whether an application is complete and ready to go",
    requires: [["application", "ready"], ["application", "complete"], ["application", "send"], ["application", "check"]],
    specificity: 8,
  },
  {
    id: "application_requirements",
    description: "What an application still needs",
    requires: [["application", "requirement"], ["application", "deadline"]],
    specificity: 7,
  },
  {
    id: "application_submission",
    description: "Send an application to an institution",
    requires: [["application", "submit"]],
    specificity: 8,
  },
  {
    id: "immigration_rule",
    description: "What a published immigration rule says",
    requires: [["visa", "rule"], ["immigration", "rule"], ["visa", "requirement"], ["immigration", "requirement"]],
    blockedBy: ["person_specific"],
    specificity: 7,
  },
  {
    id: "personal_immigration_determination",
    description: "Whether a named student's own circumstances meet an immigration rule",
    requires: [["person_specific", "visa"], ["person_specific", "immigration"], ["person_specific", "dependant"], ["dependant", "eligible"]],
    specificity: 9,
  },
  {
    id: "visa_case_preparation",
    description: "What an authorised human must decide on a visa case, and the evidence it needs",
    requires: [["visa", "case"], ["immigration", "case"]],
    specificity: 6,
  },
  {
    id: "scholarship_options",
    description: "Which scholarships a student could go for",
    requires: [["scholarship", "student"], ["scholarship", "available"], ["scholarship", "list"]],
    specificity: 7,
  },
  {
    id: "scholarship_eligibility",
    description: "Whether a student meets a named scholarship scheme's rules",
    requires: [["scholarship", "eligible"]],
    specificity: 8,
  },
  {
    id: "affordability",
    description: "Whether a student can meet the cost of study",
    requires: [["afford"], ["cost", "student"], ["money", "student"]],
    specificity: 8,
  },
  {
    id: "funding_gap",
    description: "A student's funding position and the shortfall",
    requires: [["funding", "gap"], ["funding", "student"]],
    specificity: 6,
  },
  {
    id: "prearrival_plan",
    description: "What a confirmed student needs before arriving and enrolling",
    requires: [["arrival", "student"], ["enrol", "student"], ["accommodation"], ["arrival"], ["enrol"]],
    specificity: 5,
  },
  {
    id: "case_audit",
    description: "An independent quality check on case work",
    requires: [["quality", "check"], ["audit", "case"], ["check", "case"], ["audit"]],
    specificity: 6,
  },
  {
    id: "organic_search_performance",
    description: "How WSA's website is performing in organic search",
    requires: [["website", "ranking"], ["website", "search"], ["search", "ranking"], ["website", "traffic"], ["seo"]],
    specificity: 8,
  },
  {
    id: "seo_recommendation",
    description: "What to change on the site for organic search",
    requires: [["website", "content"], ["search", "content"]],
    specificity: 4,
  },
  {
    id: "records_structure",
    description: "Where a controlled record belongs and how it is versioned",
    requires: [["records", "filing"], ["sharepoint", "records"], ["version", "records"], ["sharepoint", "filing"]],
    specificity: 6,
  },
  {
    id: "paid_media_analysis",
    description: "How paid campaigns are performing against spend",
    requires: [["paid", "campaign"], ["advert", "spend"], ["advert", "campaign"], ["conversion", "advert"], ["paid", "lead"]],
    specificity: 7,
  },
  {
    id: "live_ads_change",
    description: "Change something in a live advertising account",
    requires: [["advert", "publish"], ["campaign", "publish"]],
    specificity: 8,
  },
  {
    id: "social_content_draft",
    description: "Write a social post or piece of organic content",
    requires: [["draft", "post"], ["draft", "content"], ["draft", "social"], ["post", "content"]],
    specificity: 7,
  },
  {
    id: "social_content_critique",
    description: "Improve or review a social post that already exists",
    requires: [["critique", "post"], ["critique", "content"], ["critique", "social"]],
    specificity: 7,
  },
  {
    id: "social_market_intelligence",
    description: "What an audience in a particular market responds to",
    requires: [["social", "audience"], ["social", "market"], ["audience", "market"]],
    specificity: 6,
  },
  {
    id: "social_account_action",
    description: "Publish, schedule or reply on a live social account",
    requires: [["publish", "post"], ["schedule", "post"], ["reply", "post"], ["publish", "social"], ["schedule", "social"]],
    specificity: 9,
  },
  {
    id: "management_information",
    description: "A count, ranking or trend drawn from the records WSA already holds, such as how many enquiries, leads, students or applications, from which source, in a period",
    // "How many cold leads have we had from the website in the last 12
    // months" is a question about records WSA already holds. It is not
    // prospecting, and routing it there produced a confident wrong refusal
    // on 11 September 2026. Information outranks the prospecting reading
    // whenever both are present. The resolution-first layer answers it from
    // the authorised sources; no worker is invented to own it.
    requires: [
      ["count", "lead"], ["count", "enquiry"], ["count", "student"], ["count", "case"], ["count", "application"],
      ["report", "lead"], ["report", "enquiry"], ["report", "student"],
      ["trend", "enquiry"], ["trend", "lead"], ["trend", "website"],
      ["most", "enquiry"], ["most", "lead"], ["most", "channel_source"],
      ["count", "channel_source"],
    ],
    specificity: 9,
  },
  {
    id: "student_record_lookup",
    description: "Find a named student's record in the CRM and say who is managing them, what stage they are at, or whether they are recorded at all",
    // Tom Arrington, 16 and 17 September 2026. "How is managing this lead?
    // <name>" reached nobody by rule on 16 September and only reached Sophie
    // through the assistant pass; "ar ethere any toms on pipedrive" reached
    // nobody at all on 17 September. Both are questions about one student's
    // CRM record, which the platform already answers under the staff
    // member's own lookup authority once a worker conversation is open (Tom's
    // decision of 9 September 2026, extended to every record on 17
    // September). This outcome makes that placement a rule. It is not a
    // count: a count over the CRM stays management information, which
    // outranks it and is blocked here so "how many on pipedrive" cannot
    // become a record lookup.
    requires: [
      ["crm"],
      ["counsellor"],
      ["managing", "student"], ["managing", "lead"], ["managing", "case"], ["managing", "enquiry"], ["managing", "named_person"],
      ["stage", "student"], ["stage", "lead"], ["stage", "case"], ["stage", "enquiry"], ["stage", "named_person"],
    ],
    // A generic or hypothetical question ("a student who ...", "which
    // specialist should handle ...") is about a kind of case, not a record.
    // Tom Arrington, 18 September 2026: such a question must not become a
    // CRM lookup, and it routes on its subject (here, scholarships) instead.
    blockedBy: ["count", "report", "trend", "most", "hypothetical", "who_handles"],
    specificity: 8,
  },
  {
    id: "cold_lead_prospecting",
    description: "Find or work cold leads and outbound prospects",
    // No bare "cold" group. On its own the word is ambiguous enough that
    // it claimed "what scholarships COULD this student apply for" through
    // a one-letter typo repair, which is how a confident wrong answer gets
    // made out of two reasonable rules.
    requires: [["cold", "lead"], ["cold", "list"], ["prospect"], ["outreach"]],
    specificity: 8,
  },
];

/** An outcome a worker's brief expressly pushes away, and where it belongs instead. */
export interface RemitExclusion {
  outcome: OutcomeId;
  /** The worker whose remit it actually is, where the brief names one. */
  belongsTo: WorkerId | null;
  /**
   * The controlled record this exclusion is read from.
   *
   * Required, not optional. An exclusion without a citation is an opinion
   * about what a worker should not do, and an opinion in code that nobody
   * can trace back to an approved record is exactly how a codebase starts
   * governing itself.
   */
  source: ControlledSource;
}

export interface WorkerRemit {
  workerId: WorkerId;
  /** Outcomes this worker's approved brief says it produces. */
  produces: OutcomeId[];
  /**
   * Outcomes this worker may identify but may not conclude on.
   *
   * This is the Priya case and it is not the same as an exclusion. The
   * subject is hers; the conclusion is not. The request reaches her and
   * she is required to say what an authorised human must decide.
   */
  identifiesButMayNotConclude: OutcomeId[];
  /** Outcomes expressly outside the brief, with the owner where one is named. */
  excludes: RemitExclusion[];
  /**
   * Position in the student pipeline, or null for workers that sit outside
   * it. SUPPORTING EVIDENCE ONLY, priority level 4. An earlier stage being
   * incomplete never overrides the outcome actually requested: "is the
   * application ready even though discovery is missing" is a question
   * about the application.
   */
  pipelineStage: number | null;
  /** The controlled record the `produces` list is read from. */
  source: ControlledSource;
  /** The controlled record that states this worker is approved at all. */
  approvalSource: ControlledSource;
}

export const REMITS: readonly WorkerRemit[] = [
  {
    workerId: "sophie",
    // student_record_lookup: Sophie's approved CRM read intent (registry,
    // CRM_READ_INTENT_APPROVED) and Tom Arrington's decisions of 9 and 17
    // September 2026 on the staff student lookup; recorded in Change Entries
    // 106 to 108. The remit's cited source below remains the Handover role
    // scope, which places first contact and the enquiry record with her.
    produces: ["enquiry_triage", "student_record_lookup"],
    identifiesButMayNotConclude: [],
    excludes: [
      { outcome: "option_comparison", belongsTo: "oliver", source: HANDOVER_ROLE_SCOPE },
      { outcome: "application_readiness", belongsTo: "james", source: HANDOVER_ROLE_SCOPE },
      { outcome: "immigration_rule", belongsTo: "priya", source: HANDOVER_ROLE_SCOPE },
    ],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: 1,
  },
  {
    workerId: "daniel",
    produces: ["student_profile", "discovery_gap"],
    identifiesButMayNotConclude: [],
    excludes: [
      { outcome: "course_facts", belongsTo: "amelia", source: HANDOVER_ROLE_SCOPE },
      { outcome: "option_comparison", belongsTo: "oliver", source: HANDOVER_ROLE_SCOPE },
    ],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: 2,
  },
  {
    workerId: "amelia",
    produces: ["institution_inventory", "course_facts", "league_ranking"],
    identifiesButMayNotConclude: [],
    excludes: [
      { outcome: "option_comparison", belongsTo: "oliver", source: HANDOVER_ROLE_SCOPE },
      { outcome: "application_readiness", belongsTo: "james", source: HANDOVER_ROLE_SCOPE },
      { outcome: "organic_search_performance", belongsTo: "ethan", source: HANDOVER_ROLE_SCOPE },
    ],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: 3,
  },
  {
    workerId: "oliver",
    produces: ["option_comparison"],
    identifiesButMayNotConclude: [],
    excludes: [
      { outcome: "application_submission", belongsTo: "james", source: HANDOVER_ROLE_SCOPE },
      { outcome: "immigration_rule", belongsTo: "priya", source: HANDOVER_ROLE_SCOPE },
      { outcome: "course_facts", belongsTo: "amelia", source: HANDOVER_ROLE_SCOPE },
    ],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: 4,
  },
  {
    workerId: "james",
    produces: ["application_readiness", "application_requirements", "application_submission"],
    identifiesButMayNotConclude: [],
    excludes: [
      { outcome: "scholarship_options", belongsTo: "harper", source: HANDOVER_ROLE_SCOPE },
      { outcome: "affordability", belongsTo: "harper", source: HANDOVER_ROLE_SCOPE },
      { outcome: "immigration_rule", belongsTo: "priya", source: HANDOVER_ROLE_SCOPE },
      { outcome: "course_facts", belongsTo: "amelia", source: HANDOVER_ROLE_SCOPE },
    ],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: 5,
  },
  {
    workerId: "priya",
    produces: ["immigration_rule", "visa_case_preparation"],
    // The bounded scope approved on 31 August 2026, section 4. Stating
    // what a published rule requires is approved. Applying it to a person
    // is not, and is enforced as blocked on her output in code.
    identifiesButMayNotConclude: ["personal_immigration_determination"],
    excludes: [
      { outcome: "affordability", belongsTo: "harper", source: PRIYA_BOUNDED_SCOPE },
      { outcome: "application_readiness", belongsTo: "james", source: PRIYA_BOUNDED_SCOPE },
    ],
    source: PRIYA_BOUNDED_SCOPE,
    approvalSource: PRIYA_BOUNDED_SCOPE,
    pipelineStage: 6,
  },
  {
    workerId: "harper",
    produces: ["scholarship_options", "scholarship_eligibility", "affordability", "funding_gap"],
    identifiesButMayNotConclude: [],
    excludes: [
      // Her brief's hard boundary: no visa financial-evidence advice. The
      // money is hers, the immigration rule about the money is not.
      { outcome: "immigration_rule", belongsTo: "priya", source: HANDOVER_ROLE_SCOPE },
      { outcome: "application_readiness", belongsTo: "james", source: HANDOVER_ROLE_SCOPE },
    ],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: null,
  },
  {
    workerId: "olivia",
    produces: ["prearrival_plan"],
    identifiesButMayNotConclude: [],
    excludes: [
      { outcome: "immigration_rule", belongsTo: "priya", source: HANDOVER_ROLE_SCOPE },
      { outcome: "affordability", belongsTo: "harper", source: HANDOVER_ROLE_SCOPE },
    ],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: 7,
  },
  {
    workerId: "grace",
    produces: ["case_audit"],
    identifiesButMayNotConclude: [],
    excludes: [],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: null,
  },
  {
    workerId: "ethan",
    produces: ["organic_search_performance", "seo_recommendation"],
    identifiesButMayNotConclude: [],
    excludes: [
      { outcome: "paid_media_analysis", belongsTo: "alex", source: HANDOVER_ROLE_SCOPE },
      { outcome: "social_content_draft", belongsTo: "nia", source: HANDOVER_ROLE_SCOPE },
      { outcome: "league_ranking", belongsTo: "amelia", source: HANDOVER_ROLE_SCOPE },
    ],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: null,
  },
  {
    workerId: "maya",
    produces: ["records_structure"],
    identifiesButMayNotConclude: [],
    excludes: [],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: null,
  },
  {
    workerId: "alex",
    produces: ["paid_media_analysis", "live_ads_change"],
    identifiesButMayNotConclude: [],
    excludes: [
      { outcome: "organic_search_performance", belongsTo: "ethan", source: HANDOVER_ROLE_SCOPE },
      { outcome: "social_content_draft", belongsTo: "nia", source: HANDOVER_ROLE_SCOPE },
    ],
    source: HANDOVER_ROLE_SCOPE,
    approvalSource: APPROVAL_RECORD,
    pipelineStage: null,
  },
  {
    workerId: "nia",
    produces: [
      "social_content_draft",
      "social_content_critique",
      "social_market_intelligence",
      "social_account_action",
    ],
    identifiesButMayNotConclude: [],
    excludes: [
      // Straight from her brief: no SEO, no paid media, no education
      // research or suitability, no scholarship or funding, no visa.
      { outcome: "organic_search_performance", belongsTo: "ethan", source: NIA_BOUNDED_SCOPE },
      { outcome: "seo_recommendation", belongsTo: "ethan", source: NIA_BOUNDED_SCOPE },
      { outcome: "paid_media_analysis", belongsTo: "alex", source: NIA_BOUNDED_SCOPE },
      { outcome: "course_facts", belongsTo: "amelia", source: NIA_BOUNDED_SCOPE },
      { outcome: "option_comparison", belongsTo: "oliver", source: NIA_BOUNDED_SCOPE },
      { outcome: "scholarship_options", belongsTo: "harper", source: NIA_BOUNDED_SCOPE },
      { outcome: "immigration_rule", belongsTo: "priya", source: NIA_BOUNDED_SCOPE },
    ],
    source: NIA_BOUNDED_SCOPE,
    approvalSource: NIA_BOUNDED_SCOPE,
    pipelineStage: null,
  },
];

/**
 * Outcomes no approved worker produces.
 *
 * This list is evidence, not a placeholder. Prospecting is the clearest
 * case: the Controlled Worker Handover of 5 September 2026 records a new
 * staff member starting on 14 September whose role "will include
 * converting cold leads", and no worker brief in the Register mentions
 * prospecting, cold leads or outbound business development at all. So
 * "give me some cold leads" is a real workforce gap and not a router
 * failure, and the router is allowed to say so in those words.
 *
 * Nothing may be added here to make a routing failure look tidy. An
 * outcome belongs here only where the controlled records show no approved
 * worker produces it.
 */
export const UNOWNED_OUTCOMES: readonly { outcome: OutcomeId; source: ControlledSource }[] = [
  { outcome: "cold_lead_prospecting", source: HANDOVER_PROSPECTING_GAP },
  // No worker brief includes aggregate reporting over the CRM. Sophie reads
  // one enquiry by exact identifier, Grace samples for audit; nobody counts.
  // Recorded as unowned so the gap log groups these and Tom can decide who
  // should, rather than the router inventing an owner.
  { outcome: "management_information", source: HANDOVER_ROLE_SCOPE },
];

export function isUnowned(outcome: OutcomeId): boolean {
  return UNOWNED_OUTCOMES.some(u => u.outcome === outcome);
}

export function remitFor(workerId: WorkerId): WorkerRemit | undefined {
  return REMITS.find(r => r.workerId === workerId);
}

export function outcomeDefinition(id: OutcomeId): OutcomeDefinition {
  const found = OUTCOMES.find(o => o.id === id);
  if (!found) throw new Error(`Unknown outcome: ${id}`);
  return found;
}

/** Every worker whose approved remit produces this outcome. */
export function producersOf(outcome: OutcomeId): WorkerId[] {
  return REMITS.filter(r => r.produces.includes(outcome)).map(r => r.workerId);
}

/** Every worker that owns the subject but may not conclude on it. */
export function subjectOwnersOf(outcome: OutcomeId): WorkerId[] {
  return REMITS.filter(r => r.identifiesButMayNotConclude.includes(outcome)).map(r => r.workerId);
}
