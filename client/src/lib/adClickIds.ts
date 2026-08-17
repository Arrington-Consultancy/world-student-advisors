/**
 * Google Ads click-ID persistence, so a lead can be traced back to the ad
 * click that produced it even when the visitor lands on one page (e.g. the
 * homepage) and doesn't submit the Sign-up Form until several pages/visits
 * later. gclid = standard Google Ads clicks, gbraid = App campaigns /
 * privacy-sandbox iOS clicks, wbraid = web-to-app clicks.
 */

const STORAGE_KEY = "wsa_ad_click_ids";
const CLICK_ID_PARAMS = ["gclid", "gbraid", "wbraid"] as const;
type ClickIdParam = (typeof CLICK_ID_PARAMS)[number];
export type AdClickIds = Partial<Record<ClickIdParam, string>>;

/**
 * Reads gclid/gbraid/wbraid from the current URL, if present, and stores
 * the first non-empty value seen for this browser. Call once on app mount so
 * it runs regardless of which page a visitor lands on.
 */
export function captureAdClickIds(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const found: AdClickIds = {};
  for (const key of CLICK_ID_PARAMS) {
    const value = params.get(key);
    if (value) found[key] = value;
  }
  if (Object.keys(found).length === 0) return;

  try {
    const existing = getStoredAdClickIds();
    const next: AdClickIds = { ...existing };
    for (const key of CLICK_ID_PARAMS) {
      if (!next[key] && found[key]) next[key] = found[key];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private browsing, disabled storage) — the
    // click ID simply won't be attributed. Not worth failing anything over.
  }
}

/** Reads whatever click IDs have been captured this browser, if any. */
export function getStoredAdClickIds(): AdClickIds {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
