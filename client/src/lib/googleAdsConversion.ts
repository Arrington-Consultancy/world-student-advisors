/**
 * Google Ads "Submit lead form" conversion event, fired on a genuinely
 * successful Sign-up Form submission (after Pipedrive has actually saved
 * the lead — never on a raw click). No redirect/url callback is needed
 * here: the form swaps to its confirmation view in place rather than
 * navigating to a separate thank-you page.
 *
 * Since 18 September 2026 the conversion also carries a SHA-256 hash of the
 * student's email address and phone number, on Tom Arrington's decision of
 * that day (open point AB-A10), so that a click recorded under gbraid or
 * wbraid, which carries no per-click identifier, can still be matched.
 * googleAdsUserData.ts says exactly what is hashed and when nothing is sent.
 * The conversion is reported whether or not that data can be produced.
 */
import { hashedUserData } from "./googleAdsUserData";

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

/** gtag if it has loaded; otherwise the queue gtag.js processes when it does. */
function send(args: readonly unknown[]): void {
  if (typeof window.gtag === "function") {
    window.gtag(...args);
    return;
  }
  // The base tag loads async. If the form succeeds before gtag is ready,
  // queue the exact same call so gtag.js can process it when it finishes
  // loading. Order is preserved, so user data still precedes the conversion.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push([...args]);
}

export type SignupContact = {
  email?: string | null;
  phone?: string | null;
};

export async function reportSignupConversion(contact: SignupContact = {}): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  // Set before the conversion, so gtag attaches it to the event. A failure
  // here must never cost the conversion itself.
  try {
    const userData = await hashedUserData(contact.email, contact.phone);
    if (userData) send(["set", "user_data", userData]);
  } catch {
    /* the conversion still goes */
  }

  send(CONVERSION_ARGS);
}
