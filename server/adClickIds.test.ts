import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
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

/**
 * 23 November 2026. Tim Hunt's Pipedrive forms submit straight to Pipedrive,
 * so the click identifier has to be offered to them in the page. Pipedrive's
 * loader reads `window.pd_webform` and passes on strings, numbers and
 * booleans only (client/src/lib/adClickIds.ts, HOW).
 */
describe("handing the click IDs to Pipedrive's embedded forms", () => {
  const win = () => window as unknown as { pd_webform?: Record<string, unknown> };

  it("offers every stored value, as a string, under the name a hidden field asks for", async () => {
    const { exposeAdClickIdsToPipedriveForms } = await import("../client/src/lib/adClickIds");
    stubWindow("?gclid=test-gclid&gbraid=test-gbraid&wbraid=test-wbraid&utm_source=google&utm_campaign=autumn");

    captureAdClickIds();
    exposeAdClickIdsToPipedriveForms();

    expect(win().pd_webform).toEqual({
      gclid: "test-gclid",
      gbraid: "test-gbraid",
      wbraid: "test-wbraid",
      utm_source: "google",
      utm_campaign: "autumn",
    });
  });

  it("offers the click ID from an earlier visit, when today's address carries none", async () => {
    const { exposeAdClickIdsToPipedriveForms } = await import("../client/src/lib/adClickIds");
    stubWindow("", { wsa_ad_click_ids: JSON.stringify({ gclid: "first-gclid" }) });

    captureAdClickIds();
    exposeAdClickIdsToPipedriveForms();

    expect(win().pd_webform).toEqual({ gclid: "first-gclid" });
  });

  it("sets nothing for a visitor who did not come from an ad", async () => {
    const { exposeAdClickIdsToPipedriveForms } = await import("../client/src/lib/adClickIds");
    stubWindow("");

    exposeAdClickIdsToPipedriveForms();

    expect(win().pd_webform).toBeUndefined();
  });

  it("keeps anything already on pd_webform, and drops values that are not a plain short string", async () => {
    const { exposeAdClickIdsToPipedriveForms } = await import("../client/src/lib/adClickIds");
    stubWindow("", {
      wsa_ad_click_ids: JSON.stringify({
        gclid: "real-gclid",
        gbraid: "",
        wbraid: { nested: true },
        utm_source: "x".repeat(513),
        not_ours: "ignored",
      }),
    });
    win().pd_webform = { plan: "kept" };

    exposeAdClickIdsToPipedriveForms();

    expect(win().pd_webform).toEqual({ plan: "kept", gclid: "real-gclid" });
  });

  it("does nothing outside the browser, or when storage is blocked", async () => {
    const { exposeAdClickIdsToPipedriveForms } = await import("../client/src/lib/adClickIds");
    vi.stubGlobal("window", undefined);
    expect(() => exposeAdClickIdsToPipedriveForms()).not.toThrow();

    const blocked: Record<string, unknown> = {
      location: { search: "" },
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    };
    vi.stubGlobal("window", blocked);
    exposeAdClickIdsToPipedriveForms();
    expect(blocked.pd_webform).toBeUndefined();
  });

  it("runs once at start-up, after the landing address is read and before any page renders", () => {
    const main = readFileSync("client/src/main.tsx", "utf8");
    const capture = main.indexOf("\ncaptureAdClickIds();");
    const expose = main.indexOf("\nexposeAdClickIdsToPipedriveForms();");
    expect(capture).toBeGreaterThan(-1);
    expect(expose).toBeGreaterThan(capture);
    expect(main.indexOf("createRoot(", expose)).toBeGreaterThan(expose);
  });
});
