import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import {
  FIRST_CONTACT,
  REGISTRATION_FORM_URL,
  REGISTRATION_THANK_YOU,
  REGISTRATION_THANK_YOU_PATH,
  reportRegistrationConversionOnce,
} from "../../client/src/lib/registrationForm";
import { isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { SEO_MAP, shouldNoindex } from "../../shared/seo";

/**
 * Tim Hunt's Pipedrive Website Registration Form (14 November 2026). What
 * these hold: every "Start Your Application" button leads to /contact, where
 * his form is embedded exactly as he sent it; a campaign hand-off still gets
 * the website's own form; the page no longer promises a Student Portal
 * account; /contact/thank-you reports the site's one Google Ads conversion
 * once per arrival, and is private.
 */

const CONTACT = readFileSync("client/src/pages/Contact.tsx", "utf8");
const THANK_YOU_PAGE = readFileSync("client/src/pages/ContactThankYou.tsx", "utf8");
const SITEMAP = readFileSync("client/public/sitemap.xml", "utf8");
const APP = readFileSync("client/src/App.tsx", "utf8");

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : /\.tsx$/.test(name) ? [full] : [];
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Tim's form", () => {
  it("is the one he sent, exactly", () => {
    expect(REGISTRATION_FORM_URL).toBe(
      "https://webforms.pipedrive.com/f/ctvQhNxYDb7IJn9tWaOdddYbPkg4UqRGmkTf7T91AfKENzMr8pOcVbBKsWgerujteP",
    );
  });

  it("is what every Start Your Application button leads to: all of them go to /contact", () => {
    let buttons = 0;
    for (const file of sourceFiles("client/src")) {
      const lines = stripComments(readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (!/>\s*Start your application\s*</i.test(line) && !/^\s*Start your application\s*$/i.test(line)) return;
        // The Contact page's own heading is not a button.
        if (/<h2/.test(lines[i - 1] ?? "") || /<h2/.test(line)) return;
        const before = lines.slice(Math.max(0, i - 8), i + 1).join("\n");
        // The website form's own submit button, kept for campaign hand-offs, is not a link.
        if (before.includes("Submitting")) return;
        const hrefs = [...before.matchAll(/href=\{?"([^"]+)"/g)].map(m => m[1]);
        expect(hrefs.at(-1), `${file}:${i + 1}`).toBe("/contact");
        buttons++;
      });
    }
    expect(buttons).toBeGreaterThanOrEqual(10);
  });

  it("is embedded on /contact, through Pipedrive's loader", () => {
    expect(CONTACT).toContain("embedUrl={REGISTRATION_FORM_URL}");
    expect(CONTACT).toContain('import PipedriveFormEmbed from "@/components/PipedriveFormEmbed"');
  });

  it("leaves a campaign hand-off with the website's own form, so it still reaches that campaign's staff", () => {
    const code = stripComments(CONTACT);
    expect(code).toContain("campaignHandoff ? (\n                  <StudentForm />");
    expect(code).toContain('isCampaignSlug(fromUrl) || recallCampaign() !== ""');
  });

  it("no longer promises a Student Portal account, which a Pipedrive form cannot create", () => {
    expect(CONTACT).not.toContain("You'll also get your own Student Portal account");
    expect(CONTACT).toContain("a member of our team will contact you personally");
  });
});

describe("/contact/thank-you", () => {
  it("is a real route, private: noindex, out of the sitemap, not prerendered", () => {
    expect(REGISTRATION_THANK_YOU_PATH).toBe("/contact/thank-you");
    expect(isValidClientRoute(REGISTRATION_THANK_YOU_PATH)).toBe(true);
    expect(APP).toContain('<Route path={"/contact/thank-you"} component={ContactThankYou} />');
    expect(shouldNoindex(REGISTRATION_THANK_YOU_PATH)).toBe(true);
    expect(SEO_MAP[REGISTRATION_THANK_YOU_PATH]?.title).toBeTruthy();
    expect(SITEMAP).not.toContain("/contact/thank-you");
    expect(ALL_PRERENDER_ROUTES).not.toContain("/contact/thank-you");
  });

  it("captures nothing and reports the conversion once on arrival", () => {
    const code = stripComments(THANK_YOU_PAGE);
    expect(code).not.toMatch(/<form|<input|trpc\.|fetch\(/);
    expect(code.match(/reportRegistrationConversionOnce\(\)/g)).toHaveLength(1);
  });

  it("offers Claudia on WhatsApp, the number Tim gave", () => {
    expect(FIRST_CONTACT.whatsapp).toBe("+44 7341 905 979");
    expect(FIRST_CONTACT.whatsapp.replace(/\D/g, "")).toBe(FIRST_CONTACT.whatsappDigits);
    expect(REGISTRATION_THANK_YOU.body).not.toMatch(/within \d+|24 hours|guarantee/i);
  });
});

describe("the conversion", () => {
  function browser(opts: { type?: string; store?: Map<string, string> | null; gtag?: ReturnType<typeof vi.fn> }) {
    const store = opts.store === undefined ? new Map<string, string>() : opts.store;
    const sessionStorage = store
      ? { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } }
      : { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    const dataLayer: unknown[][] = [];
    const win: Record<string, unknown> = { sessionStorage, dataLayer };
    if (opts.gtag) win.gtag = opts.gtag;
    vi.stubGlobal("window", win);
    vi.stubGlobal("performance", { getEntriesByType: () => [{ type: opts.type ?? "navigate" }] });
    return { dataLayer, store };
  }

  it("reports the site's established Submit lead form conversion once for a fresh arrival", async () => {
    const gtag = vi.fn();
    browser({ gtag });
    expect(reportRegistrationConversionOnce()).toBe("reported");
    await Promise.resolve();
    expect(gtag).toHaveBeenCalledWith("event", "conversion", { send_to: "AW-946725823/hviLCPiHkOMcEL_Ht8MD" });
  });

  it("does not report again in the same session, or for a reload or a back/forward return", () => {
    const gtag = vi.fn();
    const { store } = browser({ gtag });
    expect(reportRegistrationConversionOnce()).toBe("reported");
    browser({ gtag, store });
    expect(reportRegistrationConversionOnce()).toBe("already-reported");
    browser({ gtag, type: "reload" });
    expect(reportRegistrationConversionOnce()).toBe("not-an-arrival");
    browser({ gtag, type: "back_forward" });
    expect(reportRegistrationConversionOnce()).toBe("not-an-arrival");
  });

  it("still reports when storage is blocked, and does nothing outside the browser", async () => {
    const { dataLayer } = browser({ store: null });
    expect(reportRegistrationConversionOnce()).toBe("reported");
    await Promise.resolve();
    expect(dataLayer).toEqual([["event", "conversion", { send_to: "AW-946725823/hviLCPiHkOMcEL_Ht8MD" }]]);
    vi.stubGlobal("window", undefined);
    expect(reportRegistrationConversionOnce()).toBe("unavailable");
  });
});
