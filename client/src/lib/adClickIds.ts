/**
 * Attribution persistence, so a lead can be traced back to the ad click or
 * campaign that produced it even when the visitor lands on one page (e.g.
 * the homepage) and doesn't submit the Sign-up Form until several pages or
 * visits later. gclid = standard Google Ads clicks, gbraid = App campaigns /
 * privacy-sandbox iOS clicks, wbraid = web-to-app clicks.
 */

const STORAGE_KEY = "wsa_ad_click_ids";
const CLICK_ID_PARAMS = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;
type ClickIdParam = (typeof CLICK_ID_PARAMS)[number];
export type AdClickIds = Partial<Record<ClickIdParam, string>>;

/**
 * Reads attribution values from the current URL, if present, and stores the
 * first non-empty value seen for this browser. Call once on app mount so it
 * runs regardless of which page a visitor lands on.
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

declare global {
  interface Window {
    /**
     * Read by Pipedrive's web form loader when a form asks for "JavaScript
     * variables" to fill its hidden fields (Pipedrive product update,
     * August 2026).
     */
    pd_webform?: Record<string, unknown>;
  }
}

/** A real click identifier or UTM value is far shorter than this. */
const MAX_VALUE_LENGTH = 512;

/**
 * Hands the stored attribution values to Pipedrive's embedded web forms.
 *
 * WHY (23 November 2026). Since 15 November the Contact page and the Nigeria
 * page carry Tim Hunt's Pipedrive Website Registration Form. A submission
 * goes from the visitor's browser straight to Pipedrive and never touches
 * this server, so the click identifier stored above no longer reached the
 * Lead. The server-side "Qualified Lead" upload (server/ads/qualifiedLead.ts)
 * skips a Deal that has no click identifier, so Google Ads would stop
 * learning which clicks became qualified leads.
 *
 * HOW. Pipedrive's loader (webforms.pipedrive.com/f/loader, read on 23
 * November 2026) answers a form's request for named variables from
 * `window.pd_webform`, and passes on only strings, numbers and booleans. A
 * form asks only for the names its owner gave to hidden fields, so this does
 * nothing at all until Tim adds hidden fields named gclid, gbraid and wbraid
 * to his form. It changes nothing in Pipedrive and nothing in his forms.
 *
 * These are the same values, sent to the same place, as the website's own
 * form has sent to Pipedrive with each signup since August 2026.
 */
export function exposeAdClickIdsToPipedriveForms(): void {
  if (typeof window === "undefined") return;

  const stored = getStoredAdClickIds();
  const values: Record<string, string> = {};
  for (const key of CLICK_ID_PARAMS) {
    const value = stored[key];
    if (typeof value === "string" && value !== "" && value.length <= MAX_VALUE_LENGTH) values[key] = value;
  }
  if (Object.keys(values).length === 0) return;

  window.pd_webform = { ...(window.pd_webform ?? {}), ...values };
}
