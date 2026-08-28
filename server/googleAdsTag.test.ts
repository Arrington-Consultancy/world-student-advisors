import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Google Ads gtag.js base tag must never load until analytics consent
 * is granted (see client/src/components/CookieConsent.tsx and the site-wide
 * consent-gating fix). These tests exercise loadGoogleAdsTag() directly with
 * a minimal fake window/document, since this repo's Vitest runs in a
 * node environment (no real DOM) — see vitest.config.ts.
 */

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
    const { loadGoogleAdsTag } = await import("../client/src/lib/googleAdsTag");

    expect(() => loadGoogleAdsTag()).not.toThrow();
  });

  it("configures gtag with the site's Google Ads ID and injects the gtag.js script", async () => {
    const fakeWindow: any = {};
    const fakeDocument = makeFakeDocument();
    vi.stubGlobal("window", fakeWindow);
    vi.stubGlobal("document", fakeDocument);
    const { loadGoogleAdsTag } = await import("../client/src/lib/googleAdsTag");

    loadGoogleAdsTag();

    expect(Array.isArray(fakeWindow.dataLayer)).toBe(true);
    expect(typeof fakeWindow.gtag).toBe("function");
    // "js" call and "config" call both went through gtag -> dataLayer.push
    expect(fakeWindow.dataLayer).toEqual(
      expect.arrayContaining([
        ["js", expect.any(Date)],
        ["config", "AW-946725823"],
      ])
    );
    expect(fakeDocument.createElement).toHaveBeenCalledWith("script");
    expect(fakeDocument.head.appendChild).toHaveBeenCalledTimes(1);
  });

  it("is idempotent — a second call does not append a second script or re-configure", async () => {
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
  });
});
