/**
 * Meta Pixel (Facebook/Instagram Ads), consent-gated.
 *
 * Supplied by Tom Arrington on 2 October 2026 as Meta's standard base code
 * for pixel 2892182304395411, to support the WSA Meta advertising. It is
 * installed here the way the Google Ads tag is (see googleAdsTag.ts), so the
 * cookie banner's promise still holds: no advertising cookie is set until
 * the visitor clicks "Accept all".
 *
 * HOW. Meta's own consent control is used: `fbq("consent", "revoke")` is
 * queued BEFORE `init`, so the pixel loads but sets no cookie and sends no
 * event; everything it is asked to do is held until `fbq("consent",
 * "grant")`, which CookieConsent issues for "Accept all". A returning
 * visitor whose stored choice is "Accept all" is loaded already granted
 * (no revoke queued; see loadMetaPixel for why a replayed grant would
 * otherwise never be reached). "Essential only" leaves it revoked. Unlike
 * Google Consent Mode there is no cookieless modelling: a revoked pixel
 * reports nothing for that visitor. That is the price of the banner's
 * promise, and it is stated rather than hidden.
 *
 * Meta's `<noscript>` image beacon is deliberately NOT installed: it fires
 * regardless of consent and so cannot be gated.
 *
 * PageView fires once at init and again on every client-side route change
 * (MetaPixelRouteTracker), because this is a single-page app.
 *
 * Idempotent: loadMetaPixel() may be called more than once.
 */

import { getCookieConsent } from "./cookieConsentStorage";

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export const META_PIXEL_ID = "2892182304395411";
const SCRIPT_ID = "wsa-meta-pixel";
const SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";

export type MetaConsentState = "granted" | "denied";

let loaded = false;

/**
 * The consent to load with when the caller has not said: granted for a
 * stored "Accept all", revoked otherwise. Read from the banner's storage so
 * that an event fired before the banner mounts (the thank-you page's Lead
 * runs in an earlier effect) loads the pixel the same way the banner would.
 */
function storedInitial(): "granted" | "revoked" {
  return getCookieConsent() === "accepted" ? "granted" : "revoked";
}

/** Installs Meta's queueing stub, exactly as its base code does. */
function ensureFbq(): Fbq {
  if (window.fbq) return window.fbq;
  const n = function (...args: unknown[]) {
    if (n.callMethod) {
      n.callMethod(...args);
    } else {
      n.queue.push(args);
    }
  } as Fbq;
  n.queue = [];
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  return n;
}

/**
 * Loads the pixel. Safe to call on every page view; the second and later
 * calls do nothing.
 *
 * `initial` is the visitor's consent as already known when the page loads:
 * "revoked" (the default) for a visitor who has not chosen or chose
 * "Essential only", "granted" for a visitor whose stored choice is "Accept
 * all". It matters because of how Meta's script drains the pre-load queue:
 * once it reads a revoke it holds everything after it, INCLUDING a grant
 * queued behind it, so a returning accepted visitor whose grant was
 * replayed after a revoke would never fire the pixel on any page. Found on
 * 3 October 2026 on /speak-to-juliet/thank-you. For a granted visitor no
 * revoke is queued, and init and PageView fire as soon as the script loads.
 */
export function loadMetaPixel(initial: "granted" | "revoked" = storedInitial()): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  if (loaded || document.getElementById(SCRIPT_ID)) {
    return;
  }
  loaded = true;

  const fbq = ensureFbq();
  if (initial !== "granted") {
    // Revoke BEFORE init: the pixel then holds every call, sets no cookie
    // and sends nothing until a grant arrives through updateMetaConsent,
    // which by then is a direct call the script processes at once.
    fbq("consent", "revoke");
  }
  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = SCRIPT_SRC;
  document.head.appendChild(script);
}

/**
 * Records the visitor's choice with Meta: grant after "Accept all", revoke
 * after "Essential only". Called by CookieConsent on mount for a returning
 * visitor and on every click of either button.
 */
export function updateMetaConsent(state: MetaConsentState): void {
  if (typeof window === "undefined") return;
  const fbq = ensureFbq();
  fbq("consent", state === "granted" ? "grant" : "revoke");
}

/** A PageView for a client-side route change. Held by Meta while revoked. */
export function trackMetaPageView(): void {
  if (typeof window === "undefined") return;
  loadMetaPixel();
  const fbq = ensureFbq();
  fbq("track", "PageView");
}

/**
 * Meta's standard "Lead" event: a completed enquiry. Asked for by Tim Hunt
 * on 4 October 2026 so the Meta campaign can optimise for enquiries rather
 * than page views. Fired by the Speak to Juliet thank-you page, once per
 * arrival, through the same guard as the Google Ads conversion
 * (speakToJulietThankYou.ts). Held by Meta while consent is revoked.
 */
export function trackMetaLead(): void {
  if (typeof window === "undefined") return;
  // Load first: on the thank-you page this runs in the page's own effect,
  // before CookieConsent's, and Meta drops a track that precedes init.
  // loadMetaPixel is idempotent, so the banner's later call is a no-op.
  loadMetaPixel();
  const fbq = ensureFbq();
  fbq("track", "Lead");
}
