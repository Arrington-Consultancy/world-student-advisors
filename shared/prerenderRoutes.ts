/**
 * Routes whose initial HTML is generated at build time (see
 * scripts/prerender.mjs) instead of the empty SPA shell, so a crawler that
 * doesn't execute JavaScript still sees the page's real heading, body text
 * and internal links.
 *
 * Deliberately excluded, and why (see the Prerender Decision Record for the
 * full route classification):
 *  - Redirect-only aliases (e.g. /study-options/a-levels, /privacy,
 *    /our-global-education-partners) already 301 to one of the routes below
 *    before ever reaching the SPA (shared/seo.ts's CANONICAL_PATHS) — there
 *    is nothing to prerender separately.
 *  - Everything under /portal and /staff-portal (Portal, PortalResources,
 *    PortalLibrary, StaffPortal, PortalLogin, PortalSetPassword,
 *    PortalResetPassword) is authenticated or an auth-flow page. Their
 *    real content only ever renders after a server-verified session token,
 *    which never exists at build time — prerendering them would only ever
 *    produce the same login/blank gate they already show today, so they're
 *    left out entirely rather than included for no benefit.
 *  - The one exception, /portal/interview-coach, is intentionally listed in
 *    PRERENDER_SHELL_ONLY_ROUTES below: it's public (no session required)
 *    but its setup screen is the only state that exists before a visitor
 *    acts, so only that shell is prerendered.
 *  - /404 is an error page, not a crawl target.
 */
export const PRERENDER_ROUTES: readonly string[] = [
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
  "/counsellors",
  "/student-support-library",
  "/learning-hub/cv-university-application",
  "/training-workshops",
  "/events",
  "/partners",
  "/student-success-stories",
  "/privacy-policy",
  "/terms",
  "/compliance",
  "/code-of-conduct",
  "/anti-bribery-and-anti-corruption-policy",
  "/data-protection-consent",
  "/sub-saharan-regional-office-policy",
  "/WebUKVisa",
  "/DDVavita",
  "/uk-masters-study",
  "/uk-masters-nigeria",
];

/**
 * Public, interactive routes where only the pre-interaction shell is safe
 * and meaningful to prerender — the rest of the page only exists once a
 * visitor acts (submits the enquiry form, starts a practice interview).
 * Rendered the same way as PRERENDER_ROUTES; kept as a separate list purely
 * so the reason for including each route stays visible in one place.
 */
export const PRERENDER_SHELL_ONLY_ROUTES: readonly string[] = ["/contact", "/portal/interview-coach"];

export const ALL_PRERENDER_ROUTES: readonly string[] = [...PRERENDER_ROUTES, ...PRERENDER_SHELL_ONLY_ROUTES];

/**
 * Where a route's prerendered HTML lives under dist/public/__prerendered__,
 * mirroring the route itself as a folder path (e.g. "/about" ->
 * "about/index.html", "/" -> "index.html") so the mapping is obvious on
 * disk and identical whether computed by the build script or the server.
 */
export function routeToPrerenderFile(route: string): string {
  if (route === "/") return "index.html";
  return `${route.replace(/^\/+/, "")}/index.html`;
}
