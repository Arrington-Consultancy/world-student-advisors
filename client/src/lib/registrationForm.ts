/**
 * The Website Registration Form: Tim Hunt's Pipedrive form, which replaces
 * the website's own sign-up form on /contact and on the Nigeria
 * postgraduate page.
 *
 * AUTHORITY. Tim Hunt's email of 14 November 2026 to Tom Arrington,
 * "Replace website and Nigeria landing page registration forms": "I have
 * tested the Pipedrive Website Registration Form and its automations.
 * Everything is working." He asked for every "Start Your Application" button
 * to lead to it (they all go to /contact) and for it to replace the form on
 * the Nigeria landing page, embedded in the page: "I want all these
 * registrations controlled through Pipedrive. The form assigns Claudia as
 * both Lead Owner and Source Owner and handles the staff notifications and
 * student acknowledgement." He first proposed the move on 28 October 2026;
 * Tom told him on 29 October what it means for the website, below. Tom
 * Arrington asked for the change on 14 November 2026.
 *
 * WHAT CHANGES. A registration now goes from the visitor's browser to
 * Pipedrive and never touches this server. Pipedrive creates the lead,
 * routes it to Claudia and sends the emails. The website no longer creates
 * a Student Portal account for these registrations: a Pipedrive form cannot.
 *
 * WHAT STAYS. A visitor who reaches /contact from a campaign link
 * (/contact?campaign=..., shared/campaignEnquiry.ts) still gets the website's
 * own form, because those enquiries are routed to that campaign's own
 * recipients and the Pipedrive form routes everything to Claudia. That keeps
 * any Speak to Juliet link already circulated, and the Sarkin Fulani draft
 * page's hand-off, working as before.
 *
 * GOOGLE ADS. The website's own form reported the "Submit lead form"
 * conversion after the server saved the lead. A Pipedrive form cannot, so
 * /contact/thank-you does it, once per arrival, as Juliet's thank-you page
 * does: Tim's form needs to send the student there after a successful
 * submission (its redirect setting in Pipedrive).
 */
import { reportSignupConversion } from "./googleAdsConversion";

/** Tim Hunt's form, 14 November 2026, exactly as he sent it. */
export const REGISTRATION_FORM_URL =
  "https://webforms.pipedrive.com/f/ctvQhNxYDb7IJn9tWaOdddYbPkg4UqRGmkTf7T91AfKENzMr8pOcVbBKsWgerujteP";

/** Where Tim's form should send the student after a successful submission. */
export const REGISTRATION_THANK_YOU_PATH = "/contact/thank-you";

/** Claudia makes first contact with every registration (Tim Hunt, 14 November 2026). */
export const FIRST_CONTACT = Object.freeze({
  name: "Claudia",
  whatsapp: "+44 7341 905 979",
  whatsappDigits: "447341905979",
});

export const REGISTRATION_THANK_YOU = Object.freeze({
  eyebrow: "Registration received",
  headline: "Thank you. We have your details.",
  body: "Claudia from our team will be in touch with you shortly. You will also receive an email confirming that we have your registration.",
  sooner: "Would you like to talk sooner?",
  whatsappCta: "Message Claudia on WhatsApp",
  whatsappMessage: "Hello Claudia, I have just registered on the WSA website.",
  library: "Explore the Student Support Library while you wait",
  stories: "Read our Student Success Stories",
});

const SESSION_KEY = "wsa_registration_form_conversion_reported";

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
 * Reports the site's established Google Ads "Submit lead form" conversion
 * for a student who has just arrived from Tim's form: once per browser
 * session, and never for a reload or a back/forward return. Without
 * analytics consent the Google tag is not loaded and nothing is sent.
 */
export function reportRegistrationConversionOnce(): ThankYouConversionOutcome {
  if (typeof window === "undefined") return "unavailable";

  const type = navigationType();
  if (type === "reload" || type === "back_forward") return "not-an-arrival";

  try {
    const storage = window.sessionStorage;
    if (storage.getItem(SESSION_KEY)) return "already-reported";
    storage.setItem(SESSION_KEY, new Date().toISOString());
  } catch {
    // Storage unavailable: report anyway rather than lose a real
    // registration. The reload check above still applies.
  }

  void reportSignupConversion();
  return "reported";
}
