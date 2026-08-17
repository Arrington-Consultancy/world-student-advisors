import { afterEach, describe, expect, it, vi } from "vitest";
import { captureAdClickIds, getStoredAdClickIds } from "../client/src/lib/adClickIds";

function stubWindow(search: string, initialStorage: Record<string, string> = {}) {
  const storage = new Map(Object.entries(initialStorage));

  vi.stubGlobal("window", {
    location: { search },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });

  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Google Ads click-ID persistence", () => {
  it("captures a GCLID from the landing URL", () => {
    stubWindow("?gclid=test-gclid-123");

    captureAdClickIds();

    expect(getStoredAdClickIds()).toEqual({ gclid: "test-gclid-123" });
  });

  it("preserves the original GCLID for the session", () => {
    stubWindow("?gclid=second-gclid", {
      wsa_ad_click_ids: JSON.stringify({ gclid: "first-gclid" }),
    });

    captureAdClickIds();

    expect(getStoredAdClickIds()).toEqual({ gclid: "first-gclid" });
  });

  it("does not overwrite an existing GCLID with blank or missing data", () => {
    stubWindow("?gclid=", {
      wsa_ad_click_ids: JSON.stringify({ gclid: "first-gclid" }),
    });

    captureAdClickIds();

    expect(getStoredAdClickIds()).toEqual({ gclid: "first-gclid" });
  });

  it("captures click IDs and UTM values from the landing URL", () => {
    stubWindow(
      "?gclid=test-gclid&gbraid=test-gbraid&wbraid=test-wbraid&utm_source=google&utm_medium=cpc&utm_campaign=autumn&utm_term=study&utm_content=hero",
    );

    captureAdClickIds();

    expect(getStoredAdClickIds()).toEqual({
      gclid: "test-gclid",
      gbraid: "test-gbraid",
      wbraid: "test-wbraid",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "autumn",
      utm_term: "study",
      utm_content: "hero",
    });
  });

  it("preserves first-touch UTM values for the session", () => {
    stubWindow("?utm_source=bing&utm_medium=organic&utm_campaign=later", {
      wsa_ad_click_ids: JSON.stringify({
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "first",
      }),
    });

    captureAdClickIds();

    expect(getStoredAdClickIds()).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "first",
    });
  });
});
