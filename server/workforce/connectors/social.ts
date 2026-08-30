/**
 * Social channel connectors: LinkedIn, Facebook, YouTube and WhatsApp.
 *
 * All four are shells. Each reports its real state, routes through the one
 * connector chokepoint so the worker gate and the signed-in staff member's
 * gate both apply, and refuses everything until a controlled authorisation
 * and real credentials exist. None of that is a placeholder to be filled
 * in casually: connecting one of these accounts, granting OAuth scopes and
 * publishing are each separate decisions that the Communications approval
 * expressly did not give.
 *
 * The distinction that matters here is between DRAFTING and PUBLISHING.
 * Drafting is text that a human reads before anything happens, so it is an
 * ordinary create governed by the access model. Publishing is an
 * irreversible external act performed in WSA's name to an audience, so it
 * consumes external_send and can never be reached by a worker on its own —
 * clause 14's consequential-action boundary, enforced by the same
 * permission engine rather than by a second rule written here.
 *
 * Each connector needs its own credential and its own WSA account
 * allowlist. A credential that happens to reach an account is not
 * authority over it, which is why server/workforce/wsaScope.ts checks the
 * account separately from the token.
 */
import { runConnectorAction, type ConnectorActionRequest, type ConnectorActionResult } from "./shared";
import type { ConnectorName, ConnectorState } from "../types";

/**
 * A social connector is operational only when it has BOTH a credential and
 * an allowlist of WSA accounts it may act on. Credentials alone are not
 * enough: without the allowlist there is nothing establishing that the
 * account reached is one of WSA's rather than any other the token can see.
 */
function socialState(connector: ConnectorName): ConnectorState {
  const upper = connector.toUpperCase();
  const hasCredential = Boolean(process.env[`WORKFORCE_${upper}_ACCESS_TOKEN`]);
  const hasAllowlist = Boolean(process.env[`WORKFORCE_${upper}_ALLOWED_ACCOUNTS`]);
  if (!hasCredential || !hasAllowlist) return "unconfigured";
  // Both present still does not prove the credential carries the scopes the
  // action needs, or that the grant was ever tested. Until a real call has
  // been made and verified, this must not claim to be operational.
  return "permission_missing";
}

function refuse(connector: ConnectorName): () => Promise<{ success: boolean; message: string }> {
  return async () => {
    // Unreachable while socialState never returns "operational" —
    // runConnectorAction only calls attempt() in that state. A loud
    // failure rather than a stub that could one day return a plausible
    // success for a post that was never made.
    throw new Error(`${connector} connector has no implemented action yet — no authorised integration exists.`);
  };
}

export function getLinkedInStatus(): ConnectorState { return socialState("linkedin"); }
export function getFacebookStatus(): ConnectorState { return socialState("facebook"); }
export function getYouTubeStatus(): ConnectorState { return socialState("youtube"); }
export function getWhatsAppStatus(): ConnectorState { return socialState("whatsapp"); }

type BareRequest = Omit<ConnectorActionRequest, "connector" | "operation">;

/** Read recent activity from a WSA channel. Nothing is written. */
export function readChannelActivity(connector: ConnectorName, request: BareRequest): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector, operation: "read" }, () => socialState(connector), refuse(connector));
}

/**
 * Prepare a post for a human to review. `create`, not `external_send`:
 * a draft is text somebody reads before anything leaves WSA, and treating
 * it as a send would either block ordinary drafting or, far worse, let a
 * publish through under a drafting permission.
 */
export function draftChannelContent(connector: ConnectorName, request: BareRequest): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector, operation: "create" }, () => socialState(connector), refuse(connector));
}

/**
 * Publish to a WSA channel. Consumes external_send, which is one of the
 * seven consequential permissions, so the permission engine refuses it for
 * every profile that does not explicitly hold it — and no worker holds any
 * connector permission at all today, so this is refused twice over.
 *
 * Exposed rather than omitted because the boundary is the point: the path
 * exists, is named, and is closed, which is more honest than pretending
 * publishing is unimaginable.
 */
export function publishToChannel(connector: ConnectorName, request: BareRequest): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector, operation: "external_send" }, () => socialState(connector), refuse(connector));
}
