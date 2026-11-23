import {
  ChevronRight,
  Download,
  FileCheck2,
  FileText,
  Headphones,
  Laptop,
} from "lucide-react";
import { Link } from "wouter";
import {
  LIBRARY_PATH,
  getResourceByCode,
  resourcePath,
} from "@/lib/studentSupportLibrary";
import {
  ABROAD_GROUPS,
  ABROAD_HEADING,
  ABROAD_INTRO,
  ABROAD_PODCAST_CODES,
  BREADCRUMB,
  DOWNLOAD_LABEL,
  ELIGIBILITY_NOTICE,
  HERO,
  LISTEN_LABEL,
  NOTE,
  PODCASTS_HEADING,
  QUESTIONNAIRES_ANCHOR,
  STEPS,
  STEPS_HEADING,
  UK_FORMS,
  UK_HEADING,
  UK_PODCAST_CODES,
  downloadAriaLabel,
  pdfHref,
  type Questionnaire,
  type QuestionnaireGroup,
} from "@/lib/studyInterviewPreparation";

/**
 * Mock Interviews, under "Podcasts & Mock Interviews": Tim Hunt's page of
 * 18 November 2026, redesigned to his brief and design references of
 * 23 November 2026. All copy and the form list live in
 * client/src/lib/studyInterviewPreparation.ts.
 *
 * Each "Download PDF" is a plain link with the download attribute, so the
 * form is saved to the student's device rather than opened in a browser
 * tab, where some phones show a PDF but cannot keep what is typed into it.
 * The button keeps its full label at every width.
 */

const STEP_ICONS = {
  pdf: FileText,
  review: FileCheck2,
  practise: Laptop,
} as const;

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

/** Tim's notice, above each set of questionnaires. */
function EligibilityNotice() {
  return (
    <p className="mt-4 rounded-r-lg border-l-4 border-wsa-red bg-red-50 px-4 py-3 text-base font-semibold leading-relaxed text-wsa-red">
      {ELIGIBILITY_NOTICE}
    </p>
  );
}

/** "WSA podcasts to help you prepare", from the library's own records. */
function PodcastStrip({
  codes,
  columns,
}: {
  codes: readonly string[];
  columns: string;
}) {
  const resources = codes
    .map(code => getResourceByCode(code))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);
  return (
    <div className="mt-8">
      <h3 className="rounded-lg bg-wsa-red px-4 py-2.5 text-lg font-semibold text-white sm:text-xl">
        {PODCASTS_HEADING}
      </h3>
      <ul className={`mt-3 grid gap-3 ${columns}`}>
        {resources.map(r => (
          <li
            key={r.code}
            className="flex items-center gap-4 rounded-xl border border-wsa-navy/10 bg-white px-4 py-3"
          >
            <Headphones className="h-7 w-7 shrink-0 text-wsa-red" aria-hidden />
            <span className="h-9 w-px shrink-0 bg-wsa-navy/15" aria-hidden />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-snug text-wsa-navy">
                {r.code} {r.title}
              </p>
              <Link
                href={resourcePath(r.slug)}
                aria-label={`${LISTEN_LABEL}: ${r.code} ${r.title}`}
                className="text-sm font-semibold text-wsa-red underline underline-offset-2 hover:text-wsa-navy"
              >
                {LISTEN_LABEL}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StudyInterviewPreparation() {
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
                {BREADCRUMB.section}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page">{BREADCRUMB.page}</li>
          </ol>
        </nav>

        {/* Tim's banner, with the button that jumps to the questionnaires. */}
        <section className="grid overflow-hidden rounded-2xl bg-wsa-navy text-white lg:grid-cols-2">
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:py-14">
            <h1 className="text-3xl font-bold leading-[1.15] sm:text-4xl lg:text-[2.75rem]">
              {HERO.heading}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-white/90">
              {HERO.intro}
            </p>
            <a
              href={`#${QUESTIONNAIRES_ANCHOR}`}
              className="mt-7 inline-flex w-fit items-center rounded-lg bg-wsa-red px-6 py-3.5 text-base font-bold text-white transition-colors duration-200 hover:bg-wsa-red/90"
            >
              {HERO.cta}
            </a>
          </div>
          <img
            src={HERO.image}
            alt={HERO.imageAlt}
            width={HERO.imageWidth}
            height={HERO.imageHeight}
            decoding="async"
            className="h-56 w-full object-cover sm:h-72 lg:h-full"
          />
        </section>

        {/* How it works, directly below the banner. */}
        <section className="mt-10" aria-labelledby="how-it-works">
          <h2
            id="how-it-works"
            className="text-2xl font-bold text-wsa-navy sm:text-3xl"
          >
            {STEPS_HEADING}
          </h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = STEP_ICONS[step.icon];
              return (
                <li
                  key={step.title}
                  className="rounded-xl border border-wsa-navy/10 bg-white p-5"
                >
                  <Icon
                    className="h-10 w-10 text-wsa-red"
                    strokeWidth={1.6}
                    aria-hidden
                  />
                  <h3 className="mt-3 text-lg font-bold text-wsa-navy">
                    {i + 1}. {step.title}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-gray-700">
                    {step.text}
                  </p>
                </li>
              );
            })}
          </ol>
          {/* Tim Hunt asked for this note, 18 November 2026. */}
          <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-wsa-navy/10 bg-white px-4 py-3 text-base font-medium text-wsa-navy">
            <FileText
              className="mt-0.5 h-5 w-5 shrink-0 text-wsa-red"
              aria-hidden
            />
            <span>{NOTE}</span>
          </p>
        </section>

        {/* UK questionnaires: where "Find your questionnaire" lands. */}
        <section
          id={QUESTIONNAIRES_ANCHOR}
          className="mt-12 scroll-mt-28"
          aria-labelledby="uk-questionnaires"
        >
          <h2
            id="uk-questionnaires"
            className="text-2xl font-bold text-wsa-navy sm:text-3xl"
          >
            {UK_HEADING}
          </h2>
          <EligibilityNotice />
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
          <PodcastStrip codes={UK_PODCAST_CODES} columns="md:grid-cols-2" />
        </section>

        {/* Outside the UK */}
        <section className="mt-14" aria-labelledby="outside-the-uk">
          <h2
            id="outside-the-uk"
            className="text-2xl font-bold text-wsa-navy sm:text-3xl"
          >
            {ABROAD_HEADING}
          </h2>
          <p className="mt-1.5 text-base text-gray-600">{ABROAD_INTRO}</p>
          <EligibilityNotice />
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
          <PodcastStrip codes={ABROAD_PODCAST_CODES} columns="md:grid-cols-3" />
        </section>
      </div>
    </div>
  );
}
