import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, AlertTriangle } from "lucide-react";

/**
 * Assigning staff access, without editing the database by hand.
 *
 * Every dimension of the Access Control Standard existed in code and none
 * of it could be operated, so each new colleague was a production row
 * edit. This is the screen that replaces that.
 *
 * The screen deliberately shows the administrator only what they
 * themselves hold. The server refuses anything else, so offering the full
 * catalogue would present choices that fail on submit and imply an
 * authority nobody has.
 *
 * Consequential permissions are marked rather than sitting anonymously
 * among the rest. Granting export_download and granting delete_destructive
 * should not feel like the same gesture.
 */

const LEVEL_NAMES: Record<number, string> = {
  1: "Executive / Full Business",
  2: "Senior Management",
  3: "Function / Team Management",
  4: "Caseworker / Adviser",
  5: "Restricted / Own Applicants",
};

const SCOPE_LABEL = (s: string) => s.replace(/_/g, " ");

export function AccessAdmin({ token }: { token: string }) {
  const utils = trpc.useUtils();
  const query = trpc.staffPortal.accessAdmin.useQuery({ token }, { enabled: !!token });

  const [targetId, setTargetId] = useState<number | null>(null);
  const [level, setLevel] = useState(4);
  const [caseScope, setCaseScope] = useState("assigned_caseload");
  const [scopes, setScopes] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>(["read"]);
  const [overlays, setOverlays] = useState<string[]>([]);
  const [status, setStatus] = useState("active");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const assign = trpc.staffPortal.assignAccess.useMutation({
    onSuccess: data => {
      setResult(data.applied ? `Saved. ${data.changes} change(s) recorded.` : data.reason);
      if (data.applied) {
        setReason("");
        utils.staffPortal.accessAdmin.invalidate();
      }
    },
    onError: e => setResult(e.message),
  });

  const bootstrap = trpc.staffPortal.bootstrapAccessAdmin.useMutation({
    onSuccess: data => {
      setResult(data.bootstrapped ? `First administrator established for ${data.email}.` : data.reason);
      utils.staffPortal.accessAdmin.invalidate();
    },
    onError: e => setResult(e.message),
  });

  if (!query.data) return null;

  if (!query.data.canAdminister) {
    return (
      <div className="border border-border/70 bg-white p-6">
        <p className="text-sm font-semibold text-wsa-navy">Access administration</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{query.data.reason}</p>
        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          If no administrator exists yet, one can be established from the account named in this deployment's
          ACCESS_BOOTSTRAP_EMAIL setting. It works once and closes itself afterwards.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={bootstrap.isPending}
          onClick={() => bootstrap.mutate({ token })}
        >
          {bootstrap.isPending ? "Checking…" : "Establish the first administrator"}
        </Button>
        {result && <p className="mt-3 text-sm text-gray-700">{result}</p>}
      </div>
    );
  }

  const data = query.data;
  const target = data.staff.find(s => s.staffUserId === targetId) ?? null;

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

  const overlayBlocked = (overlay: string) =>
    level > (data.overlayMinimumLevels as Record<string, number>)[overlay];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 border-l-2 border-wsa-navy bg-wsa-navy/5 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-wsa-navy" aria-hidden />
        <p className="text-sm leading-relaxed text-gray-700">
          You can grant only what you hold yourself, and you cannot change your own access. Every change records
          who, what, when and why, as the Access Control Standard requires.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-wsa-navy">Who</p>
        <div className="divide-y divide-border/70 border border-border/70">
          {data.staff.length === 0 && (
            <p className="p-4 text-sm text-gray-500">
              Nobody has signed in yet. A staff record is created on a person's first Microsoft sign-in, and
              access can only be given to an identity that has authenticated.
            </p>
          )}
          {data.staff.map(person => (
            <button
              key={person.staffUserId}
              type="button"
              onClick={() => setTargetId(person.staffUserId)}
              className={`flex w-full items-center justify-between p-3 text-left transition-colors ${
                targetId === person.staffUserId ? "bg-wsa-red/5" : "hover:bg-gray-50"
              }`}
            >
              <span>
                <span className="block text-sm font-medium text-wsa-navy">{person.displayName}</span>
                <span className="block text-xs text-gray-500">{person.email}</span>
              </span>
              <span className="text-xs text-gray-500">
                {person.baseAccessLevel ? `Level ${person.baseAccessLevel}` : "No access"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {target && (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold text-wsa-navy">Level</p>
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map(l => {
                const tooHigh = l < data.administratorLevel;
                return (
                  <label
                    key={l}
                    className={`flex items-center gap-2 text-sm ${tooHigh ? "text-gray-400" : "text-gray-700"}`}
                  >
                    <input
                      type="radio"
                      checked={level === l}
                      disabled={tooHigh}
                      onChange={() => setLevel(l)}
                    />
                    Level {l}: {LEVEL_NAMES[l]}
                    {tooHigh && <span className="text-xs">(above your own)</span>}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-wsa-navy">Which cases they can see</p>
            <div className="space-y-1">
              {data.caseScopes.map(s => (
                <label key={s} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={caseScope === s} onChange={() => setCaseScope(s)} />
                  {SCOPE_LABEL(s)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-wsa-navy">Areas of work</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {data.grantableScopes.map(s => (
                <label key={s} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(scopes, setScopes, s)} />
                  {SCOPE_LABEL(s)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-wsa-navy">What they may do</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {data.grantableActions.map(a => {
                const consequential = data.consequentialActions.includes(a);
                return (
                  <label
                    key={a}
                    className={`flex items-center gap-2 text-sm ${consequential ? "text-wsa-red" : "text-gray-700"}`}
                  >
                    <input type="checkbox" checked={actions.includes(a)} onChange={() => toggle(actions, setActions, a)} />
                    {SCOPE_LABEL(a)}
                    {consequential && <AlertTriangle className="h-3 w-3 shrink-0" aria-label="Consequential" />}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Marked permissions are consequential. They are never implied by a level and should be given one at a
              time, on purpose.
            </p>
          </div>

          {data.grantableOverlays.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-wsa-navy">Sensitive information</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {data.grantableOverlays.map(o => {
                  const blocked = overlayBlocked(o);
                  return (
                    <label
                      key={o}
                      className={`flex items-center gap-2 text-sm ${blocked ? "text-gray-400" : "text-gray-700"}`}
                    >
                      <input
                        type="checkbox"
                        checked={overlays.includes(o)}
                        disabled={blocked}
                        onChange={() => toggle(overlays, setOverlays, o)}
                      />
                      {SCOPE_LABEL(o)}
                      {blocked && (
                        <span className="text-xs">
                          (needs Level {(data.overlayMinimumLevels as Record<string, number>)[o]})
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-wsa-navy">Account status</p>
            <div className="flex gap-4">
              {["active", "suspended", "disabled"].map(s => (
                <label key={s} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" checked={status === s} onChange={() => setStatus(s)} />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-wsa-navy">Why</p>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why this person needs this access"
            />
            <p className="mt-1 text-xs text-gray-500">Recorded against the change. Required, and at least a sentence.</p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              disabled={assign.isPending || reason.trim().length < 10}
              onClick={() =>
                assign.mutate({
                  token,
                  targetStaffUserId: target.staffUserId,
                  baseAccessLevel: level,
                  caseScope: caseScope as "organisation" | "team" | "assigned_caseload" | "own_applicants",
                  functionalScopes: scopes,
                  actionPermissions: actions,
                  sensitiveOverlays: overlays,
                  accessStatus: status as "active" | "suspended" | "disabled",
                  teamId: null,
                  reason,
                })
              }
              className="bg-wsa-red text-white hover:bg-wsa-red/90"
            >
              {assign.isPending ? "Saving…" : `Save access for ${target.displayName}`}
            </Button>
            {result && <p className="text-sm text-gray-700">{result}</p>}
          </div>
        </>
      )}
    </div>
  );
}
