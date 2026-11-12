import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import NotFound from "@/pages/NotFound";
import { StrapBand } from "@/pages/StudentSuccessStories";
import {
  SUCCESS_STORIES,
  SUCCESS_STORIES_PATH,
  publishedCountries,
  type PublishedCountry,
  type StoryBlock,
  type SuccessStory,
} from "@shared/successStories";

/**
 * One country's success stories, /student-success-stories/<country>, opened
 * from a card on Tim Hunt's page (11 November 2026). Each story is laid out
 * as Tim set it in his Word file: the title, the name and course lines, the
 * text with its photographs where he placed them, and the closing name.
 * A story written in two languages offers a button for each.
 *
 * Only stories cleared by the consent gate reach this page
 * (shared/successStories.ts). A country with none has no page: this
 * component renders Not Found, and the server returns a real 404 because
 * the address is not in shared/routes.ts.
 *
 * An image recorded as an illustration says so on the page, so an AI-made
 * or staged picture is never passed off as a photograph of the person named.
 */

export const ILLUSTRATION_LABEL = "Illustration";

export default function StudentSuccessStoryCountry() {
  const { country } = useParams<{ country: string }>();
  const entry = publishedCountries(SUCCESS_STORIES).find(c => c.country.slug === country);
  if (!entry) return <NotFound />;
  return <StudentSuccessStoryCountryView entry={entry} />;
}

function Block({ block }: { block: StoryBlock }) {
  if (block.kind === "paragraph") {
    return <p className="text-lg leading-relaxed text-slate-800">{block.text}</p>;
  }
  if (block.kind === "signature") {
    return (
      <p className="border-t border-slate-200 pt-4 leading-snug">
        {block.lines.map((line, i) => (
          <span key={line} className={`block ${i === 0 ? "text-lg font-semibold text-wsa-navy" : "text-base text-slate-600"}`}>
            {line}
          </span>
        ))}
      </p>
    );
  }
  const { image } = block;
  return (
    <figure className="my-2">
      <div className="relative">
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
          className="h-auto w-full rounded-xl border border-slate-200 bg-slate-100 object-cover"
        />
        {image.illustration && (
          <span className="absolute left-3 top-3 rounded-md bg-black/65 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
            {ILLUSTRATION_LABEL}
          </span>
        )}
      </div>
      {image.caption && <figcaption className="mt-2 text-sm leading-snug text-slate-600">{image.caption}</figcaption>}
    </figure>
  );
}

export function StoryArticle({ story, countryName }: { story: SuccessStory; countryName: string }) {
  const [index, setIndex] = useState(0);
  const version = story.versions[index] ?? story.versions[0];
  const headingId = `story-${story.id}`;
  // A story Tim gave no title is headed by its first byline line, the
  // person's name, so the name is never shown twice.
  const identityName = story.identity.kind === "named" ? story.identity.displayName : story.identity.label;
  const heading = version.title ?? version.byline[0] ?? identityName;
  const byline = version.title ? version.byline : version.byline.slice(1);

  return (
    <article aria-labelledby={headingId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      {story.versions.length > 1 && (
        <div role="group" aria-label="Language" className="mb-5 flex flex-wrap gap-2">
          {story.versions.map((v, i) => (
            <button
              key={v.lang}
              type="button"
              lang={v.lang}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={`min-h-[2.5rem] rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-navy ${
                i === index ? "bg-wsa-navy text-white" : "border border-wsa-navy/20 text-wsa-navy hover:border-wsa-navy"
              }`}
            >
              {v.language}
            </button>
          ))}
        </div>
      )}

      <div lang={version.lang} className="flex flex-col gap-5">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-wsa-red">{countryName}</p>
          <h2 id={headingId} className="mt-1 text-2xl font-bold leading-tight text-wsa-navy sm:text-3xl">
            {heading}
          </h2>
          {byline.length > 0 && (
            <p className="mt-3 leading-snug">
              {byline.map((line, i) => (
                <span key={line} className={`block ${i === 0 ? "text-lg font-semibold text-slate-900" : "text-base text-slate-600"}`}>
                  {line}
                </span>
              ))}
            </p>
          )}
        </header>
        {version.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </article>
  );
}

export function StudentSuccessStoryCountryView({ entry }: { entry: PublishedCountry }) {
  const { country, stories } = entry;
  return (
    <div className="bg-slate-50">
      <section className="px-4 pb-12 pt-28 sm:px-6 lg:pb-16 lg:pt-36">
        <div className="mx-auto max-w-3xl">
          <Link
            href={SUCCESS_STORIES_PATH}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-wsa-navy"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All Student Success Stories
          </Link>

          <header className="mt-6 flex items-center gap-4">
            <img
              src={`/flags/${country.flagCode}.svg`}
              alt={`Flag of ${country.name}`}
              width={96}
              height={72}
              className="h-14 w-[4.75rem] shrink-0 rounded-sm border border-black/10 object-cover sm:h-[4.5rem] sm:w-24"
            />
            <h1 className="text-3xl font-bold tracking-tight text-wsa-navy sm:text-4xl">{country.name}</h1>
          </header>

          <div className="mt-8 flex flex-col gap-8">
            {stories.map(story => (
              <StoryArticle key={story.id} story={story} countryName={country.name} />
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 rounded-xl bg-white p-6 text-center shadow-sm">
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
