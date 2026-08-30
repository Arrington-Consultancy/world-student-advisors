import { ExternalLink, Lock, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * The WSA Communications area.
 *
 * Every channel shown is a verified WSA-owned account. The server decides
 * both what appears and what may be done with it; this component renders
 * that decision and never computes one of its own, so a staff member's
 * authority is not a matter of which buttons the client chose to draw.
 *
 * Where an action is refused, the reason is shown rather than the control
 * being quietly hidden. Someone meeting a boundary should be able to see
 * what it is and ask for the right thing.
 */
export function CommunicationsPanel({ token }: { token: string }) {
  const query = trpc.workforce.communications.useQuery({ token });

  if (query.isLoading) return <p className="text-sm text-gray-500">Loading WSA channels…</p>;
  if (query.error) return <p className="text-sm text-red-600">Could not load the WSA channels.</p>;
  if (!query.data) return null;

  const { channels, withheldCount, checkedAndNotFound, identityResolved, identityNote } = query.data;

  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-wsa-navy">Communications and Channels</h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Where WSA is publicly present, and what you specifically may do with each channel. Seeing a channel here
          is not authority over it: publishing, sending, deleting and account administration are each checked
          separately against your own permissions.
        </p>
      </div>

      {!identityResolved && identityNote && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {identityNote}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map(channel => (
          <div key={channel.id} className="rounded-lg border border-wsa-navy/10 bg-white p-4">
            <div className="mb-2 flex items-start gap-3">
              <span aria-hidden className="text-2xl leading-none">{channel.icon}</span>
              <div className="min-w-0">
                <h3 className="font-semibold text-wsa-navy">{channel.name}</h3>
                <p className="truncate text-xs text-gray-500" title={channel.accountIdentity}>
                  {channel.accountIdentity}
                </p>
              </div>
            </div>

            <p className="mb-3 text-xs text-gray-600">{channel.statusLabel}</p>

            <ul className="mb-3 space-y-1">
              {channel.actions.map((action, i) => (
                <li key={`${channel.id}-${i}`} className="flex items-start gap-1.5 text-xs">
                  {action.allowed ? (
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-600" aria-hidden />
                  ) : (
                    <Lock className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" aria-hidden />
                  )}
                  <span className={action.allowed ? "text-gray-800" : "text-gray-500"}>
                    {action.label}
                    {!action.allowed && action.blockedReason && (
                      <span className="block text-[11px] text-gray-400">{action.blockedReason}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {channel.externalUrl && (
              <a
                href={channel.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-wsa-red hover:underline"
              >
                Open <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </div>
        ))}
      </div>

      {withheldCount > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          {withheldCount} further {withheldCount === 1 ? "channel is" : "channels are"} not shown, because their
          content is not public and you do not hold the scope for {withheldCount === 1 ? "it" : "them"}.
        </p>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Checked and not found as WSA-owned: {checkedAndNotFound.join(", ")}. If WSA does own one of these, it needs
        verifying before it can appear here.
      </p>
    </section>
  );
}
