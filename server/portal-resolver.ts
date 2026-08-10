import { getOpenDealForPerson, getOpenLeadForPerson } from "./pipedrive-read";
import { resolveStageDisplay } from "./portal-stages";

/**
 * Real Pipedrive user IDs for WSA's five staff accounts — confirmed live
 * 2026-08-09, matches server/pipedrive.ts's COUNSELLOR_MAP/FOLLOWER_USER_IDS
 * values. The only owners ever shown to a student as their counsellor: an
 * owner_id/user_id outside this set (unset, or some other Pipedrive user)
 * is never shown, per the V1 reliability rule — Recommended Counsellor and
 * Source Owner are never used here, only the live native Owner field.
 */
const KNOWN_STAFF: Record<number, string> = {
  25629968: "Tim Hunt",
  25633444: "Eldah Therone",
  25633433: "Glenice Owino",
  25633422: "Manet Khamayo",
  25633455: "Sarafina Kihumbu",
};

/**
 * The four normal counsellors who may be treated as a confirmed allocation
 * on a pre-conversion Lead. Tim Hunt is deliberately excluded: a fresh Lead
 * owned by Tim is not safe evidence of deliberate allocation (a previous
 * live test proved the website enquiry flow does not set owner_id, and the
 * resulting Lead was owned by Tim anyway). Once a student is converted to a
 * Deal, the native Deal owner — including Tim — is reliable.
 */
const LEAD_COUNSELLOR_IDS = new Set([25633444, 25633433, 25633422, 25633455]);

/** Resolves an owner for a Deal — Tim Hunt is permitted here. */
function resolveDealCounsellorName(ownerId: number | null): string | null {
  if (ownerId === null) return null;
  return KNOWN_STAFF[ownerId] ?? null;
}

/**
 * Resolves an owner for a pre-conversion Lead. Tim Hunt is suppressed: his
 * ownership of a Lead cannot be treated as a confirmed counsellor allocation.
 */
function resolveLeadCounsellorName(ownerId: number | null): string | null {
  if (ownerId === null) return null;
  if (!LEAD_COUNSELLOR_IDS.has(ownerId)) return null;
  return KNOWN_STAFF[ownerId] ?? null;
}

export type PortalProgress =
  | { state: "resolved"; stageLabel: string; nextAction: string; position: number; counsellor: string | null }
  | { state: "no_record" }
  | { state: "pipedrive_unavailable" };

/**
 * Resolves a student's current progress live from Pipedrive, using
 * pipedrivePersonId as the sole durable anchor — never a stored Lead/Deal
 * ID, which would silently go stale the moment staff convert a Lead to a
 * Deal or open a new one. An open Deal takes priority over an open Lead
 * (conversion typically archives the Lead); a Person with neither is a
 * valid state, not an error — most likely a very new Lead not yet
 * indexed, or genuinely no matching record.
 *
 * Pipedrive read failures are caught here, not left to bubble up: the
 * caller (server/routers.ts's portal.dashboard) must still be able to show
 * the student's name and static resources — both sourced from the portal
 * database, not Pipedrive — even when only this live-progress read fails.
 */
export async function resolvePortalDashboard(pipedrivePersonId: number): Promise<PortalProgress> {
  try {
    const deal = await getOpenDealForPerson(pipedrivePersonId);
    if (deal) {
      const stage = resolveStageDisplay(deal.stageId);
      return {
        state: "resolved",
        stageLabel: stage.label,
        nextAction: stage.nextAction,
        position: stage.position,
        counsellor: resolveDealCounsellorName(deal.ownerId),
      };
    }

    const lead = await getOpenLeadForPerson(pipedrivePersonId);
    if (lead) {
      return {
        state: "resolved",
        stageLabel: "Getting to know you",
        nextAction: "Your counsellor is learning about your goals and options",
        position: 0,
        counsellor: resolveLeadCounsellorName(lead.ownerId),
      };
    }

    return { state: "no_record" };
  } catch (error) {
    console.error(
      "[Portal] Failed to resolve live progress from Pipedrive:",
      error instanceof Error ? error.message : String(error)
    );
    return { state: "pipedrive_unavailable" };
  }
}
