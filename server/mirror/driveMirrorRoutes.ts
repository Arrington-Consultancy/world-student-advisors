/**
 * The consent redirect for the WSA AI Reporting Mirror's Google credential.
 * Verifies the signed state first, exchanges the code server-side, refuses
 * any grant wider than drive.file, seals and stores the tokens, audits by
 * identifier, and returns the browser to the Staff Portal. No token value
 * is ever in a URL, log, audit row or response body.
 */
import type { Express, Request, Response } from "express";
import { driveOAuthConfig, exchangeDriveCode, driveScopesOutsideApproved, storeDriveGrant, verifyDriveState, DRIVE_MIRROR_REDIRECT_PATH } from "./driveMirrorOAuth";
import { recordAuditEvent, type AuditEvent } from "../workforce/audit";

function back(res: Response, outcome: string): void {
  res.redirect(`/staff-portal?drive_mirror=${encodeURIComponent(outcome)}`);
}
function event(staffUserId: number, decision: AuditEvent["permissionDecision"], reason: string, success: boolean, errorCategory: AuditEvent["errorCategory"]): Omit<AuditEvent, "timestamp"> {
  return { staffUserId, authMethod: "entra_sso", workerId: "staff_portal", workerSpecificationVersion: "drive-mirror-1", requestedCapability: "connector:google_drive_mirror:authorise", permissionDecision: decision, permissionReason: reason, connector: "google_drive", success, errorCategory };
}

export function registerDriveMirrorRoutes(app: Express): void {
  app.get(DRIVE_MIRROR_REDIRECT_PATH, async (req: Request, res: Response) => {
    const cfg = driveOAuthConfig();
    if (!cfg) return back(res, "unconfigured");
    const { code, state, error } = req.query as Record<string, string | undefined>;
    if (error) return back(res, "denied");
    if (!code || !state) return back(res, "invalid");
    const who = await verifyDriveState(state, cfg.tokenKey);
    if (!who) return back(res, "state_invalid");
    try {
      const tokens = await exchangeDriveCode(code, cfg);
      const wider = driveScopesOutsideApproved(tokens.scope);
      if (wider.length > 0) {
        recordAuditEvent(event(who.staffUserId, "denied", `Google returned scopes beyond drive.file: ${wider.join(", ")}. Grant refused and not stored.`, false, "permission_denied"));
        return back(res, "scopes_refused");
      }
      const grantId = await storeDriveGrant(tokens, who.staffUserId, cfg);
      recordAuditEvent(event(who.staffUserId, "allowed", grantId !== null
        ? `Google Drive reporting mirror grant stored (id ${grantId}), scope drive.file only.`
        : "Google Drive reporting mirror grant could not be stored: no database available. Nothing retained.", grantId !== null, grantId !== null ? "none" : "connector_error"));
      return back(res, grantId !== null ? "connected" : "store_failed");
    } catch (err) {
      console.warn("[Drive mirror OAuth] Authorisation exchange failed:", String((err as Error)?.message ?? err).slice(0, 200));
      return back(res, "exchange_failed");
    }
  });
}
