/**
 * Campaign landing pages that need their enquiries identified as theirs.
 *
 * WHY THIS EXISTS. The Speak to Juliet page tells a visitor "leave your
 * details and Juliet will come back to you". The signup path it hands off to
 * is the right one, but on its own it notifies the general staff list, which
 * does not include Juliet, and it records nothing about which page the
 * enquiry came from. The page would have been promising something the system
 * did not do. Tom Arrington, 19 September 2026: implement the smallest safe
 * campaign-specific mechanism that keeps the controlled path, identifies the
 * enquiry and notifies Juliet.
 *
 * WHAT IT IS, AND IS NOT. A closed list of slugs. A landing page may emit
 * one, the signup procedure validates what it receives against this list and
 * ignores anything else, the campaign's label goes into the Lead note that is
 * already written, and one extra email goes to the campaign's own recipients.
 *
 * It is not a counsellor allocation: nobody is added to the CRM's counsellor
 * vocabulary, no owner is set, and no Pipedrive field is created. It is not a
 * second CRM route: the Lead is still created by the one controlled path. It
 * does not change the general staff notification list, which continues to
 * receive every enquiry exactly as before. The campaign email is additional,
 * never instead.
 *
 * Recipients are deliberately not in this file. The browser has no business
 * knowing who is emailed, so the addresses live server-side in
 * server/_core/env.ts and are keyed by the slug.
 */

export const CAMPAIGN_SLUGS = Object.freeze(["speak-to-juliet"] as const);

export type CampaignSlug = (typeof CAMPAIGN_SLUGS)[number];

export function isCampaignSlug(value: string): value is CampaignSlug {
  return (CAMPAIGN_SLUGS as readonly string[]).includes(value);
}

/**
 * How the campaign is named to staff: in the Lead note in Pipedrive, and in
 * the subject line of the email its owner receives. Written so that somebody
 * reading a Lead in six months can tell where it came from.
 */
export const CAMPAIGN_LABELS: Readonly<Record<CampaignSlug, string>> = Object.freeze({
  "speak-to-juliet": "Speak to Juliet, the Nigeria landing page",
});

/** The page a campaign's enquiries come from, for the note. */
export const CAMPAIGN_PATHS: Readonly<Record<CampaignSlug, string>> = Object.freeze({
  "speak-to-juliet": "/speak-to-juliet",
});

/**
 * Campaigns whose own recipient list REPLACES the general staff
 * notification, rather than being sent alongside it.
 *
 * Tom Arrington, 19 September 2026, resolving the conflict between Tim Hunt's
 * master draft and the earlier implementation brief in favour of the master:
 * a Speak to Juliet enquiry is to notify exactly Juliet, Tim, Glenice and
 * Eldah, and to exclude Manet, Tom and Claudia. Tom authorised his own
 * exclusion. Sending the general notification as well would defeat that, so
 * for a campaign listed here the general one is not sent and the campaign's
 * list receives the full enquiry instead of a summary.
 *
 * A campaign NOT listed here keeps the original behaviour: the general list
 * is notified as always and the campaign's own recipients additionally.
 *
 * This changes nothing for an ordinary enquiry, which carries no campaign at
 * all and is unaffected by any of this.
 *
 * SCOPE. This governs the new-enquiry notification only. Failure alerts (a
 * sign-up that could not be saved, a portal account that could not be
 * created) still go to the general staff list whatever the campaign, because
 * they are operational alerts for whoever fixes the system rather than
 * enquiry routing.
 */
export const CAMPAIGN_REPLACES_GENERAL_NOTIFICATION: ReadonlySet<CampaignSlug> = Object.freeze(
  new Set<CampaignSlug>(["speak-to-juliet"]),
);

/** Whether this campaign's recipients replace the general staff list. */
export function campaignReplacesGeneralNotification(slug: CampaignSlug): boolean {
  return CAMPAIGN_REPLACES_GENERAL_NOTIFICATION.has(slug);
}
