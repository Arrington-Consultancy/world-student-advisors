import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getStatusDisplay, STATUS_TONE_CLASSES } from "./statusDisplay";
import type { WorkforceWorker } from "./WorkerCard";

/**
 * The reusable worker workspace shell. For every worker today
 * (canOpenForLiveExecution is false across the board — see the platform's
 * own registry) this renders in controlled information/status mode only:
 * identity, status, blockers, connector intent and escalation route. No
 * chat, no system prompt, no case data — there is nothing live to show
 * yet, and this must not pretend otherwise. Once a worker's
 * canOpenForLiveExecution becomes true, this is the shell a live chat
 * panel, evidence panel and connector-activity view would be added to —
 * not a rewrite.
 */
export function WorkerWorkspace({ worker, open, onOpenChange }: { worker: WorkforceWorker | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!worker) return null;
  const status = getStatusDisplay(worker);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-wsa-navy">
            {worker.canonicalName}, {worker.roleTitle}
          </DialogTitle>
          <DialogDescription>{worker.personality.summary}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_TONE_CLASSES[status.tone]}`}>{status.label}</span>
          </div>

          {!worker.canOpenForLiveExecution && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="font-medium">Not yet available for live case work.</p>
              <p className="mt-1">{worker.currentNextControl}</p>
            </div>
          )}

          <div>
            <p className="font-medium text-gray-700">What {worker.canonicalName} is for</p>
            <p className="text-gray-600">{worker.personality.whatFor}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">What {worker.canonicalName} is not for</p>
            <p className="text-gray-600">{worker.personality.whatNotFor}</p>
          </div>

          {worker.materialBlockers.length > 0 && (
            <div>
              <p className="font-medium text-gray-700">Open governance items</p>
              <ul className="list-inside list-disc text-gray-600">
                {worker.materialBlockers.map(blocker => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="font-medium text-gray-700">Connector intent (not granted access)</p>
            <p className="text-gray-600">SharePoint: {worker.connectorIntent.sharePoint}</p>
            <p className="text-gray-600">Google Drive: {worker.connectorIntent.googleDrive}</p>
            <p className="mt-1 text-xs text-gray-500">Hard boundary: {worker.connectorIntent.hardBoundary}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
