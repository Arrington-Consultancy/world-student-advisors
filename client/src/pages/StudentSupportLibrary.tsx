import { useMemo, useState } from "react";
import { ArrowRight, Download, Eye, PlayCircle, Search, X } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { Link } from "wouter";
import {
  CANONICAL_RESOURCES,
  LIBRARY_SECTIONS,
  searchLibrary,
  type CanonicalResource,
} from "@/lib/studentSupportLibrary";
import { getYouTubeVideoId } from "@/lib/youtube";
import VideoModal from "@/components/VideoModal";

const DISCLAIMER =
  "Disclaimer: This information is provided in good faith and was believed to be accurate at the time of publication. Fees, dates, entry requirements, visa regulations and other information may change. Students should check current requirements before making any financial or study commitments.";

/**
 * Student Support Library — Stage 2.
 *
 * Every resource is rendered from a single canonical WSA 001–039 record
 * (see client/src/lib/studentSupportLibrary.ts) — a resource used in
 * several sections is the same object referenced by code each time, never
 * a separate copy. Search runs over that same canonical set, so a match
 * always resolves to one result even when the resource appears in
 * multiple sections.
 */
export default function StudentSupportLibrary() {
  const [selected, setSelected] = useState<{ title: string; videoId: string; url: string } | null>(null);
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;
  const searchResults = useMemo(() => searchLibrary(trimmedQuery), [trimmedQuery]);

  const handlePlay = (resource: CanonicalResource) => {
    const videoId = getYouTubeVideoId(resource.youtubeUrl);
    if (!videoId) {
      // Shouldn't happen (every URL in the data file is validated against
      // this same parser), but never fail silently on a click.
      window.open(resource.youtubeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setSelected({ title: resource.title, videoId, url: resource.youtubeUrl });
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-24">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Podcasts • Guides • Student Support</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Your Student Support Library
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Free podcasts and practical guides from WSA's student counsellors, supporting you at every stage of your journey, from choosing where and what to study through to your visa, travel and arrival. No sign up. Just straightforward advice when you need it.
              </p>
            </div>
          </ScrollReveal>

          {/* Search */}
          <ScrollReveal delay={80}>
            <div className="mt-12 pt-6 border-t border-border max-w-xl">
              <label htmlFor="library-search" className="sr-only">
                Search the Student Support Library
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-wsa-navy/40"
                  aria-hidden="true"
                />
                <input
                  id="library-search"
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search visas, CAS, scholarships, PhD, Canada..."
                  className="w-full pl-11 pr-11 py-3.5 border border-border text-wsa-navy placeholder:text-wsa-navy/40 focus:outline-none focus:border-wsa-red transition-colors"
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
            </div>
          </ScrollReveal>

          {/* Jump-to category nav — hidden while searching, since results
              replace the sectioned browse view below. */}
          {!isSearching && (
            <ScrollReveal delay={120}>
              <nav aria-label="Jump to category" className="flex flex-wrap gap-2 mt-8">
                {LIBRARY_SECTIONS.map((section, i) => (
                  <a
                    key={section.title}
                    href={`#category-${i + 1}`}
                    className="px-3 py-1.5 text-xs font-medium text-wsa-navy/70 border border-border hover:border-wsa-red hover:text-wsa-red transition-colors"
                  >
                    {i + 1}. {section.title}
                  </a>
                ))}
              </nav>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* Categories, or search results */}
      <section className="pb-16 lg:pb-20">
        <div className="container max-w-4xl">
          {isSearching ? (
            <SearchResults query={trimmedQuery} results={searchResults} onPlay={handlePlay} />
          ) : (
            LIBRARY_SECTIONS.map((section, sectionIndex) => (
              <ScrollReveal key={section.title} delay={Math.min(sectionIndex * 40, 200)}>
                <div
                  id={`category-${sectionIndex + 1}`}
                  className={`py-10 lg:py-12 scroll-mt-28 ${sectionIndex > 0 ? "border-t border-border" : ""}`}
                >
                  <h2 className="text-2xl md:text-3xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                    <span className="text-wsa-red/70 mr-2">{sectionIndex + 1}.</span>
                    {section.title}
                  </h2>
                  <div className="grid lg:grid-cols-2 gap-x-8">
                    {section.codes.map(code => (
                      <ResourceCard
                        key={code}
                        resource={CANONICAL_RESOURCES[code]}
                        onPlay={handlePlay}
                      />
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))
          )}
        </div>
      </section>

      {/* Disclaimer — shown once for the whole library, not repeated per resource */}
      <section className="pb-16 lg:pb-20">
        <div className="container max-w-4xl">
          <p className="text-xs text-muted-foreground/80 leading-relaxed border-t border-border pt-6">
            {DISCLAIMER}
          </p>
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
  onPlay: (resource: CanonicalResource) => void;
}

function SearchResults({ query, results, onPlay }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-wsa-navy mb-2">No results for "{query}"</p>
        <p className="text-muted-foreground">
          Try a different word, or browse the sections above — your Student Counsellor can also help you find what you need.
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
        {results.map(({ resource, sections }) => (
          <ResourceCard key={resource.code} resource={resource} onPlay={onPlay} sections={sections} />
        ))}
      </div>
    </div>
  );
}

interface ResourceCardProps {
  resource: CanonicalResource;
  onPlay: (resource: CanonicalResource) => void;
  /** When shown in search results, the sections this resource belongs to. */
  sections?: string[];
}

function ResourceCard({ resource, onPlay, sections }: ResourceCardProps) {
  const pdfUrl = `/downloads/${resource.pdfFile}`;

  return (
    <div className="py-6 border-b border-border/40 lg:border-none lg:pb-8">
      <h3 className="text-lg sm:text-xl font-semibold text-wsa-navy leading-snug mb-1.5">
        <span className="text-wsa-red">{resource.code}</span>
        <span className="text-wsa-navy/30 mx-2 font-normal">|</span>
        {resource.title}
      </h3>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-3">{resource.description}</p>
      {sections && sections.length > 0 && (
        <p className="text-xs text-wsa-navy/50 mb-3">Appears in: {sections.join(", ")}</p>
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
      </div>
    </div>
  );
}
