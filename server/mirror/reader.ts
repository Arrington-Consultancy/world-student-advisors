/**
 * Reading the reporting mirror, manifest first.
 *
 * Tom Arrington, 11 September 2026: workers must check the manifest before
 * answering and refuse to present stale data as current. So a read here
 * is: fetch manifest.json, judge its age and status, confirm every data
 * file still carries the md5 the manifest recorded, and only then parse.
 * Anything else is a named refusal with the last successful sync time.
 */
import { getDriveMirrorAccess } from "./driveMirrorOAuth";
import { DriveClient } from "./driveClient";
import { MIRROR_FILE_NAMES, MIRROR_FOLDER_NAME, type MirrorManifest } from "./manifest";
import { parseCsv, type Row } from "./sanitise";
import { CRM_FIELDS, type MiReader } from "../workforce/mi/evidence";

/** How old a mirror may be and still be presented as current. Hourly sync, two missed windows tolerated. */
export const MIRROR_FRESH_MINUTES = 150;

export type MirrorReadStatus = "unconfigured" | "not_authorised" | "no_manifest" | "stale" | "inconsistent" | "partial" | "fresh";
export interface MirrorRead {
  status: MirrorReadStatus;
  manifest: MirrorManifest | null;
  ageMinutes: number | null;
  detail: string;
  files?: { leads: Row[]; deals: Row[]; persons: Row[] };
}

export async function readMirror(deps: { fetchImpl?: typeof fetch; now?: Date; freshMinutes?: number } = {}): Promise<MirrorRead> {
  const now = deps.now ?? new Date();
  const fresh = deps.freshMinutes ?? MIRROR_FRESH_MINUTES;
  const access = await getDriveMirrorAccess({ fetchImpl: deps.fetchImpl });
  if (!access.ok) return { status: access.status === "unconfigured" ? "unconfigured" : "not_authorised", manifest: null, ageMinutes: null, detail: `The reporting mirror's Google Drive grant is ${access.status.replace(/_/g, " ")}.` };
  const client = new DriveClient(access.accessToken, deps.fetchImpl);
  const folder = await client.findFolder(MIRROR_FOLDER_NAME);
  const manifestFile = folder ? await client.findInFolder(folder.id, MIRROR_FILE_NAMES.manifest) : null;
  if (!manifestFile) return { status: "no_manifest", manifest: null, ageMinutes: null, detail: "The reporting mirror has never completed a sync." };
  let manifest: MirrorManifest;
  try { manifest = JSON.parse(await client.download(manifestFile.id)) as MirrorManifest; } catch { return { status: "inconsistent", manifest: null, ageMinutes: null, detail: "The mirror manifest could not be read." }; }
  const syncedAt = new Date(manifest.lastSuccessfulSyncAt);
  const ageMinutes = Math.round((now.getTime() - syncedAt.getTime()) / 60000);
  if (!Number.isFinite(ageMinutes) || ageMinutes > fresh) {
    return { status: "stale", manifest, ageMinutes, detail: `The reporting mirror was last synced ${Number.isFinite(ageMinutes) ? `${ageMinutes} minutes ago` : "at an unknown time"}, which is older than the ${fresh}-minute freshness limit.` };
  }
  // Every data file must still be the one the manifest describes.
  const contents: Record<string, Row[]> = {};
  for (const entry of manifest.files) {
    const meta = await client.getMeta(entry.fileId);
    if (meta.md5Checksum && meta.md5Checksum !== entry.md5) {
      return { status: "inconsistent", manifest, ageMinutes, detail: `${entry.name} on Drive does not match the manifest, so a sync must have failed part way. Last complete sync ${manifest.lastSuccessfulSyncAt}.` };
    }
    contents[entry.name] = parseCsv(await client.download(entry.fileId));
  }
  const files = { leads: contents[MIRROR_FILE_NAMES.leads] ?? [], deals: contents[MIRROR_FILE_NAMES.deals] ?? [], persons: contents[MIRROR_FILE_NAMES.persons] ?? [] };
  return { status: manifest.status === "partial" ? "partial" : "fresh", manifest, ageMinutes, detail: manifest.status === "partial" ? `Partial mirror: ${manifest.reason ?? "reason not recorded"}.` : `Mirror synced ${ageMinutes} minutes ago.`, files };
}

/**
 * The evidence layer reads Pipedrive-shaped records. This rebuilds exactly
 * the keys it uses from the sanitised columns, so the same resolver serves
 * both the live CRM and the mirror without a second code path.
 */
export function miReaderOverMirror(files: { leads: Row[]; deals: Row[]; persons: Row[] }): MiReader {
  const num = (s: string | undefined) => (s && /^\d+$/.test(s) ? Number(s) : undefined);
  return {
    listLeads: async () => files.leads.map(r => ({
      id: r.id, add_time: r.created_at, person_id: num(r.person_id), is_archived: r.status === "archived",
      source_name: r.source_name || undefined, [CRM_FIELDS.leadUtmSource]: r.utm_source || undefined,
    })),
    listDeals: async () => files.deals.map(r => ({
      id: num(r.id), add_time: r.created_at, person_id: num(r.person_id), stage_id: num(r.stage_id), status: r.status || undefined,
      [CRM_FIELDS.dealApplicationDate1]: r.application_date_1 || undefined,
    })),
    listPersons: async () => files.persons.map(r => ({
      id: num(r.id), [CRM_FIELDS.personReferredBy]: r.referred_by || undefined, [CRM_FIELDS.personSourceOwner]: r.source_owner || undefined,
      [CRM_FIELDS.personCountryOfResidence]: r.country_of_residence || undefined, [CRM_FIELDS.personNationality]: r.nationality || undefined,
    })),
  };
}
