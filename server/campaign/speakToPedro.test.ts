import { describe, expect, it } from "vitest";
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import {
  ELDAH_PHOTO,
  OFFICIAL_SOURCES,
  PEDRO_ALL_PATHS,
  PEDRO_COPY,
  PEDRO_FORM_EMBED_URLS,
  PEDRO_LANGS,
  PEDRO_PATHS,
  PEDRO_PHOTO,
  PEDRO_THANK_YOU_PATHS,
  WSA_LOGO,
  isPipedriveFormUrl,
  languageSwitchHref,
  publicationBlockers,
  type PedroCopy,
} from "../../client/src/lib/speakToPedro";
import { consentCopyForPath } from "../../client/src/lib/consentCopy";
import {
  NOINDEX_PATHS,
  SEO_MAP,
  getLanguageAlternates,
  getLanguageForPath,
  shouldNoindex,
} from "../../shared/seo";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { injectSeoMeta } from "../_core/vite";

/**
 * Speak to Pedro, the Angola page for families in Luanda, Tom Arrington's
 * brief of 18 October 2026. What these hold: a draft that cannot be found or
 * mistaken for a published page, Portuguese first with a complete English
 * twin, the unchanged WSA logo, the smiling photograph Tom approved, the
 * form slot honest about the Pipedrive form not existing
 * yet, nothing the brief forbids (contact numbers, guarantees, the
 * free-service line, testimonials, sensitive fields), and no conversion.
 */

const PAGE = readFileSync("client/src/pages/SpeakToPedro.tsx", "utf8");
const APP = readFileSync("client/src/App.tsx", "utf8");
const SITEMAP = readFileSync("client/public/sitemap.xml", "utf8");
const HEADER = readFileSync("client/src/components/Header.tsx", "utf8");

const sha256 = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(strings);
  return [];
}

/** The shape of a copy object: keys and array lengths, without the words. */
function shape(value: unknown): unknown {
  if (typeof value === "string") return "s";
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, shape(v)])
    );
  return typeof value;
}

async function render(path: string): Promise<string> {
  const React = await import("react");
  const { renderToString } = await import("react-dom/server");
  const { Router } = await import("wouter");
  const Pages = await import("../../client/src/pages/SpeakToPedro");
  const component = {
    [PEDRO_PATHS.pt]: Pages.SpeakToPedroPt,
    [PEDRO_PATHS.en]: Pages.SpeakToPedroEn,
    [PEDRO_THANK_YOU_PATHS.pt]: Pages.SpeakToPedroThankYouPt,
    [PEDRO_THANK_YOU_PATHS.en]: Pages.SpeakToPedroThankYouEn,
  }[path];
  return renderToString(
    React.createElement(
      Router,
      { ssrPath: path, ssrSearch: "utm_source=meta&utm_campaign=luanda" },
      React.createElement(component)
    )
  );
}

describe("routes, search engines and language", () => {
  it("serves four routes: Portuguese by default, English beside it, and a thank-you page for each", () => {
    expect(PEDRO_ALL_PATHS).toEqual([
      "/speak-to-pedro",
      "/speak-to-pedro/en",
      "/speak-to-pedro/obrigado",
      "/speak-to-pedro/en/thank-you",
    ]);
    for (const p of PEDRO_ALL_PATHS) {
      expect(VALID_CLIENT_ROUTES).toContain(p);
      expect(isValidClientRoute(p)).toBe(true);
      expect(APP).toContain(`<Route path={"${p}"}`);
    }
  });

  it("is a draft nobody can find: noindex, not in the sitemap, not prerendered", () => {
    for (const p of PEDRO_ALL_PATHS) {
      expect(NOINDEX_PATHS.has(p)).toBe(true);
      expect(shouldNoindex(p)).toBe(true);
      expect(SITEMAP).not.toContain(p);
      expect(ALL_PRERENDER_ROUTES).not.toContain(p);
    }
  });

  it("is linked from nowhere on the site", () => {
    const files = [
      HEADER,
      readFileSync("client/src/components/Footer.tsx", "utf8"),
      readFileSync("client/src/pages/Home.tsx", "utf8"),
      readFileSync("client/src/pages/Contact.tsx", "utf8"),
      readFileSync("client/src/pages/OurTeam.tsx", "utf8"),
    ];
    for (const f of files) expect(f).not.toContain("speak-to-pedro");
  });

  it("gives each page its own title in its own language", () => {
    expect(SEO_MAP[PEDRO_PATHS.pt].title).toMatch(/Educação no Reino Unido/);
    expect(SEO_MAP[PEDRO_PATHS.en].title).toMatch(/UK education/);
    expect(SEO_MAP[PEDRO_THANK_YOU_PATHS.pt].title).toMatch(/Pedido recebido/);
    expect(SEO_MAP[PEDRO_THANK_YOU_PATHS.en].title).toMatch(/Enquiry received/);
  });

  it("declares Portuguese on the Portuguese pages and English everywhere else", () => {
    expect(getLanguageForPath(PEDRO_PATHS.pt)).toBe("pt");
    expect(getLanguageForPath(PEDRO_THANK_YOU_PATHS.pt)).toBe("pt");
    expect(getLanguageForPath(PEDRO_PATHS.en)).toBe("en");
    expect(getLanguageForPath("/")).toBe("en");
    expect(getLanguageForPath("/speak-to-madalitso")).toBe("en");
  });

  it("links each page to its translation, with Portuguese as x-default, and touches no other page", () => {
    expect(getLanguageAlternates(PEDRO_PATHS.en)).toEqual([
      {
        hreflang: "pt",
        href: "https://www.worldstudentadvisors.com/speak-to-pedro",
      },
      {
        hreflang: "en",
        href: "https://www.worldstudentadvisors.com/speak-to-pedro/en",
      },
      {
        hreflang: "x-default",
        href: "https://www.worldstudentadvisors.com/speak-to-pedro",
      },
    ]);
    expect(
      getLanguageAlternates(PEDRO_THANK_YOU_PATHS.pt).map(a => a.href)
    ).toContain(
      "https://www.worldstudentadvisors.com/speak-to-pedro/en/thank-you"
    );
    expect(getLanguageAlternates("/")).toEqual([]);
  });

  it("sends the right <html lang> and alternates in the server's first response", () => {
    const shell = readFileSync("client/index.html", "utf8");
    const pt = injectSeoMeta(shell, PEDRO_PATHS.pt);
    expect(pt).toContain('<html lang="pt">');
    expect(pt).toContain(
      '<link rel="alternate" hreflang="en" href="https://www.worldstudentadvisors.com/speak-to-pedro/en" />'
    );
    expect(pt).toContain('<meta name="robots" content="noindex, nofollow" />');
    const en = injectSeoMeta(shell, PEDRO_PATHS.en);
    expect(en).toContain('<html lang="en">');
    const home = injectSeoMeta(shell, "/");
    expect(home).toContain('<html lang="en">');
    expect(home).not.toContain('rel="alternate" hreflang');
  });
});

describe("the two languages", () => {
  it("are complete twins: the same sections, the same number of items, nothing empty", () => {
    expect(shape(PEDRO_COPY.pt)).toEqual(shape(PEDRO_COPY.en));
    for (const lang of PEDRO_LANGS)
      for (const s of strings(PEDRO_COPY[lang]))
        expect(s.trim().length).toBeGreaterThan(0);
  });

  it("do not leave English in the Portuguese, beyond names of UK things", () => {
    const pt = strings(PEDRO_COPY.pt).join(" ");
    for (const word of [
      " the ",
      " and ",
      " your ",
      " with ",
      " guidance",
      " enquiry",
      " school ",
    ])
      expect(pt.toLowerCase()).not.toContain(word);
  });

  it("switch language without losing the visitor's query string, UTM tags included", () => {
    expect(
      languageSwitchHref(
        PEDRO_PATHS.pt,
        "en",
        "utm_source=meta&utm_campaign=luanda"
      )
    ).toBe("/speak-to-pedro/en?utm_source=meta&utm_campaign=luanda");
    expect(languageSwitchHref(PEDRO_PATHS.en, "pt", "?gclid=abc")).toBe(
      "/speak-to-pedro?gclid=abc"
    );
    expect(languageSwitchHref(PEDRO_THANK_YOU_PATHS.pt, "en", "")).toBe(
      "/speak-to-pedro/en/thank-you"
    );
    expect(languageSwitchHref(PEDRO_THANK_YOU_PATHS.en, "pt", "?")).toBe(
      "/speak-to-pedro/obrigado"
    );
  });

  it("speak Portuguese in the cookie banner on the Portuguese pages only, with the English wording unchanged", () => {
    expect(consentCopyForPath(PEDRO_PATHS.pt).acceptAll).toBe("Aceitar todos");
    expect(consentCopyForPath(PEDRO_THANK_YOU_PATHS.pt).essentialOnly).toBe(
      "Apenas essenciais"
    );
    expect(consentCopyForPath(PEDRO_PATHS.en).acceptAll).toBe("Accept all");
    const en = consentCopyForPath("/");
    expect(en.heading).toBe("Your privacy matters");
    expect(en.body).toBe(
      "We use essential cookies to make this site work. With your consent, we'd also like to use analytics cookies to understand how families use the site so we can improve it. You can change your mind at any time. Read our"
    );
  });
});

describe("what the brief forbids", () => {
  const all = PEDRO_LANGS.flatMap(l => strings(PEDRO_COPY[l])).join(" \n ");

  it("publishes no phone number, WhatsApp link or email address", () => {
    expect(all).not.toMatch(/\+\s?\d{2,3}[\d\s]{6,}/);
    expect(all).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(PAGE).not.toMatch(/wa\.me|mailto:|tel:/);
  });

  it("guarantees nothing, and says so", () => {
    const guarantees = all.match(/garant\w*|guarantee\w*/gi) ?? [];
    expect(guarantees.length).toBeGreaterThan(0);
    expect(all).toContain("A WSA não garante vagas, vistos nem bolsas.");
    expect(all).toContain(
      "WSA does not guarantee places, visas or scholarships."
    );
    expect(all).toContain("Nenhuma etapa garante uma vaga");
    expect(all).toContain("No step guarantees a place");
    expect(all.match(/garante/g)?.length).toBe(2);
    expect(all.match(/guarantee/g)?.length).toBe(2);
  });

  it("claims no free service, discount, scholarship offer, ranking, partnership or testimonial", () => {
    expect(all).not.toMatch(
      /\bfree\b|grátis|gratuit|discount|desconto|ranking|top \d|best\b|melhor(es)? (escola|universidade)|partner|parceri|testimonial|testemunho/i
    );
  });

  it("asks for nothing itself: no input fields, no date of birth, passport or upload", () => {
    expect(PAGE).not.toMatch(/<input|<select|<textarea|<form\b/);
    expect(all).not.toMatch(
      /passaporte|passport|data de nascimento|date of birth|upload|carregar/i
    );
  });

  it("reports no conversion and adds no pixel on any of the four pages", () => {
    const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, " ").replace(
      /(^|[^:])\/\/.*$/gm,
      "$1"
    );
    expect(code).not.toMatch(
      /reportSignupConversion|googleAdsTag|metaPixel|fbq|gtag|trackLead|conversion/i
    );
  });
});

describe("assets", () => {
  it("uses the unchanged WSA logo, the same file as the site header", () => {
    expect(WSA_LOGO.src).toBe("/manus-storage/wsa_logo_beb199d6.png");
    expect(HEADER).toContain(`src="${WSA_LOGO.src}"`);
    expect(sha256(`client/public${WSA_LOGO.src}`)).toBe(
      "b0cef35baffb4a94648239e237f9b42417851ad764309a91d0aae17b0912a418"
    );
    expect(PAGE).toContain("WSA_LOGO.src");
  });

  it("uses the smiling photograph, cropped from website photo.jpg, approved by Tom on 18 October 2026", () => {
    expect(PEDRO_PHOTO.src).toBe("/team/pedro-bezerra.jpg");
    expect(sha256(`client/public${PEDRO_PHOTO.src}`)).toBe(
      "0c3c198e796f0608c1c2ad56b06c9b9a01ba4690521e3004d19fa6553a30d2f8"
    );
    expect(PEDRO_PHOTO.approvedForPublication).toBe(true);
    expect(
      publicationBlockers().some(b => b.startsWith("Pedro's photograph"))
    ).toBe(false);
    expect(PAGE).toMatch(/!PEDRO_PHOTO\.approvedForPublication &&/);
    expect(existsSync(`client/public${ELDAH_PHOTO.src}`)).toBe(true);
  });
});

describe("the enquiry form", () => {
  it("is not invented: no Pipedrive form URL until Tim creates the forms", () => {
    expect(PEDRO_FORM_EMBED_URLS).toEqual({ pt: "", en: "" });
    expect(
      isPipedriveFormUrl(
        "https://webforms.pipedrive.com/f/6FBbycG4wTfm62tM1Vlu80jIF2PTcZ6TbHsoiumvEGG6UDug9KFPWb39sXsaF1TcmT"
      )
    ).toBe(true);
    expect(isPipedriveFormUrl("https://example.com/f/abc")).toBe(false);
    expect(isPipedriveFormUrl("")).toBe(false);
  });

  it("is never Madalitso's or Juliet's form", () => {
    const madalitso = readFileSync(
      "client/src/lib/speakToMadalitso.ts",
      "utf8"
    ).match(/webforms\.pipedrive\.com\/f\/\w+/)?.[0];
    expect(madalitso).toBeTruthy();
    for (const lang of PEDRO_LANGS)
      expect(PEDRO_FORM_EMBED_URLS[lang]).not.toContain(madalitso!);
  });

  it("keeps the page a draft while anything is outstanding", () => {
    const blockers = publicationBlockers();
    expect(
      blockers.some(b => b.startsWith("The Portuguese Pipedrive form"))
    ).toBe(true);
    expect(blockers.some(b => b.startsWith("The English Pipedrive form"))).toBe(
      true
    );
    expect(blockers.some(b => b.includes("public title"))).toBe(true);
  });
});

describe("rendered pages", () => {
  it("the Portuguese page: draft banner, the approved photograph unlabelled, the form slot pending, both languages offered", async () => {
    const html = await render(PEDRO_PATHS.pt);
    expect(html).toContain('lang="pt"');
    expect(html).toContain("data-draft-banner");
    expect(html).not.toContain("data-draft-photo");
    expect(html).toContain('src="/team/pedro-bezerra.jpg"');
    expect(html).toContain("data-form-pending");
    expect(html).toContain(PEDRO_COPY.pt.hero.headline);
    expect(html).toContain("Solicitar orientação");
    expect(html).toContain('src="/manus-storage/wsa_logo_beb199d6.png"');
    expect(html).toContain(
      'href="/speak-to-pedro/en?utm_source=meta&amp;utm_campaign=luanda"'
    );
    expect(html).not.toContain("data-pd-webforms");
    for (const s of OFFICIAL_SOURCES) expect(html).toContain(s.href);
  });

  it("the English page carries the same sections in English", async () => {
    const html = await render(PEDRO_PATHS.en);
    expect(html).toContain('lang="en"');
    expect(html).toContain(PEDRO_COPY.en.hero.headline.replace("'", "&#x27;"));
    expect(html).toContain("Request guidance");
    for (const item of PEDRO_COPY.en.faq.items) expect(html).toContain(item.q);
    expect(html).toContain(
      'href="/speak-to-pedro?utm_source=meta&amp;utm_campaign=luanda"'
    );
  });

  it("the thank-you pages promise nobody by name and no time", async () => {
    for (const lang of PEDRO_LANGS) {
      const html = await render(PEDRO_THANK_YOU_PATHS[lang]);
      expect(html).toContain(PEDRO_COPY[lang].thankYou.headline);
      const t: PedroCopy["thankYou"] = PEDRO_COPY[lang].thankYou;
      expect(strings(t).join(" ")).not.toMatch(
        /Pedro|Eldah|hora|horas|hour|dias|days|today|hoje|shortly|brevemente/i
      );
    }
  });
});

describe("the site around it", () => {
  it("hides the English header and footer on these pages only", () => {
    expect(APP).toMatch(/const LANDING_SHELL_ROUTES = \["\/speak-to-pedro"\];/);
    expect(APP).toMatch(/const isAppShell = hasOwnHeader\(location\);/);
    expect(APP).toMatch(/\{!isAppShell && <Header \/>\}/);
  });
});
