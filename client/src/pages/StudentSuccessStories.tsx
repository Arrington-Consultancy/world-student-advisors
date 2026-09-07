import { Link } from "wouter";
import { ArrowRight, BadgeCheck, MapPin, GraduationCap, Quote, ShieldCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import {
  SUCCESS_STORIES,
  publishableStories,
  type SuccessStory,
} from "@shared/successStories";

/**
 * Student Success Stories, the WSA proof layer.
 *
 * Controlling record: WSA_Student_Success_Story_and_Proof_Direction_
 * 2026-09-04_APPROVED.docx, 17_Senior Management Team/AI_Operating_System/
 * 07_Control_Room.
 *
 * Every story shown here comes from shared/successStories.ts through
 * decidePublication, so a record cannot reach this page without recorded
 * consent for website use and its duration, student approval of the final
 * wording and visual, verified outcome claims, traceable evidence, a named
 * review owner and an authorised human release.
 *
 * The card pattern follows the record: student image, name or anonymised
 * label, country, institution, course, short quotation, WSA logo and the
 * strapline, with the fuller journey in the body rather than crammed into
 * the card header. Calls to action are advisory, as the record requires,
 * rather than a repeated instruction to apply.
 *
 * There are no stories yet, so this page renders the empty state below.
 * That is deliberate. The record says to build the presentation and record
 * structure only and not to populate a real student story until the gate
 * has passed and a human has approved the final asset. A placeholder story
 * would be a false claim about a real category of person published under
 * WSA's name, which is the thing the direction exists to prevent.
 *
 * The `stories` prop exists so the rendered result can be checked against a
 * fictional fixture without that fixture ever entering the store. It
 * defaults to the real gated list, which is what every route render uses.
 */

const WSA_LOGO = "/manus-storage/wsa_logo_beb199d6.png";
const STRAPLINE = "Your Future is Our Mission";

function identityLabel(story: SuccessStory): string {
  return story.identity.kind === "named" ? story.identity.displayName : story.identity.label;
}

function StoryCard({ story }: { story: SuccessStory }) {
  const study = [story.course, story.institution, story.destination].filter(Boolean).join(", ");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {story.photograph ? (
        <img
          src={story.photograph.src}
          alt={story.photograph.alt}
          className="h-56 w-full object-cover"
          loading="lazy"
        />
      ) : null}

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-slate-900">{identityLabel(story)}</h2>
          <p className="flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {story.country}
          </p>
        </div>

        {study ? (
          <p className="flex items-start gap-1.5 text-sm text-slate-700">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{study}</span>
          </p>
        ) : null}

        {story.quotation ? (
          <blockquote className="flex gap-3 border-l-2 border-slate-300 pl-4 italic text-slate-800">
            <Quote className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <p>{story.quotation}</p>
          </blockquote>
        ) : null}

        {/*
          The record asks for a clear, uncluttered card and for the fuller
          journey to sit in the accompanying page or post. There is no
          per-story route yet, so the journey stays on this page but folded
          away, and the card reads as the record describes at rest.
        */}
        <details className="group">
          <summary className="cursor-pointer list-none font-medium text-slate-900 underline underline-offset-4">
            <span className="group-open:hidden">Read the full story</span>
            <span className="hidden group-open:inline">Hide the full story</span>
          </summary>
          <div className="mt-4 flex flex-col gap-3 text-slate-700">
            <p>{story.goal}</p>
            <p>{story.decision}</p>
            <p>{story.supportProvided}</p>
            <p className="font-medium text-slate-900">{story.outcome}</p>
            {story.nextStep ? <p>{story.nextStep}</p> : null}
            {story.adviser ? (
              <p className="text-sm text-slate-600">WSA counsellor: {story.adviser}</p>
            ) : null}
          </div>
        </details>

        <div className="mt-auto flex items-center gap-3 border-t border-slate-200 pt-4">
          <img src={WSA_LOGO} alt="World Student Advisors" className="h-8 w-auto" loading="lazy" />
          <span className="text-sm font-medium text-slate-600">{STRAPLINE}</span>
        </div>
      </div>
    </article>
  );
}

/**
 * The route component. Takes no props, so the router cannot be handed a
 * story list, and reads the store only through the gate.
 */
export default function StudentSuccessStories() {
  return <StudentSuccessStoriesView stories={publishableStories(SUCCESS_STORIES, "website")} />;
}

/**
 * The rendering, separated so the empty and populated states can both be
 * checked against a fictional fixture without that fixture ever entering
 * the store or being reachable from a route.
 */
export function StudentSuccessStoriesView({ stories }: { stories: SuccessStory[] }) {
  return (
    <div className="bg-white">
      <section className="bg-slate-50 pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal>
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Student Success Stories
            </h1>
            <p className="mt-4 text-lg text-slate-700">
              Every student who comes to us starts with a goal and a set of choices. These are
              accounts of what happened next, told by the students themselves.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {stories.length > 0 ? (
            <>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {stories.map(story => (
                  <ScrollReveal key={story.id}>
                    <StoryCard story={story} />
                  </ScrollReveal>
                ))}
              </div>

              <ScrollReveal>
                <div className="mx-auto mt-14 flex max-w-2xl flex-col gap-4 rounded-xl bg-slate-50 p-6 text-center">
                  <p className="text-lg text-slate-800">
                    Still deciding on a course, a university or a country?
                  </p>
                  <p className="text-slate-700">
                    That is the conversation our counsellors have every day. Tell us where you are
                    up to and we will help you think it through.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-1.5 font-medium text-slate-900 underline underline-offset-4"
                  >
                    Talk to a counsellor
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </ScrollReveal>
            </>
          ) : (
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
          )}
        </div>
      </section>
    </div>
  );
}
