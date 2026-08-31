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
    keywords: ["suitability", "suitable", "compare option", "trade off", "which option", "best fit", "right for this student", "recommend an option"],
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
    keywords: ["pre-arrival", "arrival", "orientation", "student success", "settling in", "transition", "accommodation", "airport", "before they travel"],
  },
  {
    workerId: "grace",
    keywords: ["audit", "quality assurance", "case review", "quality control", "case audit", "check our work", "did we follow"],
  },
  {
    workerId: "ethan",
    keywords: ["seo", "organic search", "search console", "website traffic", "organic growth", "keyword ranking", "google ranking", "web page"],
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
}

/** How the owner was identified, so a routed answer stays auditable. */
export type RoutedBy = "keywords" | "assistant" | "none";

/**
 * Routes a plain-language staff request to its responsible worker. Never
 * silently substitutes an available worker for the correct-but-unavailable
 * one, and never invents ownership for a request that matches nothing.
 */
function unmatched(note: string): RoutingResult {
  return {
    matched: false,
    routedBy: "none",
    availability: "not_available_for_live_case_work",
    status: note,
    safeNextAction:
      "Escalate to the current authorised human process. Do not guess an owner or attempt this as a general-purpose assistant.",
  };
}

/** Build the result for a worker the register says owns this work. */
function resultFor(workerId: WorkerId, routedBy: RoutedBy): RoutingResult {
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
    ownershipReason: `${worker.canonicalName} owns ${worker.roleTitle} work: ${worker.personality.whatFor}`,
    availability,
    status:
      availability === "available"
        ? "Available."
        : `Not available for live case work (specificationStatus: ${worker.specificationStatus}).`,
    blocker: availability === "available" ? undefined : worker.currentNextControl,
    safeNextAction:
      availability === "available"
        ? `Open ${worker.canonicalName}'s workspace.`
        : `Route to the current authorised human process or await approval, per controlled WSA governance. Escalation: ${worker.escalationRoute}.`,
  };
}

/**
 * The keyword pass. Deterministic, free and instant, and it settles the
 * large majority of requests without a model call.
 */
export function routeStaffRequest(requestText: string): RoutingResult {
  const tokens = tokenise(requestText);

  let best: { workerId: WorkerId; score: number } | null = null;
  for (const domain of ROUTING_DOMAINS) {
    const score = scoreTerms(tokens, domain.keywords);
    if (score > 0 && (!best || score > best.score)) best = { workerId: domain.workerId, score };
  }

  if (!best) return unmatched("No controlled worker could be confidently identified for this request.");
  return resultFor(best.workerId, "keywords");
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
  const byKeyword = routeStaffRequest(requestText);
  if (byKeyword.matched) return byKeyword;

  const assisted = await routeWithAssistant(requestText, assistantTimeoutMs);
  if (assisted.workerId) return resultFor(assisted.workerId, "assistant");
  return unmatched(
    assisted.note || "No controlled worker could be confidently identified for this request.",
  );
}

/** Every routing domain resolves to a real registry entry — guards against a keyword table drifting out of sync with the registry. */
export function assertRoutingDomainsCoverRealWorkers(): void {
  const ids = new Set(listWorkers().map(w => w.id));
  for (const domain of ROUTING_DOMAINS) {
    if (!ids.has(domain.workerId)) throw new Error(`Routing domain references unknown worker: ${domain.workerId}`);
  }
}
