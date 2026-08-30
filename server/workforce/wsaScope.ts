/**
 * The WSA boundary: workers may only ever reach WSA's own material.
 *
 * Every connector in this platform points at a system WSA shares with
 * other things. The Microsoft tenant also holds Arrington Consultancy
 * work. A Google account also holds personal and Scott-project folders.
 * A Pipedrive account holds every kind of record, not only students. So
 * "the credential works" is never the same question as "this is WSA's".
 *
 * This module answers the second question, and it answers it from
 * server-controlled configuration rather than from anything in the
 * request. A worker naming a folder, a site or a record it would like to
 * read has stated a wish, not established a permission: the allowlists
 * below are the only things that decide, and they are read from the
 * environment, so a caller cannot widen them.
 *
 * Empty configuration means an empty allowlist, which denies everything.
 * That is deliberate. The failure mode of a scoping rule that defaults to
 * "allow" is a worker reading another client's confidential material, and
 * no convenience is worth that.
 */
import type { ConnectorName } from "./types";

export interface ScopeDecision {
  withinWsaScope: boolean;
  reason: string;
}

function allowlist(variable: string): string[] {
  return (process.env[variable] ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * SharePoint: a single WSA site. Not "a site whose name contains WSA" —
 * an exact id, because a display name is not an identity and a site could
 * be renamed by anyone with permission on it.
 */
function sharePointScope(resourceId: string): ScopeDecision {
  const site = process.env.SHAREPOINT_GRAPH_SITE_ID;
  if (!site) {
    return { withinWsaScope: false, reason: "No WSA SharePoint site is configured, so nothing is in scope." };
  }
  if (resourceId === site || resourceId.startsWith(`${site}/`)) {
    return { withinWsaScope: true, reason: "Within the configured WSA SharePoint site." };
  }
  return {
    withinWsaScope: false,
    reason: "Outside the configured WSA SharePoint site. Arrington Consultancy and other tenant content are never in scope for a WSA worker.",
  };
}

/**
 * Google Drive: an explicit folder allowlist. The Access Matrix is clear
 * that Drive is not a second WSA source of truth and that no worker gets
 * whole-Drive access, so this is an allowlist rather than a denylist —
 * anything not named is out.
 */
function driveScope(resourceId: string): ScopeDecision {
  const folders = allowlist("WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS");
  if (folders.length === 0) {
    return { withinWsaScope: false, reason: "No WSA Drive folder is allowlisted, so nothing is in scope." };
  }
  const folder = resourceId.split("/")[0];
  if (folders.includes(folder)) {
    return { withinWsaScope: true, reason: "Within an allowlisted WSA Drive folder." };
  }
  return {
    withinWsaScope: false,
    reason: "Outside the allowlisted WSA Drive folders. Personal, Arrington Consultancy and Scott-project content are never in scope.",
  };
}

/**
 * Pipedrive: WSA's CRM holds student records, and a worker's business is
 * students. Restricting to the entity types a student journey actually
 * involves keeps a worker away from the rest of the account by
 * construction rather than by hoping nobody asks.
 */
const PIPEDRIVE_STUDENT_ENTITIES = ["person", "lead", "deal", "note", "activity"] as const;

function pipedriveScope(resourceId: string): ScopeDecision {
  const entity = resourceId.split("/")[0].toLowerCase();
  if ((PIPEDRIVE_STUDENT_ENTITIES as readonly string[]).includes(entity)) {
    return { withinWsaScope: true, reason: `Student-journey entity "${entity}" in the WSA CRM.` };
  }
  return {
    withinWsaScope: false,
    reason:
      `"${entity}" is not a student-journey entity. A worker's CRM scope covers ` +
      `${PIPEDRIVE_STUDENT_ENTITIES.join(", ")} and nothing else — not users, not account settings, not billing.`,
  };
}

/**
 * A social or messaging channel: the account must be one of WSA's own
 * verified accounts, named in server-controlled configuration. A worker
 * must never be able to post to, read from, or administer an account
 * merely because it holds a credential that happens to reach it.
 */
function channelAccountScope(connector: ConnectorName, resourceId: string): ScopeDecision {
  const variable = `WORKFORCE_${connector.toUpperCase()}_ALLOWED_ACCOUNTS`;
  const accounts = allowlist(variable);
  if (accounts.length === 0) {
    return { withinWsaScope: false, reason: `No WSA ${connector} account is allowlisted, so nothing is in scope.` };
  }
  const account = resourceId.split("/")[0];
  if (accounts.includes(account)) {
    return { withinWsaScope: true, reason: `Allowlisted WSA ${connector} account.` };
  }
  return { withinWsaScope: false, reason: `"${account}" is not an allowlisted WSA ${connector} account.` };
}

/**
 * The one entry point. Total over ConnectorName by the type, so a
 * connector added without a WSA boundary will not compile rather than
 * silently inheriting a permissive one.
 */
export function evaluateWsaScope(connector: ConnectorName, resourceId: string): ScopeDecision {
  if (!resourceId || resourceId.trim() === "") {
    return { withinWsaScope: false, reason: "No resource was named, so WSA scope cannot be established." };
  }

  switch (connector) {
    case "sharepoint":
      return sharePointScope(resourceId);
    case "google_drive":
      return driveScope(resourceId);
    case "pipedrive":
      return pipedriveScope(resourceId);
    case "linkedin":
    case "facebook":
    case "youtube":
    case "whatsapp":
      return channelAccountScope(connector, resourceId);
  }
}
