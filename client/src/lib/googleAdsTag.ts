/**
 * Google Ads gtag.js with Google Consent Mode v2.
 *
 * HISTORY, AND WHY THIS SHAPE. Until 28 August 2026 the base tag loaded
 * unconditionally from client/index.html. PR #59 then gated it behind the
 * cookie banner: the tag loaded only after "Accept all". Google's own record
 * shows the consequence: its last tag ping was 05:11 UTC that day, and in the
 * following month about 900 paid clicks and 15 real leads produced no
 * reported conversion at all, because almost no visitor accepts the banner
 * and an unloaded tag reports nothing (found 30 September 2026).
 *
 * NOW. The tag loads on every page view, but with every consent type set to
 * "denied" BEFORE it loads (Consent Mode v2 default). In that state gtag.js
 * sets no cookies and reads none; it sends cookieless pings that Google uses
 * to model conversions. When the visitor clicks "Accept all" the consent is
 * updated to "granted" and normal measurement resumes for that visitor. A
 * visitor who declines, or ignores the banner, stays denied. This keeps the
 * banner's promise (no analytics cookies without consent) while restoring
 * the measurement the Google Ads campaign is judged by.
 *
 * ORDER MATTERS: the consent default must be pushed before "config" and
 * before the script is injected, or gtag.js will treat the first page view
 * as unconsented-but-unknown. url_passthrough lets the click id ride along
 * in the URL when cookies are denied; ads_data_redaction strips ad click
 * identifiers from the pings while ad_storage is denied.
 *
 * Idempotent: loadGoogleAdsTag() may be called more than once.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[][];
  }
}

export const GOOGLE_ADS_ID = "AW-946725823";
const SCRIPT_ID = "wsa-google-ads-gtag";

/** The four Consent Mode v2 types the Google Ads tag reads. */
export const CONSENT_TYPES = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"] as const;
export type ConsentState = "granted" | "denied";

let loaded = false;

function ensureGtag(): void {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer!.push(args));
}

function consentRecord(state: ConsentState): Record<string, string | number> {
  return Object.fromEntries(CONSENT_TYPES.map(t => [t, state]));
}

/**
 * Loads the tag with consent denied by default. Safe to call on every page
 * view; the second and later calls do nothing.
 */
export function loadGoogleAdsTag(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  if (loaded || document.getElementById(SCRIPT_ID)) {
    return;
  }
  loaded = true;

  ensureGtag();
  // Consent Mode v2 default: everything denied until the visitor says
  // otherwise. wait_for_update gives a returning consented visitor's
  // "update" (pushed by CookieConsent on mount) time to arrive first.
  window.gtag!("consent", "default", { ...consentRecord("denied"), wait_for_update: 500 });
  window.gtag!("set", "url_passthrough", true);
  window.gtag!("set", "ads_data_redaction", true);
  window.gtag!("js", new Date());
  window.gtag!("config", GOOGLE_ADS_ID);

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(script);
}

/**
 * Records the visitor's choice with Google: "granted" after "Accept all",
 * "denied" after "Essential only". Called by CookieConsent on mount for a
 * returning visitor and on every click of either button.
 */
export function updateGoogleConsent(state: ConsentState): void {
  if (typeof window === "undefined") return;
  ensureGtag();
  window.gtag!("consent", "update", consentRecord(state));
}
