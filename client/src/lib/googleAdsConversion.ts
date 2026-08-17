/**
 * Google Ads "Submit lead form" conversion event, fired on a genuinely
 * successful Sign-up Form submission (after Pipedrive has actually saved
 * the lead — never on a raw click). No redirect/url callback is needed
 * here: the form swaps to its confirmation view in place rather than
 * navigating to a separate thank-you page.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[][];
  }
}

const CONVERSION_SEND_TO = "AW-946725823/hviLCPiHkOMcEL_Ht8MD";
const CONVERSION_ARGS = [
  "event",
  "conversion",
  { send_to: CONVERSION_SEND_TO },
] as const;

export function reportSignupConversion(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof window.gtag === "function") {
    window.gtag(...CONVERSION_ARGS);
    return;
  }

  // The base tag loads async. If the form succeeds before gtag is ready,
  // queue the exact same conversion call so gtag.js can process it when it
  // finishes loading.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push([...CONVERSION_ARGS]);
}
