import type { Express, NextFunction, Request, Response } from "express";

/**
 * Evidenced 1:1 replacements for old Squarespace-era slugs still indexed by
 * Google on this domain (found via `site:worldstudentadvisors.com` — see
 * PR #14). Every entry here has a confirmed current-route equivalent;
 * old slugs without one (e.g. /the-student-journey,
 * /ghana---postgraduate-uk-scholarships) are deliberately left out so they
 * 404 instead of being redirected to a guess.
 */
const LEGACY_REDIRECTS: Record<string, string> = {
  "/about-us": "/about",
  "/who-we-are": "/about",
  "/AboutUS": "/about",
  "/meet-our-counsellors": "/counsellors",
};

/** 301s a known legacy path to its current equivalent, preserving any query
 * string. Registered before routing/static handling so it always wins and
 * never chains through another redirect or the SPA fallback. */
export function legacyRedirects(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const target = LEGACY_REDIRECTS[req.path];
    if (!target) {
      next();
      return;
    }
    const queryIndex = req.url.indexOf("?");
    const query = queryIndex === -1 ? "" : req.url.slice(queryIndex);
    res.redirect(301, `${target}${query}`);
  });
}
