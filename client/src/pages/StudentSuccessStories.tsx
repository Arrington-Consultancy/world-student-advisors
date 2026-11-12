import { Link } from "wouter";
import { ArrowRight, BadgeCheck, ShieldCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { SUCCESS_STORIES, publishedCountries, type PublishedCountry } from "@shared/successStories";

/**
 * Student Success Stories, the WSA proof layer.
 *
 * THE DESIGN is Tim Hunt's, 11 November 2026 ("Tom Student Success FRONT
 * PAGE.png", in 16_WEBSITE_AI/14_Student Success Stories/For Tom): the
 * heading, "Choose your country to read a student's story.", a numbered
 * card per country with its flag and "Read story", and the strapline band.
 * Each card opens that country's page, /student-success-stories/<country>
 * (StudentSuccessStoryCountry.tsx).
 *
 * THE GATE. Controlling record: WSA_Student_Success_Story_and_Proof_
 * Direction_2026-09-04_APPROVED.docx, 17_Senior Management Team/
 * AI_Operating_System/07_Control_Room. Every story comes from
 * shared/successStories.ts through decidePublication, so a story cannot
 * reach this page without recorded consent for website use and its
 * duration, the student's approval of the final wording and photographs,
 * verified outcome claims, traceable evidence, a named review owner and an
 * authorised human release. Tom Arrington confirmed on 12 November 2026
 * that each of Tim's stories goes live only once Tim confirms that person
 * has agreed.
 *
 * A country appears only when one of its stories is cleared, and the cards
 * are numbered in the order shown, so the page never offers a flag that
 * leads nowhere. With nothing cleared, the page says so honestly instead.
 *
 * The `countries` prop exists so the rendered result can be checked against
 * a fictional fixture without that fixture ever entering the store. The
 * route component always passes the real gated list.
 */

const WSA_LOGO = "/manus-storage/wsa_logo_beb199d6.png";
const STRAPLINE = "Your Future is Our Mission";

export const SUCCESS_STORIES_HEADING = "Student Success Stories";
export const SUCCESS_STORIES_INTRO = "Choose your country to read a student’s story.";

/** The route component. Takes no props, so the router cannot hand it a story list. */
export default function StudentSuccessStories() {
  return <StudentSuccessStoriesView countries={publishedCountries(SUCCESS_STORIES)} />;
}

function readLabel(count: number): string {
  return count === 1 ? "Read story" : `Read ${count} stories`;
}

export function StrapBand() {
  return (
    <section className="bg-wsa-navy px-4 py-6 text-center">
      <p className="text-xl font-bold tracking-tight text-white sm:text-2xl">{STRAPLINE}</p>
    </section>
  );
}

function CountryCard({ entry, index }: { entry: PublishedCountry; index: number }) {
  const { country, path, stories } = entry;
  return (
    <Link
      href={path}
      className="group flex items-center gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-wsa-navy/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy sm:gap-6 sm:p-5"
    >
      <img
        src={`/flags/${country.flagCode}.svg`}
        alt={`Flag of ${country.name}`}
        width={176}
        height={132}
        loading="lazy"
        className="h-[4.5rem] w-24 shrink-0 rounded-sm border border-black/10 object-cover sm:h-[6.5rem] sm:w-[8.75rem]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-500">{String(index + 1).padStart(2, "0")}</span>
        <span className="block text-2xl font-bold leading-tight text-wsa-navy sm:text-3xl">{country.name}</span>
        <span className="mt-1 inline-flex items-center gap-1.5 text-base font-semibold text-blue-800 group-hover:underline">
          {readLabel(stories.length)}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

/**
 * The rendering, separated so the empty and populated states can both be
 * checked against a fictional fixture without that fixture ever entering
 * the store or being reachable from a route.
 */
export function StudentSuccessStoriesView({ countries }: { countries: PublishedCountry[] }) {
  if (countries.length === 0) return <EmptyState />;

  return (
    <div className="bg-white">
      <section className="px-4 pb-12 pt-32 sm:px-6 lg:pb-16 lg:pt-40">
        <div className="mx-auto max-w-6xl">
          <header className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-wsa-navy sm:text-5xl">{SUCCESS_STORIES_HEADING}</h1>
            <p className="mt-3 text-lg text-slate-600 sm:text-xl">{SUCCESS_STORIES_INTRO}</p>
          </header>

          <ul className="mt-10 grid gap-4 md:grid-cols-2 md:gap-5">
            {countries.map((entry, i) => (
              <li key={entry.country.slug}>
                <CountryCard entry={entry} index={i} />
              </li>
            ))}
          </ul>

          <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center gap-3 rounded-xl bg-slate-50 p-6 text-center">
            <p className="text-lg text-slate-800">Thinking about studying abroad yourself?</p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-1.5 font-medium text-slate-900 underline underline-offset-4"
            >
              Talk to a counsellor
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <StrapBand />
    </div>
  );
}

/** What the page says while no story has been cleared. */
function EmptyState() {
  return (
    <div className="bg-white">
      <section className="bg-slate-50 pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal>
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{SUCCESS_STORIES_HEADING}</h1>
            <p className="mt-4 text-lg text-slate-700">
              Every student who comes to us starts with a goal and a set of choices. These are
              accounts of what happened next, told by the students themselves.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal>
            <div className="mx-auto flex max-w-2xl flex-col gap-5 text-slate-700">
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                <ShieldCheck className="h-6 w-6 shrink-0 text-slate-500" aria-hidden="true" />
                We are still gathering these properly
              </h2>
              <p>
                We have not published any student stories yet, and we would rather say so than
                fill this page with something we made up.
              </p>
              <p>
                A student's education, finances and immigration history belong to them, not to
                us. So before any story appears here, the student tells us it can, for this
                specific use and for an agreed period, and reads the exact words and sees the
                exact photograph first. Every fact is checked against our own case record. If a
                student changes their mind afterwards, the story comes down everywhere it ran.
              </p>
              <p>
                That takes longer than writing testimonials would. We think it is the only
                version worth reading.
              </p>

              <ul className="flex flex-col gap-3 border-t border-slate-200 pt-5">
                <li className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                  <span>Told in the student's own words, with their recorded permission.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                  <span>Checked against our case record before anything is published.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                  <span>
                    Success measured by what the student wanted, which is not always the first
                    course or country they asked about.
                  </span>
                </li>
              </ul>

              <div className="mt-2 flex flex-col gap-4 rounded-xl bg-slate-50 p-6">
                <p className="text-slate-800">
                  In the meantime, if you are choosing between courses, universities or
                  countries, that is exactly what our counsellors are for.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 font-medium text-slate-900 underline underline-offset-4"
                >
                  Talk to a counsellor
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="flex items-center gap-3 border-t border-slate-200 pt-5">
                <img src={WSA_LOGO} alt="World Student Advisors" className="h-8 w-auto" />
                <span className="text-sm font-medium text-slate-600">{STRAPLINE}</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
