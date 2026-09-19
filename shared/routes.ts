/**
 * Every real client-side route this app serves. This is the single source
 * of truth the server checks against to decide whether an unmatched request
 * should get a real HTTP 404 or the SPA shell (200) — see
 * server/_core/vite.ts. Every path here must correspond to a real <Route>
 * in client/src/App.tsx, and vice versa; server/routes-sync.test.ts fails
 * the build if the two ever drift apart, so update both when adding or
 * removing a page.
 */
export const VALID_CLIENT_ROUTES = [
  "/",
  "/about",
  "/study-options",
  "/a-levels",
  "/international-foundation-programme",
  "/international-year-one",
  "/undergraduate-degrees",
  "/pre-masters-top-up-degrees",
  "/masters-doctoral-degrees",
  "/sport-pathways",
  "/online-learning",
  "/study-options/sport-pathways",
  "/study-options/online-learning",
  "/study-options/a-levels",
  "/study-options/international-foundation-programme",
  "/study-options/international-year-one",
  "/study-options/undergraduate-degrees",
  "/study-options/pre-masters-top-up-degrees",
  "/study-options/masters-doctoral-degrees",
  "/our-team",
  // Kept alongside /our-team: the page was renamed on 14 September 2026 and
  // /counsellors 301s to it (CANONICAL_PATHS), but the old path stays a real
  // route so an in-app link that still points at it renders rather than 404s.
  "/counsellors",
  "/student-support-library",
  "/staff-portal",
  "/learning-hub/cv-university-application",
  "/training-workshops",
  "/events",
  "/partners",
  "/our-global-education-partners",
  "/student-success-stories",
  "/contact",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/compliance",
  "/code-of-conduct",
  "/anti-bribery-and-anti-corruption-policy",
  "/data-protection-consent",
  "/sub-saharan-regional-office-policy",
  "/portal/login",
  "/portal/set-password",
  "/portal/reset-password",
  "/portal/resources",
  "/portal/library",
  "/portal/interview-coach",
  "/portal",
  "/WebUKVisa",
  "/DDVavita",
  "/uk-masters-study",
  "/uk-masters-nigeria",
  // Working-draft campaign landing page. A real route so it can be reviewed,
  // but noindex and absent from the sitemap and the prerender list until the
  // Google Ads brief is reconciled with the MPhil/MRes/PhD scope.
  "/nigeria-postgraduate",
  // Speak to Juliet, the Nigeria landing page for Juliet Nnajiofor-Uyi.
  // Built 19 September 2026. A real route so it can be reviewed, but
  // noindex and absent from the sitemap and the prerender list while the
  // copy is provisional and Tim Hunt's revised brief is outstanding.
  // /LPJuliet 301s here (CANONICAL_PATHS).
  "/speak-to-juliet",
  "/404",
] as const;

const VALID_CLIENT_ROUTE_SET = new Set<string>(VALID_CLIENT_ROUTES);

/** Exact match only — no trailing-slash normalisation, matching wouter's own
 * default matching behaviour so server and client never disagree. */
export function isValidClientRoute(path: string): boolean {
  return VALID_CLIENT_ROUTE_SET.has(path);
}
