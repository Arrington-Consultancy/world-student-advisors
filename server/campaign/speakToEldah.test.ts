import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { ELDAH_PAGE as E } from "../../client/src/lib/speakToEldah";
import { DESTINATION_FLAGS, whatsappHref } from "../../client/src/lib/advisorLandingPage";
import { WSA_TEAM } from "../../client/src/lib/team";
import { LIBRARY_RESOURCES } from "../../shared/studentSupportLibrary";
import { NOINDEX_PATHS, SEO_MAP, shouldNoindex } from "../../shared/seo";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { getYouTubeVideoId } from "../../client/src/lib/youtube";

/**
 * Speak to Eldah, the first Student Counsellor page: Tim Hunt's email and
 * mock-up of 12 November 2026. What these hold: Tim's wording from the
 * mock-up; Eldah's contact details as on her Our Team record; WhatsApp as
 * the main contact with Tim's tested Pipedrive form as the alternative;
 * her video, certificate and the Student Success Stories link; the "WSA UK
 * Head Office team" badge in Tim's own words; the page published and its
 * thank-you page private; and a template Glenice's and Manet's pages can
 * reuse.
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
    E.person.name, E.person.photoAlt, E.person.whatsapp, E.person.email, E.person.firstMessage,
    ...E.trust, E.video.label, E.video.caption,
    E.credentials.heading, E.credentials.body, E.credentials.certificate.alt, E.credentials.certificate.linkLabel,
    E.help.heading, ...E.help.items.map(i => `${i.title} ${i.body}`),
    E.destinationsHeading, ...Object.values(E.stories),
    E.form.heading, E.form.supporting, E.form.privacyLine,
    ...Object.values(E.thankYou),
  ].join(" ");
}

describe("Eldah's details", () => {
  const team = WSA_TEAM.find(m => m.slug === "eldah-therone")!;

  it("match her Our Team record: name, WSA address and the UK Head Office WhatsApp", () => {
    expect(E.person.name).toBe(team.name);
    expect(E.person.email).toBe(team.email);
    expect(E.person.whatsapp).toBe(team.phone);
    expect(E.person.whatsapp).toBe("+44 7470 689 849");
    expect(E.person.whatsapp.replace(/\D/g, "")).toBe(E.person.whatsappDigits);
  });

  it("use the role Tim wrote in the mock-up", () => {
    expect(E.person.role).toBe("Team Leader and Senior Student Counsellor");
    expect(E.hero.intro[0]).toBe("Hello, I’m Eldah Therone, Team Leader and Senior Student Counsellor at World Student Advisors.");
  });

  it("use the portrait Tim attached, on the site at its stated size", () => {
    expect(E.person.photo).toBe("/team/eldah-therone-portrait.jpg");
    expect(existsSync(`client/public${E.person.photo}`)).toBe(true);
    expect([E.person.photoWidth, E.person.photoHeight]).toEqual([960, 920]);
  });
});

describe("the page Tim's mock-up shows", () => {
  it("leads with WhatsApp, the message already typed", () => {
    expect(E.hero.primaryCta).toBe("WhatsApp Eldah");
    expect(whatsappHref(E.person.whatsappDigits, E.person.firstMessage)).toBe(
      `https://wa.me/447470689849?text=${encodeURIComponent("Hello Eldah, I saw your WSA page and I would like to ask about studying abroad.")}`,
    );
  });

  it("carries his heading, introduction and free-of-charge line", () => {
    expect(E.hero.headline).toBe("Speak to Eldah");
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

  it("plays WSA 034, her video from the Student Support Library, only when pressed", () => {
    const wsa034 = LIBRARY_RESOURCES.find(r => r.code === "WSA 034")!;
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

  it("embeds Tim's tested Pipedrive form exactly, through Pipedrive's loader", () => {
    expect(E.form.embedUrl).toBe(
      "https://webforms.pipedrive.com/f/6rJKJRIG1HiEmgyINvRSmovbZiPwVnlN23DlkYHqaI6HgnEAICQLikJDzRLpBxSUcH",
    );
    expect(E.form.heading).toBe("Prefer Eldah to contact you?");
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
      expect(SEO_MAP[p]?.title, p).toContain("Eldah");
    }
    expect(APP).toContain('<Route path={"/speak-to-eldah"} component={SpeakToEldah} />');
  });

  it("publishes the page: indexable, in the sitemap and prerendered", () => {
    expect(shouldNoindex(E.path)).toBe(false);
    expect(ALL_PRERENDER_ROUTES).toContain(E.path);
    expect(SITEMAP).toContain("<loc>https://www.worldstudentadvisors.com/speak-to-eldah</loc>");
  });

  it("keeps the thank-you page private: noindex, out of the sitemap, not prerendered", () => {
    expect(NOINDEX_PATHS.has(E.thankYouPath)).toBe(true);
    expect(SITEMAP).not.toContain(E.thankYouPath);
    expect(ALL_PRERENDER_ROUTES).not.toContain(E.thankYouPath);
  });
});
