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
 * Content source: the approved Student Success Story and Proof Direction.
 * Every story shown here comes from shared/successStories.ts through
 * decidePublication, so a record cannot reach this page without recorded
 * student consent for website use, student approval of the final wording
 * and visual, traceable evidence, a named review owner and an authorised
 * human release.
 *
 * There are no stories yet, so this page renders the empty state below.
 * That is deliberate. The alternative, a placeholder story written to make
 * the page look finished, would be a false claim about a real category of
 * person published under WSA's name, which is the thing the whole direction
 * exists to prevent. The empty state is true, and it says something worth
 * reading about how WSA treats students' accounts of their own lives.
 */

const stories: SuccessStory[] = publishableStories(SUCCESS_STORIES, "website");

function identityLabel(story: SuccessStory): string {
  return story.identity.kind === "named" ? story.identity.displayName : story.identity.label;
}

function StoryCard({ story }: { story: SuccessStory }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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

        {story.course || story.institution ? (
          <p className="flex items-start gap-1.5 text-sm text-slate-700">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {[story.course, story.institution, story.destination].filter(Boolean).join(", ")}
            </span>
          </p>
        ) : null}

        <div className="flex flex-col gap-3 text-slate-700">
          <p>{story.goal}</p>
          <p>{story.decision}</p>
          <p>{story.supportProvided}</p>
          <p className="font-medium text-slate-900">{story.outcome}</p>
          {story.nextStep ? <p>{story.nextStep}</p> : null}
        </div>

        {story.quotation ? (
          <blockquote className="flex gap-3 border-l-2 border-slate-300 pl-4 text-slate-800 italic">
            <Quote className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <p>{story.quotation}</p>
          </blockquote>
        ) : null}

        {story.adviser ? (
          <p className="mt-auto text-sm text-slate-600">
            WSA counsellor: {story.adviser}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function StudentSuccessStories() {
  return (
    <div className="bg-white">
      <section className="bg-slate-50 py-16 sm:py-20">
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
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {stories.map(story => (
                <ScrollReveal key={story.id}>
                  <StoryCard story={story} />
                </ScrollReveal>
              ))}
            </div>
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
                  specific use, and reads the exact words and sees the exact photograph first.
                  Every fact is checked against our own case record. If a student changes their
                  mind afterwards, the story comes down.
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
                    If you studied abroad with us and would like to tell other students what it was
                    like, we would be glad to hear from you. You decide what is included and you
                    see it before anyone else does.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1.5 font-medium text-slate-900 underline underline-offset-4"
                  >
                    Talk to us about sharing your story
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>
    </div>
  );
}
