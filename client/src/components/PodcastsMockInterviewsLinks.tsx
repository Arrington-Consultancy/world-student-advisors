import { Link } from "wouter";
import { SECTION_LINKS } from "@/lib/podcastsPage";

/**
 * The two names at the top of the Podcasts page and the Mock Interviews
 * page. Tim Hunt's feedback of 23 November 2026 on the first preview, which
 * showed "Podcasts & Mock Interviews > Podcasts" as a breadcrumb: "Please
 * change the two names to Podcasts, Mock Interviews. So, if you click on
 * either it goes to the respective page."
 *
 * Both are always links, the current page included, so the row reads and
 * behaves the same on both pages. The current one is marked for screen
 * readers and underlined in red.
 */
export default function PodcastsMockInterviewsLinks({
  current,
  className = "",
}: {
  current: string;
  className?: string;
}) {
  return (
    <nav aria-label="Podcasts and Mock Interviews" className={className}>
      <ul className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm font-semibold sm:text-base">
        {SECTION_LINKS.map(page => {
          const active = page.href === current;
          return (
            <li key={page.href}>
              <Link
                href={page.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block border-b-2 pb-1 transition-colors ${
                  active
                    ? "border-wsa-red text-wsa-navy"
                    : "border-transparent text-wsa-navy/60 hover:border-wsa-red/50 hover:text-wsa-red"
                }`}
              >
                {page.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
