/**
 * A worker's real operational state, in words that mean something.
 *
 * The portal was calling ten workers "In design" when the independent
 * Governance and Assurance Gatekeeper review had already cleared them on
 * 29 August and they were sitting on Tom's approval decision. A worker
 * waiting on a human is not a worker still being drafted, and saying so
 * made a usable estate look like an unfinished one.
 *
 * Four states, and the distinction that matters most is between Live and
 * Limited. A worker whose approved function runs from staff input and
 * controlled evidence is Live even when a connector it does not need is
 * missing. Limited means it works, with a named capability switched off.
 * Neither is "unusable", and neither should read as one.
 */
export type WorkerListItem = {
  specificationStatus: "approved" | "approval_blocked" | "not_approved" | "active" | "infrastructure";
  staffPortalExecutionStatus:
    | "staff_portal_authorised"
    | "pending_channel_decision"
    | "prohibited"
    | "not_configured"
    | "available_routing_only"
    | "not_applicable";
  canOpenForLiveExecution: boolean;
  gatekeeperReview?: "passed_cleared_for_approval" | "pending" | "not_applicable";
  /** Capabilities currently switched off, with the reason. */
  unavailableCapabilities?: readonly string[];
};

export interface StatusDisplay {
  label: string;
  tone: "live" | "limited" | "awaiting" | "blocked" | "design" | "governance" | "infrastructure";
  /** One line of detail, where the label alone would mislead. */
  detail?: string;
}

export function getStatusDisplay(worker: WorkerListItem): StatusDisplay {
  if (worker.specificationStatus === "infrastructure") return { label: "Routing", tone: "infrastructure" };
  if (worker.specificationStatus === "active") {
    return { label: "Governance function", tone: "governance", detail: "Not a case-working worker." };
  }

  if (worker.canOpenForLiveExecution) {
    const off = worker.unavailableCapabilities ?? [];
    if (off.length > 0) {
      return {
        label: "Limited",
        tone: "limited",
        detail: `Working, with ${off.length === 1 ? "one capability" : `${off.length} capabilities`} unavailable.`,
      };
    }
    return { label: "Live", tone: "live" };
  }

  if (worker.specificationStatus === "approval_blocked") {
    return { label: "Blocked", tone: "blocked", detail: "Named approval blockers must be resolved first." };
  }

  // Cleared by the independent Gatekeeper and waiting on the approval
  // authority. This is the state ten workers are actually in.
  if (worker.gatekeeperReview === "passed_cleared_for_approval") {
    return { label: "Awaiting approval", tone: "awaiting", detail: "Independently reviewed and cleared. Waiting on Tom's decision." };
  }

  if (worker.specificationStatus === "approved") {
    return { label: "Awaiting approval", tone: "awaiting", detail: "Approved. Deployment channel undecided." };
  }

  return { label: "In design", tone: "design", detail: "Not yet independently reviewed." };
}

export const STATUS_TONE_CLASSES: Record<StatusDisplay["tone"], string> = {
  live: "bg-green-50 text-green-700 border-green-200",
  limited: "bg-emerald-50 text-emerald-700 border-emerald-200",
  awaiting: "bg-amber-50 text-amber-800 border-amber-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
  design: "bg-gray-100 text-gray-600 border-gray-300",
  governance: "bg-blue-50 text-blue-700 border-blue-200",
  infrastructure: "bg-slate-50 text-slate-600 border-slate-200",
};
