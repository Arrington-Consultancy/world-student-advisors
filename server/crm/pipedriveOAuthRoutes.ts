/**
 * The one HTTP route the WSA Pipedrive OAuth application needs: the
 * redirect back from Pipedrive after a WSA administrator has consented.
 *
 * Starting consent is a tRPC mutation gated on access_admin, which returns
 * the authorise URL carrying a signed, short-lived state naming the staff
 * member. This route verifies that state before anything else, exchanges
 * the code server-side, refuses a grant whose scopes exceed the approved
 * read set, seals and stores the tokens, audits by identifier, and sends
 * the browser back to the Staff Portal. No token value is ever in a URL,
 * a log, an audit row or a response body.
 */
import type { Express, Request, Response } from "express";
import { exchangeAuthorisationCode, oauthConfig, scopesOutsideApproved, storeGrant, verifyState, PIPEDRIVE_OAUTH_REDIRECT_PATH, isWsaCompany, companyHost, PIPEDRIVE_WSA_API_DOMAIN } from "./pipedriveOAuth";
import { recordAuditEvent, type AuditEvent } from "../workforce/audit";

const AUTHORISE_CAPABILITY = "connector:pipedrive:authorise";
const SPEC_VERSION = "pipedrive-oauth-1";

function authoriseEvent(staffUserId: number, decision: AuditEvent["permissionDecision"], reason: string, success: boolean, errorCategory: AuditEvent["errorCategory"]): Omit<AuditEvent, "timestamp"> {
  return { staffUserId, authMethod: "entra_sso", workerId: "staff_portal", workerSpecificationVersion: SPEC_VERSION, requestedCapability: AUTHORISE_CAPABILITY, permissionDecision: decision, permissionReason: reason, connector: "pipedrive", success, errorCategory };
}

function back(res: Response, outcome: string): void {
  res.redirect(`/staff-portal?pipedrive=${encodeURIComponent(outcome)}`);
}

export function registerPipedriveOAuthRoutes(app: Express): void {
  app.get(PIPEDRIVE_OAUTH_REDIRECT_PATH, async (req: Request, res: Response) => {
    const cfg = oauthConfig();
    if (!cfg) return back(res, "unconfigured");
    const { code, state, error } = req.query as Record<string, string | undefined>;
    if (error) return back(res, "denied");
    if (!code || !state) return back(res, "invalid");

    const who = await verifyState(state, cfg.tokenKey);
    if (!who) return back(res, "state_invalid");

    try {
      const tokens = await exchangeAuthorisationCode(code, cfg);
      // Company first, scopes second: a grant for the wrong company is
      // refused whatever it carries, and the refusal says which company.
      if (!isWsaCompany(tokens.apiDomain)) {
        recordAuditEvent(authoriseEvent(who.staffUserId, "denied", `Pipedrive returned a grant for ${companyHost(tokens.apiDomain)}, not the WSA company ${companyHost(PIPEDRIVE_WSA_API_DOMAIN)}. Grant refused and not stored.`, false, "permission_denied"));
        return back(res, "company_refused");
      }
      const wider = scopesOutsideApproved(tokens.scope);
      if (wider.length > 0) {
        recordAuditEvent(authoriseEvent(who.staffUserId, "denied", `Pipedrive returned scopes outside the approved scope set: ${wider.join(", ")}. Grant refused and not stored.`, false, "permission_denied"));
        return back(res, "scopes_refused");
      }
      const grantId = await storeGrant(tokens, who.staffUserId, cfg);
      recordAuditEvent(authoriseEvent(
        who.staffUserId, "allowed",
        grantId !== null
          ? `WSA Pipedrive OAuth grant stored (id ${grantId}) for ${tokens.apiDomain.replace(/^https:\/\//, "")}, scopes: ${tokens.scope || "(not returned)"}.`
          : "WSA Pipedrive OAuth grant could not be stored: no database available. Nothing retained.",
        grantId !== null, grantId !== null ? "none" : "connector_error",
      ));
      return back(res, grantId !== null ? "connected" : "store_failed");
    } catch (err) {
      console.warn("[Pipedrive OAuth] Authorisation exchange failed:", String((err as Error)?.message ?? err).slice(0, 200));
      return back(res, "exchange_failed");
    }
  });
}
