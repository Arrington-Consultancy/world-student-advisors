import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

/**
 * The receptionist/router front door. Deterministic and registry-backed
 * server-side (server/workforce/router.ts) — this component only submits
 * the staff member's plain-language request and renders the server's
 * decision. It never decides ownership itself and never substitutes a
 * different worker for an unavailable one.
 */
export function Receptionist({ token }: { token: string }) {
  const [request, setRequest] = useState("");
  const [submitted, setSubmitted] = useState("");

  const routeQuery = trpc.workforce.route.useQuery({ token, request: submitted }, { enabled: submitted.length > 0 });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (request.trim().length === 0) return;
    setSubmitted(request.trim());
  };

  return (
    <div className="rounded-lg border border-border/70 bg-white p-5">
      <p className="mb-1 text-sm font-semibold text-wsa-navy">Ask the receptionist</p>
      <p className="mb-3 text-xs text-gray-500">Describe what you need in plain language. This identifies who owns it, and is not a general assistant.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input value={request} onChange={e => setRequest(e.target.value)} placeholder="e.g. Can you check this student's UK visa evidence?" className="flex-1" />
        <Button type="submit" disabled={routeQuery.isFetching}>
          {routeQuery.isFetching ? "Routing…" : "Ask"}
        </Button>
      </form>

      {routeQuery.data && (
        <div className="mt-4 rounded-md border border-border/70 bg-wsa-warm-white p-3 text-sm">
          {routeQuery.data.matched ? (
            <>
              <p className="font-medium text-wsa-navy">{routeQuery.data.responsibleWorkerName}</p>
              <p className="mt-1 text-gray-600">{routeQuery.data.ownershipReason}</p>
              <p className="mt-1 text-gray-600">{routeQuery.data.status}</p>
              {routeQuery.data.blocker && <p className="mt-1 text-amber-700">{routeQuery.data.blocker}</p>}
              <p className="mt-2 font-medium text-gray-700">Next step</p>
              <p className="text-gray-600">{routeQuery.data.safeNextAction}</p>
            </>
          ) : (
            <>
              <p className="text-gray-600">{routeQuery.data.status}</p>
              <p className="mt-1 text-gray-600">{routeQuery.data.safeNextAction}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
