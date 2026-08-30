/**
 * What a signed-in staff member may actually do with each WSA channel.
 *
 * The rule this module exists to enforce: seeing a channel is not
 * authority over it. Visibility and capability are decided separately, and
 * an action is offered only when THREE independent things agree:
 *
 *   1. The staff member holds the action permission in that channel's
 *      functional scope, decided by the same access model that governs
 *      every other read and write (server/access).
 *   2. The action is technically available at all — no channel here has an
 *      authorised integration today, so every action beyond opening the
 *      link is unavailable regardless of permission.
 *   3. For anything a connector would perform, the worker gate must also
 *      pass. That gate is separate and is not consulted or satisfied here.
 *
 * Requiring all three means Staff Portal access can never widen someone's
 * authority over a mailbox or a social account. A Level 1 executive who
 * holds only `read` sees every channel and can publish to none of them.
 */
import { evaluateAccess, type StaffAccessProfile } from "../access/accessControl";
import { WSA_CHANNELS, CHANNELS_CHECKED_AND_NOT_FOUND, type ChannelAction, type ChannelId, type IntegrationState } from "./channels";

export interface ResolvedChannelAction {
  label: string;
  permission: ChannelAction["permission"];
  /** True only when permission, availability and integration all allow it. */
  allowed: boolean;
  /** Why not, in terms a staff member can act on. Null when allowed. */
  blockedReason: string | null;
}

export interface ResolvedChannel {
  id: ChannelId;
  name: string;
  kind: string;
  icon: string;
  accountIdentity: string;
  externalUrl: string | null;
  integration: IntegrationState;
  /** Plain-language status line for the card. */
  statusLabel: string;
  evidence: string;
  actions: readonly ResolvedChannelAction[];
  /** True when the member may see the channel at all. A channel they cannot read is omitted entirely. */
  visible: boolean;
}

export interface CommunicationsView {
  channels: readonly ResolvedChannel[];
  /** Channels withheld because the member cannot read that functional scope. Counted, never named. */
  withheldCount: number;
  /** Platforms searched for and not found as WSA-owned, so their absence is explained rather than looking like an oversight. */
  checkedAndNotFound: readonly string[];
}

const STATUS_LABEL: Readonly<Record<IntegrationState, string>> = Object.freeze({
  external_only: "Verified WSA channel. No controlled integration; open it directly.",
  connected: "Connected through an authorised, tested connector.",
  connector_unconfigured: "Connector exists but is not configured or tested. Nothing is connected.",
  authorisation_required: "Integration would need a separate controlled authorisation. Not connected.",
});

/**
 * Builds the Communications view for one staff member.
 *
 * A channel the member cannot read is omitted from the list entirely
 * rather than shown greyed out, for the same reason search omits rather
 * than redacts: a placeholder naming a channel is itself a disclosure of
 * what WSA runs and who is excluded from it.
 */
export function buildCommunicationsView(profile: StaffAccessProfile, now: Date = new Date()): CommunicationsView {
  const channels: ResolvedChannel[] = [];
  let withheldCount = 0;

  for (const channel of WSA_CHANNELS) {
    // Visibility and capability are decided by different questions.
    //
    // For a channel whose content is already public to the whole internet,
    // the question is only "may this person read anything at all here?" —
    // their own scope, whatever it is. Gating the knowledge that WSA has a
    // LinkedIn page behind the marketing scope would protect nothing and
    // would empty the area for most colleagues, which is the opposite of
    // what it is for.
    //
    // For a channel whose content is NOT public — a mailbox, a message
    // thread — visibility is scope-gated like any other record.
    const readScope = channel.contentIsPublic ? profile.functionalScopes[0] : channel.functionalScope;
    const canRead = readScope === undefined
      ? { allowed: false, reason: "No functional scope is held." }
      : evaluateAccess(
          profile,
          { action: "read", functionalScope: readScope, sensitiveCategory: channel.sensitiveOverlay ?? undefined },
          now,
        );
    if (!canRead.allowed) {
      withheldCount += 1;
      continue;
    }

    const actions: ResolvedChannelAction[] = channel.actions.map(action => {
      // Doing anything to a channel — drafting, publishing, deleting,
      // administering, or reading its analytics — is governed by the
      // channel's OWN functional scope, whatever scope made it visible.
      // The one exception is opening a public channel, which is the read
      // that visibility already established.
      const openingPublicChannel = channel.contentIsPublic && action.permission === "read" && action.availableToday;
      const decision = openingPublicChannel
        ? { allowed: true, reason: "Public channel." }
        : evaluateAccess(
            profile,
            { action: action.permission, functionalScope: channel.functionalScope, sensitiveCategory: channel.sensitiveOverlay ?? undefined },
            now,
          );

      // Permission is reported first when both block, because it is the
      // one the staff member can do something about: it is their own
      // authority, whereas availability is a platform fact about WSA.
      if (!decision.allowed) {
        return { label: action.label, permission: action.permission, allowed: false, blockedReason: decision.reason };
      }
      if (!action.availableToday) {
        return {
          label: action.label,
          permission: action.permission,
          allowed: false,
          blockedReason: `You hold the permission, but ${channel.name} has no authorised integration for this yet. Connecting one is a separate controlled decision.`,
        };
      }
      return { label: action.label, permission: action.permission, allowed: true, blockedReason: null };
    });

    channels.push({
      id: channel.id,
      name: channel.name,
      kind: channel.kind,
      icon: channel.icon,
      accountIdentity: channel.accountIdentity,
      externalUrl: channel.externalUrl,
      integration: channel.integration,
      statusLabel: STATUS_LABEL[channel.integration],
      evidence: channel.evidence,
      actions,
      visible: true,
    });
  }

  return { channels, withheldCount, checkedAndNotFound: CHANNELS_CHECKED_AND_NOT_FOUND };
}
