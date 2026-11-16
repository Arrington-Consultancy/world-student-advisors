import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";

/**
 * Meta Pixel 2892182304395411, installed 2 October 2026 on Tom Arrington's
 * instruction, consent-gated. These tests pin: the pixel loads on every
 * page with Meta's consent REVOKED before init, so it sets no cookie and
 * sends nothing until "Accept all"; a grant comes only through
 * updateMetaConsent("granted"); the noscript beacon (ungateable) is not
 * installed anywhere; and the banner wires both the replay and the click.
 * Exercised with a minimal fake window/document, as googleAdsTag.test.ts
 * is, since Vitest runs in a node environment here.
 */

function makeFakeDocument() {
  const scripts: Record<string, unknown> = {};
  const head = { appendChild: vi.fn((el: any) => { scripts[el.id] = el; }) };
  return {
    getElementById: vi.fn((id: string) => scripts[id] ?? null),
    createElement: vi.fn(() => ({ id: "", async: false, src: "" }) as any),
    head,
    _scripts: scripts,
  };
}

function calls(win: any): unknown[][] {
  return win.fbq.queue as unknown[][];
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("loadMetaPixel", () => {
  it("does nothing outside the browser", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    const m = await import("../client/src/lib/metaPixel");
    expect(() => m.loadMetaPixel()).not.toThrow();
    expect(() => m.updateMetaConsent("granted")).not.toThrow();
    expect(() => m.trackMetaPageView()).not.toThrow();
  });

  it("revokes consent before init and PageView, then injects fbevents.js once", async () => {
    const win: any = {};
    const doc = makeFakeDocument();
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    const { loadMetaPixel, META_PIXEL_ID } = await import("../client/src/lib/metaPixel");

    loadMetaPixel();

    expect(META_PIXEL_ID).toBe("2892182304395411");
    const q = calls(win);
    expect(q[0]).toEqual(["consent", "revoke"]);
    expect(q[1]).toEqual(["init", "2892182304395411"]);
    expect(q[2]).toEqual(["track", "PageView"]);
    // No grant from the loader itself: only the visitor's choice grants.
    expect(q.some(c => c[0] === "consent" && c[1] === "grant")).toBe(false);

    expect(win._fbq).toBe(win.fbq);
    expect(win.fbq.loaded).toBe(true);
    expect(win.fbq.version).toBe("2.0");

    expect(doc.head.appendChild).toHaveBeenCalledTimes(1);
    const script = Object.values(doc._scripts)[0] as any;
    expect(script.id).toBe("wsa-meta-pixel");
    expect(script.src).toBe("https://connect.facebook.net/en_US/fbevents.js");
    expect(script.async).toBe(true);
  });

  it("loaded as 'granted' (a stored Accept all) queues no revoke, so init and PageView are not held", async () => {
    // Meta's script, draining the pre-load queue, holds everything after a
    // revoke, a later grant included. A returning accepted visitor must
    // therefore never see a revoke, or the pixel stays silent on every page
    // (found 3 October 2026 on /speak-to-juliet/thank-you).
    const win: any = {};
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", makeFakeDocument());
    const { loadMetaPixel, updateMetaConsent } = await import("../client/src/lib/metaPixel");
    loadMetaPixel("granted");
    updateMetaConsent("granted");
    const q = calls(win);
    expect(q.some(c => c[0] === "consent" && c[1] === "revoke")).toBe(false);
    expect(q[0]).toEqual(["init", "2892182304395411"]);
    expect(q[1]).toEqual(["track", "PageView"]);
    expect(q[2]).toEqual(["consent", "grant"]);
  });

  it("is idempotent", async () => {
    const win: any = {};
    const doc = makeFakeDocument();
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    const { loadMetaPixel } = await import("../client/src/lib/metaPixel");
    loadMetaPixel();
    const n = calls(win).length;
    loadMetaPixel();
    expect(doc.head.appendChild).toHaveBeenCalledTimes(1);
    expect(calls(win).length).toBe(n);
  });

  it("hands queued calls to the real pixel once it has loaded", async () => {
    const win: any = {};
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", makeFakeDocument());
    const { loadMetaPixel, updateMetaConsent } = await import("../client/src/lib/metaPixel");
    loadMetaPixel();
    const real = vi.fn();
    win.fbq.callMethod = real; // what fbevents.js does on arrival
    updateMetaConsent("granted");
    expect(real).toHaveBeenCalledWith("consent", "grant");
  });
});

describe("updateMetaConsent and trackMetaPageView", () => {
  it("maps granted to grant and denied to revoke, and queues before load", async () => {
    const win: any = {};
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", makeFakeDocument());
    const { updateMetaConsent, trackMetaPageView } = await import("../client/src/lib/metaPixel");
    updateMetaConsent("granted");
    updateMetaConsent("denied");
    trackMetaPageView();
    const q = calls(win);
    expect(q.slice(0, 2)).toEqual([["consent", "grant"], ["consent", "revoke"]]);
    // The tracker loads the pixel before it tracks, so init comes before
    // the PageView it pushes.
    expect(q.findIndex(c => c[0] === "init")).toBeLessThan(q.length - 1);
    expect(q[q.length - 1]).toEqual(["track", "PageView"]);
  });

  it("trackMetaLead loads the pixel first, so init precedes the Lead even when fired before the banner mounts", async () => {
    // On the thank-you page the Lead runs in the page's own effect, before
    // CookieConsent's. A track before init would be dropped by Meta, so the
    // tracker loads the pixel itself (idempotently) before pushing.
    const win: any = {};
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", makeFakeDocument());
    const { trackMetaLead, loadMetaPixel } = await import("../client/src/lib/metaPixel");
    trackMetaLead();
    const q = calls(win);
    expect(q.findIndex(c => c[0] === "init")).toBeGreaterThanOrEqual(0);
    expect(q.findIndex(c => c[0] === "init")).toBeLessThan(q.findIndex(c => c[0] === "track" && c[1] === "Lead"));
    expect(q.filter(c => c[0] === "track" && c[1] === "Lead")).toHaveLength(1);
    // The banner's later load is a no-op: no second init, no second revoke.
    loadMetaPixel("revoked");
    expect(q.filter(c => c[0] === "init")).toHaveLength(1);
  });
});

describe("wiring", () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const banner = strip(readFileSync("client/src/components/CookieConsent.tsx", "utf8"));
  const app = strip(readFileSync("client/src/App.tsx", "utf8"));
  const tracker = strip(readFileSync("client/src/components/MetaPixelRouteTracker.tsx", "utf8"));

  it("the banner loads the pixel on mount, replays a stored acceptance as a grant, and maps both buttons", () => {
    const mount = banner.slice(banner.indexOf("useEffect(() => {"), banner.indexOf("const choose"));
    // A stored acceptance loads the pixel granted (no revoke queued): a
    // grant replayed behind a revoke is never reached by Meta's script.
    expect(mount).toMatch(/^\s*loadMetaPixel\(getCookieConsent\(\) === "accepted" \? "granted" : "revoked"\);/m);
    expect(mount).toMatch(/getCookieConsent\(\) === "accepted"\)\s*\{[\s\S]*?updateMetaConsent\("granted"\)/);
    const choose = banner.slice(banner.indexOf("const choose"));
    expect(choose).toMatch(/updateMetaConsent\(value === "accepted" \? "granted" : "denied"\)/);
  });

  it("the app mounts the route tracker, which skips the first render and tracks each change", () => {
    expect(app).toContain("<MetaPixelRouteTracker />");
    expect(tracker).toContain("trackMetaPageView()");
    expect(tracker).toMatch(/\[location\]\)/);
    expect(tracker).toMatch(/first\.current/);
  });

  it("the ungateable noscript beacon is installed nowhere", () => {
    for (const f of ["client/index.html", "client/src/lib/metaPixel.ts", "client/src/components/CookieConsent.tsx"]) {
      expect(readFileSync(f, "utf8")).not.toMatch(/facebook\.com\/tr\?/);
    }
  });
});
