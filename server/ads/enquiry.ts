/**
 * What WSA sends Google when a student enquires, and when.
 *
 * WHY. Google Ads worker brief of 14 October 2026, approved by Tom
 * Arrington. The website's own "Submit lead form" conversion (gtag, action
 * 7724073976) has recorded nothing since 28 August, because visitors do not
 * accept the cookie banner and the tag cannot report without consent. The
 * Qualified Lead upload (qualifiedLead.ts) works but produces about three
 * conversions a month, too few for Google's bidding to learn from. Every
 * Pipedrive Lead the website creates from a Google click is an enquiry
 * Google can be told about directly, as the Qualified Lead is: 15 to 25
 * signals a month instead of 3.
 *
 * THE EVENT. A Pipedrive Lead, created by the website's signup path
 * (server/pipedrive.ts createStudentLead), whose Lead or Person carries a
 * Google click identifier. The conversion time is the Lead's add_time. A
 * Lead later converted to a Deal still counted as an enquiry when it was
 * made; the Qualified Lead is a separate conversion action, so there is no
 * double count within either action.
 *
 * THE DESTINATION. A conversion action Tom creates in Google Ads account
 * 516-583-8785: "WSA | Enquiry", category Submit lead form, source Import
 * from clicks, One per click, 30-day click window, Primary. Its id is not
 * known until he creates it, so there is no default:
 * GOOGLE_ADS_ENQUIRY_CONVERSION_ACTION_ID must be set, and the sync stands
 * down until it is. The website-tag action 7724073976 and the Qualified
 * Lead action are refused as destinations: uploading to either would
 * corrupt a conversion Google already reads.
 *
 * WHAT IS SENT, AND WHEN NOTHING IS. Exactly the Qualified Lead rules
 * (qualifiedLead.ts buildClickConversionEvent): the click identifier, the
 * time, a Lead-keyed transaction id, and the SHA-256 of the normalised
 * email and phone only where the Person carries GDPR consent option 105.
 * No Google click identifier, nothing is sent.
 */
import { QUALIFIED_LEAD, buildClickConversionEvent, qualifiedLeadConfig, type BuildResult } from "./qualifiedLead";
import type { DataManagerDestination } from "./googleDataManager";

export const ENQUIRY = Object.freeze({
  conversionActionName: "WSA | Enquiry",
  conversionActionIdVar: "GOOGLE_ADS_ENQUIRY_CONVERSION_ACTION_ID",
  event: "A Pipedrive Lead created from a Google click (Lead add_time), per the Google Ads worker brief of 14 October 2026.",
});

export interface EnquiryConfig {
  customerId: string;
  loginCustomerId: string | null;
  /** Null until Tom has created the action and set its id. */
  conversionActionId: string | null;
}

export type EnquiryActionProblem = "missing" | "is_submit_lead_form_tag_action" | "is_qualified_lead_action" | null;

export function enquiryConfig(env: NodeJS.ProcessEnv = process.env): EnquiryConfig {
  const base = qualifiedLeadConfig(env);
  const id = (env[ENQUIRY.conversionActionIdVar] ?? "").replace(/\D/g, "");
  return { customerId: base.customerId, loginCustomerId: base.loginCustomerId, conversionActionId: id === "" ? null : id };
}

/** Why the configured action cannot be uploaded to, or null when it can. */
export function enquiryActionProblem(config: EnquiryConfig, env: NodeJS.ProcessEnv = process.env): EnquiryActionProblem {
  if (!config.conversionActionId) return "missing";
  if (config.conversionActionId === QUALIFIED_LEAD.submitLeadFormConversionActionId) return "is_submit_lead_form_tag_action";
  if (config.conversionActionId === qualifiedLeadConfig(env).conversionActionId) return "is_qualified_lead_action";
  return null;
}

export function enquiryDestination(config: EnquiryConfig): DataManagerDestination {
  if (!config.conversionActionId) throw new Error(`${ENQUIRY.conversionActionIdVar} is not set.`);
  return {
    operatingAccount: { accountType: "GOOGLE_ADS", accountId: config.customerId },
    ...(config.loginCustomerId ? { loginAccount: { accountType: "GOOGLE_ADS" as const, accountId: config.loginCustomerId } } : {}),
    productDestinationId: config.conversionActionId,
  };
}

export function transactionIdForLead(leadId: string): string {
  return `wsa-enquiry-lead-${leadId}`;
}

/** Pipedrive Lead ids are UUIDs. Anything else is not a Lead this code can key. */
export function leadId(lead: Record<string, unknown>): string | null {
  const id = lead.id;
  return typeof id === "string" && /^[0-9a-f-]{8,64}$/i.test(id) ? id : null;
}

/**
 * The event for one enquiry, or the reason there is none.
 * Pure: reads the raw Lead and Person, writes nothing, calls nothing.
 */
export function buildEnquiryEvent(lead: Record<string, unknown>, person: Record<string, unknown> | null): BuildResult {
  const id = leadId(lead);
  return buildClickConversionEvent("lead", lead, person, id ? transactionIdForLead(id) : null);
}
