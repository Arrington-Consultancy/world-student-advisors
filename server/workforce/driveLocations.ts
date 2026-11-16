/**
 * Which Google Drive folders each WSA worker may reach, by folder ID.
 *
 * Tom Arrington, 11 September 2026: selected-folder Google Drive access is
 * approved. Workers may read selected WSA folders held in his Drive. This
 * grants nothing on the rest of that Drive and nothing on Arrington
 * Consultancy material. Two boundaries make that real: Tom shares only the
 * approved folders with the dedicated workforce service account, so the
 * credential can see nothing else; and this file names, by ID, which of
 * those shared folders each worker may reach for its existing remit. IDs,
 * never names, because a name can be reused and an ID cannot.
 *
 * INSPECTED on 11 September 2026 through Tom's connected Drive before any
 * assignment was made. Findings:
 *   WSA Website Operating System: website governance, specifications,
 *     handovers, registers, the 5 September 2026 handover, one full chat
 *     export. WSA material throughout. Contains WSA Website Images.
 *   WSA Website Images: website imagery, staff photographs, partner
 *     university logos. WSA material throughout.
 *   WSA PDFs: WSA published documents (90-day plan, team talk, enactment
 *     sheet, The Mind That Built WSA) and a copy review. One file carries
 *     "Arrington Consultancy" in its title and is excluded by ID until Tom
 *     identifies it.
 *   WSA Editable Docs: MIXED. Holds four Arrington Consultancy documents
 *     (The Mind That Built the Business, Half-Time Team Talk, 90-Day Action
 *     Plan, Enactment Sheet, all PUBLIC EDITABLE). Not designated to any
 *     worker and not to be shared with the service account until those
 *     four documents are moved out. Recorded for Tom.
 *   The parent folder "World Student Advisors" also holds "Arrington
 *     Consultancy Deliverables" and is never to be shared or designated.
 *   WSA Website Backup (29 July 2026) and WSA Sharepoint export are
 *     archive and duplicate sources: not designated, not shared.
 *
 * Provenance: Worker Personality and Connector Access Matrix v0.5, section
 * 4; WSA Change Log Change Entry 091. Changing an assignment is an
 * amendment to that record, not a code change.
 */
import type { WorkerId } from "./types";

export interface DriveRoot { id: string; name: string }

export const DRIVE_ROOTS = Object.freeze({
  websiteOperatingSystem: Object.freeze({ id: "1NfrRjUKTDsG1YiHzLpR8sHPmuuK18Zux", name: "WSA Website Operating System" }),
  websiteImages: Object.freeze({ id: "1S9Qep2_IqUiKoyqfwvXXpHzeOxVXP5pd", name: "WSA Website Images" }),
  pdfs: Object.freeze({ id: "1Dq2LmA30-aCbbNvQcwenugPZCjTd7PWQ", name: "WSA PDFs" }),
} as const satisfies Record<string, DriveRoot>);

/** Shared-candidate folders that are NOT designated, and why. Never in any worker's list. */
export const DRIVE_NOT_DESIGNATED = Object.freeze([
  { id: "16gt8iUovwFbZR6nGwRaUwgQVeWXFKycm", name: "WSA Editable Docs", reason: "Holds four Arrington Consultancy documents. Not designated until they are moved out." },
  { id: "1ciKTYlcEHbsmJWJKaUkLpyb2v9HZsJbJ", name: "World Student Advisors (parent)", reason: "Holds Arrington Consultancy Deliverables. Never shared or designated." },
  { id: "1JPSP1iP6DFMX6fHzYm6jd5mTpzUg1wdT", name: "WSA Website Backup (29 July 2026)", reason: "Archive source. Not normal worker evidence." },
  { id: "1412YWKbu9du6IkXlyvbrU7d8XckLEmW1", name: "WSA Sharepoint export", reason: "Duplicate of the controlled SharePoint site. Not normal worker evidence." },
] as const);

/** Individual files inside a designated folder that are withheld pending Tom's identification. */
export const DRIVE_EXCLUDED_FILE_IDS: ReadonlySet<string> = new Set([
  "1gbRBDkB8zezqHqzT5KcTALCPc8VE-PPI", // World_Student_Advisors_Half_Time_Team_Talk_Arrington_Consultancy.pdf: title names Arrington Consultancy.
]);

/** Per worker, by remit. Everyone not listed has no Drive location. */
export const WORKER_DRIVE_ROOTS: Readonly<Record<WorkerId, readonly DriveRoot[]>> = Object.freeze({
  staff_receptionist: [],
  wsa_core_brain: [],
  grace: [],
  sophie: [],
  daniel: [],
  oliver: [],
  james: [],
  priya: [],
  harper: [],
  olivia: [],
  amelia: [],
  /** Website and SEO governance evidence, including the images inside it. */
  ethan: [DRIVE_ROOTS.websiteOperatingSystem],
  /** Campaign and website imagery only. */
  alex: [DRIVE_ROOTS.websiteImages],
  /** WSA published documents, for records control. */
  maya: [DRIVE_ROOTS.pdfs],
  nia: [],
  wsa_governance_assurance: [],
});

export const DRIVE_LOCATION_SOURCE = "Worker Personality and Connector Access Matrix v0.5 section 4, approved by Tom Arrington on 11 September 2026; folders inspected the same day.";
export const NO_DRIVE_LOCATION = "No Google Drive folder is designated for this worker. " + DRIVE_LOCATION_SOURCE + " Adding one is an amendment to that record, not a code change.";
export const DRIVE_ROOT_NOT_DESIGNATED = "That Google Drive folder is not designated for this worker. Workers reach only the folders listed for them by ID. " + DRIVE_LOCATION_SOURCE;
export const DRIVE_ROOT_FORBIDDEN = "That Google Drive folder is never designated to any worker: it holds Arrington Consultancy material or is an archive or duplicate source. " + DRIVE_LOCATION_SOURCE;

/**
 * Resource scope grammar, and it is a grammar so the chokepoint can check
 * the root before the connector is reached:
 *   root/<rootId>                        list the designated root
 *   root/<rootId>/folder/<folderId>      list a folder inside that root (ancestry verified by the connector)
 *   root/<rootId>/file/<fileId>          read a file inside that root (ancestry verified by the connector)
 *   root/<rootId>/search/<term>          search inside that root and its subfolders
 */
export type DriveScope =
  | { kind: "list"; rootId: string; folderId: string }
  | { kind: "read"; rootId: string; fileId: string }
  | { kind: "search"; rootId: string; term: string };

export function parseDriveScope(scope: string): DriveScope | null {
  const parts = scope.split("/").filter(Boolean);
  if (parts[0] !== "root" || !parts[1]) return null;
  const rootId = parts[1];
  if (parts.length === 2) return { kind: "list", rootId, folderId: rootId };
  if (parts[2] === "folder" && parts[3] && parts.length === 4) return { kind: "list", rootId, folderId: parts[3] };
  if (parts[2] === "file" && parts[3] && parts.length === 4) return { kind: "read", rootId, fileId: parts[3] };
  if (parts[2] === "search" && parts[3]) return { kind: "search", rootId, term: decodeURIComponent(parts.slice(3).join("/")) };
  return null;
}

export interface DriveLocationDecision { permitted: boolean; reason: string; root?: DriveRoot }

export function decideDriveLocation(workerId: WorkerId, resourceScope: string): DriveLocationDecision {
  const parsed = parseDriveScope(resourceScope);
  if (!parsed) return { permitted: false, reason: "Google Drive requests must name a designated root folder by ID (root/<id>...). Nothing was read." };
  if (DRIVE_NOT_DESIGNATED.some(f => f.id === parsed.rootId)) return { permitted: false, reason: DRIVE_ROOT_FORBIDDEN };
  const designated = WORKER_DRIVE_ROOTS[workerId] ?? [];
  if (designated.length === 0) return { permitted: false, reason: NO_DRIVE_LOCATION };
  const root = designated.find(r => r.id === parsed.rootId);
  if (!root) return { permitted: false, reason: DRIVE_ROOT_NOT_DESIGNATED };
  if (parsed.kind === "read" && DRIVE_EXCLUDED_FILE_IDS.has(parsed.fileId)) return { permitted: false, reason: "That file is withheld from every worker pending Tom Arrington's identification of its ownership." };
  return { permitted: true, reason: `Designated Google Drive folder "${root.name}" for ${workerId}. ${DRIVE_LOCATION_SOURCE}`, root };
}

/** Every designated root, for acceptance runs and the admin view. */
export function allDesignatedDriveRoots(): DriveRoot[] {
  return Object.values(DRIVE_ROOTS);
}
