import { useState, type FormEvent } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * The Google sign-in approval list, inside Staff access.
 *
 * On the Microsoft route, WSA's Entra tenant decides who can sign in and
 * Staff access decides what they can do. On the Google route there is no
 * tenant, so this list does the first job as well. Approving an address here
 * IS the authentication control, which is why it sits behind access_admin
 * and every change asks for a reason.
 *
 * Revoking takes effect on the person's next request, not their next
 * sign-in: the server re-reads this list every time. Revoked rows stay
 * listed, greyed, so the record of who was once let in survives.
 */
export function GoogleApprovals({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const list = trpc.staffPortal.googleApprovals.useQuery({ token }, { enabled: !!token });
  const approve = trpc.staffPortal.approveGoogleEmail.useMutation({
    onSuccess: r => {
      setMessage(r.reason);
      if (r.applied) {
        setEmail("");
        setReason("");
        list.refetch();
      }
    },
  });
  const revoke = trpc.staffPortal.revokeGoogleEmail.useMutation({
    onSuccess: r => {
      setMessage(r.reason);
      if (r.applied) list.refetch();
    },
  });

  if (!list.data?.allowed) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    approve.mutate({ token, email: email.trim(), reason: reason.trim() });
  };

  const live = list.data.approvals.filter(a => a.revokedAt === null);
  const revoked = list.data.approvals.filter(a => a.revokedAt !== null);

  return (
    <section className="mt-8 rounded-lg border border-wsa-navy/10 bg-white p-5">
      <h3 className="text-base font-semibold text-wsa-navy">Google sign-in approvals</h3>
      <p className="mt-1 text-sm text-gray-600">
        Staff with a personal Google account can sign in only if their exact address is on this list.
        Revoking takes effect on their next click, not their next sign-in.
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="colleague@gmail.com"
          className="flex-1 rounded-lg border border-wsa-navy/20 px-3 py-2 text-sm focus:border-wsa-red focus:outline-none"
        />
        <input
          type="text"
          required
          minLength={5}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Why this person"
          className="flex-1 rounded-lg border border-wsa-navy/20 px-3 py-2 text-sm focus:border-wsa-red focus:outline-none"
        />
        <button
          type="submit"
          disabled={approve.isPending || !email.trim() || reason.trim().length < 5}
          className="rounded-lg bg-wsa-red px-4 py-2 text-sm font-medium text-white transition hover:bg-wsa-red/90 disabled:opacity-40"
        >
          {approve.isPending ? "Approving…" : "Approve"}
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-wsa-navy">{message}</p>}

      <ul className="mt-4 divide-y divide-wsa-navy/10">
        {live.length === 0 && revoked.length === 0 && (
          <li className="py-3 text-sm text-gray-500">Nobody is approved yet. Google sign-in admits nobody until you add an address.</li>
        )}
        {live.map(a => (
          <li key={a.email} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <p className="text-sm font-medium text-wsa-navy">{a.email}</p>
                <p className="text-xs text-gray-500">{a.reason}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={revoke.isPending}
              onClick={() => {
                const why = window.prompt(`Why is access for ${a.email} being withdrawn?`);
                if (why && why.trim().length >= 5) revoke.mutate({ token, email: a.email, reason: why.trim() });
              }}
              className="rounded-lg border border-wsa-navy/20 px-3 py-1.5 text-xs text-wsa-navy transition hover:bg-wsa-stone/50 disabled:opacity-40"
            >
              Revoke
            </button>
          </li>
        ))}
        {revoked.map(a => (
          <li key={a.email} className="flex items-start gap-2 py-3 opacity-60">
            <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <div>
              <p className="text-sm text-gray-600 line-through">{a.email}</p>
              <p className="text-xs text-gray-500">Withdrawn: {a.revocationReason}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
