/**
 * Staff Receptionist & Routing Coordinator — the front door.
 *
 * Deliberately deterministic and registry-backed, not a free-form model
 * call: it maps a staff request to the worker whose registry entry (role
 * title, function keywords, personality "what for" text) actually owns
 * that kind of work, then reports that worker's real, current
 * staffPortalExecutionAuthorised state. It never substitutes a different
 * worker just because that worker happens to be available, and it never
 * becomes a substantive adviser itself — its only job is identification,
 * explanation, availability and a safe next action.
 */
import { getWorker, listWorkers } from "./registry";
import { evaluateStaffPortalExecutionPermission } from "./permissions";
import { tokenise, scoreTerms } from "./routing";
import { routeWithAssistant } from "./routerAssistant";
import { routeByRemit, type CaseContext, type RemitRoutingDecision, type RoutingFailureType, type RoutingConfidence, type PriorityLevel } from "./remitRouter";
import { ROUTING_MODEL_VERSION } from "./provenance";
import type { OutcomeId } from "./remit";
import type { WorkerId } from "./types";

interface RoutingDomain {
  workerId: WorkerId;
  keywords: string[];
}

// Keyword domains are drawn from each worker's Register role title and
// Access Matrix "what for" description — not invented categories.
const ROUTING_DOMAINS: RoutingDomain[] = [
  {
    workerId: "sophie",
    keywords: [
      "enquiry", "triage", "new enquiry", "new student enquiry", "first contact", "new lead", "who should take this",
      "route this", "incoming", "student got in touch", "someone asked",
    ],
  },
  {
    workerId: "daniel",
    keywords: [
      "discovery", "background", "background information", "student profile", "academic profile",
      "student discovery", "gather background", "find out about the student", "what do we know about",
      "profile", "prior study", "academic history",
    ],
  },
  {
    workerId: "amelia",
    keywords: [
      "research", "course", "courses available", "what course", "which course", "programme", "program",
      "module", "curriculum", "syllabus", "english course", "english language", "foundation year",
      "pre-masters", "pathway", "study option", "what do we offer", "university information",
      "institution information", "entry profile", "entry requirement", "subject", "tuition fee", "ranking",
    ],
  },
  {
    workerId: "oliver",
    keywords: [
      "suitability", "suitable", "compare option", "compare universities", "compare courses", "trade off",
      "which option", "best fit", "better fit", "better option", "which university", "which of these",
      "right for this student", "recommend an option",
    ],
  },
  {
    workerId: "james",
    // "entry requirement" moved to Amelia. A published entry requirement
    // is a researched fact about a course; James owns the application
    // measured against it, which is what these phrases describe. The
    // acceptance sweep caught this: "research entry requirements for this
    // course" was reaching admissions.
    keywords: [
      "admission", "admissions requirement", "application", "application requirement", "application deadline", "apply", "submit",
      "submission", "deadline", "meets the entry requirement", "offer letter", "conditional offer", "ucas",
      "supporting document", "personal statement", "reference letter",
    ],
  },
  {
    workerId: "priya",
    keywords: ["visa", "immigration", "ukvi", "compliance", "sponsor licence", "cas", "right to study", "atas", "brp", "ihs"],
  },
  {
    workerId: "harper",
    keywords: ["scholarship", "funding", "financial", "tuition fee", "fees", "affordability", "funding gap", "bursary", "cost of study", "how much"],
  },
  {
    workerId: "olivia",
    keywords: [
      "pre-arrival", "arrival", "arrive", "they arrive", "orientation", "student success", "settling in",
      "transition", "accommodation", "airport", "before they travel", "enrol", "enrolment", "enrollment",
      "got their offer", "has their offer",
    ],
  },
  {
    workerId: "grace",
    keywords: [
      "audit", "quality assurance", "quality check", "quality checked", "case review", "quality control",
      "case audit", "check our work", "check this case", "review this case", "did we follow",
      "before it goes out",
    ],
  },
  {
    workerId: "ethan",
    keywords: [
      "seo", "organic search", "search console", "website traffic", "organic growth", "keyword ranking",
      "google ranking", "search ranking", "search rankings", "website search", "search result", "web page",
      "website ranking",
    ],
  },
  {
    workerId: "nia",
    keywords: [
      "social", "social media", "instagram", "facebook", "linkedin", "youtube", "tiktok",
      "social post", "caption", "reel", "video content", "content calendar", "engagement",
      "follower", "hashtag", "what should we post",
    ],
  },
  {
    workerId: "alex",
    keywords: ["paid media", "google ads", "advertising", "advert", "ppc", "ad campaign", "conversion tracking", "ad spend", "cost per lead", "boost"],
  },
  {
    workerId: "maya",
    keywords: ["sharepoint", "records control", "file structure", "document control", "records management", "version control", "where is the document", "filing"],
  },
];

export interface RoutingResult {
  matched: boolean;
  routedBy: RoutedBy;
  responsibleWorkerId?: WorkerId;
  responsibleWorkerName?: string;
  ownershipReason?: string;
  availability: "available" | "not_available_for_live_case_work";
  status: string;
  blocker?: string;
  safeNextAction: string;
  /**
   * The remit model's reading of the request, carried for the Routing
   * Gap Log and for the "Wrong specialist?" correction. `outcome` is the
   * interpreted intent; `candidates` are the workers considered;
   * `failure` is the classified reason where nobody could take it.
   */
  outcome: OutcomeId | null;
  outcomeDescription: string | null;
  candidates: WorkerId[];
  confidence: RoutingConfidence;
  decidedAt: PriorityLevel;
  failure: RoutingFailureType | null;
  /** Set where the subject owner may not conclude. The worker is still the destination. */
  humanGate: string | null;
  modelVersion: string;
  /** A management-information question: answered by the resolution-first layer, not a worker. */
  informationRequest?: boolean;
  /** The resolution, attached by the route endpoint after it has checked the authorised sources. */
  informationAnswer?: InformationAnswerView;
}

/** What Reception shows for an information question. Server-composed; never a raw record. */
export interface InformationAnswerView {
  outcome: "answered" | "partial" | "unavailable" | "permission_denied" | "connector_unavailable";
  answer: string;
  coverage: { from: string; to: string; reliableFrom: string | null } | null;
  sourcesChecked: string[];
  gapType: string;
  humanOwner: string | null;
  recorded: boolean;
}

/** How the owner was identified, so a routed answer stays auditable. */
export type RoutedBy = "remit" | "keywords" | "assistant" | "none";

/**
 * Routes a plain-language staff request to its responsible worker. Never
 * silently substitutes an available worker for the correct-but-unavailable
 * one, and never invents ownership for a request that matches nothing.
 */
function unmatched(
  note: string,
  extra: Partial<RoutingResult> = {},
  safeNextAction =
    "Escalate to the current authorised human process. Do not guess an owner or attempt this as a general-purpose assistant.",
): RoutingResult {
  return {
    matched: false,
    routedBy: "none",
    availability: "not_available_for_live_case_work",
    status: note,
    safeNextAction,
    outcome: null,
    outcomeDescription: null,
    candidates: [],
    confidence: "none",
    decidedAt: "unresolved",
    failure: "no_recognised_intent",
    humanGate: null,
    modelVersion: ROUTING_MODEL_VERSION,
    ...extra,
  };
}

/** Build the result for a worker the register says owns this work. */
function resultFor(workerId: WorkerId, routedBy: RoutedBy, decision?: RemitRoutingDecision): RoutingResult {
  const worker = getWorker(workerId);
  const executionPermission = evaluateStaffPortalExecutionPermission(worker.id);
  const availability: RoutingResult["availability"] = executionPermission.allowed
    ? "available"
    : "not_available_for_live_case_work";

  return {
    matched: true,
    routedBy,
    responsibleWorkerId: worker.id,
    responsibleWorkerName: `${worker.canonicalName}, WSA ${worker.roleTitle} Specialist`,
    ownershipReason: decision?.outcomeDescription
      ? `${worker.canonicalName} owns this: ${decision.outcomeDescription.toLowerCase()}. ${worker.personality.whatFor}`
      : `${worker.canonicalName} owns ${worker.roleTitle} work: ${worker.personality.whatFor}`,
    availability,
    status:
      availability !== "available"
        ? `Not available for live case work (specificationStatus: ${worker.specificationStatus}).`
        : decision?.humanGate ?? "Available.",
    blocker: availability === "available" ? undefined : worker.currentNextControl,
    safeNextAction:
      availability !== "available"
        ? `Route to the current authorised human process or await approval, per controlled WSA governance. Escalation: ${worker.escalationRoute}.`
        : decision?.safeNextAction ?? `Open ${worker.canonicalName}'s workspace.`,
    outcome: decision?.outcome ?? null,
    outcomeDescription: decision?.outcomeDescription ?? null,
    candidates: decision?.candidates ?? [workerId],
    confidence: decision?.confidence ?? "low",
    decidedAt: decision?.decidedAt ?? "keyword_tiebreak",
    failure: null,
    humanGate: decision?.humanGate ?? null,
    modelVersion: ROUTING_MODEL_VERSION,
  };
}

/** The legacy keyword pass. Level 5 only: supporting evidence when the remit model found no outcome at all. */
function routeByKeywords(requestText: string): WorkerId | null {
  const tokens = tokenise(requestText);
  let best: { workerId: WorkerId; score: number } | null = null;
  for (const domain of ROUTING_DOMAINS) {
    const score = scoreTerms(tokens, domain.keywords);
    if (score > 0 && (!best || score > best.score)) best = { workerId: domain.workerId, score };
  }
  return best?.workerId ?? null;
}

/**
 * The deterministic front door.
 *
 * Remit first. The remit model reads what the person wants to end up
 * holding and decides ownership from approved remits and exclusions, in
 * the five-level order set out in remitRouter.ts. It also carries the
 * operational state, so a recognised remit whose worker or capability
 * cannot take the job is reported as exactly that rather than as "no one
 * owns it".
 *
 * Keywords only where the remit model recognised no intent at all, and
 * marked low confidence when they do, because a word overlap is evidence
 * and not ownership.
 */
export function routeStaffRequest(requestText: string, context: CaseContext = {}): RoutingResult {
  const decision = routeByRemit(requestText, context);

  if (decision.matched && decision.responsibleWorkerId) {
    return resultFor(decision.responsibleWorkerId, "remit", decision);
  }

  // Resolution first. The route endpoint runs the information resolver with
  // the signed-in staff member's own authorisation and attaches the answer.
  if (decision.resolution === "information") {
    return unmatched(decision.status, {
      routedBy: "remit",
      outcome: decision.outcome,
      outcomeDescription: decision.outcomeDescription,
      candidates: [],
      confidence: decision.confidence,
      decidedAt: decision.decidedAt,
      failure: null,
      informationRequest: true,
    }, "");
  }

  // The remit model recognised what was asked and established that nobody
  // can take it. That is a finding, and it is reported as one, with the
  // classification the Routing Gap Log needs.
  if (decision.failure && decision.failure !== "no_recognised_intent") {
    return unmatched(decision.status, {
      outcome: decision.outcome,
      outcomeDescription: decision.outcomeDescription,
      candidates: decision.candidates,
      confidence: decision.confidence,
      decidedAt: decision.decidedAt,
      failure: decision.failure,
    }, decision.safeNextAction);
  }

  const byKeyword = routeByKeywords(requestText);
  if (byKeyword) return resultFor(byKeyword, "keywords");

  return unmatched("I could not work out what you are asking for.");
}

/**
 * The full front door: keywords first, then the assistant.
 *
 * The order matters beyond cost. A deterministic match is reproducible
 * and explainable, so it should never be displaced by a model that might
 * answer differently tomorrow. The model only ever sees what keywords
 * could not place.
 */
export async function routeStaffRequestAssisted(
  requestText: string,
  assistantTimeoutMs?: number,
): Promise<RoutingResult> {
  const deterministic = routeStaffRequest(requestText);
  if (deterministic.matched) return deterministic;
  if (deterministic.informationRequest) return deterministic;
  // A classified failure is an answer. The assistant only sees requests the
  // remit model could not read at all, never ones it read and found unowned
  // or blocked, because a model guessing an owner for an unowned outcome is
  // exactly the invented remit this whole layer exists to prevent.
  if (deterministic.failure && deterministic.failure !== "no_recognised_intent") return deterministic;

  const assisted = await routeWithAssistant(requestText, assistantTimeoutMs);
  if (assisted.workerId) return resultFor(assisted.workerId, "assistant");
  return unmatched(
    assisted.note || "I could not work out what you are asking for.",
  );
}

/** Every routing domain resolves to a real registry entry — guards against a keyword table drifting out of sync with the registry. */
export function assertRoutingDomainsCoverRealWorkers(): void {
  const ids = new Set(listWorkers().map(w => w.id));
  for (const domain of ROUTING_DOMAINS) {
    if (!ids.has(domain.workerId)) throw new Error(`Routing domain references unknown worker: ${domain.workerId}`);
  }
}
