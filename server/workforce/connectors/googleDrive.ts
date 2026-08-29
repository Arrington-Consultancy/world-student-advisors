/**
 * Google Drive connector abstraction — explicitly secondary to SharePoint
 * (Access Matrix section 1: "Google Drive is not a second WSA source of
 * truth"), used only where a controlled task genuinely depends on legacy
 * website/marketing/migration evidence that lives there. No worker
 * receives whole-Drive access by default, and this connector must never
 * be able to reach Arrington Consultancy, Scott-project, personal or other
 * unrelated Drive content — folder scoping is enforced below, not left to
 * the caller's judgement.
 */
import { runConnectorAction, type ConnectorActionRequest, type ConnectorActionResult } from "./shared";
import type { ConnectorState } from "../types";

function getGoogleDriveConnectorState(): ConnectorState {
  const hasCredentials = Boolean(
    process.env.WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON && process.env.WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS,
  );
  if (!hasCredentials) return "unconfigured";
  return "permission_missing";
}

/**
 * The only folders any WSA worker may ever be scoped into — a strict
 * allowlist from WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS, never the caller's
 * own claim about which folder is relevant. Empty until configured, which
 * means every scope check fails closed today.
 */
function getAllowedFolderIds(): string[] {
  const raw = process.env.WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS ?? "";
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

/** True only if the requested folder is inside the server-controlled allowlist — never inferred from the request's own claim. */
export function isDriveFolderAuthorised(folderId: string): boolean {
  return getAllowedFolderIds().includes(folderId);
}

async function driveAttempt(): Promise<{ success: boolean; message: string }> {
  throw new Error("Google Drive connector has no implemented action yet — configuration is not proven operational.");
}

export function getGoogleDriveStatus(): ConnectorState {
  return getGoogleDriveConnectorState();
}

export function searchGoogleDrive(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "google_drive", operation: "search" }, getGoogleDriveConnectorState, driveAttempt);
}

export function readGoogleDriveFile(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "google_drive", operation: "read" }, getGoogleDriveConnectorState, driveAttempt);
}
