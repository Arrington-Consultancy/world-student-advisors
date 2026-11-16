/**
 * Keeping the campaign marker alive across the whole sign-up journey.
 *
 * A student who arrives from a campaign landing page carries the slug in the
 * URL. That is enough for someone who fills the form and submits it, and it
 * was all this needed until a real journey went through "Continue with
 * Google": the OAuth round trip returns to /contact carrying only the prefill
 * token, the query string is rebuilt from scratch, and the campaign was gone
 * by the time the form was submitted. The enquiry then notified the general
 * staff list instead of the campaign's own recipients.
 *
 * There are two defences and the journey needs both:
 *
 *  1. The server carries the slug through the OAuth state and puts it back on
 *     the /contact redirect (server/portal-google-auth.ts). That is the
 *     authoritative path and it needs no browser storage, so it still works
 *     in a private window or where storage is blocked.
 *
 *  2. This module remembers it for the tab as well, so any other way of
 *     leaving and returning to the form (a wander off to the privacy policy,
 *     a back button, a reload that drops the query) keeps it too.
 *
 * Only a slug on the closed list is ever stored or returned, so nothing a
 * visitor can type reaches the server as a campaign. The server validates it
 * again regardless.
 */
import { isCampaignSlug, type CampaignSlug } from "@shared/campaignEnquiry";

const STORAGE_KEY = "wsa_campaign";

/** Remember the campaign for the rest of this tab's session. Never throws. */
export function rememberCampaign(slug: string): void {
  if (!isCampaignSlug(slug)) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, slug);
  } catch {
    // Private mode, blocked storage, full quota. The OAuth state path above
    // is the one that has to work; this is the belt and the other is braces.
  }
}

/** The campaign this tab arrived with, or "" if there isn't one. Never throws. */
export function recallCampaign(): CampaignSlug | "" {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY) ?? "";
    return isCampaignSlug(stored) ? stored : "";
  } catch {
    return "";
  }
}
