import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getOpenDealForPerson, getOpenLeadForPerson } from "./pipedrive-read";

function jsonResponse(data: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

describe("pipedrive-read — read-only Pipedrive access for the portal", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getOpenDealForPerson", () => {
    it("reads the owner from user_id (Deal's real field key), not owner_id", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        jsonResponse({
          data: [{ id: 85, stage_id: 17, user_id: { id: 25633433 }, update_time: "2026-08-08 07:30:20" }],
        })
      );

      const result = await getOpenDealForPerson(8455);

      expect(result).toEqual({ id: 85, stageId: 17, ownerId: 25633433, updateTime: "2026-08-08 07:30:20" });
    });

    it("returns the most recently updated Deal when several are open", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        jsonResponse({
          data: [
            { id: 1, stage_id: 16, user_id: { id: 1 }, update_time: "2026-01-01 00:00:00" },
            { id: 2, stage_id: 17, user_id: { id: 2 }, update_time: "2026-08-01 00:00:00" },
          ],
        })
      );

      const result = await getOpenDealForPerson(8455);

      expect(result?.id).toBe(2);
    });

    it("returns null when the person has no open Deal", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));

      const result = await getOpenDealForPerson(8455);

      expect(result).toBeNull();
    });

    it("throws on a Pipedrive API error, letting the resolver catch it", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "server error" }, false));

      await expect(getOpenDealForPerson(8455)).rejects.toThrow(/Pipedrive API error/);
    });
  });

  describe("getOpenLeadForPerson", () => {
    it("reads the owner from owner_id (Lead's real field key)", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        jsonResponse({
          data: [{ id: "lead-uuid", owner_id: { id: 25633455 }, is_archived: false, update_time: "2026-08-01 00:00:00" }],
        })
      );

      const result = await getOpenLeadForPerson(293);

      expect(result).toEqual({ id: "lead-uuid", ownerId: 25633455 });
    });

    it("filters out archived Leads", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        jsonResponse({
          data: [{ id: "old-lead", owner_id: { id: 1 }, is_archived: true, update_time: "2026-01-01 00:00:00" }],
        })
      );

      const result = await getOpenLeadForPerson(293);

      expect(result).toBeNull();
    });

    it("returns null when the person has no Lead at all", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));

      const result = await getOpenLeadForPerson(293);

      expect(result).toBeNull();
    });
  });
});
