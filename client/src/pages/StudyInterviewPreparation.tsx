import { useState } from "react";
import { ChevronRight, Download, FileText, PlayCircle } from "lucide-react";
import { Link } from "wouter";
import VideoModal from "@/components/VideoModal";
import { getYouTubeVideoId } from "@/lib/youtube";
import { LIBRARY_PATH } from "@/lib/studentSupportLibrary";
import {
  ABROAD_GROUPS,
  ABROAD_HEADING,
  ABROAD_INTRO,
  BREADCRUMB,
  DOWNLOAD_LABEL,
  ELIGIBILITY,
  HERO,
  NOTE,
  STEPS,
  STEPS_HEADING,
  UK_FORMS,
  UK_HEADING,
  UK_VIDEO,
  downloadAriaLabel,
  pdfHref,
  type Questionnaire,
  type QuestionnaireGroup,
} from "@/lib/studyInterviewPreparation";

/**
 * Study interview preparation, in the Student Support Library: Tim Hunt's
 * page of 18 November 2026, laid out from his mock-up. All copy and the
 * form list live in client/src/lib/studyInterviewPreparation.ts.
 *
 * Each "Download PDF" is a plain link with the download attribute, so the
 * form is saved to the student's device rather than opened in a browser
 * tab, where some phones show a PDF but cannot keep what is typed into it.
 * The button keeps its full label at every width: in the mock-up it is cut
 * to "Download PD" at the right edge of each card.
 */

function Badge({ number }: { number: string }) {
  return (
    <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md bg-wsa-navy/[0.07] px-1.5 text-sm font-semibold text-wsa-navy">
      {number}
    </span>
  );
}

function DownloadButton({
  form,
  group,
}: {
  form: Questionnaire;
  group?: QuestionnaireGroup;
}) {
  return (
    <a
      href={pdfHref(form)}
      download
      aria-label={downloadAriaLabel(form, group)}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-wsa-navy px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-wsa-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-red"
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      {DOWNLOAD_LABEL}
    </a>
  );
}

export default function StudyInterviewPreparation() {
  // The video loads from YouTube only when asked for, in the site's own
  // video window (the one the library uses).
  const [playing, setPlaying] = useState(false);
  const videoId = getYouTubeVideoId(UK_VIDEO.youtubeUrl);

  return (
    <div className="min-h-screen bg-slate-50/70">
      <div className="container max-w-6xl pt-28 pb-20 lg:pt-36">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-600">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link
                href={LIBRARY_PATH}
                className="hover:text-wsa-red hover:underline underline-offset-2"
              >
                {BREADCRUMB.library}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page">{BREADCRUMB.page}</li>
          </ol>
        </nav>

        {/* Hero, with the eligibility card on the right */}
        <section className="rounded-2xl bg-wsa-navy px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_minmax(0,400px)] lg:gap-10">
            <div>
              <h1 className="text-3xl font-semibold leading-[1.15] sm:text-4xl lg:text-[2.75rem]">
                {HERO.heading}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85">
                {HERO.intro}
              </p>
            </div>
            <div className="rounded-xl border-l-4 border-wsa-red bg-white p-5 text-wsa-navy shadow-sm sm:p-6">
              <h2 className="text-xl font-semibold">{ELIGIBILITY.heading}</h2>
              <p className="mt-2 text-base leading-relaxed text-gray-700">
                {ELIGIBILITY.text}
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-10" aria-labelledby="how-it-works">
          <h2
            id="how-it-works"
            className="text-2xl font-semibold text-wsa-navy"
          >
            {STEPS_HEADING}
          </h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="rounded-xl border border-wsa-navy/10 bg-white p-5"
              >
                <h3 className="text-base font-semibold text-wsa-navy">
                  {i + 1}. {step.title}
                </h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
          {/* Tim Hunt asked for this note, 18 November 2026. */}
          <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-wsa-red/25 bg-white px-4 py-3 text-base font-medium text-wsa-navy">
            <FileText
              className="mt-0.5 h-5 w-5 shrink-0 text-wsa-red"
              aria-hidden
            />
            <span>{NOTE}</span>
          </p>
        </section>

        {/* UK questionnaires */}
        <section className="mt-12" aria-labelledby="uk-questionnaires">
          <h2
            id="uk-questionnaires"
            className="text-2xl font-semibold text-wsa-navy"
          >
            {UK_HEADING}
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {UK_FORMS.map(form => (
              <li
                key={form.number}
                className="flex items-center gap-3 rounded-xl border border-wsa-navy/10 bg-white px-3.5 py-3"
              >
                <Badge number={form.number} />
                <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-wsa-navy">
                  {form.title}
                </span>
                <DownloadButton form={form} />
              </li>
            ))}
          </ul>

          {/* Tim Hunt, 18 November 2026: the Pre-CAS video in the UK section.
              Birmingham City University's own film, played from their upload. */}
          {videoId && (
            <div className="mt-5 grid items-center gap-4 overflow-hidden rounded-xl border border-wsa-navy/10 bg-white sm:grid-cols-[minmax(0,320px)_1fr]">
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label={`${UK_VIDEO.playLabel}: ${UK_VIDEO.title}`}
                className="group relative block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wsa-red"
              >
                <img
                  src={UK_VIDEO.poster}
                  alt={UK_VIDEO.posterAlt}
                  width={UK_VIDEO.posterWidth}
                  height={UK_VIDEO.posterHeight}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full"
                />
                <PlayCircle
                  className="absolute bottom-3 left-3 h-11 w-11 rounded-full bg-black/45 text-white drop-shadow transition-transform duration-200 group-hover:scale-110"
                  aria-hidden
                />
              </button>
              <div className="px-4 pb-4 sm:py-4 sm:pr-5 sm:pl-0">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-wsa-red">
                  {UK_VIDEO.eyebrow}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-wsa-navy">
                  {UK_VIDEO.title}
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed text-gray-600">
                  {UK_VIDEO.credit}
                </p>
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-wsa-navy px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-wsa-red"
                >
                  <PlayCircle className="h-4 w-4" aria-hidden />
                  {UK_VIDEO.playLabel}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Outside the UK */}
        <section className="mt-12" aria-labelledby="outside-the-uk">
          <h2
            id="outside-the-uk"
            className="text-2xl font-semibold text-wsa-navy"
          >
            {ABROAD_HEADING}
          </h2>
          <p className="mt-1.5 text-base text-gray-600">{ABROAD_INTRO}</p>
          <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
            {ABROAD_GROUPS.map(group => (
              <section
                key={group.name}
                aria-label={group.name}
                className="overflow-hidden rounded-xl border border-wsa-navy/10 bg-white"
              >
                <div className="flex items-center justify-between gap-3 bg-wsa-navy/[0.05] px-4 py-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-wsa-navy">
                      {group.name}
                    </h3>
                    {group.subtitle && (
                      <p className="text-xs text-gray-600">{group.subtitle}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-wsa-navy/80">
                    {group.range}
                  </span>
                </div>
                <ul className="divide-y divide-wsa-navy/10">
                  {group.forms.map(form => (
                    <li
                      key={form.number}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <Badge number={form.number} />
                      <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-wsa-navy">
                        {form.title}
                      </span>
                      <DownloadButton form={form} group={group} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      </div>
      <VideoModal
        resource={
          playing && videoId
            ? { title: UK_VIDEO.title, videoId, url: UK_VIDEO.youtubeUrl }
            : null
        }
        onOpenChange={open => setPlaying(open)}
      />
    </div>
  );
}
