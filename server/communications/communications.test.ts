import { describe, expect, it } from "vitest";
import { WSA_CHANNELS, CHANNELS_CHECKED_AND_NOT_FOUND, getChannel } from "./channels";
import { buildCommunicationsView } from "./access";
import type { StaffAccessProfile } from "../access/accessControl";

const NOW = new Date("2026-08-30T12:00:00Z");

function profile(over: Partial<StaffAccessProfile> = {}): StaffAccessProfile {
  return {
    staffUserId: 1,
    baseAccessLevel: 1,
    functionalScopes: ["executive"],
    caseScope: "organisation",
    actionPermissions: ["read"],
    sensitiveOverlays: [],
    temporaryGrants: [],
    status: "active",
    teamId: null,
    assignedByStaffUserId: null,
    assignedAt: null,
    assignmentReason: null,
    ...over,
  };
}

describe("the channel register records only verified WSA channels", () => {
  it("every channel carries the evidence it was transcribed from", () => {
    for (const c of WSA_CHANNELS) {
      expect(c.evidence.length).toBeGreaterThan(20);
    }
  });

  it("no channel is presented as connected — none has an authorised integration today", () => {
    for (const c of WSA_CHANNELS) {
      expect(c.integration).not.toBe("connected");
    }
  });

  it("records the platforms searched for and not found, so their absence is explained", () => {
    for (const name of ["TikTok", "X (Twitter)", "Google Business Profile"]) {
      expect(CHANNELS_CHECKED_AND_NOT_FOUND).toContain(name);
    }
  });

  it("does not include any platform that was not found as WSA-owned", () => {
    const ids = WSA_CHANNELS.map(c => c.id.toLowerCase()).join(" ");
    for (const absent of ["tiktok", "twitter", "threads", "pinterest", "snapchat"]) {
      expect(ids).not.toContain(absent);
    }
  });

  it("WhatsApp is not assumed to be integrable — its own evidence says so", () => {
    expect(getChannel("whatsapp").integration).toBe("authorisation_required");
    expect(getChannel("whatsapp").evidence).toContain("NOT established");
  });

  it("email is honest that its connector is unconfigured rather than connected", () => {
    expect(getChannel("wsa_email").integration).toBe("connector_unconfigured");
  });
});

describe("seeing a channel is never authority over it", () => {
  it("a read-only executive sees channels but may publish to none of them", () => {
    const view = buildCommunicationsView(profile(), NOW);
    expect(view.channels.length).toBeGreaterThan(0);
    for (const c of view.channels) {
      for (const a of c.actions) {
        if (a.permission === "external_send" || a.permission === "delete_destructive" || a.permission === "access_admin") {
          expect(a.allowed).toBe(false);
        }
      }
    }
  });

  it("even holding external_send does not allow publishing, because no integration exists", () => {
    // The dangerous case: a broad permission set must still not imply a
    // capability WSA does not have.
    const broad = profile({
      actionPermissions: ["read", "create", "update", "external_send", "delete_destructive", "access_admin"],
      functionalScopes: ["executive", "marketing_seo", "operations", "enquiry_triage", "pre_arrival_student_success"],
    });
    const view = buildCommunicationsView(broad, NOW);
    const sends = view.channels.flatMap(c => c.actions.filter(a => a.permission === "external_send"));
    expect(sends.length).toBeGreaterThan(0);
    for (const a of sends) {
      expect(a.allowed).toBe(false);
      expect(a.blockedReason).toContain("no authorised integration");
    }
  });

  it("reports the permission reason first when the member lacks the permission entirely", () => {
    const view = buildCommunicationsView(profile(), NOW);
    const send = view.channels.flatMap(c => c.actions).find(a => a.permission === "external_send");
    expect(send?.allowed).toBe(false);
    expect(send?.blockedReason).not.toContain("no authorised integration");
  });

  it("a suspended account sees nothing at all", () => {
    const view = buildCommunicationsView(profile({ status: "suspended" }), NOW);
    expect(view.channels).toHaveLength(0);
    expect(view.withheldCount).toBe(WSA_CHANNELS.length);
  });

  it("a channel whose content is NOT public is omitted entirely when the scope is not held", () => {
    // Marketing holds neither the operations scope (email) nor enquiry
    // triage (WhatsApp), and both carry non-public content, so both are
    // withheld. The public pages stay visible, which is the distinction
    // this module turns on: a WSA LinkedIn page is public to the whole
    // internet, a mailbox is not.
    const narrow = profile({ functionalScopes: ["marketing_seo"] });
    const view = buildCommunicationsView(narrow, NOW);
    const payload = JSON.stringify(view);

    expect(view.withheldCount).toBe(2);

    // Withheld channels are counted, never surfaced. Asserted on ids and
    // on details unique to those channels rather than on the bare word
    // "WhatsApp", which legitimately appears in the Events entry's own
    // description of where WSA publishes sessions.
    const ids = view.channels.map(c => c.id);
    expect(ids).not.toContain("wsa_email");
    expect(ids).not.toContain("whatsapp");
    expect(payload).not.toContain("Microsoft 365 tenant");
    expect(payload).not.toContain("wa.me");

    // The public ones are still there, including the alumni page.
    expect(view.channels.map(c => c.id)).toContain("facebook_friendship_society");
  });

  it("opening a verified external channel is permitted for a reader — that is the point of the area", () => {
    const marketing = profile({ functionalScopes: ["marketing_seo"] });
    const view = buildCommunicationsView(marketing, NOW);
    const linkedin = view.channels.find(c => c.id === "linkedin");
    expect(linkedin).toBeDefined();
    expect(linkedin?.externalUrl).toBe("https://www.linkedin.com/company/world-student-advisors/");
    expect(linkedin?.actions.find(a => a.label === "View the channel")?.allowed).toBe(true);
  });
});
