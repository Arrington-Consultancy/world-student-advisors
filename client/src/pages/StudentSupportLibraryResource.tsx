import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Check, Download, Eye, Link2, PlayCircle } from "lucide-react";
import NotFound from "@/pages/NotFound";
import {
  LIBRARY_DISCLAIMER,
  LIBRARY_PATH,
  getResourceBySlug,
  getSection,
  pdfPath,
  resourcePath,
  resourcesInSection,
} from "@/lib/studentSupportLibrary";
import { getCanonicalUrl } from "@/lib/seo";
import { getYouTubeEmbedUrl, getYouTubeVideoId } from "@/lib/youtube";

/**
 * One permanent page per Student Support Library resource,
 * /student-support-library/<slug>. This is the link a Student Counsellor
 * sends instead of a YouTube link (Tim Hunt, 26 September 2026): the student
 * can watch or listen, read or download the WSA summary, and is on the WSA
 * website with the rest of the library one click away.
 *
 * The recording is not requested from YouTube until the visitor presses
 * play, and then only in the privacy-enhanced player, as on the library
 * page itself. Nothing here collects data or calls the server.
 */
export default function StudentSupportLibraryResource() {
  const { slug } = useParams<{ slug: string }>();
  const resource = slug ? getResourceBySlug(slug) : undefined;
  if (!resource) return <NotFound />;

  const section = getSection(resource.section);
  const others = resourcesInSection(resource.section).filter(r => r.code !== resource.code);
  const permanentUrl = getCanonicalUrl(resourcePath(resource.slug));
  const pdfUrl = pdfPath(resource);

  return (
    <div className="min-h-screen">
      <section className="pt-32 lg:pt-40 pb-12 lg:pb-16">
        <div className="container max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-8">
            <Link href={LIBRARY_PATH} className="hover:text-wsa-red transition-colors">
              Student Support Library
            </Link>
            <span className="mx-2 text-wsa-navy/30">/</span>
            <Link href={`${LIBRARY_PATH}#section-${section.number}`} className="hover:text-wsa-red transition-colors">
              {section.number}. {section.title}
            </Link>
          </nav>

          <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-4">
            {resource.code}
            <span className="text-wsa-navy/30 mx-2 font-normal normal-case tracking-normal">|</span>
            <span className="normal-case tracking-normal text-wsa-navy/60">
              {section.number}. {section.title}
            </span>
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-wsa-navy leading-[1.1] mb-6">
            {resource.title}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-10">{resource.description}</p>

          <Player resource={resource} />

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 border border-wsa-navy/20 text-sm font-semibold text-wsa-navy hover:border-wsa-red hover:text-wsa-red transition-colors"
            >
              <Eye size={16} aria-hidden="true" />
              View Summary
            </a>
            <a
              href={pdfUrl}
              download={resource.pdfFile}
              className="inline-flex items-center gap-2 px-5 py-3 border border-wsa-navy/20 text-sm font-semibold text-wsa-navy hover:border-wsa-red hover:text-wsa-red transition-colors"
            >
              <Download size={16} aria-hidden="true" />
              Download Summary
            </a>
            <CopyLinkButton url={permanentUrl} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground break-all">
            Permanent link: <span className="text-wsa-navy/70">{permanentUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
          </p>
        </div>
      </section>

      {others.length > 0 && (
        <section className="pb-12 lg:pb-16">
          <div className="container max-w-4xl">
            <div className="border-t border-border pt-8">
              <h2 className="text-xl font-semibold text-wsa-navy mb-4">
                More in {section.number}. {section.title}
              </h2>
              <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                {others.map(r => (
                  <li key={r.code}>
                    <Link
                      href={resourcePath(r.slug)}
                      className="group inline-flex items-baseline gap-2 py-1.5 text-[15px] text-wsa-navy hover:text-wsa-red transition-colors"
                    >
                      <span className="text-xs font-medium text-wsa-red/80 shrink-0">{r.code}</span>
                      <span className="group-hover:underline underline-offset-2">{r.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="pb-16 lg:pb-20">
        <div className="container max-w-4xl">
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <Link
              href={LIBRARY_PATH}
              className="inline-flex items-center gap-2 text-wsa-navy font-semibold hover:text-wsa-red transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to the Student Support Library
            </Link>
            <Link href={`${LIBRARY_PATH}?q=`} className="text-sm text-muted-foreground hover:text-wsa-red transition-colors">
              Search all {section.number === 1 ? "the" : "the"} podcasts and guides
            </Link>
          </div>
          <p className="mt-10 text-xs text-muted-foreground/80 leading-relaxed border-t border-border pt-6">{LIBRARY_DISCLAIMER}</p>
        </div>
      </section>
    </div>
  );
}

function Player({ resource }: { resource: ReturnType<typeof getResourceBySlug> & object }) {
  const [playing, setPlaying] = useState(false);
  const videoId = getYouTubeVideoId(resource.youtubeUrl);

  if (!videoId) {
    return (
      <a
        href={resource.youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-wsa-navy font-semibold hover:text-wsa-red"
      >
        <PlayCircle size={18} aria-hidden="true" /> Watch / Listen on YouTube
      </a>
    );
  }

  return (
    <div className="aspect-video w-full bg-wsa-navy overflow-hidden">
      {playing ? (
        <iframe
          src={getYouTubeEmbedUrl(videoId)}
          title={resource.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play: ${resource.title}`}
          className="group w-full h-full flex flex-col items-center justify-center gap-4 text-white px-6 text-center"
        >
          <span className="w-20 h-20 rounded-full bg-white/95 text-wsa-navy flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <PlayCircle size={40} aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">Watch / Listen</span>
          <span className="text-xs text-white/60 max-w-sm">
            Plays in YouTube's privacy-enhanced player. Nothing is loaded from YouTube until you press play.
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * For staff sending the link to a student: copies the permanent URL. Falls
 * back to showing the URL selected in the text below when the clipboard is
 * unavailable, which the visible "Permanent link" line already covers.
 */
function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 px-5 py-3 border border-wsa-navy/20 text-sm font-semibold text-wsa-navy hover:border-wsa-red hover:text-wsa-red transition-colors"
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}
