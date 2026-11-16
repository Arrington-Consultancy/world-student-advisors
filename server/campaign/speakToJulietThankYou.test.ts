import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { VALID_CLIENT_ROUTES } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { NOINDEX_PATHS, SEO_MAP, shouldNoindex } from "../../shared/seo";
import { THANK_YOU, THANK_YOU_PATH, reportJulietFormConversionOnce } from "../../client/src/lib/speakToJulietThankYou";

/**
 * The Speak to Juliet thank-you page: the page Tim Hunt's Pipedrive form
 * redirects to after a successful submission, 28 September 2026. What this
 * guards: the route exists and is noindex and unlinked; the page captures
 * nothing and creates nothing; the site's one established Google Ads
 * conversion is reported once per arrival and never for a reload; and the
 * landing page itself reports nothing.
 */
const PAGE = readFileSync("client/src/pages/SpeakToJulietThankYou.tsx", "utf8");
const LANDING = readFileSync("client/src/pages/SpeakToJuliet.tsx", "utf8");
const LIB = readFileSync("client/src/lib/speakToJulietThankYou.ts", "utf8");
const CONVERSION = readFileSync("client/src/lib/googleAdsConversion.ts", "utf8");
const SITEMAP = readFileSync("client/public/sitemap.xml", "utf8");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the route", () => {
  it("is a real route, noindex, out of the sitemap and not prerendered", () => {
    expect(THANK_YOU_PATH).toBe("/speak-to-juliet/thank-you");
    expect(VALID_CLIENT_ROUTES).toContain(THANK_YOU_PATH);
    expect(NOINDEX_PATHS.has(THANK_YOU_PATH)).toBe(true);
    expect(shouldNoindex(THANK_YOU_PATH)).toBe(true);
    expect(SITEMAP).not.toContain(THANK_YOU_PATH);
    expect(ALL_PRERENDER_ROUTES).not.toContain(THANK_YOU_PATH);
    expect(SEO_MAP[THANK_YOU_PATH].title).toContain("Juliet");
  });

  it("is linked from nowhere on the site, so only the form's redirect leads there", () => {
    expect(LANDING).not.toContain("thank-you");
    for (const file of ["client/src/components/Header.tsx", "client/src/components/Footer.tsx", "client/src/pages/Home.tsx"]) {
      expect(readFileSync(file, "utf8"), file).not.toContain(THANK_YOU_PATH);
    }
  });
});

describe("the page", () => {
  it("captures nothing: no form, no fields, no Pipedrive, no server call", () => {
    expect(PAGE).not.toMatch(/<form|<input|<select|<textarea/);
    expect(PAGE).not.toContain("pipedrive");
    expect(PAGE).not.toContain("trpc");
    expect(PAGE).not.toContain("fetch(");
    expect(PAGE).not.toContain("PIPEDRIVE_FORM");
  });

  it("creates no portal account and implies none", () => {
    // Comments explain what the page does not do; only the code and copy count.
    const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").toLowerCase();
    for (const word of ["portal", "account", "password", "set-password"]) {
      expect(code, word).not.toContain(word);
      expect(Object.values(THANK_YOU).join(" ").toLowerCase(), word).not.toContain(word);
    }
    expect(PAGE).not.toMatch(/createPortalUser|submitStudent|useMutation/);
  });

  it("confirms the enquiry, points to the acknowledgement email Pipedrive sends, and offers WhatsApp and email to Juliet only", () => {
    expect(THANK_YOU.headline).toBe("Thank you. Your details are with Juliet.");
    expect(THANK_YOU.body).toContain("email confirming");
    expect(PAGE).toContain("whatsappHref(JULIET.whatsappDigits");
    expect(PAGE).toContain("href={`mailto:${JULIET.email}`}");
    expect(PAGE).not.toContain("GLENICE");
    expect(PAGE).toContain('href="/speak-to-juliet"');
    expect(PAGE).toContain('href="/student-support-library"');
    // No response-time promise, as on the landing page.
    expect(Object.values(THANK_YOU).join(" ")).not.toMatch(/\d+\s*(hours|days|minutes)/i);
  });

  it("reports the conversion on mount and nowhere else", () => {
    expect(PAGE).toContain("reportJulietFormConversionOnce()");
    expect(PAGE.match(/reportJulietFormConversionOnce\(\)/g)?.length).toBe(1);
    expect(LANDING).not.toContain("reportSignupConversion");
    expect(LANDING).not.toContain("reportJulietFormConversionOnce");
  });
});

describe("the conversion", () => {
  it("reuses the site's one established Google Ads conversion, not a new one", () => {
    expect(LIB).toContain('import { reportSignupConversion } from "./googleAdsConversion"');
    expect(LIB).not.toContain("AW-");
    expect(LIB).not.toContain("send_to");
    expect(CONVERSION).toContain('"AW-946725823/hviLCPiHkOMcEL_Ht8MD"');
  });

  function browser(opts: { type?: string; store?: Map<string, string> | null; gtag?: ReturnType<typeof vi.fn> }) {
    const store = opts.store === undefined ? new Map<string, string>() : opts.store;
    const sessionStorage = store
      ? {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => { store.set(k, v); },
        }
      : {
          getItem: () => { throw new Error("blocked"); },
          setItem: () => { throw new Error("blocked"); },
        };
    const dataLayer: unknown[][] = [];
    const win: Record<string, unknown> = { sessionStorage, dataLayer };
    if (opts.gtag) win.gtag = opts.gtag;
    // Meta's queueing stub, as metaPixel.ts installs it; a Lead fired here
    // lands in its queue, where the test can read it.
    const fbq: any = (...args: unknown[]) => { fbq.queue.push(args); };
    fbq.queue = [] as unknown[][];
    win.fbq = fbq;
    vi.stubGlobal("window", win);
    vi.stubGlobal("performance", { getEntriesByType: () => [{ type: opts.type ?? "navigate" }] });
    return { dataLayer, store, fbq };
  }
  const leads = (fbq: any) => (fbq.queue as unknown[][]).filter(c => c[0] === "track" && c[1] === "Lead").length;

  it("reports once for a fresh arrival, to Google and to Meta", async () => {
    const gtag = vi.fn();
    const { fbq } = browser({ gtag });
    expect(reportJulietFormConversionOnce()).toBe("reported");
    await Promise.resolve();
    expect(gtag).toHaveBeenCalledWith("event", "conversion", { send_to: "AW-946725823/hviLCPiHkOMcEL_Ht8MD" });
    // Tim Hunt, 4 October 2026: Meta must see the completed enquiry, not
    // only the page view. Exactly one standard Lead event per arrival.
    expect(leads(fbq)).toBe(1);
  });

  it("does not report again in the same session", async () => {
    const gtag = vi.fn();
    const { store } = browser({ gtag });
    expect(reportJulietFormConversionOnce()).toBe("reported");
    const second = browser({ gtag, store });
    expect(reportJulietFormConversionOnce()).toBe("already-reported");
    await Promise.resolve();
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(leads(second.fbq)).toBe(0);
  });

  it("does not report for a reload or a back/forward return", () => {
    const gtag = vi.fn();
    const reload = browser({ gtag, type: "reload" });
    expect(reportJulietFormConversionOnce()).toBe("not-an-arrival");
    const back = browser({ gtag, type: "back_forward" });
    expect(reportJulietFormConversionOnce()).toBe("not-an-arrival");
    expect(gtag).not.toHaveBeenCalled();
    expect(leads(reload.fbq) + leads(back.fbq)).toBe(0);
  });

  it("queues the conversion when the tag has not loaded, and still reports when storage is blocked", async () => {
    const { dataLayer } = browser({ store: null });
    expect(reportJulietFormConversionOnce()).toBe("reported");
    await Promise.resolve();
    expect(dataLayer).toEqual([["event", "conversion", { send_to: "AW-946725823/hviLCPiHkOMcEL_Ht8MD" }]]);
  });

  it("does nothing outside the browser", () => {
    vi.stubGlobal("window", undefined);
    expect(reportJulietFormConversionOnce()).toBe("unavailable");
  });
});
