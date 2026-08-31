/**
 * Maps a worker's real controlled status to honest staff-facing language
 * and styling. Never renders "Ready"/green for a worker that cannot
 * legally or operationally work yet — canOpenForLiveExecution is the only
 * thing that unlocks that language, and it comes from the server, not
 * from this file's own judgement.
 */
export type WorkerListItem = {
  specificationStatus: "approved" | "approval_blocked" | "not_approved" | "active" | "infrastructure";
  staffPortalExecutionStatus: "pending_channel_decision" | "prohibited" | "not_configured" | "available_routing_only" | "not_applicable";
  canOpenForLiveExecution: boolean;
};

export interface StatusDisplay {
  label: string;
  tone: "available" | "pending" | "blocked" | "design" | "governance" | "infrastructure";
}

export function getStatusDisplay(worker: WorkerListItem): StatusDisplay {
  if (worker.canOpenForLiveExecution) return { label: "Available", tone: "available" };

  if (worker.specificationStatus === "infrastructure") return { label: "Routing only", tone: "infrastructure" };
  if (worker.specificationStatus === "active") return { label: "Governance function, not a case-working worker", tone: "governance" };

  if (worker.specificationStatus === "approval_blocked") return { label: "Approval blocked", tone: "blocked" };

  if (worker.specificationStatus === "approved" && worker.staffPortalExecutionStatus === "pending_channel_decision") {
    return { label: "Approved, deployment channel undecided", tone: "pending" };
  }

  return { label: "In design, not yet approved", tone: "design" };
}

export const STATUS_TONE_CLASSES: Record<StatusDisplay["tone"], string> = {
  available: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
  design: "bg-gray-100 text-gray-600 border-gray-300",
  governance: "bg-blue-50 text-blue-700 border-blue-200",
  infrastructure: "bg-slate-50 text-slate-600 border-slate-200",
};
