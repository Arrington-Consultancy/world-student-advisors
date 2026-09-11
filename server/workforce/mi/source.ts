/**
 * Where a management-information question gets its figures.
 *
 * Tom Arrington, 11 September 2026: Pipedrive remains the source of truth,
 * but workers do not query it live for ordinary reporting. They read the
 * WSA AI Reporting Mirror, after checking its manifest, and refuse to
 * present stale data as current. The live CRM is used only when the WSA
 * Pipedrive OAuth grant is operational and the mirror is not usable.
 * Individual-case lookups are a different path and never come here.
 */
import { readMirror } from "../../mirror/reader";
import { miReaderOverMirror } from "../../mirror/reader";
import { getPipedriveOAuthStatus } from "../../crm/pipedriveOAuth";
import { liveMiReader } from "./liveReader";
import type { MiSource } from "./resolve";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

export async function miSource(): Promise<MiSource> {
  let mirrorDetail = "the reporting mirror is not configured";
  let lastGood: string | null = null;
  try {
    const mirror = await readMirror();
    if ((mirror.status === "fresh" || mirror.status === "partial") && mirror.files && mirror.manifest) {
      const synced = fmt(mirror.manifest.lastSuccessfulSyncAt);
      const partial = mirror.status === "partial" ? ` The mirror is marked partial: ${mirror.manifest.reason ?? "reason not recorded"}.` : "";
      return {
        ok: true,
        reader: miReaderOverMirror(mirror.files),
        sourceName: "the WSA reporting mirror of Pipedrive",
        sourceLabel: `the WSA reporting mirror of Pipedrive, synced ${synced}${partial}`,
      };
    }
    mirrorDetail = mirror.detail;
    lastGood = mirror.manifest?.lastSuccessfulSyncAt ?? null;
  } catch (error) {
    mirrorDetail = `the reporting mirror could not be read (${String((error as Error)?.message ?? error).slice(0, 120)})`;
  }
  if ((await getPipedriveOAuthStatus()) === "operational") {
    return { ok: true, reader: liveMiReader, sourceName: "Pipedrive", sourceLabel: "Pipedrive, checked just now" };
  }
  return { ok: false, reason: `${mirrorDetail.replace(/\.$/, "")}, and there is no live CRM connection to fall back on.`, lastSuccessfulSyncAt: lastGood };
}
