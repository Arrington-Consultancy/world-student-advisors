import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  AVAILABILITY_NOTE,
  BRIEF_CONFLICTS,
  DESTINATIONS,
  DESTINATIONS_LINE,
  CAMPAIGN_SLUG,
  GLENICE,
  GLENICE_QUOTE,
  HERO,
  JULIET,
  JULIET_ORGANISATION,
  JULIET_PODCAST,
  GLENICE_HEAD_OFFICE_LINE,
  KEY_MESSAGE,
  PIPEDRIVE_FORM,
  STEPS,
  STUDY_FAMILIES,
  SUPPORT_HEADING,
  SUPPORT_STEPS,
  WHATSAPP_FIRST_MESSAGE,
  WITHDRAWN_PODCAST_IDS,
  whatsappHref,
} from "../../client/src/lib/speakToJuliet";
import { CANONICAL_PATHS, NOINDEX_PATHS, SEO_MAP, getCanonicalPath, shouldNoindex } from "../../shared/seo";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";

/**
 * Speak to Juliet, the Nigeria landing page built 19 September 2026 to Tom
 * Arrington's implementation brief and revised 24 September 2026 to Tim
 * Hunt's edits.
 *
 * What these tests hold, in order of how much damage the failure would do:
 * the page's form is Tim Hunt's Pipedrive form exactly as he supplied it and
 * the page calls nothing else, WhatsApp opens the right number with the
 * right message, no withdrawn podcast can come back, the
 * alias redirects to one canonical URL, and no claim appears that WSA cannot
 * evidence.
 */

const PAGE_SOURCE = readFileSync("client/src/pages/SpeakToJuliet.tsx", "utf8");

/**
 * Comments are not shipped code, and a comment that explains why a thing is
 * absent naturally names the thing. Stripped before any check that asks what
 * the page actually does, the same way server/siteCopy.test.ts does it.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const PAGE_CODE = stripComments(PAGE_SOURCE);
const LIB_CODE = stripComments(readFileSync("client/src/lib/speakToJuliet.ts", "utf8"));

/**
 * Every string the page actually renders. BRIEF_CONFLICTS deliberately quotes
 * wording the page rejects, so a check on what the visitor reads must look at
 * the rendered copy and not at the source file.
 */
function renderedCopy(): string {
  return [
    HERO.eyebrow, HERO.headline, HERO.supporting, HERO.primaryCta, HERO.secondaryCta,
    JULIET.name, JULIET.role, JULIET.location ?? "", JULIET.photoAlt, JULIET_ORGANISATION,
    GLENICE.name, GLENICE.role, GLENICE.photoAlt, GLENICE_QUOTE, GLENICE_HEAD_OFFICE_LINE,
    SUPPORT_HEADING, ...KEY_MESSAGE,
    DESTINATIONS_LINE, AVAILABILITY_NOTE,
    ...STUDY_FAMILIES.map(f => `${f.title} ${f.body}`),
    ...DESTINATIONS.map(d => `${d.name} ${d.body}`),
    ...STEPS.map(s => `${s.title} ${s.body}`),
    ...SUPPORT_STEPS,
    JULIET_PODCAST.title, JULIET_PODCAST.blurb, JULIET_PODCAST.awaitingLine,
    PIPEDRIVE_FORM.heading, PIPEDRIVE_FORM.supporting, PIPEDRIVE_FORM.fallbackLine, PIPEDRIVE_FORM.fallbackCta,
  ].join(" ");
}

/** The embed code exactly as Tim Hunt sent it on 23 September 2026. */
const TIM_EMBED_URL = "https://webforms.pipedrive.com/f/6q9NP6Qklnnpo5qbQ9NZiyPUfxG86g8tN4BJztkTp80lcM8G8dExsiKe6jTWJCzYwr";
const TIM_LOADER_SRC = "https://webforms.pipedrive.com/f/loader";

describe("the form is Tim Hunt's Pipedrive form, unaltered", () => {
  it("embeds the exact form he supplied, through the exact loader he supplied", () => {
    expect(PIPEDRIVE_FORM.embedUrl).toBe(TIM_EMBED_URL);
    expect(PIPEDRIVE_FORM.loaderSrc).toBe(TIM_LOADER_SRC);
    // The placeholder carries Pipedrive's class and data attribute, which is
    // what its loader looks for. Nothing about the form is reproduced here.
    expect(PAGE_SOURCE).toContain('className="pipedriveWebForms');
    expect(PAGE_SOURCE).toContain("data-pd-webforms={PIPEDRIVE_FORM.embedUrl}");
    expect(PAGE_SOURCE).toContain("script.src = PIPEDRIVE_FORM.loaderSrc");
  });

  it("the page no longer carries a form of its own, so there is one form and one CRM workflow", () => {
    for (const gone of ["<form", "<input", "<select", "params.set(", "/contact?", "#student-signup", "FallbackForm", "toInternationalNigerianNumber"]) {
      expect(PAGE_CODE, `page code must no longer contain ${gone}`).not.toContain(gone);
    }
  });

  it("never posts to an API or a CRM from this codebase: the submission is Pipedrive's alone", () => {
    for (const forbidden of ["fetch(", "XMLHttpRequest", "useMutation", "trpc.", "api.pipedrive.com", "PIPEDRIVE_API"]) {
      expect(PAGE_CODE.toLowerCase(), `page code must not contain ${forbidden}`).not.toContain(forbidden.toLowerCase());
    }
    expect(LIB_CODE).not.toContain("api.pipedrive.com");
  });

  it("loads the loader only after the placeholder has mounted, and removes it on leaving, so a second visit works", () => {
    // A <script> in JSX does not execute; the effect is the only correct
    // place, and it has to clean up or the SPA accumulates loaders.
    expect(PAGE_SOURCE).not.toMatch(/<script/);
    expect(PAGE_SOURCE).toContain('document.createElement("script")');
    expect(PAGE_SOURCE).toContain("document.body.appendChild(script)");
    expect(PAGE_SOURCE).toContain("script.remove()");
    expect(PAGE_SOURCE.indexOf("useEffect(() => {\n    const el = host.current")).toBeGreaterThan(-1);
  });

  it("offers the form's own URL as a fallback until the iframe has arrived", () => {
    expect(PAGE_SOURCE).toContain("href={PIPEDRIVE_FORM.embedUrl}");
    expect(PAGE_SOURCE).toContain("{!embedded && (");
    expect(PIPEDRIVE_FORM.fallbackLine.toLowerCase()).toContain("open it");
  });

  it("the only third-party hosts the page names are Pipedrive's form host and YouTube's no-cookie embed", () => {
    const hosts = new Set(
      [...`${PAGE_CODE} ${LIB_CODE}`.matchAll(/https:\/\/([a-z0-9.-]+)\//g)].map(m => m[1]),
    );
    hosts.delete("wa.me");
    expect([...hosts].sort()).toEqual(["webforms.pipedrive.com", "www.youtube-nocookie.com"]);
  });

  it("keeps the retired website route's identifier only as documentation of what still resolves on the server", () => {
    // The signup procedure still honours campaign=speak-to-juliet for any
    // link already circulating (server/campaign/*.test.ts). The page itself
    // no longer sends anyone there.
    expect(CAMPAIGN_SLUG).toBe("speak-to-juliet");
    expect(PAGE_CODE).not.toContain("CAMPAIGN_SLUG");
  });

  it("promises Juliet will come back, which is the Pipedrive workflow Tim Hunt confirmed", () => {
    expect(PIPEDRIVE_FORM.supporting).toContain("Juliet will come back to you");
    expect(PIPEDRIVE_FORM.heading).toBe("Would rather not message?");
  });
});

describe("WhatsApp, the primary action", () => {
  it("builds Juliet's link with her number and the first message already written", () => {
    const href = whatsappHref(JULIET.whatsappDigits ?? "", WHATSAPP_FIRST_MESSAGE);
    expect(href.startsWith("https://wa.me/2348035837934?text=")).toBe(true);
    expect(decodeURIComponent(href.split("?text=")[1])).toBe(WHATSAPP_FIRST_MESSAGE);
  });

  it("the digits match the number shown on the page, with no punctuation", () => {
    expect(JULIET.whatsappDigits).toBe(JULIET.whatsapp?.replace(/[^0-9]/g, ""));
    expect(JULIET.whatsappDigits).toMatch(/^[0-9]+$/);
  });

  it("the first message names Juliet and says what the person wants, without promising anything", () => {
    expect(WHATSAPP_FIRST_MESSAGE).toContain("Juliet");
    expect(WHATSAPP_FIRST_MESSAGE.length).toBeLessThan(160);
  });

  it("the sticky bar is a phone-only fallback that waits for the hero button to leave", () => {
    expect(PAGE_SOURCE).toContain("IntersectionObserver");
    expect(PAGE_SOURCE).toContain("sm:hidden");
    expect(PAGE_SOURCE).toContain("env(safe-area-inset-bottom, 0px)");
  });
});

describe("the route, the alias and the metadata", () => {
  it("serves the canonical page", () => {
    expect(isValidClientRoute("/speak-to-juliet")).toBe(true);
    expect(VALID_CLIENT_ROUTES).toContain("/speak-to-juliet");
  });

  it("redirects both spellings of Tim's short link to the canonical route", () => {
    expect(CANONICAL_PATHS["/LPJuliet"]).toBe("/speak-to-juliet");
    expect(CANONICAL_PATHS["/lpjuliet"]).toBe("/speak-to-juliet");
    expect(getCanonicalPath("/LPJuliet")).toBe("/speak-to-juliet");
  });

  it("the alias is not itself a route, so it can never render a second copy of the page", () => {
    expect(isValidClientRoute("/LPJuliet")).toBe(false);
    expect(isValidClientRoute("/lpjuliet")).toBe(false);
  });

  it("the canonical route is canonical to itself, so the redirect cannot chain", () => {
    expect(getCanonicalPath("/speak-to-juliet")).toBe("/speak-to-juliet");
    expect(CANONICAL_PATHS["/speak-to-juliet"]).toBeUndefined();
  });

  it("has its own title and description", () => {
    const seo = SEO_MAP["/speak-to-juliet"];
    expect(seo?.title).toContain("Juliet");
    expect(seo?.description).toContain("Lagos");
  });

  it("stays out of the index until Tom Arrington's separate GO to publish it", () => {
    // Indexing, the sitemap and the prerender list change together on that
    // GO, as /nigeria-postgraduate did. Tim Hunt's revision is not that GO.
    expect(NOINDEX_PATHS.has("/speak-to-juliet")).toBe(true);
    expect(shouldNoindex("/speak-to-juliet")).toBe(true);
    expect(ALL_PRERENDER_ROUTES).not.toContain("/speak-to-juliet");
  });
});

describe("what the page says", () => {
  it("leads with the headline and the primary action from the brief", () => {
    expect(HERO.headline).toBe("Thinking about studying abroad? Speak to Juliet.");
    expect(HERO.eyebrow).toBe("For the people of Nigeria");
    expect(HERO.primaryCta).toContain("WhatsApp");
  });

  it("promises no response time anywhere", () => {
    const allCopy = renderedCopy().toLowerCase();
    for (const promise of ["24 hour", "24-hour", "48 hour", "within a day", "same day", "immediately"]) {
      expect(allCopy, `must not promise "${promise}"`).not.toContain(promise);
    }
  });

  it("states plainly that the service is free, which Tim Hunt confirmed in writing", () => {
    expect(HERO.supporting).toBe(
      "Free, personal support for Nigerian students and families from Juliet and the WorldStudentAdvisors team.",
    );
    expect(KEY_MESSAGE).toContain("The service is free.");
    expect(SUPPORT_HEADING).toBe("Free service from WSA");
  });

  it("describes no destination in terms of work, migration or settlement", () => {
    const allCopy = [
      DESTINATIONS_LINE, AVAILABILITY_NOTE,
      ...STUDY_FAMILIES.map(f => f.body),
      ...DESTINATIONS.map(d => `${d.name} ${d.body}`),
    ].join(" ").toLowerCase();
    for (const banned of ["skilled", "employment", "job", "career opportunit", "migrat", "settle", "residency", "work permit", "work visa"]) {
      expect(allCopy, `must not mention "${banned}"`).not.toContain(banned);
    }
  });

  it("claims nothing about rankings, outcomes or university relationships", () => {
    const allCopy = [
      HERO.supporting, DESTINATIONS_LINE, AVAILABILITY_NOTE,
      ...STEPS.map(s => s.body), ...STUDY_FAMILIES.map(f => f.body),
      ...DESTINATIONS.map(d => `${d.name} ${d.body}`),
      ...SUPPORT_STEPS,
    ].join(" ").toLowerCase();
    for (const banned of ["ranked", "ranking", "top 10", "success rate", "guarantee", "partner universit", "accredited"]) {
      expect(allCopy, `must not claim "${banned}"`).not.toContain(banned);
    }
  });

  it("states the availability caveat once, so no family reads as a standing offer", () => {
    expect(AVAILABILITY_NOTE.toLowerCase()).toContain("depends on");
  });
});

describe("the two people, as Tim Hunt arranged them on 24 September 2026", () => {
  it("puts Juliet first and gives her the page", () => {
    expect(JULIET.name).toBe("Juliet Nnajiofor-Uyi");
    expect(JULIET.role).toBe("Higher Education Advisor");
    expect(JULIET.location).toBe("Lagos, Nigeria");
    expect(PAGE_SOURCE.indexOf("{JULIET.name}")).toBeLessThan(PAGE_SOURCE.indexOf("{GLENICE.name}"));
  });

  it("captions her hero photograph with his four lines: name, role, WorldStudentAdvisors, Lagos", () => {
    expect(JULIET_ORGANISATION).toBe("WorldStudentAdvisors");
    const figure = PAGE_SOURCE.slice(PAGE_SOURCE.indexOf("<figure"), PAGE_SOURCE.indexOf("</figure>"));
    expect(figure).toContain("src={JULIET.photo}");
    expect(figure).toContain("<figcaption");
    for (const line of ["{JULIET.name}", "{JULIET.role}", "{JULIET_ORGANISATION}", "{JULIET.location}"]) {
      expect(figure, `caption must carry ${line}`).toContain(line);
    }
    // In his order.
    const order = ["{JULIET.name}", "{JULIET.role}", "{JULIET_ORGANISATION}", "{JULIET.location}"].map(l => figure.indexOf(l));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("makes the Nigerian flag larger than the eyebrow text it sits beside", () => {
    // 19 September: h-4 w-6. 24 September, at his request: larger.
    expect(PAGE_SOURCE).toContain('<NigerianFlag className="h-7 w-[2.625rem] shrink-0" />');
    expect(PAGE_SOURCE).not.toContain('className="h-4 w-6');
  });

  it("places Glenice above How this works, so the reader has met her before step 3 names her", () => {
    const glenice = PAGE_SOURCE.indexOf("{GLENICE.name}");
    const howItWorks = PAGE_SOURCE.indexOf(">How this works<");
    expect(glenice).toBeGreaterThan(-1);
    expect(howItWorks).toBeGreaterThan(-1);
    expect(glenice).toBeLessThan(howItWorks);
    // And after the destinations, where she was before, so she is not the afterthought at the foot.
    expect(glenice).toBeGreaterThan(PAGE_SOURCE.indexOf(">Where you could study<"));
  });

  it("shows Glenice's photograph larger than before, with matching intrinsic dimensions", () => {
    const card = PAGE_SOURCE.slice(PAGE_SOURCE.indexOf("src={GLENICE.photo}"), PAGE_SOURCE.indexOf("{GLENICE.name}"));
    expect(card).toContain("w-28");
    expect(card).toContain("width={112}");
    expect(card).toContain("height={149}");
    expect(card).not.toContain("w-20");
  });

  it("gives Glenice Tim Hunt's role wording, links her to head office without placing her there, and publishes no contact detail for her", () => {
    expect(GLENICE.role).toBe("Juliet's dedicated Student Counsellor");
    expect(GLENICE_HEAD_OFFICE_LINE).toBe("Linked to WSA UK Head Office");
    expect(GLENICE.location).toBeUndefined();
    expect(renderedCopy()).not.toMatch(/based (at|in) .{0,20}head office/i);
    expect(GLENICE.whatsapp).toBeUndefined();
    expect(GLENICE.whatsappDigits).toBeUndefined();
    expect(GLENICE.email).toBeUndefined();
    expect(renderedCopy()).not.toContain("glenice@worldstudentadvisors.com");
    expect(renderedCopy()).not.toContain("447459720726");
    // ContactLines renders nothing for a person without details, and the
    // Glenice card never calls it anyway.
    const card = PAGE_SOURCE.slice(PAGE_SOURCE.indexOf("src={GLENICE.photo}"), PAGE_SOURCE.indexOf(">How this works<"));
    expect(card).not.toContain("ContactLines");
  });

  it("quotes Glenice in her own approved words, so the page needs no fresh sign off", () => {
    const bio = readFileSync("client/src/lib/team.ts", "utf8");
    expect(bio).toContain(GLENICE_QUOTE);
  });

  it("states the workflow Tim Hunt specified: Juliet first, Glenice only once the student goes ahead", () => {
    const steps = STEPS.map(x => `${x.title} ${x.body}`).join(" ");
    expect(steps).toContain("Glenice Owino");
    expect(steps).toContain("dedicated Student Counsellor");
    expect(steps).toMatch(/Juliet (is the person you deal with|talks it through)/);
    expect(PAGE_SOURCE).toMatch(/Glenice does not contact you at this stage/i);
  });

  it("Juliet's photograph is the one in the controlled team record", () => {
    const team = readFileSync("client/src/lib/team.ts", "utf8");
    expect(team).toContain(JULIET.photo);
  });
});

describe("the podcast", () => {
  it("holds the slot open and uses neither recording Tim Hunt has withdrawn", () => {
    // WSA 036 withdrawn 19 September 2026 as out of date; its replacement
    // withdrawn 24 September by WhatsApp over a telephone number error, with
    // the next link to be different.
    expect(JULIET_PODCAST.youtubeId).toBe("");
    expect(WITHDRAWN_PODCAST_IDS).toEqual(["SZjjr2T3qTU", "fR4j72Jbk5Y"]);
    for (const id of WITHDRAWN_PODCAST_IDS) {
      expect(JULIET_PODCAST.youtubeId).not.toBe(id);
      expect(PAGE_CODE, `page must not carry withdrawn id ${id}`).not.toContain(id);
    }
    expect(JULIET_PODCAST.awaitingLine.length).toBeGreaterThan(20);
    expect(PAGE_SOURCE).toContain("if (!JULIET_PODCAST.youtubeId)");
  });

  it("never autoplays until a visitor asks for it", () => {
    expect(PAGE_SOURCE).toContain("if (!playing)");
    expect(PAGE_SOURCE).toContain("onClick={() => setPlaying(true)}");
    const iframeBlock = PAGE_SOURCE.slice(PAGE_SOURCE.indexOf("<iframe"));
    expect(iframeBlock).toContain("autoplay=1");
    expect(PAGE_SOURCE.indexOf("autoplay=1")).toBeGreaterThan(PAGE_SOURCE.indexOf("setPlaying(true)"));
    expect(iframeBlock).toContain("youtube-nocookie.com");
  });

  it("ships no poster for a recording that does not exist yet", () => {
    expect(PAGE_CODE).not.toContain("podcast-poster");
    expect(LIB_CODE).not.toContain("podcast-poster");
  });
});

describe("mobile and accessibility", () => {
  it("gives every image real alt text and the play button a name", () => {
    expect(JULIET.photoAlt).toContain("Juliet Nnajiofor-Uyi");
    expect(GLENICE.photoAlt).toContain("Glenice Owino");
    expect(PAGE_SOURCE).toContain("aria-label={`Play: ${JULIET_PODCAST.title}`}");
    // The one decorative image is the poster inside that labelled button.
    expect(PAGE_SOURCE.match(/alt=""/g)?.length ?? 0).toBe(1);
  });

  it("gives the tappable actions a real target size", () => {
    expect(PAGE_SOURCE).toContain("min-h-[3rem]");
    expect(PAGE_SOURCE).toContain("min-h-[2.75rem]");
  });

  it("sets width and height on every photograph, so the page does not jump while it loads", () => {
    const heroImg = PAGE_SOURCE.slice(PAGE_SOURCE.indexOf("src={JULIET.photo}"));
    expect(heroImg).toContain("width={600}");
    expect(heroImg).toContain("height={800}");
  });

  it("keeps the form placeholder and its host inside the viewport", () => {
    expect(PAGE_SOURCE).toContain('className="pipedriveWebForms min-w-0 max-w-full"');
  });
});

describe("Tim Hunt's master draft of 19 September 2026", () => {
  it("names every destination he listed", () => {
    const names = DESTINATIONS.map(d => d.name).join(" ");
    for (const country of ["United Kingdom", "United States", "Canada", "Germany", "Europe"]) {
      expect(names).toContain(country);
    }
  });

  it("keeps the European markets he named", () => {
    const europe = DESTINATIONS.find(d => d.name.includes("Europe"));
    for (const place of ["Cyprus", "Hungary", "France", "Netherlands"]) {
      expect(europe?.body).toContain(place);
    }
  });

  it("drops the relationship and ranking claims from his destination copy", () => {
    const copy = DESTINATIONS.map(d => d.body).join(" ").toLowerCase();
    for (const claim of ["strong network", "strong links", "world-leading", "world leading", "education partners"]) {
      expect(copy, `must not claim "${claim}"`).not.toContain(claim);
    }
  });

  it("closes the destinations with his own approved line, verbatim", () => {
    expect(DESTINATIONS_LINE).toBe(
      "Your WSA counsellor will help you compare countries, universities, courses and costs to find the options that best fit your ambitions and budget.",
    );
  });

  it("carries his list of what WSA does, under his own heading", () => {
    for (const step of ["Course and university selection", "Applications and offers", "Payment guidance", "Visa preparation"]) {
      expect(SUPPORT_STEPS).toContain(step);
    }
    expect(SUPPORT_HEADING).toBe("Free service from WSA");
  });

  it("keeps the study routes he grouped, including the summer and sports camps", () => {
    const copy = STUDY_FAMILIES.map(f => f.body).join(" ").toLowerCase();
    for (const route of ["phd", "top-up", "international foundation", "gcse", "a level", "football", "summer camps", "online courses"]) {
      expect(copy, `must still name "${route}"`).toContain(route);
    }
  });

  it("records every point where his draft and the implementation brief differed, and how each was settled", () => {
    expect(BRIEF_CONFLICTS.length).toBeGreaterThanOrEqual(9);
    const all = BRIEF_CONFLICTS.map(c => `${c.master} ${c.built}`).join(" ");
    for (const subject of ["Personal Assistant", "Head Office", "Tom", "free", "Source Owner", "family name", "Other", "Summer School", "Pipedrive"]) {
      expect(all, `conflict over "${subject}" must be recorded`).toContain(subject);
    }
    for (const c of BRIEF_CONFLICTS) {
      expect(c.master.length).toBeGreaterThan(20);
      expect(c.built.length).toBeGreaterThan(40);
    }
    // The form conflict is now settled in his favour and says so.
    const form = BRIEF_CONFLICTS.find(c => c.master.includes("built in Pipedrive"));
    expect(form?.built).toContain("Adopted on 24 September 2026");
  });

  it("does not call Glenice a Personal Assistant on the page, and uses his linked-to wording for head office", () => {
    expect(GLENICE.role).toBe("Juliet's dedicated Student Counsellor");
    expect(renderedCopy()).not.toContain("Personal Assistant");
    expect(renderedCopy()).toContain("Linked to WSA UK Head Office");
    // The record of the disagreement still names the wording, so the reason survives.
    expect(LIB_CODE).toContain("Personal Assistant");
  });
});
