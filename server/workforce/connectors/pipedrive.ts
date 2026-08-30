/**
 * Pipedrive (CRM) connector abstraction.
 *
 * Different in kind from the SharePoint and Google Drive connectors: those
 * fail closed because nothing is configured, whereas Pipedrive is already
 * live. server/pipedrive.ts holds a working API token and the public
 * contact form (server/routers.ts) writes real student Persons, Leads and
 * Notes through it today. So for the CRM, permission logic is the only
 * thing standing between a worker and genuine student personal data —
 * passport numbers, dates of birth, funding circumstances and contact
 * details.
 *
 * Two consequences, both deliberate:
 *
 * 1. This module never imports server/pipedrive.ts and never reads
 *    ENV.pipedriveApiToken. That token exists for one narrow purpose —
 *    creating leads from the public sign-up form — and a worker inheriting
 *    it would be the same mistake as treating graphMail.ts's Mail.Send
 *    credentials as proof of SharePoint file access. A workforce CRM
 *    connector needs its own credential, provisioned under its own
 *    controlled decision, and proves that with its own environment
 *    variable.
 * 2. Only read paths are exposed. There is no exported create, update,
 *    delete or send helper, because no controlled record has granted a
 *    worker the ability to change a student's CRM record. The permission
 *    engine would refuse such a call anyway; not providing the convenience
 *    means nothing has to be refused in the first place.
 *
 * Every call still routes through runConnectorAction, so the worker gate
 * (permissions.ts, including the CRM gate) and the staff member's own
 * access gate (access/enforcement.ts) both apply, and every attempt is
 * audit-logged whether or not it reaches a live system.
 */
import { runConnectorAction, type ConnectorActionRequest, type ConnectorActionResult } from "./shared";
import type { ConnectorState } from "../types";

/**
 * Deliberately WORKFORCE_PIPEDRIVE_API_TOKEN, not PIPEDRIVE_API_TOKEN.
 * The website's token being present must never make the workforce
 * connector look configured — that would let a permission bug reach live
 * student data using a credential nobody granted to a worker.
 */
function getPipedriveConnectorState(): ConnectorState {
  if (!process.env.WORKFORCE_PIPEDRIVE_API_TOKEN) return "unconfigured";
  // A token existing is not evidence that it is scoped to read-only CRM
  // access, that it has been tested, or that the controlled record grants
  // any worker the right to use it. Until a real call has been made and
  // verified, this must not report "operational".
  return "permission_missing";
}

async function pipedriveAttempt(): Promise<{ success: boolean; message: string }> {
  // Unreachable while getPipedriveConnectorState() never returns
  // "operational" — runConnectorAction only calls attempt() in that state.
  // Kept as a safety net that fails loudly rather than a stub that might
  // one day return a plausible-looking success.
  throw new Error("Pipedrive connector has no implemented action yet — configuration is not proven operational.");
}

export function getPipedriveStatus(): ConnectorState {
  return getPipedriveConnectorState();
}

/**
 * Look up CRM records matching a controlled scope. The scope is audit text
 * only: it is not consulted by any gate and cannot widen what the caller
 * may see. Which student records are reachable is decided by the staff
 * member's own case scope in access/enforcement.ts, not here.
 */
export function searchPipedrive(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "pipedrive", operation: "search" }, getPipedriveConnectorState, pipedriveAttempt);
}

/** Read one CRM record. Same gates as search; read is not a lesser operation where student personal data is concerned. */
export function readPipedriveRecord(request: Omit<ConnectorActionRequest, "connector" | "operation">): Promise<ConnectorActionResult> {
  return runConnectorAction({ ...request, connector: "pipedrive", operation: "read" }, getPipedriveConnectorState, pipedriveAttempt);
}
