import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { CLAUDIA_PAGE as C } from "../../client/src/lib/speakToClaudia";
import { ELDAH_PAGE } from "../../client/src/lib/speakToEldah";
import { REGISTRATION_FORM_URL, REGISTRATION_THANK_YOU_PATH } from "../../client/src/lib/registrationForm";
import { DESTINATION_FLAGS, whatsappHref } from "../../client/src/lib/advisorLandingPage";
import { WSA_TEAM } from "../../client/src/lib/team";
import { LIBRARY_RESOURCES } from "../../shared/studentSupportLibrary";
import { SEO_MAP, shouldNoindex } from "../../shared/seo";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { getYouTubeVideoId } from "../../client/src/lib/youtube";

/**
 * Speak to Claudia: Tim Hunt's email and mock-up of 14 November 2026, on
 * the counsellor template. What these hold: Tim's wording; her number for
 * WhatsApp and for a call; no certificate, no British Council line and no
 * video of her; WSA 039 shown with a WSA poster; the Website Registration
 * Form, which already routes to Claudia and sends students to
 * /contact/thank-you; and the page published.
 */

const PAGE = readFileSync("client/src/pages/CounsellorLandingPage.tsx", "utf8");
const SITEMAP = readFileSync("client/public/sitemap.xml", "utf8");
const APP = readFileSync("client/src/App.tsx", "utf8");

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every string a visitor can read on the page. */
function renderedCopy(): string {
  return [
    C.teamBadge, C.hero.headline, C.hero.subheading, ...C.hero.intro, C.hero.freeLine, C.hero.primaryCta,
    C.person.name, C.person.role, C.person.photoAlt, C.person.whatsapp, C.person.email, C.person.firstMessage,
    ...C.trust, C.help.heading, ...C.help.items.map(i => `${i.title} ${i.body}`),
    C.destinationsHeading, ...Object.values(C.podcast), ...Object.values(C.stories),
    C.form.heading, C.form.supporting, C.form.privacyLine,
  ].join(" ");
}

describe("Claudia's details", () => {
  const team = WSA_TEAM.find(m => m.slug === "claudia-ingado")!;

  it("match her Our Team record: name, WSA address and number", () => {
    expect(C.person.name).toBe(team.name);
    expect(C.person.email).toBe(team.email);
    expect(C.person.whatsapp).toBe(team.phone);
    expect(C.person.whatsapp).toBe("+44 7341 905 979");
    expect(C.person.whatsapp.replace(/\D/g, "")).toBe(C.person.whatsappDigits);
  });

  it("use the job title Tim gave", () => {
    expect(C.person.role).toBe("Student Recruitment Relationship Manager");
    expect(C.hero.showNameAndRole).toBe(true);
  });

  it("use the photograph Tim attached, on the site at its stated size", () => {
    expect(C.person.photo).toBe("/team/claudia-ingado-portrait.jpg");
    expect(existsSync(`client/public${C.person.photo}`)).toBe(true);
    expect([C.person.photoWidth, C.person.photoHeight]).toEqual([960, 960]);
  });
});

describe("the page Tim's mock-up shows", () => {
  it("leads with WhatsApp, the message already typed", () => {
    expect(C.hero.primaryCta).toBe("WhatsApp Claudia");
    expect(whatsappHref(C.person.whatsappDigits, C.person.firstMessage)).toBe(
      `https://wa.me/447341905979?text=${encodeURIComponent("Hello Claudia, I saw your WSA page and I would like to talk about studying abroad.")}`,
    );
  });

  it("rings her number too, as Tim asked, while Eldah's number still opens WhatsApp", () => {
    expect(C.person.callable).toBe(true);
    expect("callable" in ELDAH_PAGE.person).toBe(false);
    expect(stripComments(PAGE)).toContain("href={`tel:+${person.whatsappDigits}`}");
  });

  it("carries his heading, introduction and free-of-charge line", () => {
    expect(C.hero.headline).toBe("Speak to Claudia");
    expect(C.hero.subheading).toBe("Your first step towards studying abroad");
    expect(C.hero.intro).toEqual([
      "Hello, I’m Claudia. I’ll help you explore your study and career goals, understand your options and plan an affordable route to an international university.",
      "When you are ready, I’ll introduce you to a WSA Student Counsellor for your applications and next steps.",
    ]);
    expect(C.hero.freeLine).toBe("Our advice and university application support are free of charge.");
    expect(C.teamBadge).toBe("WSA UK Head Office team");
  });

  it("claims no British Council training, certificate or podcast of her own", () => {
    expect("credentials" in C).toBe(false);
    expect("video" in C).toBe(false);
    expect(renderedCopy()).not.toMatch(/British Council|certif|accredit|my podcast|her podcast/i);
  });

  it("has his three trust points and three study plan cards", () => {
    expect(C.trust).toEqual(["Your study goals", "Practical guidance", "The wider WSA team"]);
    expect(C.help.heading).toBe("Let’s build your study plan");
    expect(C.help.items.map(i => i.title)).toEqual(["Your goals", "Your budget", "Your next steps"]);
  });

  it("plays WSA 039 from the Student Support Library, with a WSA poster, only when pressed", () => {
    const wsa039 = LIBRARY_RESOURCES.find(r => r.code === "WSA 039")!;
    expect(C.podcast.code).toBe(wsa039.code);
    expect(C.podcast.title).toBe(wsa039.title);
    expect(getYouTubeVideoId(wsa039.youtubeUrl)).toBe(C.podcast.youtubeId);
    expect(C.podcast.libraryPath).toBe(`/student-support-library/${wsa039.slug}`);
    const podcast = stripComments(PAGE).split("function Podcast(")[1].split("\nfunction ")[0];
    expect(podcast).toContain("const [playing, setPlaying] = useState(false);");
    expect(podcast).toContain("<Mic ");
    expect(podcast).not.toContain("person.photo");
  });

  it("shows WSA's eight destinations and links to the Student Success Stories", () => {
    expect(DESTINATION_FLAGS).toHaveLength(8);
    expect(C.stories.linkLabel).toBe("Read Student Success Stories");
    expect(VALID_CLIENT_ROUTES).toContain("/student-success-stories");
  });

  it("embeds the Website Registration Form from Tim's links document, which already routes to Claudia", () => {
    expect(C.form.embedUrl).toBe(REGISTRATION_FORM_URL);
    expect(C.form.embedUrl).toBe(
      "https://webforms.pipedrive.com/f/ctvQhNxYDb7IJn9tWaOdddYbPkg4UqRGmkTf7T91AfKENzMr8pOcVbBKsWgerujteP",
    );
    expect(C.form.heading).toBe("Prefer Claudia to contact you?");
  });

  it("relies on that form's own thank-you page rather than a second one", () => {
    expect(C.thankYouPath).toBe(REGISTRATION_THANK_YOU_PATH);
    expect("thankYou" in C).toBe(false);
    expect(isValidClientRoute("/speak-to-claudia/thank-you")).toBe(false);
  });
});

describe("what the page says", () => {
  it("uses no em dash, promises no response time and guarantees nothing", () => {
    const copy = renderedCopy();
    expect(copy).not.toContain("—");
    expect(copy).not.toMatch(/within \d+|24 hours|guarantee/i);
  });
});

describe("the route", () => {
  it("serves the page", () => {
    expect(isValidClientRoute(C.path)).toBe(true);
    expect(SEO_MAP[C.path]?.title).toContain("Claudia");
    expect(APP).toContain('<Route path={"/speak-to-claudia"} component={SpeakToClaudia} />');
  });

  it("publishes it: indexable, in the sitemap and prerendered", () => {
    expect(shouldNoindex(C.path)).toBe(false);
    expect(ALL_PRERENDER_ROUTES).toContain(C.path);
    expect(SITEMAP).toContain("<loc>https://www.worldstudentadvisors.com/speak-to-claudia</loc>");
  });
});
