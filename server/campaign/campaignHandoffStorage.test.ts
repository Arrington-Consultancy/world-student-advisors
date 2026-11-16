import { afterEach, describe, expect, it, vi } from "vitest";
import { recallCampaign, rememberCampaign } from "../../client/src/lib/campaignHandoff";

/**
 * The second defence for the campaign marker. The authoritative one is the
 * OAuth state round trip, covered in speakToJulietEndToEnd.test.ts; this one
 * keeps the marker for the tab so that any other way of leaving the form and
 * coming back keeps it too, and so that it cannot take a value nobody
 * authorised. It must never throw, whatever the browser does with storage,
 * because a student in a private window still has to be able to submit.
 */
function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
  return store;
}

function stubBlockedStorage() {
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: () => { throw new Error("storage is blocked"); },
      setItem: () => { throw new Error("storage is blocked"); },
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("remembering the campaign for the tab", () => {
  it("remembers a real campaign and gives it back", () => {
    stubStorage();
    rememberCampaign("speak-to-juliet");
    expect(recallCampaign()).toBe("speak-to-juliet");
  });

  it("gives back nothing when the journey had no campaign", () => {
    stubStorage();
    expect(recallCampaign()).toBe("");
  });

  it("stores nothing a visitor can craft", () => {
    const store = stubStorage();
    for (const crafted of ["", "unknown-campaign", "../admin", "SPEAK-TO-JULIET", "speak-to-juliet "]) {
      rememberCampaign(crafted);
      expect(store.size, `"${crafted}" must not be stored`).toBe(0);
      expect(recallCampaign()).toBe("");
    }
  });

  it("gives back nothing if something else wrote a value that is not on the closed list", () => {
    stubStorage({ wsa_campaign: "../admin" });
    expect(recallCampaign()).toBe("");
  });

  it("never throws when storage is blocked, as in a private window", () => {
    stubBlockedStorage();
    expect(() => rememberCampaign("speak-to-juliet")).not.toThrow();
    expect(recallCampaign()).toBe("");
  });
});
