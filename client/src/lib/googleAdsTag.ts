/**
 * Loads the Google Ads gtag.js base tag — but only once analytics consent
 * has actually been granted (see CookieConsent.tsx). Previously this script
 * loaded unconditionally from client/index.html on every page view,
 * regardless of the cookie banner's choice, contradicting both the
 * banner's own copy and CookieConsent.tsx's "no non-essential scripts
 * should fire until consent is granted" rule. Idempotent: safe to call more
 * than once (e.g. once on mount for a returning consented visitor, and
 * again if a future settings UI lets someone change their mind).
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[][];
  }
}

const GOOGLE_ADS_ID = "AW-946725823";
const SCRIPT_ID = "wsa-google-ads-gtag";

let loaded = false;

export function loadGoogleAdsTag(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  if (loaded || document.getElementById(SCRIPT_ID)) {
    return;
  }
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer!.push(args));
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(script);
}
