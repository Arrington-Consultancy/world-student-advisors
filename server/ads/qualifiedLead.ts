/**
 * What WSA sends Google when a lead is qualified, and when.
 *
 * THE EVENT. A Qualified Lead is a Pipedrive Lead that has become a Deal.
 * That is the controlled position, not an invention here: the Credibility
 * Preparation Dashboard record of 14 September 2026 gives the journey as
 * "LEAD, CLAUDIA QUALIFIES, STUDENT / DEAL" and states that a Lead becomes a
 * Student and a Pipedrive Deal only when course, university, finance and
 * commitment are all established (server/operating/studentJourney.ts,
 * QUALIFICATION_GATES). Google Ads Brief v2.1 section 22 asks for "did the
 * counsellor qualify it" to reach Google, and section 21 for conversion
 * signals based on lead QUALITY rather than form completion. The moment a
 * counsellor converts the Lead to a Deal is therefore the qualification
 * event, and the Deal's creation time is the conversion time.
 *
 * THE DESTINATION. Google Ads customer 516-583-8785, conversion action
 * "Qualified Lead", id 7726096949, resource
 * customers/5165838785/conversionActions/7726096949. Both were confirmed by
 * Google to WSA on 16 September 2026 and are constants here, overridable by
 * environment only so a test or a future account move needs no code change.
 *
 * WHAT IS SENT. The Google click identifier (gclid, gbraid or wbraid) that
 * the website captured at the ad click and wrote to the Lead and the Person;
 * the Deal's creation time in UTC; a transaction id built from the Deal id so
 * Google deduplicates a repeat; and, where the student recorded consent on
 * the signup form, the SHA-256 of their normalised email and phone as the
 * first-party match keys enhanced conversions for leads is built on.
 *
 * WHAT IS NOT SENT, AND WHEN NOTHING IS. No name, no case content, no field
 * beyond those above. A Deal with no Google click identifier on the Deal or
 * its Person is not a Google Ads lead, and nothing is sent for it: sending a
 * student's hashed contact details to Google for a lead that did not come
 * from Google would be data used for no purpose. Every such decision is
 * recorded with its reason and is visible in the acceptance report.
 */
import { emailIdentifier, phoneIdentifier, type DataManagerDestination, type DataManagerEvent, type UserIdentifier } from "./googleDataManager";

export const QUALIFIED_LEAD = Object.freeze({
  googleAdsCustomerId: "5165838785",
  conversionActionId: "7726096949",
  conversionActionName: "Qualified Lead",
  /** The website's own conversion, fired by gtag on a successful signup. Recorded for the register; not uploaded here. */
  submitLeadFormConversionActionId: "7724073976",
  qualificationEvent: "Pipedrive Lead converted to a Deal (Deal creation), per the Credibility Preparation Dashboard record of 14 September 2026 and Google Ads Brief v2.1 sections 21 and 22.",
});

/**
 * Pipedrive custom field keys carrying Google attribution. These are the
 * live WSA account's keys, created 17 August 2026 and used by the signup
 * path in server/pipedrive.ts; a test holds the two files to the same
 * values so they cannot drift apart. Lead and Deal share one key set.
 */
export const ATTRIBUTION_FIELD_KEYS = Object.freeze({
  person: Object.freeze({
    gclid: "d970d238a2fb0326527b340d0277167043f53348",
    gbraid: "89385b2ee447e241a5166e5d0dc80adadbe52cb3",
    wbraid: "19c0ef543f99a042852b58e2bd414361fb6467db",
    gdprConsent: "507b7011ec6784002524c02f940ef8610059cd1e",
  }),
  deal: Object.freeze({
    gclid: "19e66a5b2b1da9bd2d84c0ac33c36bb87204967a",
    gbraid: "2b218a5930dbb5e1a853137737ed6fdeaecf468f",
    wbraid: "0a1191cb3cbab21347e92f2fae140eb52e64a2d4",
  }),
});

/** The Pipedrive option id the signup form writes for "consent given". */
export const PIPEDRIVE_GDPR_CONSENT_YES = 105;

export interface QualifiedLeadConfig {
  customerId: string;
  loginCustomerId: string | null;
  conversionActionId: string;
}

export function qualifiedLeadConfig(env: NodeJS.ProcessEnv = process.env): QualifiedLeadConfig {
  const digits = (v: string | undefined, fallback: string) => {
    const d = (v ?? "").replace(/\D/g, "");
    return d === "" ? fallback : d;
  };
  const login = (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "").replace(/\D/g, "");
  return {
    customerId: digits(env.GOOGLE_ADS_CUSTOMER_ID, QUALIFIED_LEAD.googleAdsCustomerId),
    loginCustomerId: login === "" ? null : login,
    conversionActionId: digits(env.GOOGLE_ADS_QUALIFIED_LEAD_CONVERSION_ACTION_ID, QUALIFIED_LEAD.conversionActionId),
  };
}

export function qualifiedLeadDestination(config: QualifiedLeadConfig = qualifiedLeadConfig()): DataManagerDestination {
  return {
    operatingAccount: { accountType: "GOOGLE_ADS", accountId: config.customerId },
    ...(config.loginCustomerId ? { loginAccount: { accountType: "GOOGLE_ADS" as const, accountId: config.loginCustomerId } } : {}),
    productDestinationId: config.conversionActionId,
  };
}

export function transactionIdForDeal(dealId: number | string): string {
  return `wsa-qualified-lead-deal-${dealId}`;
}

/** Pipedrive's "YYYY-MM-DD HH:MM:SS", which it reports in UTC, to RFC 3339. */
export function pipedriveTimeToIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) return null;
  const iso = m[3] ? `${m[1]}T${m[2]}${m[3].length === 5 ? `${m[3].slice(0, 3)}:${m[3].slice(3)}` : m[3]}` : `${m[1]}T${m[2]}Z`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export interface IdentifierFlags {
  gclid: boolean;
  gbraid: boolean;
  wbraid: boolean;
  email: boolean;
  phone: boolean;
  consent: boolean;
}

export type BuildResult =
  | { ok: true; event: DataManagerEvent; identifiers: IdentifierFlags; personId: number | null }
  | { ok: false; reason: string; identifiers: IdentifierFlags; personId: number | null };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function primary(list: unknown): string | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const chosen = (list.find(e => e && typeof e === "object" && (e as { primary?: boolean }).primary === true) ?? list[0]) as { value?: unknown };
  return str(chosen?.value);
}

/** Pipedrive represents a deal's person as a number or as an object carrying value. */
export function dealPersonId(deal: Record<string, unknown>): number | null {
  const p = deal.person_id;
  if (typeof p === "number") return p;
  if (p && typeof p === "object" && typeof (p as { value?: unknown }).value === "number") return (p as { value: number }).value;
  return null;
}

/**
 * The event for one qualified lead, or the reason there is none.
 * Pure: reads the raw Deal and Person, writes nothing, calls nothing.
 */
export function buildQualifiedLeadEvent(deal: Record<string, unknown>, person: Record<string, unknown> | null): BuildResult {
  const personId = dealPersonId(deal);
  const pick = (dealKey: string, personKey: string) => str(deal[dealKey]) ?? (person ? str(person[personKey]) : null);
  const gclid = pick(ATTRIBUTION_FIELD_KEYS.deal.gclid, ATTRIBUTION_FIELD_KEYS.person.gclid);
  const gbraid = pick(ATTRIBUTION_FIELD_KEYS.deal.gbraid, ATTRIBUTION_FIELD_KEYS.person.gbraid);
  const wbraid = pick(ATTRIBUTION_FIELD_KEYS.deal.wbraid, ATTRIBUTION_FIELD_KEYS.person.wbraid);

  const consentRaw = person?.[ATTRIBUTION_FIELD_KEYS.person.gdprConsent];
  const consent = Number(consentRaw) === PIPEDRIVE_GDPR_CONSENT_YES;
  const email = consent ? emailIdentifier(primary(person?.email)) : null;
  const phone = consent ? phoneIdentifier(primary(person?.phone)) : null;

  const identifiers: IdentifierFlags = { gclid: Boolean(gclid), gbraid: Boolean(gbraid), wbraid: Boolean(wbraid), email: Boolean(email), phone: Boolean(phone), consent };

  if (typeof deal.id !== "number") return { ok: false, reason: "deal_has_no_id", identifiers, personId };
  const eventTimestamp = pipedriveTimeToIso(deal.add_time);
  if (!eventTimestamp) return { ok: false, reason: "deal_add_time_unreadable", identifiers, personId };
  if (!gclid && !gbraid && !wbraid) return { ok: false, reason: "no_google_click_identifier", identifiers, personId };

  const userIdentifiers = [email, phone].filter((u): u is UserIdentifier => u !== null);
  const event: DataManagerEvent = {
    transactionId: transactionIdForDeal(deal.id),
    eventTimestamp,
    adIdentifiers: {
      ...(gclid ? { gclid } : {}),
      ...(gbraid ? { gbraid } : {}),
      ...(wbraid ? { wbraid } : {}),
    },
    eventSource: "WEB",
    ...(userIdentifiers.length > 0
      ? { userData: { userIdentifiers }, consent: { adUserData: "CONSENT_GRANTED" as const, adPersonalization: "CONSENT_GRANTED" as const } }
      : {}),
  };
  return { ok: true, event, identifiers, personId };
}

/** "gclid,email,phone": the shape of what was sent, for the record and the report. Never a value. */
export function identifierSummary(flags: IdentifierFlags): string {
  return (["gclid", "gbraid", "wbraid", "email", "phone"] as const).filter(k => flags[k]).join(",") || "none";
}
