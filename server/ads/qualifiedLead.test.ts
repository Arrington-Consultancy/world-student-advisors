import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  ATTRIBUTION_FIELD_KEYS, QUALIFIED_LEAD, buildQualifiedLeadEvent, identifierSummary, pipedriveTimeToIso,
  qualifiedLeadConfig, qualifiedLeadDestination, transactionIdForDeal,
} from "./qualifiedLead";
import { sha256Hex } from "./googleDataManager";

const K = ATTRIBUTION_FIELD_KEYS;
const DEAL = { id: 24, title: "Student", add_time: "2026-09-10 14:22:11", person_id: { value: 369 }, [K.deal.gclid]: "Cj0KCQjw-deal-click" };
const PERSON = { id: 369, email: [{ value: "Vivian.Onuh@Gmail.com", primary: true }], phone: [{ value: "+234 818 204 9068", primary: true }], [K.person.gdprConsent]: 105 };

describe("the Pipedrive attribution keys are the ones the signup path writes", () => {
  it("match server/pipedrive.ts exactly, so the reader and the writer cannot drift apart", () => {
    const src = readFileSync(new URL("../pipedrive.ts", import.meta.url), "utf8");
    const pf = src.slice(src.indexOf("const PF = {"), src.indexOf("};", src.indexOf("const PF = {")));
    const lf = src.slice(src.indexOf("const LF = {"), src.indexOf("};", src.indexOf("const LF = {")));
    for (const [name, key] of Object.entries(K.person)) expect(pf).toContain(`${name}: "${key}"`);
    for (const [name, key] of Object.entries(K.deal)) expect(lf).toContain(`${name}: "${key}"`);
  });
});

describe("destination and configuration", () => {
  it("targets the live WSA account and the Qualified Lead action by default, digits only", () => {
    const c = qualifiedLeadConfig({});
    expect(c).toEqual({ customerId: "5165838785", loginCustomerId: null, conversionActionId: "7726096949" });
    expect(qualifiedLeadDestination(c)).toEqual({ operatingAccount: { accountType: "GOOGLE_ADS", accountId: "5165838785" }, productDestinationId: "7726096949" });
    expect(QUALIFIED_LEAD.submitLeadFormConversionActionId).toBe("7724073976");
  });
  it("accepts a formatted override and a manager login account", () => {
    const c = qualifiedLeadConfig({ GOOGLE_ADS_CUSTOMER_ID: "516-583-8785", GOOGLE_ADS_LOGIN_CUSTOMER_ID: "123-456-7890", GOOGLE_ADS_QUALIFIED_LEAD_CONVERSION_ACTION_ID: "99" });
    expect(c).toEqual({ customerId: "5165838785", loginCustomerId: "1234567890", conversionActionId: "99" });
    expect(qualifiedLeadDestination(c).loginAccount).toEqual({ accountType: "GOOGLE_ADS", accountId: "1234567890" });
  });
});

describe("timestamps", () => {
  it("reads Pipedrive's UTC wall-clock form and RFC 3339 forms, and refuses anything else", () => {
    expect(pipedriveTimeToIso("2026-09-10 14:22:11")).toBe("2026-09-10T14:22:11.000Z");
    expect(pipedriveTimeToIso("2026-09-10T14:22:11Z")).toBe("2026-09-10T14:22:11.000Z");
    expect(pipedriveTimeToIso("2026-09-10T15:22:11+01:00")).toBe("2026-09-10T14:22:11.000Z");
    expect(pipedriveTimeToIso("10/09/2026")).toBeNull();
    expect(pipedriveTimeToIso(null)).toBeNull();
  });
});

describe("buildQualifiedLeadEvent", () => {
  it("sends the click id, the deal creation time, a deal-keyed transaction id and hashed consented contact keys", () => {
    const r = buildQualifiedLeadEvent(DEAL, PERSON);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.personId).toBe(369);
    expect(r.event).toEqual({
      transactionId: "wsa-qualified-lead-deal-24",
      eventTimestamp: "2026-09-10T14:22:11.000Z",
      adIdentifiers: { gclid: "Cj0KCQjw-deal-click" },
      eventSource: "WEB",
      userData: { userIdentifiers: [{ emailAddress: sha256Hex("vivianonuh@gmail.com") }, { phoneNumber: sha256Hex("+2348182049068") }] },
      consent: { adUserData: "CONSENT_GRANTED", adPersonalization: "CONSENT_GRANTED" },
    });
    expect(identifierSummary(r.identifiers)).toBe("gclid,email,phone");
    expect(JSON.stringify(r.event)).not.toContain("Vivian");
    expect(JSON.stringify(r.event)).not.toContain("@");
  });

  it("falls back to the person's click identifiers when the deal carries none", () => {
    const r = buildQualifiedLeadEvent({ ...DEAL, [K.deal.gclid]: undefined }, { ...PERSON, [K.person.wbraid]: "wbraid-from-person" });
    expect(r.ok && r.event.adIdentifiers).toEqual({ wbraid: "wbraid-from-person" });
    expect(identifierSummary(r.identifiers)).toBe("wbraid,email,phone");
  });

  it("sends no contact keys when the person recorded no consent, click identifier only", () => {
    const r = buildQualifiedLeadEvent(DEAL, { ...PERSON, [K.person.gdprConsent]: 106 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.userData).toBeUndefined();
    expect(r.event.consent).toBeUndefined();
    expect(identifierSummary(r.identifiers)).toBe("gclid");
  });

  it("sends nothing for a deal with no Google click identifier anywhere, and says why", () => {
    const r = buildQualifiedLeadEvent({ ...DEAL, [K.deal.gclid]: undefined }, PERSON);
    expect(r).toMatchObject({ ok: false, reason: "no_google_click_identifier", personId: 369 });
    expect(identifierSummary(r.identifiers)).toBe("email,phone");
  });

  it("sends nothing for a deal whose creation time cannot be read, or that has no id", () => {
    expect(buildQualifiedLeadEvent({ ...DEAL, add_time: "yesterday" }, PERSON)).toMatchObject({ ok: false, reason: "deal_add_time_unreadable" });
    expect(buildQualifiedLeadEvent({ ...DEAL, id: undefined }, PERSON)).toMatchObject({ ok: false, reason: "deal_has_no_id" });
  });

  it("copes with a missing person and a numeric person_id", () => {
    const r = buildQualifiedLeadEvent({ ...DEAL, person_id: 12 }, null);
    expect(r.ok).toBe(true);
    expect(r.personId).toBe(12);
    if (r.ok) expect(r.event.userData).toBeUndefined();
    expect(transactionIdForDeal(24)).toBe("wsa-qualified-lead-deal-24");
  });
});
