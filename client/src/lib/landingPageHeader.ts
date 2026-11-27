/**
 * Which pages show the website's menu bar and its red "Start Your
 * Application" button, and which show the logo alone.
 *
 * Tim Hunt, 17 November 2026, "Sign up issue": "looking at Eldah, Glenice
 * and Manet's Landing Page they will assume the red sign-up box top right
 * belongs to the Landing Page." That button goes to /contact, whose form
 * makes Claudia the Lead's owner ("Start your application from the website
 * goes into Claudia's Pipedrive account as a cold lead to follow up. This is
 * desirable."), so on a page with someone else's own form it sends the
 * student to the wrong person. His request: "Could the top line of website
 * page access options and the sign up be removed from all LP. They could
 * remain on Claudia's and the Nigerian LP as they both use the same form."
 *
 * So on the pages below the header keeps the logo, which still links to the
 * home page, and drops the menu, the button and the phone menu. The footer
 * is unchanged, so the rest of the site is still one tap away. Claudia's
 * page and /nigeria-postgraduate are deliberately absent: both embed the
 * same Website Registration Form as /contact.
 *
 * Each entry also covers the page's own thank-you page: "/speak-to-eldah"
 * covers "/speak-to-eldah/thank-you", and "/speak-to-gladys" covers
 * "/speak-to-gladys-thank-you", the one thank-you page named that way.
 */
export const LOGO_ONLY_HEADER_PAGES = Object.freeze([
  "/speak-to-juliet",
  "/speak-to-madalitso",
  "/speak-to-gladys",
  "/speak-to-eldah",
  "/speak-to-glenice",
  "/speak-to-manet",
  "/sarkin-fulani-future-leaders",
  // Tim Hunt's mock-up of 22 November 2026: the logo and the language
  // switch, no menu.
  "/speak-to-pedro",
] as const);

export function showsLogoOnlyHeader(location: string): boolean {
  const path = location.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return LOGO_ONLY_HEADER_PAGES.some(
    p => path === p || path.startsWith(`${p}/`) || path === `${p}-thank-you`
  );
}
