/**
 * The production reader for management information: the WSA Pipedrive OAuth
 * grant, read scopes only, GET only, never the website contact form's
 * token. Configured means a usable grant exists right now.
 */
import { createPipedriveReaderWithAuth } from "../../pipedrive-read";
import { pipedriveOAuthAuth } from "../../crm/pipedriveOAuthAuth";
import { pipedriveOAuthStatusSync } from "../../crm/pipedriveOAuth";
import type { MiReader } from "./evidence";

const reader = createPipedriveReaderWithAuth(pipedriveOAuthAuth);

export const liveMiReader: MiReader = {
  listLeads: () => reader.listLeadsRaw(),
  listDeals: () => reader.listDealsRaw(),
  listPersons: () => reader.listPersonsRaw(),
};

export function liveMiReaderConfigured(): boolean {
  return pipedriveOAuthStatusSync() === "operational";
}
