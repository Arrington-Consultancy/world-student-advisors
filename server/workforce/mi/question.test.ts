import { describe, expect, it } from "vitest";
import { isActionRequest, parseInformationQuestion } from "./question";

/**
 * Tom Arrington, 11 September 2026. The class of question, not one
 * sentence: management information about records WSA already holds, asked
 * the way staff actually type it, including misspellings and shorthand.
 * Each must be read as a question with a measure, a subject, the filters
 * that were stated, and a period; and an action request must not be.
 */
const NOW = new Date("2026-09-11T12:00:00Z");

describe("the six questions Tom set", () => {
  it("how many cold leads have we had from the website in the last 12 months", () => {
    const q = parseInformationQuestion("How many cold leads have we had from the website in the last 12 months?", NOW)!;
    expect(q).not.toBeNull();
    expect(q.measure).toBe("count");
    expect(q.subject).toBe("leads");
    expect(q.channel).toBe("website");
    expect(q.period.label).toBe("the last 12 months");
    expect(q.period.assumed).toBe(false);
    expect(q.period.from.toISOString().slice(0, 10)).toBe("2025-09-11");
  });
  it("how many enquiries came from Nigeria last quarter", () => {
    const q = parseInformationQuestion("How many enquiries came from Nigeria last quarter?", NOW)!;
    expect(q.measure).toBe("count");
    expect(q.subject).toBe("enquiries");
    expect(q.country).toBe("Nigeria");
    expect(q.period.label).toBe("last quarter");
    expect(q.period.from.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(q.period.to.toISOString().slice(0, 10)).toBe("2026-07-01");
  });
  it("how many students went cold after first contact", () => {
    const q = parseInformationQuestion("How many students went cold after first contact?", NOW)!;
    expect(q.measure).toBe("count");
    expect(q.subject).toBe("students");
    expect(q.status).toBe("cold");
    expect(q.period.assumed).toBe(true);
  });
  it("which source produced the most enquiries this year", () => {
    const q = parseInformationQuestion("Which source produced the most enquiries this year?", NOW)!;
    expect(q.measure).toBe("ranking");
    expect(q.subject).toBe("enquiries");
    expect(q.groupBy).toBe("channel");
    expect(q.period.label).toBe("2026 so far");
  });
  it("have website enquiries increased since the new site went live", () => {
    const q = parseInformationQuestion("Have website enquiries increased since the new site went live?", NOW)!;
    expect(q.measure).toBe("trend");
    expect(q.subject).toBe("enquiries");
    expect(q.channel).toBe("website");
    expect(q.trendAnchor).toBe("since_new_site");
  });
  it("how many referrals did we get from partners", () => {
    const q = parseInformationQuestion("How many referrals did we get from partners?", NOW)!;
    expect(q.measure).toBe("count");
    expect(q.subject).toBe("referrals");
    expect(q.channel).toBe("partner");
  });
});

describe("messy spelling and shorthand", () => {
  it.each([
    ["how many cold leads frm the website last 12 mnths", "leads", "website"],
    ["cold leads website last 12 months how many", "leads", "website"],
    ["no. of enquires from nigeria last quater", "enquiries", null],
    ["how many studnts went cold after 1st contact", "students", null],
    ["which source gave us most enquiries this yr", "enquiries", null],
    ["web enquiries up since new site?", "enquiries", "website"],
    ["how many partner referrals did we get", "referrals", "partner"],
  ])("%s", (text, subject, channel) => {
    const q = parseInformationQuestion(text, NOW);
    expect(q, text).not.toBeNull();
    expect(q!.subject).toBe(subject);
    if (channel) expect(q!.channel).toBe(channel);
  });
  it("reads 'quater' as last quarter and 'yr' as this year", () => {
    expect(parseInformationQuestion("enquiries from nigeria last quater, how many", NOW)!.period.label).toBe("last quarter");
    expect(parseInformationQuestion("which source produced most enquiries this yr", NOW)!.period.label).toBe("2026 so far");
  });
});

describe("information versus action", () => {
  it("a request to produce leads is an action, not a question", () => {
    expect(isActionRequest("give me 50 cold leads")).toBe(true);
    expect(isActionRequest("find me some cold leads in Kenya")).toBe(true);
    expect(isActionRequest("pull a list of leads for the January intake")).toBe(true);
    expect(parseInformationQuestion("give me 50 cold leads", NOW)).toBeNull();
    // An action request that happens to contain a counting word is still an
    // action. Without the information-versus-action guard this would parse.
    expect(isActionRequest("give me the total leads list to call this week")).toBe(true);
    expect(parseInformationQuestion("give me the total leads list to call this week", NOW)).toBeNull();
    expect(parseInformationQuestion("pull all website enquiries so I can count them", NOW)).toBeNull();
  });
  it("a question about records is information even when it uses 'give me'", () => {
    expect(isActionRequest("give me the number of leads we had last month")).toBe(false);
    expect(parseInformationQuestion("give me the number of leads we had last month", NOW)!.measure).toBe("count");
  });
  it("a sentence with no measure or subject is not an information question", () => {
    expect(parseInformationQuestion("is this application ready to send", NOW)).toBeNull();
    expect(parseInformationQuestion("draft a post about the January intake", NOW)).toBeNull();
  });
});
