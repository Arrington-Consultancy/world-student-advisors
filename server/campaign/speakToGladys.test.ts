import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import * as Template from "../../client/src/lib/advisorLandingPage";
import { GLADYS_PAGE as G } from "../../client/src/lib/speakToGladys";
import { MADALITSO_PAGE } from "../../client/src/lib/speakToMadalitso";
import * as Juliet from "../../client/src/lib/speakToJuliet";
import { LIBRARY_RESOURCES, LIBRARY_RESOURCE_PATHS } from "../../shared/studentSupportLibrary";
import { NOINDEX_PATHS, SEO_MAP, shouldNoindex } from "../../shared/seo";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";

/**
 * Speak to Gladys, the Ghana landing page, Tim Hunt's email and annotated
 * document of 24 October 2026, on the country representative template. What
 * these hold: Gladys's details exactly as Tim gave them, his form unaltered,
 * his replacement wording where he asked for it and Juliet's where he wrote
 * "no change", Manet with no contact details, the British Council line no
 * stronger than the certificates, the page published and its thank-you page
 * private, and Madalitso's page unchanged by the two template additions.
 */

const PAGE = readFileSync("client/src/pages/AdvisorLandingPage.tsx", "utf8");
const SITEMAP = readFileSync("client/public/sitemap.xml", "utf8");

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every string a visitor can read on the two pages. */
function renderedCopy(): string {
  return [
    ...Object.values(G.hero).flatMap(v => (typeof v === "string" ? [v] : Object.values(v))),
    G.advisor.name, G.advisor.role, G.advisor.location ?? "", G.advisor.photoAlt, G.advisor.organisation, G.advisor.intro,
    G.advisor.whatsapp ?? "", G.advisor.email ?? "", G.advisor.firstMessage, G.credentials ?? "",
    G.counsellor.name, G.counsellor.role, G.counsellor.photoAlt, G.counsellor.headOfficeLine, G.counsellor.panelHeading, ...G.counsellor.panelBody,
    G.podcast.title, G.podcast.blurb, G.podcast.libraryLabel ?? "",
    G.askHeading, ...G.studyFamilies.map(f => `${f.title} ${f.body}`), G.availabilityNote,
    ...G.steps.map(s => `${s.title} ${s.body}`), ...G.keyMessage,
    G.form.heading, G.form.supporting, G.form.privacyLine,
    ...Object.values(G.thankYou),
  ].join(" ");
}

describe("Gladys's details, exactly as Tim Hunt gave them on 24 October 2026", () => {
  it("names her, her role and Accra", () => {
    expect(G.advisor.name).toBe("Gladys Naadi");
    expect(G.advisor.role).toBe("Director for Ghana");
    expect(G.advisor.location).toBe("Accra, Ghana");
  });

  it("shows his WhatsApp number and links the same digits", () => {
    expect(G.advisor.whatsapp).toBe("+233 55 521 6156");
    expect(G.advisor.whatsappDigits).toBe("233555216156");
    expect((G.advisor.whatsapp ?? "").replace(/\D/g, "")).toBe(G.advisor.whatsappDigits);
    expect(Template.whatsappHref(G.advisor.whatsappDigits!, G.advisor.firstMessage)).toBe(
      `https://wa.me/233555216156?text=${encodeURIComponent("Hello Gladys, I saw the WSA page and I would like to ask about studying abroad.")}`,
    );
  });

  it("uses her WSA address", () => {
    expect(G.advisor.email).toBe("gladys@worldstudentadvisors.com");
  });

  it("uses the two photographs Tim attached, at the template's portrait size", () => {
    for (const p of [G.advisor, G.counsellor]) {
      expect(existsSync(`client/public${p.photo}`), p.photo).toBe(true);
      expect([p.photoWidth, p.photoHeight]).toEqual([720, 960]);
    }
    expect(G.advisor.photo).toBe("/team/gladys-naadi.jpg");
    expect(G.counsellor.photo).toBe("/team/manet-khamayo-lighter.jpg");
  });
});

describe("the page Tim Hunt annotated, section by section", () => {
  it("lives at /speak-to-gladys, with Ghana's flag", () => {
    expect(G.path).toBe("/speak-to-gladys");
    expect(G.country).toEqual({ name: "Ghana", flagCode: "gh" });
    const flag = readFileSync("client/public/flags/gh.svg", "utf8");
    expect(flag).toContain('id="flag-icons-gh"');
    // Red, gold and green, with the black star.
    for (const colour of ["#ce1126", "#fcd116", "#006b3f", "#000001"]) expect(flag).toContain(colour);
  });

  it("carries his hero: heading, button and the second route", () => {
    expect(G.hero.eyebrow).toBe("For the people of Ghana");
    expect(G.hero.headline).toBe("Thinking about studying abroad? Speak to Gladys.");
    expect(G.hero.primaryCta).toBe("Message Gladys on WhatsApp");
    expect(G.hero.secondary).toEqual({
      heading: "Prefer Gladys to contact you?",
      supporting: "Leave your details and Gladys will get in touch with you.",
      cta: "Send my details to Gladys",
    });
  });

  it("weaves in the British Council certificates without claiming endorsement", () => {
    expect(G.credentials).toBe("Gladys and Manet both hold British Council certificates in UK agent and counsellor training.");
    expect(renderedCopy()).not.toMatch(/accredit|endorse|approved by the British Council|British Council (approved|registered)/i);
    expect(stripComments(PAGE)).toContain("content.credentials &&");
  });

  it("puts WSA 023 in the recording slot, behind a WSA poster rather than Gladys's photograph", () => {
    const wsa023 = LIBRARY_RESOURCES.find(r => r.code === "WSA 023");
    expect(wsa023?.youtubeUrl).toContain(G.podcast.youtubeId);
    expect(G.podcast.title).toBe("WSA 023 CAS and UKVI Credibility Interview");
    expect(G.podcast.libraryPath).toBe("/student-support-library/cas-and-ukvi-credibility-interview");
    expect(LIBRARY_RESOURCE_PATHS).toContain(G.podcast.libraryPath);
    expect(G.podcast.poster).toBe("brand");
    expect(stripComments(PAGE)).toContain('podcast.poster === "brand"');
  });

  it("uses Tim's replacement for the availability sentence", () => {
    expect(G.availabilityNote).toBe(
      "The study options available to you will depend on your academic qualifications, your preferred intake and the entry requirements of each institution. Gladys will help you explore suitable opportunities and guide you towards the best options for your circumstances and ambitions.",
    );
  });

  it("asks about the four families from Juliet's page, with Ghana in Online study", () => {
    expect(G.askHeading).toBe("What you can ask Gladys about");
    expect(G.studyFamilies.map(f => f.title)).toEqual(Juliet.STUDY_FAMILIES.map(f => f.title));
    G.studyFamilies.forEach((f, i) => {
      expect(f.body).toBe(Juliet.STUDY_FAMILIES[i].body.replace("Nigeria", "Ghana"));
    });
  });

  it("gives Manet Glenice's panel, which Tim marked \"no change\", with no contact details of her own", () => {
    expect(G.counsellor.name).toBe("Manet Khamayo");
    expect(G.counsellor.role).toBe("Gladys's dedicated Student Counsellor");
    expect(G.counsellor.headOfficeLine).toBe(Juliet.GLENICE_HEAD_OFFICE_LINE);
    expect(G.counsellor.panelBody[0]).toBe(Juliet.GLENICE_QUOTE);
    expect(G.counsellor.panelBody[1]).toBe(
      "Manet does not contact you at this stage. Gladys speaks to you first, and introduces you to Manet when you decide to go ahead.",
    );
    expect(G.counsellor.whatsapp).toBeUndefined();
    expect(G.counsellor.whatsappDigits).toBeUndefined();
    expect(G.counsellor.email).toBeUndefined();
  });

  it("explains how it works in his three steps, which are Juliet's with the names changed", () => {
    const swap = (s: string) => s.replace(/Juliet/g, "Gladys").replace(/Glenice Owino/g, "Manet Khamayo").replace(/Glenice/g, "Manet").replace(/Nigeria/g, "Ghana");
    expect(G.steps).toEqual(Juliet.STEPS.map(s => ({ title: swap(s.title), body: swap(s.body) })));
    expect(G.steps.map(s => s.title)).toEqual(["Speak to Gladys", "Gladys talks it through with you", "Manet takes your application forward"]);
  });

  it("closes with his four lines and both buttons", () => {
    expect(G.keyMessage).toEqual([
      "Gladys is your person in Ghana.",
      "Manet is your dedicated WSA Student Counsellor, linked to UK Head Office.",
      "WSA provides the infrastructure and expertise.",
      "The service is free.",
    ]);
  });

  it("embeds his Pipedrive form exactly as he sent it", () => {
    expect(G.form.embedUrl).toBe("https://webforms.pipedrive.com/f/6FzmqLZuj3P8GwoHDGL648Ia2jcrXuCILo9S7P21FJUHdS3p7W3xc0t6gWZHyRYbIL");
    expect(G.form.embedUrl).not.toBe(MADALITSO_PAGE.form.embedUrl);
  });

  it("promises no acknowledgement email, which Tim has not confirmed for this form", () => {
    expect(G.thankYou.body).toBe("Gladys will be in touch with you shortly.");
    expect(renderedCopy()).not.toMatch(/confirming that we have your enquiry/);
  });
});

describe("what the pages say", () => {
  it("uses no em dash, promises no response time and guarantees nothing", () => {
    const copy = renderedCopy();
    expect(copy).not.toContain("—");
    expect(copy).not.toMatch(/within \d+|24 hours|guarantee/i);
  });

  it("never mentions another representative or counsellor", () => {
    expect(renderedCopy()).not.toMatch(/Juliet|Glenice|Madalitso|Eldah|Malawi|Nigeria|Lagos/);
  });
});

describe("the template additions leave Madalitso's page as it was", () => {
  it("Madalitso sets neither, so he keeps his photograph poster and no credentials line", () => {
    expect((MADALITSO_PAGE as Template.AdvisorLandingContent).credentials).toBeUndefined();
    expect(MADALITSO_PAGE.podcast.poster).toBeUndefined();
  });
});

describe("the routes", () => {
  it("serves both pages, with the thank-you address Tim gave", () => {
    expect(G.thankYouPath).toBe("/speak-to-gladys-thank-you");
    for (const p of [G.path, G.thankYouPath]) {
      expect(isValidClientRoute(p), p).toBe(true);
      expect(VALID_CLIENT_ROUTES).toContain(p);
      expect(SEO_MAP[p]?.title, p).toContain("Gladys");
    }
  });

  it("publishes the landing page: indexable, in the sitemap and prerendered", () => {
    expect(NOINDEX_PATHS.has(G.path)).toBe(false);
    expect(shouldNoindex(G.path)).toBe(false);
    expect(ALL_PRERENDER_ROUTES).toContain(G.path);
    expect(SITEMAP).toContain("<loc>https://www.worldstudentadvisors.com/speak-to-gladys</loc>");
  });

  it("keeps the thank-you page private: noindex, out of the sitemap, not prerendered", () => {
    expect(shouldNoindex(G.thankYouPath)).toBe(true);
    expect(SITEMAP).not.toContain(G.thankYouPath);
    expect(ALL_PRERENDER_ROUTES).not.toContain(G.thankYouPath);
  });
});
