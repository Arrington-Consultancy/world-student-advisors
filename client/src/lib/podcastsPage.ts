/**
 * WSA Podcasts: the library's own page, renamed and redesigned to Tim
 * Hunt's brief of 23 November 2026, "WSA website updates for Podcasts &
 * Mock Interviews", and his design reference "WSA Podcasts university
 * advice hub.png". In his feedback document: "I was never keen on 'STUDENT
 * SUPPORT LIBRARY' does not say what it is". So this page opens as "WSA
 * Podcasts". The menu first read "Podcasts & Mock Interviews" with the two
 * pages under it; his second feedback document the same day asked for the
 * two names on their own, in the menu and at the top of both pages
 * (SECTION_LINKS below).
 *
 * What he asked for: "a working search box and four clickable topic cards.
 * The podcasts and summaries are free to access without signing up. Please
 * add a clear link back to the Mock Interviews page." Every line below is
 * his, from the design, except the Mock Interviews link, which the design
 * does not word.
 *
 * The address stays /student-support-library, so no link already sent to a
 * student, printed in a PMIQ form or indexed by a search engine breaks.
 */

export type TopicIcon = "help" | "study" | "applications" | "travel";

/**
 * The two pages, by the names Tim gave them. Shown at the top of each page
 * as a pair of links (components/PodcastsMockInterviewsLinks.tsx) and as two
 * items in the main menu and the footer, which keep their own literal
 * copies because a test reads those files for the addresses.
 */
export const SECTION_LINKS = Object.freeze([
  { label: "Podcasts", href: "/student-support-library" },
  {
    label: "Mock Interviews",
    href: "/student-support-library/study-interview-preparation",
  },
] as const);

export const PODCASTS_PAGE = Object.freeze({
  heading: "WSA Podcasts",
  lead: "Free advice on choosing a course, applying to university, preparing for interviews and visas, and getting ready to travel.",
  sub: "Listen or read the episode summaries. No sign-up needed.",
  image: "/images/library/podcasts-hero.jpg",
  imageAlt: "A student wearing headphones, smiling as he listens on his phone",
  imageWidth: 862,
  imageHeight: 436,
  searchLabel: "Search podcasts",
  searchPlaceholder: "Try CAS Shield, scholarships or Canada",
  /**
   * Tim's four cards, in the library's section order (shared/
   * studentSupportLibrary.ts LIBRARY_SECTIONS, numbered 1 to 4). Each jumps
   * to its section.
   */
  topics: [
    { section: 1, label: "How WSA can help", icon: "help" },
    { section: 2, label: "Choosing where and what to study", icon: "study" },
    {
      section: 3,
      label: "Applications, interviews and visas",
      icon: "applications",
    },
    { section: 4, label: "Travel and life abroad", icon: "travel" },
  ] as ReadonlyArray<{
    section: 1 | 2 | 3 | 4;
    label: string;
    icon: TopicIcon;
  }>,
  mockInterviews: {
    text: "Preparing for a university or visa interview?",
    link: "Go to Mock Interviews",
  },
});

export function allRenderedCopy(): string {
  const p = PODCASTS_PAGE;
  return [
    ...SECTION_LINKS.map(l => l.label),
    p.heading,
    p.lead,
    p.sub,
    p.imageAlt,
    p.searchLabel,
    p.searchPlaceholder,
    ...p.topics.map(t => t.label),
    p.mockInterviews.text,
    p.mockInterviews.link,
  ].join("\n");
}
