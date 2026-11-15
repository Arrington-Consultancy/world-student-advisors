import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { MANET_PAGE as E } from "../../client/src/lib/speakToManet";
import { DESTINATION_FLAGS, whatsappHref } from "../../client/src/lib/advisorLandingPage";
import { WSA_TEAM } from "../../client/src/lib/team";
import { LIBRARY_RESOURCES } from "../../shared/studentSupportLibrary";
import { NOINDEX_PATHS, SEO_MAP, shouldNoindex } from "../../shared/seo";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { getYouTubeVideoId } from "../../client/src/lib/youtube";

/**
 * Speak to Manet: Tim Hunt's email and mock-up of 12 November 2026, on
 * Eldah's structure. What these hold: Tim's wording from the mock-up, with
 * her specialism prominent; her number as on her Our Team record, which Tim
 * corrected on 15 September 2026 (his mock-up's differs and awaits his
 * confirmation); no email until he supplies it; WhatsApp as the main contact,
 * her number also ringing her, and her Pipedrive form as the alternative;
 * her WSA 038 video, her certificate and the
 * Student Success Stories link; the "WSA UK Head Office team" badge; the
 * page published and its thank-you page private.
 */

const PAGE = readFileSync("client/src/pages/CounsellorLandingPage.tsx", "utf8");
const SITEMAP = readFileSync("client/public/sitemap.xml", "utf8");
const APP = readFileSync("client/src/App.tsx", "utf8");

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every string a visitor can read on the two pages. */
function renderedCopy(): string {
  return [
    E.teamBadge, ...Object.values(E.hero).flatMap(v => (typeof v === "string" ? [v] : [...v])),
    E.person.name, E.person.photoAlt, E.person.whatsapp, E.person.firstMessage,
    ...E.trust, E.video.label, E.video.caption,
    E.credentials.heading, E.credentials.body, E.credentials.certificate.alt, E.credentials.certificate.linkLabel,
    E.help.heading, ...E.help.items.map(i => `${i.title} ${i.body}`),
    E.destinationsHeading, ...Object.values(E.stories),
    E.form.heading, E.form.supporting, E.form.privacyLine,
    ...Object.values(E.thankYou),
  ].join(" ");
}

describe("Manet's details", () => {
  const team = WSA_TEAM.find(m => m.slug === "manet-khamayo")!;

  it("match her Our Team record: name and number, the one Tim corrected on 15 September 2026", () => {
    expect(E.person.name).toBe(team.name);
    expect(E.person.whatsapp).toBe(team.phone);
    expect(E.person.whatsapp).toBe("+44 7555 546016");
    expect(E.person.whatsapp.replace(/\D/g, "")).toBe(E.person.whatsappDigits);
  });

  it("leave out her email until Tim supplies it", () => {
    expect("email" in E.person).toBe(false);
    expect(renderedCopy()).not.toMatch(/@worldstudentadvisors/);
  });

  it("keep her specialism prominent: in her title and the first line of her introduction", () => {
    expect(E.person.role).toBe("Student Counsellor, specialising in study destinations beyond the UK and online learning");
    expect(E.hero.intro[0]).toBe(
      "Hello, I’m Manet Khamayo, Student Counsellor at World Student Advisors, specialising in study destinations beyond the UK and online learning.",
    );
    expect(SEO_MAP[E.path]?.description).toContain("specialising in study destinations beyond the UK and online learning");
  });

  it("use the portrait Tim attached, on the site at its stated size", () => {
    expect(E.person.photo).toBe("/team/manet-khamayo-portrait.jpg");
    expect(existsSync(`client/public${E.person.photo}`)).toBe(true);
    expect([E.person.photoWidth, E.person.photoHeight]).toEqual([960, 960]);
  });
});

describe("the page Tim's mock-up shows", () => {
  it("leads with WhatsApp, the message already typed", () => {
    expect(E.hero.primaryCta).toBe("WhatsApp Manet");
    expect(whatsappHref(E.person.whatsappDigits, E.person.firstMessage)).toBe(
      `https://wa.me/447555546016?text=${encodeURIComponent("Hello Manet, I saw your WSA page and I would like to ask about studying abroad.")}`,
    );
  });

  it("rings her number as well, as the mock-up's phone icon and Tim's \"Telephone and WhatsApp\" show", () => {
    expect(E.person.callable).toBe(true);
  });

  it("carries his heading, introduction and free-of-charge line", () => {
    expect(E.hero.headline).toBe("Speak to Manet");
    expect(E.hero.subheading).toBe("Your dedicated WSA Student Counsellor");
    expect(E.hero.freeLine).toBe("Our advice and university application support are free of charge.");
  });

  it("says she is part of the WSA UK Head Office team, Tim's words, not that she is in the UK", () => {
    expect(E.teamBadge).toBe("WSA UK Head Office team");
    expect(renderedCopy()).not.toMatch(/based in the UK|lives in the UK|in Clevedon/i);
  });

  it("has his three trust points and three ways she can help", () => {
    expect(E.trust).toEqual(["British Council trained", "Personal guidance", "Support through to arrival"]);
    expect(E.help.items.map(i => i.title)).toEqual([
      "Choose your course and destination",
      "Prepare your applications",
      "Get ready for your next steps",
    ]);
  });

  it("plays WSA 038, her video, with the mock-up's caption, only when pressed", () => {
    const wsa034 = LIBRARY_RESOURCES.find(r => r.code === "WSA 038")!;
    expect(E.video.caption).toBe("Explore your study options beyond the UK and online.");
    expect(getYouTubeVideoId(wsa034.youtubeUrl)).toBe(E.video.youtubeId);
    expect(E.video.libraryPath).toBe(`/student-support-library/${wsa034.slug}`);
    expect(stripComments(PAGE)).toContain("const [playing, setPlaying] = useState(false);");
    expect(stripComments(PAGE)).toContain("youtube-nocookie.com/embed/");
  });

  it("shows her British Council certificate in a pop-up, claiming only that she completed the training", () => {
    expect(existsSync(`client/public${E.credentials.certificate.src}`)).toBe(true);
    expect(E.credentials.body).toContain("has completed British Council Agent and Counsellor Training");
    expect(renderedCopy()).not.toMatch(/accredit|endorse|approved by the British Council|certified by the British Council/i);
    expect(stripComments(PAGE)).toMatch(/<Dialog open=\{open\} onOpenChange=\{setOpen\}>/);
    expect(stripComments(PAGE)).toContain('className="z-[110]');
  });

  it("shows WSA's eight destinations and links to the Student Success Stories", () => {
    expect(stripComments(PAGE)).toContain("DESTINATION_FLAGS.map");
    expect(DESTINATION_FLAGS).toHaveLength(8);
    expect(E.stories.linkLabel).toBe("Read Student Success Stories");
    expect(stripComments(PAGE)).toContain("href={SUCCESS_STORIES_LINK}");
    expect(VALID_CLIENT_ROUTES).toContain("/student-success-stories");
  });

  it("embeds her Pipedrive form from Tim's links document exactly, through Pipedrive's loader", () => {
    expect(E.form.embedUrl).toBe(
      "https://webforms.pipedrive.com/f/5VLj1bLK2vka3aEDr9bzwJiq932HJNhcSd8cj1MCh714Ly41QrnLVJFYd1uTVzdLGz",
    );
    expect(E.form.heading).toBe("Prefer Manet to contact you?");
    expect(stripComments(PAGE)).toContain("data-pd-webforms={form.embedUrl}");
    expect(stripComments(PAGE)).not.toMatch(/fetch\(|trpc\.|method="post"/);
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
  it("serves both pages", () => {
    for (const p of [E.path, E.thankYouPath]) {
      expect(isValidClientRoute(p), p).toBe(true);
      expect(SEO_MAP[p]?.title, p).toContain("Manet");
    }
    expect(APP).toContain('<Route path={"/speak-to-manet"} component={SpeakToManet} />');
  });

  it("publishes the page: indexable, in the sitemap and prerendered", () => {
    expect(shouldNoindex(E.path)).toBe(false);
    expect(ALL_PRERENDER_ROUTES).toContain(E.path);
    expect(SITEMAP).toContain("<loc>https://www.worldstudentadvisors.com/speak-to-manet</loc>");
  });

  it("keeps the thank-you page private: noindex, out of the sitemap, not prerendered", () => {
    expect(NOINDEX_PATHS.has(E.thankYouPath)).toBe(true);
    expect(SITEMAP).not.toContain(E.thankYouPath);
    expect(ALL_PRERENDER_ROUTES).not.toContain(E.thankYouPath);
  });
});
