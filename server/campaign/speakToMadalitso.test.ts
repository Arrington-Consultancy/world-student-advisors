import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import * as Template from "../../client/src/lib/advisorLandingPage";
import { MADALITSO_PAGE as M } from "../../client/src/lib/speakToMadalitso";
import * as Juliet from "../../client/src/lib/speakToJuliet";
import { LIBRARY_RESOURCES, LIBRARY_RESOURCE_PATHS } from "../../shared/studentSupportLibrary";
import { NOINDEX_PATHS, SEO_MAP, shouldNoindex } from "../../shared/seo";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";

/**
 * Speak to Madalitso, the Malawi landing page, Tim Hunt's brief of 16
 * October 2026, on the country representative template built from Speak to
 * Juliet. What these hold: Madalitso's details exactly as Tim gave them
 * (the .co.uk address above all), his form unaltered, the shared WSA content
 * identical to Juliet's, Eldah with no contact details, the page published
 * and its thank-you page private, and nothing on either page that the brief
 * did not ask for.
 */

const PAGE = readFileSync("client/src/pages/AdvisorLandingPage.tsx", "utf8");
const THANK_YOU_PAGE = readFileSync("client/src/pages/AdvisorThankYouPage.tsx", "utf8");
const SITEMAP = readFileSync("client/public/sitemap.xml", "utf8");

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every string a visitor can read on the two pages. */
function renderedCopy(): string {
  return [
    ...Object.values(M.hero).flatMap(v => (typeof v === "string" ? [v] : Object.values(v))),
    M.advisor.name, M.advisor.role, M.advisor.location ?? "", M.advisor.photoAlt, M.advisor.organisation, M.advisor.intro,
    M.advisor.whatsapp ?? "", M.advisor.email ?? "", M.advisor.firstMessage,
    M.counsellor.name, M.counsellor.role, M.counsellor.photoAlt, M.counsellor.headOfficeLine, M.counsellor.panelHeading, ...M.counsellor.panelBody,
    M.podcast.title, M.podcast.blurb, M.podcast.libraryLabel ?? "",
    M.askHeading, ...M.studyFamilies.map(f => `${f.title} ${f.body}`), M.availabilityNote,
    ...M.steps.map(s => `${s.title} ${s.body}`), ...M.keyMessage,
    M.form.heading, M.form.supporting, M.form.privacyLine,
    ...Object.values(M.thankYou),
    ...Template.TRUST_LINE, Template.FREE_BADGE.heading, Template.FREE_BADGE.line, Template.BACKED_BY_LABEL,
    Template.SUPPORT_HEADING, Template.HELP_HEADING, Template.READY_HEADING, ...Template.SUPPORT_STEPS,
    Template.DESTINATIONS_HEADING, Template.WHERE_HEADING, Template.DESTINATIONS_LINE,
    ...Template.DESTINATIONS.map(d => `${d.name} ${d.body}`), ...Template.DESTINATION_FLAGS.map(f => `${f.name} ${f.alt}`),
    Template.FORM_FALLBACK.line, Template.FORM_FALLBACK.cta,
  ].join(" ");
}

describe("Madalitso's details, exactly as Tim Hunt gave them on 16 October 2026", () => {
  it("names him, his role and Blantyre", () => {
    expect(M.advisor.name).toBe("Madalitso Dube");
    expect(M.advisor.role).toBe("Director for Malawi");
    expect(M.advisor.location).toBe("Blantyre, Malawi");
  });

  it("uses his .co.uk address everywhere, never .com", () => {
    expect(M.advisor.email).toBe("madalitso@worldstudentadvisors.co.uk");
    const all = renderedCopy() + stripComments(PAGE) + stripComments(THANK_YOU_PAGE);
    expect(all).not.toMatch(/madalitso@worldstudentadvisors\.com/i);
    // Both pages take the address from the one record rather than spelling it out.
    expect(PAGE).toContain("mailto:${advisor.email}");
    expect(THANK_YOU_PAGE).toContain("mailto:${advisor.email}");
  });

  it("shows his WhatsApp number as Tim wrote it, and links the same digits", () => {
    // Tim Hunt, 23 October 2026: the first number's phone has stopped working.
    expect(M.advisor.whatsapp).toBe("+265 999 646 997");
    expect(M.advisor.whatsappDigits).toBe("265999646997");
    expect((M.advisor.whatsapp ?? "").replace(/\D/g, "")).toBe(M.advisor.whatsappDigits);
    expect(Template.whatsappHref(M.advisor.whatsappDigits!, M.advisor.firstMessage)).toBe(
      `https://wa.me/265999646997?text=${encodeURIComponent("Hello Madalitso, I saw the WSA page and I would like to ask about studying abroad.")}`,
    );
  });

  it("no longer sends anyone to the number whose phone stopped working", () => {
    for (const file of ["client/src/lib/speakToMadalitso.ts", "client/src/pages/AdvisorLandingPage.tsx", "client/src/pages/AdvisorThankYouPage.tsx", "client/src/lib/team.ts"]) {
      const code = readFileSync(file, "utf8").replace(/\/\/.*$/gm, "");
      expect(code).not.toContain("265888772850");
      expect(code).not.toContain("888 77 28 50");
    }
  });

  it("uses the photographs in Tim's mock-up, which are already on the site", () => {
    expect(existsSync(`client/public${M.advisor.photo}`)).toBe(true);
    expect(existsSync(`client/public${M.counsellor.photo}`)).toBe(true);
    expect(readFileSync("client/src/lib/team.ts", "utf8")).toContain(M.advisor.photo);
  });
});

describe("the page Tim Hunt described, section by section", () => {
  it("1. lives at /speak-to-madalitso, with Malawi's flag", () => {
    expect(M.path).toBe("/speak-to-madalitso");
    expect(M.country).toEqual({ name: "Malawi", flagCode: "mw" });
    expect(existsSync("client/public/flags/mw.svg")).toBe(true);
    expect(readFileSync("client/public/flags/mw.svg", "utf8")).toContain('id="flag-icons-mw"');
  });

  it("3. carries his heading, introduction, trust messages and button", () => {
    expect(M.hero.eyebrow).toBe("For the people of Malawi");
    expect(M.hero.headline).toBe("Thinking about studying abroad? Speak to Madalitso.");
    expect(M.hero.supporting).toBe("Free, personal support for Malawian students and families from Madalitso and the World Student Advisors team.");
    expect(Template.TRUST_LINE).toEqual(["Backed by WSA UK Head Office", "British Council UK knowledge-trained counsellors", "With you from application to enrolment"]);
    expect(M.hero.primaryCta).toBe("Message Madalitso on WhatsApp");
  });

  it("5. puts WSA 037 under Meet Madalitso, the recording already in the Student Support Library", () => {
    const wsa037 = LIBRARY_RESOURCES.find(r => r.code === "WSA 037");
    expect(wsa037?.youtubeUrl).toContain(M.podcast.youtubeId);
    expect(M.podcast.title).toBe("Meet Madalitso");
    expect(M.podcast.libraryPath).toBe("/student-support-library/madalitso-dube-director-for-malawi");
    expect(LIBRARY_RESOURCE_PATHS).toContain(M.podcast.libraryPath);
    expect(PAGE).toContain("youtube-nocookie.com/embed/");
    expect(PAGE).toContain("useState(false)");
  });

  it("6. gives Eldah her panel in Tim's suggested wording, with no contact details of her own", () => {
    expect(M.counsellor.name).toBe("Eldah Therone");
    expect(M.counsellor.panelBody).toEqual([
      "Madalitso is your first point of contact in Malawi. When you are ready to proceed, he introduces you to Eldah, who supports your course selection, applications and visa preparation. Madalitso remains involved throughout your journey.",
    ]);
    expect(M.counsellor.whatsapp).toBeUndefined();
    expect(M.counsellor.whatsappDigits).toBeUndefined();
    expect(M.counsellor.email).toBeUndefined();
    expect(stripComments(PAGE)).not.toMatch(/counsellor\.(email|whatsapp)/);
  });

  it("7. asks about the four families from Juliet's page, with Malawi in Online study", () => {
    expect(M.askHeading).toBe("What you can ask Madalitso about");
    expect(M.studyFamilies.map(f => f.title)).toEqual(Juliet.STUDY_FAMILIES.map(f => f.title));
    M.studyFamilies.forEach((f, i) => {
      expect(f.body).toBe(Juliet.STUDY_FAMILIES[i].body.replace("Nigeria", "Malawi"));
    });
  });

  it("8. explains how it works in his three steps", () => {
    expect(M.steps).toEqual([
      { title: "Speak to Madalitso", body: "Contact Madalitso on WhatsApp or complete the enquiry form." },
      { title: "Madalitso discusses your options", body: "Madalitso helps you explore suitable courses, universities and destinations, taking account of your qualifications, ambitions and budget." },
      { title: "Eldah takes your application forward", body: "When you're ready to proceed, Madalitso introduces you to Eldah Therone, your dedicated WSA Student Counsellor. Eldah supports your applications and visa preparation, while Madalitso remains involved." },
    ]);
  });

  it("9. embeds his tested Pipedrive form exactly, through Pipedrive's own loader, and posts nothing itself", () => {
    expect(M.form.embedUrl).toBe("https://webforms.pipedrive.com/f/6FBbycG4wTfm62tM1Vlu80jIF2PTcZ6TbHsoiumvEGG6UDug9KFPWb39sXsaF1TcmT");
    expect(Template.PIPEDRIVE_LOADER_SRC).toBe(Juliet.PIPEDRIVE_FORM.loaderSrc);
    const code = stripComments(PAGE);
    expect(code).toContain("data-pd-webforms={form.embedUrl}");
    expect(code).not.toMatch(/<form|trpc|fetch\(|axios/);
    const hosts = new Set([...code.matchAll(/https:\/\/([a-z0-9.-]+)/g)].map(m => m[1]));
    // The page names only YouTube's no-cookie host; WhatsApp links are built in the template lib.
    expect([...hosts].sort()).toEqual(["www.youtube-nocookie.com"]);
  });

  it("11. closes with his dark-blue section, his four lines and both buttons", () => {
    expect(Template.READY_HEADING).toBe("Ready to start?");
    expect(M.keyMessage).toEqual([
      "Madalitso is your person in Malawi.",
      "Eldah is your dedicated WSA Student Counsellor, linked to UK Head Office.",
      "WSA provides the infrastructure and expertise.",
      "The service is free.",
    ]);
    expect(M.hero.secondary.cta).toBe("Send my details to Madalitso");
    expect(PAGE).toContain("bg-wsa-navy");
  });
});

describe("the shared WSA content stays identical to Speak to Juliet's", () => {
  it("4. the same seven service areas and the same destinations", () => {
    expect(Template.SUPPORT_STEPS).toEqual(Juliet.SUPPORT_STEPS);
    expect(Template.SUPPORT_HEADING).toBe(Juliet.SUPPORT_HEADING);
    expect(Template.HELP_HEADING).toBe(Juliet.HELP_HEADING);
    expect(Template.DESTINATION_FLAGS.map(f => [f.name, f.code])).toEqual(Juliet.DESTINATION_FLAGS.map(f => [f.name, f.code]));
    expect(Template.DESTINATIONS).toEqual(Juliet.DESTINATIONS);
    expect(Template.DESTINATIONS_LINE).toBe(Juliet.DESTINATIONS_LINE);
    for (const f of Template.DESTINATION_FLAGS) expect(existsSync(`client/public/flags/${f.code}.svg`), f.code).toBe(true);
  });

  it("the trust line, badge and closing heading", () => {
    expect(Template.TRUST_LINE).toEqual(Juliet.TRUST_LINE);
    expect(Template.FREE_BADGE).toEqual(Juliet.FREE_BADGE);
    expect(Template.BACKED_BY_LABEL).toBe(Juliet.BACKED_BY_LABEL);
    expect(Template.READY_HEADING).toBe(Juliet.READY_HEADING);
    expect(Template.FREE_SERVICE_LINE).toBe(Juliet.FREE_SERVICE_LINE);
  });

  it("leaves Speak to Juliet's own page untouched", () => {
    const juliet = readFileSync("client/src/pages/SpeakToJuliet.tsx", "utf8");
    expect(juliet).not.toContain("advisorLandingPage");
  });
});

describe("what the pages say", () => {
  it("uses no em dash, promises no response time and guarantees nothing", () => {
    const copy = renderedCopy();
    expect(copy).not.toContain("—");
    expect(copy).not.toMatch(/within \d+|24 hours|guarantee/i);
  });
});

describe("the routes", () => {
  it("10. serves both pages", () => {
    for (const p of [M.path, M.thankYouPath]) {
      expect(isValidClientRoute(p), p).toBe(true);
      expect(VALID_CLIENT_ROUTES).toContain(p);
      expect(SEO_MAP[p]?.title, p).toContain("Madalitso");
    }
    expect(M.thankYouPath).toBe("/speak-to-madalitso/thank-you");
  });

  it("publishes the landing page: indexable, in the sitemap and prerendered", () => {
    expect(NOINDEX_PATHS.has(M.path)).toBe(false);
    expect(shouldNoindex(M.path)).toBe(false);
    expect(ALL_PRERENDER_ROUTES).toContain(M.path);
    expect(SITEMAP).toContain("<loc>https://www.worldstudentadvisors.com/speak-to-madalitso</loc>");
  });

  it("keeps the thank-you page private: noindex, out of the sitemap, not prerendered, linked from nowhere", () => {
    expect(shouldNoindex(M.thankYouPath)).toBe(true);
    expect(SITEMAP).not.toContain(M.thankYouPath);
    expect(ALL_PRERENDER_ROUTES).not.toContain(M.thankYouPath);
    expect(stripComments(PAGE)).not.toMatch(/thank-?you/i);
  });
});

describe("the thank-you page", () => {
  it("captures nothing and reports no conversion", () => {
    const code = stripComments(THANK_YOU_PAGE);
    expect(code).not.toMatch(/<form|<input|<select|<textarea|trpc|fetch\(|pipedrive/i);
    expect(code).not.toMatch(/reportSignupConversion|trackMetaLead|gtag|fbq/);
  });

  it("thanks the student in Madalitso's name and offers WhatsApp and his .co.uk email", () => {
    expect(M.thankYou.headline).toBe("Thank you. Your details are with Madalitso.");
    expect(M.thankYou.body).toContain("You will also receive an email confirming that we have your enquiry.");
    expect(THANK_YOU_PAGE).toContain("whatsappHref(advisor.whatsappDigits");
    expect(THANK_YOU_PAGE).toContain("href={content.path}");
  });
});
