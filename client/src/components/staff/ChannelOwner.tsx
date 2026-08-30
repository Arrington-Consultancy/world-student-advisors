import { trpc, type RouterOutputs } from "@/lib/trpc";

type Worker = RouterOutputs["workforce"]["listWorkers"]["workers"][number];

/**
 * Who owns this area.
 *
 * Nia, WSA's Social Media & Content Intelligence specialist, heads the Channels page,
 * because a page about WSA's public presence should say who is responsible
 * for it rather than presenting the accounts as ownerless.
 *
 * Her status is the real one from the Register, unsoftened. Naming an
 * owner is not the same as saying that owner is running: showing "in
 * design" here is the honest version, and it is also the useful one,
 * because a colleague looking at this page needs to know nobody is
 * currently working these accounts on WSA's behalf.
 *
 * The portrait slot falls back to initials until a real image exists.
 * There is deliberately no placeholder face: an invented likeness for a
 * worker WSA has not designed yet would be worse than a monogram.
 */
const OWNER_ID = "nia";

export function ChannelOwner({ token }: { token: string }) {
  const query = trpc.workforce.listWorkers.useQuery({ token });
  const owner: Worker | undefined = query.data?.workers.find((w: Worker) => w.id === OWNER_ID);

  if (!owner) return null;

  const initials = owner.canonicalName
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="mb-8 flex items-start gap-4 rounded-lg border border-wsa-navy/10 bg-white p-4">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-wsa-navy/5 text-lg font-semibold text-wsa-navy"
        aria-hidden
      >
        {initials}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-semibold text-wsa-navy">{owner.canonicalName}</h3>
          <span className="text-xs text-gray-500">{owner.roleTitle}</span>
          {!owner.canOpenForLiveExecution && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
              In design, not yet running
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-700">{owner.personality.summary}</p>
        <p className="mt-1 text-xs text-gray-500">
          Owns WSA's organic social once approved. Nobody is working these accounts on WSA's behalf today.
        </p>
      </div>
    </section>
  );
}
