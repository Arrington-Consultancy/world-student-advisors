/**
 * SharePoint connector abstraction — WSA's permanent source of truth.
 *
 * This does NOT use the existing Graph client-credentials in server/_core/
 * graphMail.ts as proof of SharePoint access: those were granted only the
 * Mail.Send application permission (see graphMail.ts's own comment), which
 * proves nothing about Sites.Read.All / Files.ReadWrite.All or any other
 * Graph file-access permission. Until a distinct, tested set of
 * credentials with the actual Sites/Files permissions exists, this
 * connector reports itself unconfigured — never operational — however the
 * request is phrased. See connectorConfigurationPlan.md for exactly what
 * needs to be provisioned.
 */
import { runConnectorAction, type ConnectorActionRequest, type ConnectorActionResult } from "./shared";
import type { ConnectorState } from "../types";

/**
 * Distinct from the mail-sending credentials in graphMail.ts on purpose —
 * a future SharePoint file connector needs its own app registration (or
 * expanded permissions on the existing one, with fresh admin consent) and
 * should prove that with its own env vars rather than silently reusing
 * Mail.Send credentials as if they implied file access.
 */
function getSharePointConnectorState(): ConnectorState {
  const hasFileCredentials = Boolean(
    process.env.SHAREPOINT_GRAPH_CLIENT_ID &&
      process.env.SHAREPOINT_GRAPH_CLIENT_SECRET &&
      process.env.SHAREPOINT_GRAPH_TENANT_ID &&
      process.env.SHAREPOINT_GRAPH_SITE_ID,
  );
  if (!hasFileCredentials) return "unconfigured";
  // Credentials existing is not the same as the Graph application having
  // been granted Sites.Read.All/Files.ReadWrite.All with admin consent, or
  // that grant having been tested. Until this connector actually performs
  // and verifies a real call, it must not report "operational" merely
  // because environment variables are present.
  return "permission_missing";
}

async function sharePointAttempt(): Promise<{ success: boolean; message: string }> {
  // Not implemented: no tested Graph Sites/Files call exists yet. Reaching
  // this function at all would mean getSharePointConnectorState() wrongly
  // reported "operational" — runConnectorAction never calls attempt()
  // unless state is operational, so this is a safety net, not a live path.
  throw new Error("SharePoint connector has no implemented action yet. Its configuration is not proven operational.");
}

export function getSharePointStatus(): ConnectorState {
  return getSharePointConnectorState();
}

export function searchSharePoint(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "sharepoint", operation: "search" }, getSharePointConnectorState, sharePointAttempt);
}

export function readSharePointRecord(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "sharepoint", operation: "read" }, getSharePointConnectorState, sharePointAttempt);
}

export function writeSharePointHandoff(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "sharepoint", operation: "update" }, getSharePointConnectorState, sharePointAttempt);
}
