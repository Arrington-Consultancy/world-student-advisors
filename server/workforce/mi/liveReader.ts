/**
 * The production reader for management information: the workforce
 * read-only Pipedrive credential, GET only, never the website contact
 * form's token. Configured means the dedicated variable is present.
 */
import { createPipedriveReader } from "../../pipedrive-read";
import type { MiReader } from "./evidence";

const workforceToken = () => process.env.WORKFORCE_PIPEDRIVE_API_TOKEN ?? "";
const reader = createPipedriveReader(workforceToken);

export const liveMiReader: MiReader = {
  listLeads: () => reader.listLeadsRaw(),
  listDeals: () => reader.listDealsRaw(),
  listPersons: () => reader.listPersonsRaw(),
};

export function liveMiReaderConfigured(): boolean {
  return workforceToken() !== "";
}
