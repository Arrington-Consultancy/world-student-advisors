import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SECTION_IDS } from "../client/src/lib/staffSection";
import { LIBRARY_RESOURCES, LIBRARY_SECTIONS, resourcePath, resourcesInSection } from "../shared/studentSupportLibrary";
import { SITE_ORIGIN } from "../shared/seo";

/**
 * Tim Hunt, 7 October 2026: a Student Support Library resource area in the
 * Staff Portal holding every permanent WSA link, mirroring the structure
 * and order of the public library, each row "WSA number | title | link"
 * with a Copy link button. The Staff Portal becomes the single master
 * source for these links, replacing circulated Word lists, and staff send
 * the WSA page rather than YouTube.
 *
 * What this guards: the section is addressable and on the home screen; the
 * list is rendered from the shared record (so it cannot drift from the
 * website); the four headings and every resource appear in the public
 * library's order; every link is the absolute permanent URL; each row has
 * its Copy link; and no YouTube link is offered for copying.
 */
const PAGE = readFileSync(new URL("../client/src/pages/StaffPortal.tsx", import.meta.url), "utf8");
const PANEL = readFileSync(new URL("../client/src/components/staff/LibraryLinksPanel.tsx", import.meta.url), "utf8");

async function render(): Promise<string> {
  const React = await import("react");
  const { renderToString } = await import("react-dom/server");
  const { LibraryLinksPanel } = await import("../client/src/components/staff/LibraryLinksPanel");
  return renderToString(React.createElement(LibraryLinksPanel));
}

describe("the library links section exists in the portal", () => {
  it("is addressable by URL and rendered, with a card in Daily work", () => {
    expect(SECTION_IDS).toContain("library");
    expect(PAGE).toContain('{section === "library" && <LibraryLinksPanel />}');
    const daily = PAGE.slice(PAGE.indexOf("const DAILY_WORK"), PAGE.indexOf("const WSA_INFORMATION"));
    expect(daily).toMatch(/id: "library",\s*label: "Student Support Library links"/);
  });

  it("renders from the shared library record, not a typed copy", () => {
    expect(PANEL).toMatch(/import \{[\s\S]*?LIBRARY_RESOURCES,[\s\S]*?LIBRARY_SECTIONS,[\s\S]*?\} from "@\/lib\/studentSupportLibrary"/);
    expect(PANEL).toContain("LIBRARY_SECTIONS.map(");
    expect(PANEL).toContain("resourcesInSection(section.id)");
    // No resource code or slug is written into the component by hand.
    expect(PANEL).not.toMatch(/WSA \d{3}/);
    expect(PANEL).not.toMatch(/student-support-library\//);
  });
});

describe("the list mirrors the public library", () => {
  it("shows the four headings in Tim Hunt's order, and every resource in website order under its heading", async () => {
    const html = await render();
    const headingPositions = LIBRARY_SECTIONS.map(s => html.indexOf(`${s.title}<`));
    for (const pos of headingPositions) expect(pos).toBeGreaterThan(-1);
    expect([...headingPositions].sort((a, b) => a - b)).toEqual(headingPositions);

    // Codes appear in exactly the order of the shared record, which is the
    // order the public library renders them.
    const codes = [...html.matchAll(/>(WSA \d{3})</g)].map(m => m[1]);
    expect(codes).toEqual(LIBRARY_RESOURCES.map(r => r.code));

    // And each sits under its own heading: the last code of section n comes
    // before the heading of section n + 1.
    for (let i = 0; i < LIBRARY_SECTIONS.length - 1; i++) {
      const rows = resourcesInSection(LIBRARY_SECTIONS[i].id);
      const last = html.indexOf(`>${rows[rows.length - 1].code}<`);
      expect(last).toBeLessThan(headingPositions[i + 1]);
    }
  });

  it("gives every resource its absolute permanent link, Tim's example included, and a Copy link button", async () => {
    const html = await render();
    for (const r of LIBRARY_RESOURCES) {
      const url = `${SITE_ORIGIN}${resourcePath(r.slug)}`;
      expect(html, r.code).toContain(`href="${url}"`);
      expect(html, r.code).toContain(`>${url}<`);
      expect(html, r.code).toContain(`aria-label="Copy link for ${r.code} `);
    }
    expect(html).toContain("https://www.worldstudentadvisors.com/student-support-library/code-of-conduct");
    const copyButtons = html.match(/aria-label="Copy link for /g) ?? [];
    expect(copyButtons).toHaveLength(LIBRARY_RESOURCES.length);
  });

  it("offers no YouTube link, since the point is to send the WSA page", async () => {
    const html = await render();
    expect(html).not.toMatch(/youtube\.com|youtu\.be/);
    expect(PANEL).not.toContain("youtubeUrl");
  });

  it("copies with the clipboard and says so, falling back to the visible link when it cannot", () => {
    expect(PANEL).toContain("navigator.clipboard.writeText(url)");
    expect(PANEL).toContain('"Copied"');
    expect(PANEL).toContain("select-all");
  });
});
