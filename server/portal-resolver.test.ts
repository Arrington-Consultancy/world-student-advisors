import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./pipedrive-read", () => ({
  getOpenDealForPerson: vi.fn(),
  getOpenLeadForPerson: vi.fn(),
}));

const { getOpenDealForPerson, getOpenLeadForPerson } = await import("./pipedrive-read");
const { resolvePortalDashboard } = await import("./portal-resolver");

const mockedGetOpenDealForPerson = vi.mocked(getOpenDealForPerson);
const mockedGetOpenLeadForPerson = vi.mocked(getOpenLeadForPerson);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolvePortalDashboard — read-time Person -> Lead/Deal resolution", () => {
  it("prefers an open Deal over an open Lead when both exist", async () => {
    mockedGetOpenDealForPerson.mockResolvedValue({ id: 1, stageId: 18, ownerId: 25633433, updateTime: "2026-08-01" });
    mockedGetOpenLeadForPerson.mockResolvedValue({ id: "lead-uuid", ownerId: 25633444 });

    const result = await resolvePortalDashboard(42);

    expect(result).toEqual({
      state: "resolved",
      stageLabel: "Application Preparation",
      nextAction: "Finalising your application",
      position: 3,
      counsellor: "Glenice Owino",
    });
    expect(mockedGetOpenLeadForPerson).not.toHaveBeenCalled();
  });

  it("falls back to the open Lead's generic pre-conversion state when no Deal exists", async () => {
    mockedGetOpenDealForPerson.mockResolvedValue(null);
    mockedGetOpenLeadForPerson.mockResolvedValue({ id: "lead-uuid", ownerId: 25633455 });

    const result = await resolvePortalDashboard(42);

    expect(result).toEqual({
      state: "resolved",
      stageLabel: "Getting to know you",
      nextAction: "Your counsellor is learning about your goals and options",
      position: 0,
      counsellor: "Sarafina Kihumbu",
    });
  });

  it("returns no_record — a valid state, not an error — when neither a Deal nor a Lead exists", async () => {
    mockedGetOpenDealForPerson.mockResolvedValue(null);
    mockedGetOpenLeadForPerson.mockResolvedValue(null);

    const result = await resolvePortalDashboard(42);

    expect(result).toEqual({ state: "no_record" });
  });

  it("returns pipedrive_unavailable, not a thrown error, when the Deal read fails", async () => {
    mockedGetOpenDealForPerson.mockRejectedValue(new Error("Pipedrive API error (500) on /persons/42/deals"));

    const result = await resolvePortalDashboard(42);

    expect(result).toEqual({ state: "pipedrive_unavailable" });
  });

  it("returns pipedrive_unavailable when the Lead read fails after no Deal was found", async () => {
    mockedGetOpenDealForPerson.mockResolvedValue(null);
    mockedGetOpenLeadForPerson.mockRejectedValue(new Error("Pipedrive API error (500) on /leads"));

    const result = await resolvePortalDashboard(42);

    expect(result).toEqual({ state: "pipedrive_unavailable" });
  });

  it("omits the counsellor when the Deal owner does not resolve to a known WSA staff account", async () => {
    mockedGetOpenDealForPerson.mockResolvedValue({ id: 1, stageId: 20, ownerId: 999999, updateTime: "2026-08-01" });

    const result = await resolvePortalDashboard(42);

    expect(result).toMatchObject({ state: "resolved", counsellor: null });
  });

  it("omits the counsellor when the Deal owner is unset", async () => {
    mockedGetOpenDealForPerson.mockResolvedValue({ id: 1, stageId: 20, ownerId: null, updateTime: "2026-08-01" });

    const result = await resolvePortalDashboard(42);

    expect(result).toMatchObject({ state: "resolved", counsellor: null });
  });

  it("falls back to the safe generic stage display for an unmapped stage_id", async () => {
    mockedGetOpenDealForPerson.mockResolvedValue({ id: 1, stageId: 999, ownerId: 25629968, updateTime: "2026-08-01" });

    const result = await resolvePortalDashboard(42);

    expect(result).toMatchObject({ state: "resolved", stageLabel: "In progress", position: 0, counsellor: "Tim Hunt" });
  });
});
