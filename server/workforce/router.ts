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
import type { WorkerId } from "./types";

interface RoutingDomain {
  workerId: WorkerId;
  keywords: string[];
}

// Keyword domains are drawn from each worker's Register role title and
// Access Matrix "what for" description — not invented categories.
const ROUTING_DOMAINS: RoutingDomain[] = [
  { workerId: "sophie", keywords: ["enquiry", "enquiries", "triage", "new student", "first contact", "first enquiry"] },
  { workerId: "daniel", keywords: ["discovery", "background", "profile", "student discovery"] },
  { workerId: "amelia", keywords: ["research", "course research", "university research", "program information", "programme information"] },
  { workerId: "oliver", keywords: ["suitability", "compare options", "trade-off", "trade off", "which option", "best fit"] },
  { workerId: "james", keywords: ["admission", "admissions", "application", "apply", "submit", "submission", "deadline", "entry requirement"] },
  { workerId: "priya", keywords: ["visa", "immigration", "ukvi", "compliance", "sponsor licence", "cas"] },
  { workerId: "harper", keywords: ["scholarship", "funding", "financial", "tuition fee", "affordability", "funding gap"] },
  { workerId: "olivia", keywords: ["pre-arrival", "pre arrival", "arrival", "orientation", "student success", "settling in", "transition"] },
  { workerId: "grace", keywords: ["audit", "quality assurance", "qa", "case review", "quality control", "case audit"] },
  { workerId: "ethan", keywords: ["seo", "organic search", "search console", "website traffic", "organic growth"] },
  { workerId: "nia", keywords: ["social", "social media", "instagram", "facebook", "linkedin", "youtube", "post", "posts", "content", "caption", "reel", "video content", "organic"] },
  { workerId: "alex", keywords: ["paid media", "google ads", "advertising", "ppc", "ad campaign", "conversion tracking"] },
  { workerId: "maya", keywords: ["sharepoint", "records control", "file structure", "document control", "records management"] },
];

export interface RoutingResult {
  matched: boolean;
  responsibleWorkerId?: WorkerId;
  responsibleWorkerName?: string;
  ownershipReason?: string;
  availability: "available" | "not_available_for_live_case_work";
  status: string;
  blocker?: string;
  safeNextAction: string;
}

function scoreDomain(requestLower: string, domain: RoutingDomain): number {
  return domain.keywords.reduce((score, keyword) => (requestLower.includes(keyword) ? score + keyword.length : score), 0);
}

/**
 * Routes a plain-language staff request to its responsible worker. Never
 * silently substitutes an available worker for the correct-but-unavailable
 * one, and never invents ownership for a request that matches nothing.
 */
export function routeStaffRequest(requestText: string): RoutingResult {
  const requestLower = requestText.toLowerCase();

  let best: { workerId: WorkerId; score: number } | null = null;
  for (const domain of ROUTING_DOMAINS) {
    const score = scoreDomain(requestLower, domain);
    if (score > 0 && (!best || score > best.score)) {
      best = { workerId: domain.workerId, score };
    }
  }

  if (!best) {
    return {
      matched: false,
      availability: "not_available_for_live_case_work",
      status: "No controlled worker could be confidently identified for this request.",
      safeNextAction: "Escalate to the current authorised human process. Do not guess an owner or attempt this as a general-purpose assistant.",
    };
  }

  const worker = getWorker(best.workerId);
  const executionPermission = evaluateStaffPortalExecutionPermission(worker.id);
  const availability: RoutingResult["availability"] = executionPermission.allowed ? "available" : "not_available_for_live_case_work";

  return {
    matched: true,
    responsibleWorkerId: worker.id,
    responsibleWorkerName: `${worker.canonicalName}, WSA ${worker.roleTitle} Specialist`,
    ownershipReason: `${worker.canonicalName} owns ${worker.roleTitle} work: ${worker.personality.whatFor}`,
    availability,
    status: availability === "available" ? "Available." : `Not available for live case work (specificationStatus: ${worker.specificationStatus}).`,
    blocker: availability === "available" ? undefined : worker.currentNextControl,
    safeNextAction:
      availability === "available"
        ? `Open ${worker.canonicalName}'s workspace.`
        : `Route to the current authorised human process / await approval, per controlled WSA governance. Escalation: ${worker.escalationRoute}.`,
  };
}

/** Every routing domain resolves to a real registry entry — guards against a keyword table drifting out of sync with the registry. */
export function assertRoutingDomainsCoverRealWorkers(): void {
  const ids = new Set(listWorkers().map(w => w.id));
  for (const domain of ROUTING_DOMAINS) {
    if (!ids.has(domain.workerId)) throw new Error(`Routing domain references unknown worker: ${domain.workerId}`);
  }
}
