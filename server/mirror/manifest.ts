/** The manifest every reader must check before trusting a mirror file. */
export interface MirrorFileEntry { name: string; fileId: string; md5: string; rowCount: number; columns: string[] }
export interface MirrorManifest {
  version: 1;
  source: "pipedrive";
  storage: "google_drive";
  folderName: string;
  folderId: string;
  /** The last run that wrote a complete or partial set of files. */
  lastSuccessfulSyncAt: string;
  status: "complete" | "partial";
  reason: string | null;
  coveragePeriod: { from: string | null; to: string };
  recordCounts: { leads: number; deals: number; persons: number };
  fieldsIncluded: { leads: string[]; deals: string[]; persons: string[] };
  fieldsExcluded: string[];
  files: MirrorFileEntry[];
  syncRunId: number | null;
}
export const MIRROR_FOLDER_NAME = "WSA AI Reporting Mirror";
export const MIRROR_FILE_NAMES = Object.freeze({ leads: "leads.csv", deals: "deals.csv", persons: "persons.csv", manifest: "manifest.json" } as const);
