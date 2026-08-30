import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronRight, Lock, Check } from "lucide-react";
import { trpc, type RouterOutputs } from "@/lib/trpc";

/**
 * WSA's channels, grouped the way somebody actually looks for them:
 * the accounts we post to, the systems we log into, and our own web
 * surfaces.
 *
 * A card is a labelled way in, first and foremost. What you may DO with a
 * channel is real and server-decided, but it is detail — so it sits behind
 * a disclosure rather than shouting six permission refusals at everyone
 * who opens the page.
 */
const GROUP_TITLES: Record<string, { title: string; blurb: string }> = {
  social: {
    title: "Social accounts",
    blurb: "Where WSA posts publicly. Opening a channel is not permission to publish to it.",
  },
  system: {
    title: "Systems",
    blurb: "The systems staff log into to do the work.",
  },
  web: {
    title: "WSA web",
    blurb: "Our own pages.",
  },
};

const GROUP_ORDER = ["social", "system", "web"];

/** Taken from the server's own return type, so the two cannot drift apart. */
type Channel = RouterOutputs["workforce"]["communications"]["channels"][number];

function ChannelCard({ channel }: { channel: Channel }) {
  const [open, setOpen] = useState(false);
  const allowed = channel.actions.filter((a: Channel["actions"][number]) => a.allowed).length;

  return (
    <div className="rounded-lg border border-wsa-navy/10 bg-white transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <span aria-hidden className="text-2xl leading-none">{channel.icon}</span>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-wsa-navy">{channel.name}</h4>
          <p className="truncate text-xs text-gray-500" title={channel.accountIdentity}>
            {channel.accountIdentity}
          </p>
        </div>
        {channel.externalUrl && (
          <a
            href={channel.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-wsa-navy/15 px-2.5 py-1.5 text-xs font-medium text-wsa-navy hover:border-wsa-red hover:text-wsa-red"
          >
            Open <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1 border-t border-wsa-navy/5 px-4 py-2 text-left text-xs text-gray-500 hover:text-wsa-navy"
      >
        {open ? <ChevronDown className="h-3 w-3" aria-hidden /> : <ChevronRight className="h-3 w-3" aria-hidden />}
        What you can do here ({allowed} of {channel.actions.length})
      </button>

      {open && (
        <ul className="space-y-1.5 px-4 pb-4">
          {channel.actions.map((action: Channel["actions"][number], i: number) => (
            <li key={i} className="flex items-start gap-1.5 text-xs">
              {action.allowed
                ? <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-600" aria-hidden />
                : <Lock className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" aria-hidden />}
              <span className={action.allowed ? "text-gray-800" : "text-gray-500"}>
                {action.label}
                {!action.allowed && action.blockedReason && (
                  <span className="block text-[11px] leading-snug text-gray-400">{action.blockedReason}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChannelsPanel({ token }: { token: string }) {
  const query = trpc.workforce.communications.useQuery({ token });

  if (query.isLoading) return <p className="text-sm text-gray-500">Loading channels…</p>;
  if (query.error) return <p className="text-sm text-red-600">Could not load the WSA channels.</p>;
  if (!query.data) return null;

  const { channels, withheldCount, checkedAndNotFound, identityResolved, identityNote } = query.data;

  return (
    <div>
      {!identityResolved && identityNote && (
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {identityNote}
        </p>
      )}

      {GROUP_ORDER.map(group => {
        const inGroup = channels.filter(c => c.group === group);
        if (inGroup.length === 0) return null;
        const meta = GROUP_TITLES[group];
        return (
          <section key={group} className="mb-10">
            <h3 className="text-lg font-semibold text-wsa-navy">{meta.title}</h3>
            <p className="mb-4 text-sm text-gray-600">{meta.blurb}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inGroup.map(c => <ChannelCard key={c.id} channel={c} />)}
            </div>
          </section>
        );
      })}

      <div className="border-t border-wsa-navy/10 pt-4 text-xs text-gray-400">
        {withheldCount > 0 && (
          <p className="mb-1">
            {withheldCount} channel{withheldCount === 1 ? "" : "s"} not shown — their content is not public and you do
            not hold the scope.
          </p>
        )}
        <p>Checked and not found as WSA-owned: {checkedAndNotFound.join(", ")}.</p>
      </div>
    </div>
  );
}
