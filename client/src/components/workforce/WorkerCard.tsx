import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getStatusDisplay, STATUS_TONE_CLASSES } from "./statusDisplay";

export interface WorkforceWorker {
  id: string;
  canonicalName: string;
  roleTitle: string;
  specificationStatus: "approved" | "approval_blocked" | "not_approved" | "active" | "infrastructure";
  staffPortalExecutionStatus: "pending_channel_decision" | "prohibited" | "not_configured" | "available_routing_only" | "not_applicable";
  currentNextControl: string;
  materialBlockers: string[];
  personality: { summary: string; whatFor: string; whatNotFor: string };
  connectorIntent: { sharePoint: string; googleDrive: string; hardBoundary: string };
  canOpenForLiveExecution: boolean;
}

export function WorkerCard({ worker, onOpen }: { worker: WorkforceWorker; onOpen: (worker: WorkforceWorker) => void }) {
  const status = getStatusDisplay(worker);

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-wsa-navy">{worker.canonicalName}</p>
            <p className="text-sm text-gray-500">{worker.roleTitle}</p>
          </div>
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_TONE_CLASSES[status.tone]}`}>
            {status.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-gray-700">{worker.personality.summary}</p>
        <div>
          <p className="text-gray-500">
            <span className="font-medium text-gray-700">For: </span>
            {worker.personality.whatFor}
          </p>
          <p className="text-gray-500">
            <span className="font-medium text-gray-700">Not for: </span>
            {worker.personality.whatNotFor}
          </p>
        </div>
        {worker.materialBlockers.length > 0 && (
          <p className="text-xs text-amber-700">
            {worker.materialBlockers.length} open governance item{worker.materialBlockers.length === 1 ? "" : "s"} pending Tom Arrington's decision.
          </p>
        )}
        <button
          type="button"
          onClick={() => onOpen(worker)}
          className="text-sm font-medium text-wsa-red hover:underline"
        >
          {worker.canOpenForLiveExecution ? "Open workspace" : "View status"}
        </button>
      </CardContent>
    </Card>
  );
}
