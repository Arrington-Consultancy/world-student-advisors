import { Link } from "wouter";
import { ArrowRight, Headphones, BookOpen, Video, Presentation, Lock } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { isPublicContent, usePortalSession, LockedVideoOverlay } from "@/components/GatedVideoCard";

// A written guide (not a YouTube embed) surfaced alongside the video cards.
interface GuideItem {
  title: string;
  href: string;
  summary: string;
  category: string;
}

/**
 * Learning Hub. Connected Knowledge Centre
 * Design system: Editorial Calm (Poppins headings, generous spacing, trust-led)
 *
 * All YouTube IDs are from the verified @WorldStudentAdvisors channel.
 * Per brief S14, ONLY four items are publicly viewable without portal registration:
 *   The Student Journey / How to Write a Personal Statement /
 *   How to Apply for a PhD / Can You Work While You Study?
 * All other videos display a locked teaser with a portal registration CTA.
 */

interface VideoItem {
  title: string;
  youtubeId: string;
  duration: string;
  summary: string;
  category: string;
  presenter?: string;
  relatedLink?: { label: string; href: string };
}

// Real WSA YouTube videos, verified from channel
const featuredVideo: VideoItem = {
  title: "The Student Journey: From First Enquiry to Graduation",
  youtubeId: "ADQ1h0Ofhik",
  duration: "11:49",
  summary: "A complete walkthrough of what happens when you study abroad with WSA, from your first question to graduation day. Presented by Tim Hunt, Founder & Managing Director.",
  category: "Getting Started",
  presenter: "Tim Hunt",
  relatedLink: { label: "Start your application", href: "/contact" },
};

// The three free videos (besides the featured Student Journey), shown at the top of the page.
const freeVideos: VideoItem[] = [
  {
    title: "Writing a Personal Statement: What UK Universities Expect",
    youtubeId: "Uwz3OWh8rWA",
    duration: "3:19",
    summary: "What admissions teams look for in a personal statement, common mistakes to avoid, and how your counsellor helps you get it right.",
    category: "Applications",
    relatedLink: { label: "Meet the Counsellors", href: "/counsellors" },
  },
  {
    title: "How to Apply for a PhD: A Complete Guide for International Students",
    youtubeId: "Jo4cT1dC2tc",
    duration: "1:59",
    summary: "A step-by-step guide to PhD applications: finding supervisors, writing research proposals, funding options, and what universities look for in doctoral candidates.",
    category: "Practical Guides",
    relatedLink: { label: "Masters & Doctoral", href: "/masters-doctoral-degrees" },
  },
  {
    title: "Can You Work While You Study? UK Rules for International Students",
    youtubeId: "qx2yZo3UrM0",
    duration: "2:39",
    summary: "Understanding UK work rights for international students: how many hours you can work, what types of work are allowed, and how to balance study with employment.",
    category: "Practical Guides",
    relatedLink: { label: "Study in the UK", href: "/study-options" },
  },
];

// Portal-only content, shown in categorised sections below the free videos.
const videosByCategory: { category: string; description: string; videos: VideoItem[]; guides?: GuideItem[] }[] = [
  {
    category: "Visa & Immigration",
    description: "Clear, practical guidance on UK student visas, CAS letters, and immigration requirements. Your counsellor handles this with you, these videos help you understand what's ahead.",
    videos: [
      {
        title: "UK Student Visa 2026–27 Guide",
        youtubeId: "RAqz0qd34OA",
        duration: "8:15",
        summary: "CAS, bank statements, TB test, IHS, and Graduate Visa advice. Everything you need to know about the UK student visa process for 2026–27.",
        category: "Visa & Immigration",
        presenter: "Tim Hunt",
        relatedLink: { label: "Study in the UK", href: "/study-options" },
      },
      {
        title: "Credibility Interviews: How to Prepare for Your CAS & UKVI Student Visa Interview",
        youtubeId: "jqaNY_UTekc",
        duration: "8:11",
        summary: "What to expect from a credibility interview, how to prepare, and what the interviewer is looking for. Practical tips from experienced counsellors.",
        category: "Visa & Immigration",
        presenter: "Tim Hunt",
        relatedLink: { label: "Speak to a counsellor", href: "/contact" },
      },
      {
        title: "Guide for International Students: UK Visa, Bank Statements, CAS & Health Charge",
        youtubeId: "kwxnOj3FXYw",
        duration: "6:50",
        summary: "What you need to know about finances and documents for your UK student visa.",
        category: "Visa & Immigration",
        relatedLink: { label: "Study in the UK", href: "/study-options" },
      },
      {
        title: "Your Personal Guide to Applying for a UK English Study Visa",
        youtubeId: "iYvDj1cYrhc",
        duration: "3:54",
        summary: "A focused guide for students applying for English language study visas. Covers the specific requirements and timeline.",
        category: "Visa & Immigration",
        relatedLink: { label: "Online Learning", href: "/study-options/online-learning" },
      },
    ],
  },
  {
    category: "Interview & Application Preparation",
    description: "Practical advice on personal statements, university interviews, and application strategy. Your counsellor reviews everything with you, these videos help you prepare.",
    videos: [
      {
        title: "How to Pass Your UK University Interview",
        youtubeId: "kYb7iXC2vb4",
        duration: "4:03",
        summary: "Interview tips for Nursing, Teaching & Social Work programmes. What interviewers look for and how to present yourself confidently.",
        category: "Applications",
        relatedLink: { label: "Study Options", href: "/study-options" },
      },
      {
        title: "Ten Steps to UK University Success",
        youtubeId: "6a7do5dlbOI",
        duration: "2:57",
        summary: "A concise overview of the ten key steps from initial research to successful enrolment at a UK university.",
        category: "Applications",
        relatedLink: { label: "Start your application", href: "/contact" },
      },
    ],
    guides: [
      {
        title: "How to Write a University CV That Gets You Noticed",
        href: "/learning-hub/cv-university-application",
        summary: "The seven sections every strong university CV needs, plus a free downloadable checklist. Presented by Tim Hunt.",
        category: "Applications",
      },
    ],
  },
  {
    category: "Study Destinations",
    description: "Explore universities and destinations through video. See campuses, hear from representatives, and understand what each option offers.",
    videos: [
      {
        title: "Study in Hungary 2026–2027: University of Debrecen Guide",
        youtubeId: "cSEZdgQQR4o",
        duration: "8:57",
        summary: "A complete guide to studying at the University of Debrecen in Hungary for international students. Courses, costs, and student life.",
        category: "Destinations",
        relatedLink: { label: "Study in Europe", href: "/study-options" },
      },
      {
        title: "An Outstanding UK Study Opportunity: the University of Lincoln",
        youtubeId: "zm35CMrUAy4",
        duration: "7:58",
        summary: "Discover what makes the University of Lincoln an excellent choice for international students. Campus, courses, and support services.",
        category: "Destinations",
        relatedLink: { label: "Study in the UK", href: "/study-options" },
      },
      {
        title: "I Would Like to Introduce Aberystwyth University",
        youtubeId: "r5Dv1BN9G1E",
        duration: "8:01",
        summary: "An introduction to Aberystwyth University, its location, programmes, merit-based awards, and why international students choose it.",
        category: "Destinations",
        relatedLink: { label: "Study in the UK", href: "/study-options" },
      },
    ],
  },
  {
    category: "Meet the Team",
    description: "Get to know the people who will support you. Real introductions from WSA counsellors and application managers.",
    videos: [
      {
        title: "Introducing Juliet Nnajiofor-Uyi. Lagos, Nigeria",
        youtubeId: "SZjjr2T3qTU",
        duration: "2:17",
        summary: "Meet Juliet, based in Lagos, Nigeria. She introduces herself and explains how she supports students through the application process.",
        category: "Our Team",
        presenter: "Juliet Nnajiofor-Uyi",
        relatedLink: { label: "Meet all counsellors", href: "/counsellors" },
      },
    ],
  },
];

function VideoCard({
  video,
  featured = false,
  unlocked,
}: {
  video: VideoItem;
  featured?: boolean;
  unlocked: boolean;
}) {
  const isFree = isPublicContent(video.title, video.youtubeId);
  const canWatch = isFree || unlocked;
  return (
    <div className={featured ? "" : "border-t border-border pt-6"}>
      {/* Video embed */}
      {canWatch ? (
        <div className="relative aspect-video bg-wsa-navy/5 mb-5 overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            loading="lazy"
          />
        </div>
      ) : (
        <LockedVideoOverlay title={video.title} />
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-medium tracking-wider uppercase text-wsa-red/70">{video.category}</span>
        <span className="text-xs text-muted-foreground">{video.duration}</span>
        {video.presenter && (
          <span className="text-xs text-muted-foreground">• {video.presenter}</span>
        )}
        {isFree ? (
          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5">Free</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-wsa-navy/60 bg-wsa-navy/5 px-2 py-0.5">
            <Lock size={10} /> Portal
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-wsa-navy leading-snug mb-3 ${featured ? "text-xl md:text-2xl" : "text-lg"}`}>
        {video.title}
      </h3>

      {/* Summary */}
      <p className="text-muted-foreground leading-relaxed text-[15px] mb-4">{video.summary}</p>

      {/* Related link */}
      {video.relatedLink && (
        <Link href={video.relatedLink.href} className="inline-flex items-center text-sm font-medium text-wsa-red hover:text-wsa-red/80 transition-colors">
          {video.relatedLink.label} <ArrowRight className="ml-1.5" size={14} />
        </Link>
      )}
    </div>
  );
}

/** Same footprint as VideoCard, for written guides that don't have a video embed. */
function GuideCard({ guide }: { guide: GuideItem }) {
  return (
    <div className="border-t border-border pt-6">
      <Link href={guide.href} className="block relative aspect-video bg-wsa-navy mb-5 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-wsa-navy to-wsa-navy/80" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <BookOpen className="text-white mb-3" size={28} aria-hidden="true" />
          <p className="text-white text-sm font-medium group-hover:underline">Read the guide</p>
        </div>
      </Link>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-medium tracking-wider uppercase text-wsa-red/70">{guide.category}</span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-wsa-navy/60 bg-wsa-navy/5 px-2 py-0.5">
          <BookOpen size={10} /> Guide
        </span>
      </div>

      <h3 className="font-semibold text-wsa-navy leading-snug mb-3 text-lg">{guide.title}</h3>
      <p className="text-muted-foreground leading-relaxed text-[15px] mb-4">{guide.summary}</p>

      <Link href={guide.href} className="inline-flex items-center text-sm font-medium text-wsa-red hover:text-wsa-red/80 transition-colors">
        Read the guide <ArrowRight className="ml-1.5" size={14} />
      </Link>
    </div>
  );
}

export default function LearningHub() {
  const unlocked = usePortalSession();
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-24">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Learning Hub</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Understand your options before you decide
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Videos, guides, and podcasts created by WSA's qualified counsellors — all free to watch, for every student and family.
              </p>
            </div>
          </ScrollReveal>

          {/* Content type navigation */}
          <ScrollReveal delay={100}>
            <div className="flex flex-wrap gap-4 mt-12 border-b border-border pb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-wsa-navy text-white text-sm font-medium">
                <Video size={16} /> Videos
              </span>
              <Link href="/podcasts" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-wsa-navy/70 hover:text-wsa-red transition-colors border border-border">
                <Headphones size={16} /> 90-Second Advisor Podcast
              </Link>
              <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-wsa-navy/40 border border-border/50 cursor-default">
                <BookOpen size={16} /> Written Guides (coming soon)
              </span>
              <Link href="/training-workshops" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-wsa-navy/70 hover:text-wsa-red transition-colors border border-border">
                <Presentation size={16} /> Training & Workshops
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Most-watched guides — the four headline videos, always at the top of the page */}
      <section className="pb-24 lg:pb-32">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-4">Start here</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Start here — no sign-up needed
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Four of our most-requested guides — the best place to begin. The rest of the library continues below.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="max-w-4xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red/70 mb-4">Featured</p>
              <VideoCard video={featuredVideo} featured unlocked={unlocked} />
            </div>
          </ScrollReveal>
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {freeVideos.map((video, i) => (
              <ScrollReveal key={video.title} delay={i * 60}>
                <VideoCard video={video} unlocked={unlocked} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Divider intro for portal content */}
      <section className="py-16 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-white/60 mb-4">Student Portal library</p>
              <h2 className="text-2xl md:text-3xl font-semibold text-white leading-[1.15] mb-4">
                The full WSA library — free for everyone
              </h2>
              <p className="text-white/70 leading-relaxed mb-6">
                Visa guides, interview preparation, university profiles, and more — all open to watch, no sign-up needed.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/portal" className="inline-flex items-center px-5 py-2.5 bg-wsa-red text-white text-sm font-medium hover:bg-wsa-red/90 transition-colors">
                  Visit the Student Portal
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Video Categories */}
      {videosByCategory.map((cat, catIndex) => (
        <section
          key={cat.category}
          className={`py-20 lg:py-28 ${catIndex % 2 === 0 ? "bg-wsa-cream" : ""}`}
        >
          <div className="container">
            <ScrollReveal>
              <div className="max-w-2xl mb-12">
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-4">{cat.category}</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                  {cat.category}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {cat.description}
                </p>
              </div>
            </ScrollReveal>

            <div className={`grid gap-x-8 gap-y-10 ${cat.videos.length + (cat.guides?.length ?? 0) === 1 ? "max-w-xl" : "md:grid-cols-2 lg:grid-cols-3"}`}>
              {cat.videos.map((video, i) => (
                <ScrollReveal key={video.youtubeId} delay={i * 60}>
                  <VideoCard video={video} unlocked={unlocked} />
                </ScrollReveal>
              ))}
              {cat.guides?.map((guide, i) => (
                <ScrollReveal key={guide.href} delay={(cat.videos.length + i) * 60}>
                  <GuideCard guide={guide} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Portal sign-up CTA */}
      {!unlocked && (
        <section className="py-24 lg:py-32 bg-wsa-cream">
          <div className="container">
            <ScrollReveal>
              <div className="max-w-3xl mx-auto text-center">
                <div className="w-14 h-14 mx-auto mb-6 bg-wsa-navy flex items-center justify-center">
                  <Lock className="text-white" size={24} />
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Unlock the full library, free
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
                  Four of our most-requested guides are free to watch above. Register for the Student Portal to unlock every video, the searchable Student Resource Centre, downloadable guides, and personalised support from your counsellor.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center px-8 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                  >
                    Register free <ArrowRight className="ml-3" size={20} />
                  </Link>
                  <Link
                    href="/portal/login"
                    className="inline-flex items-center px-8 py-4 border border-wsa-navy/20 text-wsa-navy text-lg font-medium transition-colors hover:border-wsa-red hover:text-wsa-red"
                  >
                    Already registered? Log in
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Podcast Section */}
      <section className="py-24 lg:py-32 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Podcast</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15] mb-6">
                The 90-Second Advisor
              </h2>
              <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-2xl mx-auto">
                Quick, practical advice from WSA counsellors. Each episode covers one topic that matters to students and parents considering studying abroad.
              </p>
              <Link
                href="/podcasts"
                className="inline-flex items-center px-8 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
              >
                <Headphones className="mr-3" size={20} />
                Listen to episodes
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Have a question that isn't answered here?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10">
                Your Student Counsellor can answer specific questions about your situation. Apply today and they'll be in touch within 48 hours.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center px-10 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
              >
                Ask a counsellor
                <ArrowRight className="ml-3" size={20} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
