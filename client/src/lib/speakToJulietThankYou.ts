/**
 * The Speak to Juliet thank-you page: where Tim Hunt's Pipedrive form sends
 * the student after a successful submission.
 *
 * WHY THIS PAGE EXISTS. The Speak to Juliet form is Tim Hunt's Pipedrive web
 * form, embedded on /speak-to-juliet (Change Entry 117). A submission goes
 * from the visitor's browser to Pipedrive and never touches this server, so
 * the website's own sign-up path, which reports the Google Ads "Submit lead
 * form" conversion after the server has saved the lead, never runs for it.
 * Pipedrive's form can redirect the browser to a page of our choosing once
 * the submission has succeeded. This is that page. Tim's Operating
 * Guidelines of 28 September 2026: "Tom is to create a dedicated thank you
 * page to enable a clear confirmation and Google Ads conversion measurement;
 * Pipedrive acknowledgement is independent of the redirect."
 *
 * WHAT IT DOES NOT DO. It captures nothing: no form, no fields, no call to
 * Pipedrive or to this server. Pipedrive remains the source of the lead, and
 * Pipedrive's own automation sends the student's acknowledgement email. It
 * creates no Student Portal account: that account is created by the
 * website's own sign-up procedure from data this page never has, and the
 * Juliet route has no such step by design.
 *
 * THE CONVERSION. The page reports the site's one established Google Ads
 * conversion, reportSignupConversion in googleAdsConversion.ts, with the
 * same conversion id the website form uses. No new conversion action is
 * invented. The hashed email and phone the website form adds are not
 * available here, because the data went to Pipedrive; the conversion is
 * reported without them, which that module explicitly allows. As
 * everywhere on the site, the Google Ads tag loads only after analytics
 * consent (CookieConsent.tsx); without consent nothing is sent.
 *
 * THE META LEAD. Since 4 October 2026, on Tim Hunt's request, the same
 * arrival also fires Meta's standard "Lead" event (trackMetaLead in
 * metaPixel.ts), so the Meta campaign can count completed enquiries rather
 * than page views. It goes through the same once-per-arrival guard below,
 * and Meta holds it if the visitor has not accepted cookies.
 *
 * ONCE, AND ONLY FOR AN ARRIVAL. A form submission is one event, so the
 * conversion is reported once per browser session and only for a fresh
 * navigation to this page: a reload or a back/forward return is not a
 * second submission and reports nothing. Nothing on /speak-to-juliet itself
 * reports a conversion, and nothing on the site links to this page, so
 * merely visiting or refreshing the landing page cannot count as a
 * submission. A visitor who types this address directly would be counted
 * once; that residual risk is the same for any redirect-based conversion
 * and is why the page is noindex and unlinked.
 */
import { reportSignupConversion } from "./googleAdsConversion";
import { trackMetaLead } from "./metaPixel";

export const THANK_YOU_PATH = "/speak-to-juliet/thank-you";

/** Copy. Nothing here promises a response time; Juliet contacts the student. */
export const THANK_YOU = Object.freeze({
  eyebrow: "Speak to Juliet",
  headline: "Thank you. Your details are with Juliet.",
  body:
    "Juliet will be in touch with you shortly. You will also receive an email confirming that we have your enquiry.",
  sooner: "Would you like to talk sooner?",
  whatsappCta: "Message Juliet on WhatsApp",
  /** Already written when WhatsApp opens, so the student's first message is easy. */
  whatsappMessage: "Hello Juliet, I have just sent you my details through your page.",
  back: "Back to Juliet's page",
  library: "Explore the Student Support Library while you wait",
});

const SESSION_KEY = "wsa_juliet_form_conversion_reported";

export type ThankYouConversionOutcome = "reported" | "already-reported" | "not-an-arrival" | "unavailable";

/** The browser's own account of how this page load happened. */
function navigationType(): string {
  try {
    const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return entry?.type ?? "navigate";
  } catch {
    return "navigate";
  }
}

/**
 * Reports the Submit lead form conversion for a student who has just
 * arrived from Tim's form, once per browser session, and never for a
 * reload or a back/forward return. Returns what it did, so the page and
 * the tests can see it.
 */
export function reportJulietFormConversionOnce(): ThankYouConversionOutcome {
  if (typeof window === "undefined") return "unavailable";

  const type = navigationType();
  if (type === "reload" || type === "back_forward") return "not-an-arrival";

  let storage: Storage | null = null;
  try {
    storage = window.sessionStorage;
    if (storage.getItem(SESSION_KEY)) return "already-reported";
    storage.setItem(SESSION_KEY, new Date().toISOString());
  } catch {
    // Storage unavailable (private mode, blocked): report anyway rather than
    // lose a real submission. The reload check above still applies.
  }

  void reportSignupConversion();
  trackMetaLead();
  return "reported";
}
