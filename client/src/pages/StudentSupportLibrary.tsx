import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Download,
  Eye,
  FileCheck2,
  GraduationCap,
  Headphones,
  Plane,
  PlayCircle,
  Search,
  X,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import ScrollReveal from "@/components/ScrollReveal";
import VideoModal from "@/components/VideoModal";
import {
  LIBRARY_DISCLAIMER,
  LIBRARY_PATH,
  LIBRARY_RESOURCES,
  LIBRARY_SECTIONS,
  pdfPath,
  resourcePath,
  resourcesInSection,
  searchLibrary,
  type LibraryResource,
  type LibrarySection,
} from "@/lib/studentSupportLibrary";
import { LIBRARY_CALLOUT, PAGE_PATH as INTERVIEW_PREPARATION_PATH } from "@/lib/studyInterviewPreparation";
import { PODCASTS_PAGE, type TopicIcon } from "@/lib/podcastsPage";
import { getYouTubeVideoId } from "@/lib/youtube";

const TOPIC_ICONS: Record<TopicIcon, typeof Headphones> = {
  help: Headphones,
  study: GraduationCap,
  applications: FileCheck2,
  travel: Plane,
};

/**
 * WSA Podcasts (the Student Support Library, renamed and redesigned to Tim
 * Hunt's brief of 23 November 2026; copy in client/src/lib/podcastsPage.ts).
 * Underneath it is still Tim Hunt's four-section structure of
 * 26 September 2026 (shared/studentSupportLibrary.ts). Every resource
 * appears once, in its one home section, and has its own permanent page at
 * /student-support-library/<slug>. Search runs over the same records and
 * puts the query in the address bar, so a search itself can be shared.
 */
export default function StudentSupportLibrary() {
  const [selected, setSelected] = useState<{ title: string; videoId: string; url: string } | null>(null);
  const search = useSearch();
  const [, navigate] = useLocation();

  // The address bar is the one source of truth for the search: the box
  // shows `?q=` and typing rewrites `?q=` (replace, not push, so the back
  // button leaves the library rather than stepping through keystrokes).
  // It must not be copied into local state once at mount: on the
  // prerendered page wouter reports an empty search during hydration and
  // the real one a moment later, and a copy taken at mount would miss it
  // (found on the live site, 29 September 2026: a shared ?q= link opened
  // on all 38 resources with the query stripped).
  const query = new URLSearchParams(search).get("q") ?? "";
  const setQuery = (value: string) =>
    navigate(value.trim() ? `${LIBRARY_PATH}?q=${encodeURIComponent(value)}` : LIBRARY_PATH, { replace: true });

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;
  const searchResults = useMemo(() => searchLibrary(trimmedQuery), [trimmedQuery]);

  const handlePlay = (resource: LibraryResource) => {
    const videoId = getYouTubeVideoId(resource.youtubeUrl);
    if (!videoId) {
      window.open(resource.youtubeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setSelected({ title: resource.title, videoId, url: resource.youtubeUrl });
  };

  return (
    <div className="min-h-screen">
      {/* Tim Hunt's "WSA Podcasts" design, 23 November 2026: hero, search,
          four topic cards and the way to Mock Interviews. */}
      <section className="pt-28 lg:pt-36 pb-10 lg:pb-12">
        <div className="container max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm font-semibold text-wsa-navy">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>{PODCASTS_PAGE.breadcrumb.section}</li>
              <li aria-hidden>
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li aria-current="page">{PODCASTS_PAGE.breadcrumb.page}</li>
            </ol>
          </nav>

          <div className="grid overflow-hidden rounded-2xl bg-wsa-navy text-white lg:grid-cols-[1fr_1fr]">
            <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:py-12">
              <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">{PODCASTS_PAGE.heading}</h1>
              <p className="mt-5 text-lg font-semibold leading-relaxed text-white/95 sm:text-xl">{PODCASTS_PAGE.lead}</p>
              <p className="mt-3 text-base text-white/85">{PODCASTS_PAGE.sub}</p>
            </div>
            <img
              src={PODCASTS_PAGE.image}
              alt={PODCASTS_PAGE.imageAlt}
              width={PODCASTS_PAGE.imageWidth}
              height={PODCASTS_PAGE.imageHeight}
              decoding="async"
              className="h-56 w-full object-cover sm:h-72 lg:h-full"
            />
          </div>

          <div className="mt-6">
            <div className="relative flex items-center rounded-xl border-2 border-wsa-navy/15 bg-white focus-within:border-wsa-red transition-colors">
              <label htmlFor="library-search" className="hidden shrink-0 border-r border-wsa-navy/15 px-5 py-1 text-lg font-bold text-wsa-navy sm:block">
                {PODCASTS_PAGE.searchLabel}
              </label>
              <Search size={18} className="ml-4 shrink-0 text-wsa-navy/40 sm:hidden" aria-hidden="true" />
              <input
                id="library-search"
                type="search"
                aria-label={PODCASTS_PAGE.searchLabel}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={PODCASTS_PAGE.searchPlaceholder}
                className="w-full min-w-0 bg-transparent px-4 py-4 pr-11 text-base text-wsa-navy placeholder:text-wsa-navy/45 focus:outline-none"
              />
              {isSearching && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-wsa-navy/40 hover:text-wsa-red transition-colors"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Searches titles, descriptions and the terms inside each summary. Every podcast has its own permanent link you can share.
            </p>
          </div>

          {!isSearching && (
            <nav aria-label="Podcast topics" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {PODCASTS_PAGE.topics.map(topic => {
                const Icon = TOPIC_ICONS[topic.icon];
                const section = LIBRARY_SECTIONS.find(s => s.number === topic.section)!;
                return (
                  <a
                    key={topic.section}
                    href={`#section-${topic.section}`}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border border-wsa-navy/15 bg-white px-3 py-6 text-center transition-colors hover:border-wsa-red focus-visible:border-wsa-red"
                  >
                    <Icon className="h-10 w-10 text-wsa-red" strokeWidth={1.6} aria-hidden />
                    <span className="text-base font-bold leading-snug text-wsa-navy sm:text-lg">{topic.label}</span>
                    <span className="text-xs text-wsa-navy/50">{resourcesInSection(section.id).length} podcasts</span>
                  </a>
                );
              })}
            </nav>
          )}

          {/* Tim: "Please add a clear link back to the Mock Interviews page." */}
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-red-50 px-5 py-4 text-base font-semibold text-wsa-navy">
            {PODCASTS_PAGE.mockInterviews.text}
            <Link href={INTERVIEW_PREPARATION_PATH} className="inline-flex items-center text-wsa-red underline underline-offset-2 hover:text-wsa-navy">
              {PODCASTS_PAGE.mockInterviews.link}
              <ArrowRight className="ml-1.5" size={16} aria-hidden />
            </Link>
          </p>
        </div>
      </section>

      {/* Sections, or search results */}
      <section className="pb-16 lg:pb-20">
        <div className="container max-w-4xl">
          {isSearching ? (
            <SearchResults query={trimmedQuery} results={searchResults} onPlay={handlePlay} />
          ) : (
            LIBRARY_SECTIONS.map((section, sectionIndex) => (
              <ScrollReveal key={section.id} delay={Math.min(sectionIndex * 40, 200)}>
                <div
                  id={`section-${section.number}`}
                  className={`py-10 lg:py-12 scroll-mt-28 ${sectionIndex > 0 ? "border-t border-border" : ""}`}
                >
                  <h2 className="text-2xl md:text-3xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                    <span className="text-wsa-red/70 mr-2">{section.number}.</span>
                    {section.title}
                  </h2>
                  <div className="grid lg:grid-cols-2 gap-x-8">
                    {resourcesInSection(section.id).map(resource => (
                      <ResourceCard key={resource.code} resource={resource} onPlay={handlePlay} />
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))
          )}
        </div>
      </section>

      {/* Tim Hunt's interview questionnaires, 18 November 2026 */}
      <section className="pb-8">
        <div className="container max-w-4xl">
          <div className="border border-border/40 bg-wsa-navy p-8 lg:p-10">
            <p className="text-sm font-medium tracking-[0.2em] uppercase text-white/70 mb-4">{LIBRARY_CALLOUT.eyebrow}</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-white leading-[1.2] mb-4">{LIBRARY_CALLOUT.heading}</h2>
            <p className="text-[15px] text-white/80 leading-relaxed mb-6 max-w-2xl">{LIBRARY_CALLOUT.text}</p>
            <Link
              href={INTERVIEW_PREPARATION_PATH}
              className="inline-flex items-center px-6 py-3 bg-wsa-red text-white font-semibold transition-colors duration-200 hover:bg-wsa-red/90"
            >
              {LIBRARY_CALLOUT.link}
              <ArrowRight className="ml-2" size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Interview Readiness Coach: applicant-benefit callout */}
      <section className="pb-16 lg:pb-20">
        <div className="container max-w-4xl">
          <div className="border border-border/40 p-8 lg:p-10">
            <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-4">Applicant benefit</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-wsa-navy leading-[1.2] mb-4">
              Prepare for your interview with the AI Interview Readiness Coach
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-6 max-w-2xl">
              Once you're a WSA applicant, your Student Portal gives you free access to structured AI practice for CAS interviews, UKVI credibility interviews, university interviews and course-specific interviews, with honest feedback before your live mock interview.
            </p>
            <Link
              href="/portal/interview-coach"
              className="inline-flex items-center text-wsa-navy font-semibold hover:text-wsa-red transition-colors duration-200"
            >
              Explore the Interview Readiness Coach
              <ArrowRight className="ml-2" size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Disclaimer, shown once for the whole library */}
      <section className="pb-16 lg:pb-20">
        <div className="container max-w-4xl">
          <p className="text-xs text-muted-foreground/80 leading-relaxed border-t border-border pt-6">{LIBRARY_DISCLAIMER}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 lg:py-32 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15] mb-6">
                Have a question that isn't answered here?
              </h2>
              <p className="text-lg text-white/70 leading-relaxed mb-10">
                Your Student Counsellor can answer specific questions about your situation. Apply today and they'll be in touch within 48 hours.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center px-10 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
              >
                Start your application
                <ArrowRight className="ml-3" size={20} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <VideoModal resource={selected} onOpenChange={open => !open && setSelected(null)} />
    </div>
  );
}

interface SearchResultsProps {
  query: string;
  results: ReturnType<typeof searchLibrary>;
  onPlay: (resource: LibraryResource) => void;
}

function SearchResults({ query, results, onPlay }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-wsa-navy mb-2">No results for "{query}"</p>
        <p className="text-muted-foreground">
          Try a different word, or clear the search to browse the four sections. Your Student Counsellor can also help you find what you need.
        </p>
      </div>
    );
  }

  return (
    <div className="py-10">
      <p className="text-sm font-medium text-wsa-navy/60 mb-6">
        {results.length} {results.length === 1 ? "result" : "results"} for "{query}"
      </p>
      <div className="grid lg:grid-cols-2 gap-x-8">
        {results.map(({ resource, section }) => (
          <ResourceCard key={resource.code} resource={resource} onPlay={onPlay} section={section} />
        ))}
      </div>
    </div>
  );
}

interface ResourceCardProps {
  resource: LibraryResource;
  onPlay: (resource: LibraryResource) => void;
  /** In search results, the one section this resource lives in. */
  section?: LibrarySection;
}

function ResourceCard({ resource, onPlay, section }: ResourceCardProps) {
  const pdfUrl = pdfPath(resource);
  const page = resourcePath(resource.slug);

  return (
    <div className="py-6 border-b border-border/40 lg:border-none lg:pb-8">
      <h3 className="text-lg sm:text-xl font-semibold text-wsa-navy leading-snug mb-1.5">
        <span className="text-wsa-red">{resource.code}</span>
        <span className="text-wsa-navy/30 mx-2 font-normal">|</span>
        <Link href={page} className="hover:text-wsa-red transition-colors">
          {resource.title}
        </Link>
      </h3>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-3">{resource.description}</p>
      {section && (
        <p className="text-xs text-wsa-navy/50 mb-3">
          Section {section.number}: {section.title}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 -mx-2">
        <button
          type="button"
          onClick={() => onPlay(resource)}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-wsa-navy/90 hover:text-wsa-red transition-colors px-2 py-2.5"
        >
          <PlayCircle size={16} className="shrink-0" aria-hidden="true" />
          Watch / Listen
        </button>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-wsa-navy/70 hover:text-wsa-red transition-colors px-2 py-2.5"
        >
          <Eye size={16} className="shrink-0" aria-hidden="true" />
          View Summary
        </a>
        <a
          href={pdfUrl}
          download={resource.pdfFile}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-wsa-navy/70 hover:text-wsa-red transition-colors px-2 py-2.5"
        >
          <Download size={16} className="shrink-0" aria-hidden="true" />
          Download Summary
        </a>
        <Link
          href={page}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-wsa-navy/70 hover:text-wsa-red transition-colors px-2 py-2.5"
        >
          Open page
          <ArrowRight size={14} className="shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
