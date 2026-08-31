import { trpc } from "@/lib/trpc";
import { ShieldAlert } from "lucide-react";

/**
 * What a staff member sees when they are signed in but hold no usable
 * access assignment.
 *
 * Signing in and being able to do something are two separate things, and
 * until now only the first of them said anything. A colleague who
 * authenticated with Microsoft but had no row in the access tables landed
 * on a portal where every panel quietly refused, with nothing anywhere
 * explaining that the account simply had not been given an access level
 * yet. That reads as broken software rather than as an unfinished
 * administrative step.
 *
 * The wording per reason is deliberate: it says what state the account is
 * in and who resolves it, and never suggests a workaround, because there
 * is no self-service path to access here and there should not be.
 */

const EXPLANATIONS: Record<string, { title: string; detail: string }> = {
  no_individual_identity: {
    title: "Signed in with the shared portal password",
    detail:
      "Individual workers need to know which member of staff is asking, and a shared password cannot tell them. " +
      "Sign out and use Sign in with Microsoft instead.",
  },
  staff_record_not_found: {
    title: "No WSA staff record for this account",
    detail:
      "Your Microsoft sign-in worked, but this account has no staff record yet. Tom Arrington creates it.",
  },
  staff_record_inactive: {
    title: "This staff record is not active",
    detail: "The account exists but has been deactivated. Tom Arrington can reactivate it.",
  },
  no_access_assignment: {
    title: "No access level assigned yet",
    detail:
      "Your Microsoft sign-in worked and your staff record exists, but nobody has assigned an access level, " +
      "functional scope or case scope to it. Until that happens every worker will decline, which is the system " +
      "working as intended rather than a fault. Tom Arrington makes the assignment.",
  },
  invalid_access_assignment: {
    title: "This access assignment cannot be read",
    detail:
      "The stored access assignment is not a valid one, so it is being refused rather than guessed at. " +
      "Tom Arrington needs to correct it.",
  },
  database_unavailable: {
    title: "Access records are temporarily unreachable",
    detail: "Nothing is wrong with your account. Try again shortly.",
  },
};

export function AccessBanner({ token }: { token: string }) {
  const query = trpc.staffPortal.myAccess.useQuery({ token }, { enabled: !!token });

  // Silence while loading, and silence when access is assigned. A banner
  // that appears on every successful sign-in is a banner people stop
  // reading.
  if (!query.data || query.data.assigned) return null;

  const explanation = EXPLANATIONS[query.data.reason] ?? {
    title: "Access is not available on this account",
    detail: query.data.detail,
  };

  return (
    <div className="mb-8 border-l-2 border-wsa-red bg-wsa-red/5 p-5" role="status">
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-wsa-red" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-wsa-navy">{explanation.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{explanation.detail}</p>
        </div>
      </div>
    </div>
  );
}
