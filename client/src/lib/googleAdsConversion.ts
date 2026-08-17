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
  }
}

const CONVERSION_SEND_TO = "AW-946725823/hviLCPiHkOMcEL_Ht8MD";

export function reportSignupConversion(): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    // gtag.js hasn't loaded (ad blocker, slow network, etc.) — the
    // submission itself already succeeded, so this is never worth
    // blocking or retrying over.
    return;
  }
  window.gtag("event", "conversion", {
    send_to: CONVERSION_SEND_TO,
    value: 1.0,
    currency: "GBP",
  });
}
