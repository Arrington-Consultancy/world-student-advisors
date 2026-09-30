import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";

/**
 * Google Consent Mode v2 for the Google Ads tag (30 September 2026).
 *
 * Between 28 August and 30 September 2026 the tag loaded only after "Accept
 * all", and Google recorded no tag ping and no conversion from about 900
 * paid clicks. These tests pin the replacement: the tag loads on every page
 * with every consent type denied BEFORE the config call, sets no consent
 * update on its own, and switches to granted only through
 * updateGoogleConsent("granted"), which CookieConsent calls for "Accept all".
 * They exercise the module with a minimal fake window/document, since this
 * repo's Vitest runs in a node environment (no real DOM).
 */

const TYPES = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];

function makeFakeDocument() {
  const scripts: Record<string, unknown> = {};
  const head = {
    appendChild: vi.fn((el: any) => {
      scripts[el.id] = el;
    }),
  };
  return {
    getElementById: vi.fn((id: string) => scripts[id] ?? null),
    createElement: vi.fn(() => ({ id: "", async: false, src: "" }) as any),
    head,
    _scripts: scripts,
  };
}

function entries(win: any, kind: string, sub?: string) {
  return (win.dataLayer as unknown[][]).filter(e => e[0] === kind && (sub === undefined || e[1] === sub));
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadGoogleAdsTag", () => {
  it("does nothing outside the browser", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    const { loadGoogleAdsTag, updateGoogleConsent } = await import("../client/src/lib/googleAdsTag");

    expect(() => loadGoogleAdsTag()).not.toThrow();
    expect(() => updateGoogleConsent("granted")).not.toThrow();
  });

  it("pushes a denied consent default for all four types before the config call, then injects gtag.js", async () => {
    const fakeWindow: any = {};
    const fakeDocument = makeFakeDocument();
    vi.stubGlobal("window", fakeWindow);
    vi.stubGlobal("document", fakeDocument);
    const { loadGoogleAdsTag } = await import("../client/src/lib/googleAdsTag");

    loadGoogleAdsTag();

    const dl: unknown[][] = fakeWindow.dataLayer;
    const dflt = entries(fakeWindow, "consent", "default");
    expect(dflt).toHaveLength(1);
    for (const t of TYPES) expect((dflt[0][2] as any)[t]).toBe("denied");
    expect((dflt[0][2] as any).wait_for_update).toBe(500);

    const defaultIndex = dl.indexOf(dflt[0]);
    const configIndex = dl.findIndex(e => e[0] === "config" && e[1] === "AW-946725823");
    expect(configIndex).toBeGreaterThan(defaultIndex);
    expect(dl).toEqual(expect.arrayContaining([["js", expect.any(Date)], ["set", "url_passthrough", true], ["set", "ads_data_redaction", true]]));

    // No update is pushed by the loader itself: only the visitor's choice grants.
    expect(entries(fakeWindow, "consent", "update")).toHaveLength(0);

    expect(fakeDocument.createElement).toHaveBeenCalledWith("script");
    expect(fakeDocument.head.appendChild).toHaveBeenCalledTimes(1);
    const script = Object.values(fakeDocument._scripts)[0] as any;
    expect(script.src).toBe("https://www.googletagmanager.com/gtag/js?id=AW-946725823");
    expect(script.async).toBe(true);
  });

  it("is idempotent: a second call does not append a second script or re-push the default", async () => {
    const fakeWindow: any = {};
    const fakeDocument = makeFakeDocument();
    vi.stubGlobal("window", fakeWindow);
    vi.stubGlobal("document", fakeDocument);
    const { loadGoogleAdsTag } = await import("../client/src/lib/googleAdsTag");

    loadGoogleAdsTag();
    const countAfterFirst = fakeWindow.dataLayer.length;
    loadGoogleAdsTag();

    expect(fakeDocument.head.appendChild).toHaveBeenCalledTimes(1);
    expect(fakeWindow.dataLayer.length).toBe(countAfterFirst);
    expect(entries(fakeWindow, "consent", "default")).toHaveLength(1);
  });
});

describe("updateGoogleConsent", () => {
  it("grants all four types on 'granted' and denies all four on 'denied'", async () => {
    const fakeWindow: any = {};
    vi.stubGlobal("window", fakeWindow);
    vi.stubGlobal("document", makeFakeDocument());
    const { loadGoogleAdsTag, updateGoogleConsent } = await import("../client/src/lib/googleAdsTag");

    loadGoogleAdsTag();
    updateGoogleConsent("granted");
    updateGoogleConsent("denied");

    const updates = entries(fakeWindow, "consent", "update");
    expect(updates).toHaveLength(2);
    for (const t of TYPES) {
      expect((updates[0][2] as any)[t]).toBe("granted");
      expect((updates[1][2] as any)[t]).toBe("denied");
    }
  });

  it("works before the tag has loaded, by queueing on dataLayer", async () => {
    const fakeWindow: any = {};
    vi.stubGlobal("window", fakeWindow);
    vi.stubGlobal("document", makeFakeDocument());
    const { updateGoogleConsent } = await import("../client/src/lib/googleAdsTag");

    updateGoogleConsent("granted");
    expect(entries(fakeWindow, "consent", "update")).toHaveLength(1);
  });
});

describe("CookieConsent wiring", () => {
  const src = readFileSync("client/src/components/CookieConsent.tsx", "utf8");
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("loads the tag on every mount and replays a stored acceptance as a granted update", () => {
    const mount = stripped.slice(stripped.indexOf("useEffect(() => {"), stripped.indexOf("const choose"));
    expect(mount).toMatch(/^\s*loadGoogleAdsTag\(\);/m);
    expect(mount).toMatch(/getCookieConsent\(\) === "accepted"\)\s*\{\s*updateGoogleConsent\("granted"\)/);
    expect(mount).not.toMatch(/updateGoogleConsent\("denied"\)/);
  });

  it("maps Accept all to granted and Essential only to denied", () => {
    expect(stripped).toMatch(/updateGoogleConsent\(value === "accepted" \? "granted" : "denied"\)/);
    expect(stripped).toMatch(/choose\("declined"\)[\s\S]*Essential only/);
    expect(stripped).toMatch(/choose\("accepted"\)[\s\S]*Accept all/);
  });

  it("does not load the tag from index.html", () => {
    const html = readFileSync("client/index.html", "utf8").replace(/<!--[\s\S]*?-->/g, "");
    expect(html).not.toMatch(/googletagmanager\.com|gtag\(/);
  });
});
