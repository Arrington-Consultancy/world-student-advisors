import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { SUCCESS_STORIES, SUCCESS_STORY_PATHS, type StoryImage, type SuccessStory } from "../shared/successStories";

/**
 * Tim Hunt's twelve Student Success Stories (11 November 2026), released by
 * Tom Arrington on 12 November 2026. What these hold: the stories and
 * countries Tim sent; every photograph on the site with its hidden data
 * removed; the AI-made Clevedon Pier picture labelled as an illustration;
 * the Angola stories in English and Portuguese; the wording changes Tom told
 * Tim about; and no copy that reads as WSA giving regulated immigration
 * advice.
 */

const text = (s: SuccessStory): string =>
  s.versions
    .flatMap(v => [
      v.title ?? "",
      ...v.byline,
      ...v.blocks.flatMap(b =>
        b.kind === "paragraph" ? [b.text] : b.kind === "signature" ? [...b.lines] : [b.image.alt, b.image.caption ?? ""],
      ),
    ])
    .join(" ");

const images = (s: SuccessStory): StoryImage[] =>
  s.versions.flatMap(v => v.blocks.flatMap(b => (b.kind === "image" ? [b.image] : [])));

const byId = (id: string) => {
  const s = SUCCESS_STORIES.find(x => x.id === id);
  if (!s) throw new Error(`no story ${id}`);
  return s;
};

describe("the stories Tim Hunt sent", () => {
  it("are twelve, two each for Angola and Kenya and one for each other country", () => {
    const count = (slug: string) => SUCCESS_STORIES.filter(s => s.countrySlug === slug).length;
    expect(SUCCESS_STORIES).toHaveLength(12);
    expect(new Set(SUCCESS_STORIES.map(s => s.id)).size).toBe(12);
    expect(count("angola")).toBe(2);
    expect(count("kenya")).toBe(2);
    for (const slug of ["ghana", "malawi", "nigeria", "south-sudan", "tanzania", "uganda", "zambia", "zimbabwe"]) {
      expect(count(slug), slug).toBe(1);
    }
    expect(SUCCESS_STORY_PATHS).toHaveLength(10);
  });

  it("names each person as Tim did", () => {
    expect(SUCCESS_STORIES.map(s => (s.identity.kind === "named" ? s.identity.displayName : ""))).toEqual([
      "Edivalda Correia Felix Diogo",
      "Dr António Gaspar Cosme",
      "Gladys Banhu Naadi",
      "Sylvester Kututa",
      "Richard Musembi",
      "Madalitso Dube",
      "Joe Agi",
      "Arop Deng",
      "Neema Mwakalinga",
      "Bakuyiira Ssegona",
      "Chipo Mwansa",
      "Darlene Makwangudze",
    ]);
  });

  it("gives the two Angola stories in English and Portuguese, each marked as its language", () => {
    for (const id of ["angola-edivalda-diogo", "angola-antonio-cosme"]) {
      expect(byId(id).versions.map(v => [v.language, v.lang]), id).toEqual([["English", "en-GB"], ["Português", "pt"]]);
    }
    expect(byId("angola-antonio-cosme").versions[1].title).toBe("Apoio de Excelência com um Toque Pessoal");
  });

  it("records the parent's approval wherever the story is about a child", () => {
    for (const s of SUCCESS_STORIES) {
      if (s.consent.studentWasChild) expect(s.consent.parentOrGuardianConsent, s.id).toBe(true);
    }
    expect(SUCCESS_STORIES.filter(s => s.consent.studentWasChild).map(s => s.id)).toEqual([
      "kenya-sylvester-kututa",
      "nigeria-joe-agi",
      "south-sudan-arop-deng",
    ]);
  });
});

describe("the photographs", () => {
  const all = SUCCESS_STORIES.flatMap(images);

  it("are all on the site, described for screen readers, at the size the page reserves", () => {
    expect(new Set(all.map(i => i.src)).size).toBe(22);
    for (const i of all) {
      const file = `client/public${i.src}`;
      expect(existsSync(file), file).toBe(true);
      expect(i.alt.trim().length, i.src).toBeGreaterThan(3);
      expect(Math.max(i.width, i.height), i.src).toBeLessThanOrEqual(1200);
    }
  });

  it("carry no hidden data, such as where or when they were taken", () => {
    for (const src of new Set(all.map(i => i.src))) {
      const bytes = readFileSync(`client/public${src}`);
      expect(bytes.includes(Buffer.from("Exif\0\0")), src).toBe(false);
      expect(bytes.includes(Buffer.from("http://ns.adobe.com/xap/")), src).toBe(false);
    }
  });

  it("label the AI-made Clevedon Pier picture as an illustration, and only that one so far", () => {
    const labelled = all.filter(i => i.illustration).map(i => i.src);
    expect(labelled).toEqual(["/success-stories/kenya/richard-clevedon-pier.jpg"]);
    expect(all.find(i => i.illustration)?.alt).toMatch(/^Illustration of /);
  });
});

describe("the wording changes Tom told Tim about on 12 November 2026", () => {
  it("captions Richard's picture with his own name and no wrong date", () => {
    const caption = images(byId("kenya-richard-musembi"))[0].caption;
    expect(caption).toBe("Tim, Richard (me), Hank and Greta overlooking Clevedon Pier");
    expect(text(byId("kenya-richard-musembi"))).toContain("Clevedon Pier, which opened in 1869");
    expect(text(byId("kenya-richard-musembi"))).not.toMatch(/Andrew|1969/);
  });

  it("never reads as WSA giving regulated immigration advice", () => {
    expect(text(byId("angola-antonio-cosme"))).toContain("supported my visa preparation");
    expect(text(byId("angola-antonio-cosme"))).toContain("me apoiou na preparação do pedido de visto");
    expect(text(byId("zambia-chipo-mwansa"))).toContain("thinking about my options after my studies");
    for (const s of SUCCESS_STORIES) {
      expect(text(s), s.id).not.toMatch(/took care of my visa|tratou do meu pedido de visto|visa options|immigration advice/i);
      expect(s.claimsRegulatedImmigrationAdvice, s.id).toBe(false);
    }
  });

  it("fixes Tim's typos and uses no em dash", () => {
    const all = SUCCESS_STORIES.map(text).join(" ");
    expect(all).not.toMatch(/receiveing|Toque Pessoa\b|\ba MSc|to turn to make|Advisors early clients/);
    expect(all).not.toContain("—");
  });
});
