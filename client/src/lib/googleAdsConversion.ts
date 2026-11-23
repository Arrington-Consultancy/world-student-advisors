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
import { ensureGtag } from "./googleAdsTag";
import { hashedUserData } from "./googleAdsUserData";

const CONVERSION_SEND_TO = "AW-946725823/hviLCPiHkOMcEL_Ht8MD";
const CONVERSION_ARGS = [
  "event",
  "conversion",
  { send_to: CONVERSION_SEND_TO },
] as const;

/**
 * Always through gtag, which queues on the data layer until gtag.js has
 * loaded and is read in order when it does, so user data still precedes
 * the conversion. Never push an Array to the data layer directly: gtag.js
 * runs only `arguments` objects as commands, and until 23 November 2026
 * this fallback pushed an Array that it ignored (googleAdsTag.ts, THE BUG).
 */
function send(args: readonly unknown[]): void {
  ensureGtag();
  window.gtag!(...args);
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
