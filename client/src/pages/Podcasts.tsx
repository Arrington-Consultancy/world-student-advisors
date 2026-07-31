import { Link } from "wouter";
import { ArrowRight, Headphones, Lock } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { isPublicContent, usePortalSession, LockedVideoOverlay } from "@/components/GatedVideoCard";

/**
 * Podcasts page. "Free Expert Advice Anytime, Anywhere"
 * Content source: worldstudentadvisors.com/podcasts (approved)
 * YouTube videos: curated from @WorldStudentAdvisors channel
 * Social: YouTube channel link for full library
 */

interface PodcastEpisode {
  title: string;
  youtubeId: string;
  duration: string;
  summary: string;
  category: string;
}

// Curated podcast-style episodes from the WSA YouTube channel
const episodes: PodcastEpisode[] = [
  {
    title: "The Student Journey: From First Enquiry to Graduation",
    youtubeId: "ADQ1h0Ofhik",
    duration: "11:49",
    summary: "A complete walkthrough of what happens when you study abroad with WSA, from your first question to graduation day. Presented by Tim Hunt.",
    category: "Getting Started",
  },
  {
    title: "UK Student Visa 2026–27 Guide",
    youtubeId: "RAqz0qd34OA",
    duration: "8:15",
    summary: "CAS, bank statements, TB test, IHS, and Graduate Visa advice. Everything you need to know about the UK student visa process for 2026–27.",
    category: "Visas & Immigration",
  },
  {
    title: "Credibility Interviews: How to Prepare for Your CAS & UKVI Interview",
    youtubeId: "jqaNY_UTekc",
    duration: "8:11",
    summary: "What to expect from a credibility interview, how to prepare, and what the interviewer is looking for. Practical tips from experienced counsellors.",
    category: "Visas & Immigration",
  },
  {
    title: "Writing a Personal Statement: What UK Universities Expect",
    youtubeId: "Uwz3OWh8rWA",
    duration: "3:19",
    summary: "What admissions teams look for in a personal statement, common mistakes to avoid, and how your counsellor helps you get it right.",
    category: "Applications",
  },
  {
    title: "How to Pass Your UK University Interview",
    youtubeId: "kYb7iXC2vb4",
    duration: "4:03",
    summary: "Interview tips for Nursing, Teaching & Social Work programmes. What interviewers look for and how to present yourself confidently.",
    category: "Applications",
  },
  {
    title: "Ten Steps to UK University Success",
    youtubeId: "6a7do5dlbOI",
    duration: "2:57",
    summary: "A concise overview of the ten key steps from initial research to successful enrolment at a UK university.",
    category: "Getting Started",
  },
  {
    title: "Your Personal Guide to Applying for a UK English Study Visa",
    youtubeId: "iYvDj1cYrhc",
    duration: "3:54",
    summary: "A focused guide for students applying for English language study visas. Covers the specific requirements and timeline.",
    category: "Visas & Immigration",
  },
  {
    title: "Guide for International Students: UK Visa, Bank Statements, CAS & Health Charge",
    youtubeId: "kwxnOj3FXYw",
    duration: "6:50",
    summary: "What you need to know about finances and documents for your UK student visa.",
    category: "Visas & Immigration",
  },
];

export default function Podcasts() {
  const unlocked = usePortalSession();
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Podcast Series</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Free expert advice, anytime, anywhere
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Real conversations about studying abroad. Every episode is free to watch — no sign-up needed.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Introduction */}
      <section className="pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl border-l-4 border-wsa-red/30 pl-8">
              <p className="text-lg text-wsa-navy leading-relaxed mb-5">
                These episodes are made for students and parents who want straight answers. Each one covers a specific stage of the process, from picking a subject to landing in the UK. Every episode is free to watch, here and in the Student Portal.
              </p>
              <p className="text-lg text-wsa-navy leading-relaxed mb-5">
                You'll hear from real students, education professionals, and university staff. Topics include choosing the right course, writing a strong application, securing your offer, paying your deposit, and preparing for your visa.
              </p>
              <p className="text-lg text-wsa-navy leading-relaxed">
                When you work with us, you get a named counsellor who handles everything personally: accommodation, flights, pre-departure preparation, and check-ins after you arrive. We stay in touch long after enrolment.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Episodes grid */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-14">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Episodes</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Watch and learn at your own pace
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Each episode covers one topic that matters to students and parents considering studying abroad. Practical, honest, and free to watch.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-x-8 gap-y-12">
            {episodes.map((ep, i) => {
              const isFree = isPublicContent(ep.title, ep.youtubeId);
              const canWatch = isFree || unlocked;
              return (
                <ScrollReveal key={ep.youtubeId} delay={i * 60}>
                  <div className="border-t-2 border-wsa-red/20 pt-6">
                    {canWatch ? (
                      <div className="relative aspect-video bg-white mb-5 overflow-hidden">
                        <iframe
                          src={`https://www.youtube.com/embed/${ep.youtubeId}`}
                          title={ep.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <LockedVideoOverlay title={ep.title} />
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-medium tracking-wider uppercase text-wsa-red/70">{ep.category}</span>
                      <span className="text-xs text-muted-foreground">{ep.duration}</span>
                      {isFree ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5">Free</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-wsa-navy/60 bg-wsa-navy/5 px-2 py-0.5">
                          <Lock size={10} /> Portal
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-wsa-navy mb-3 leading-snug">{ep.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-[15px]">{ep.summary}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {!unlocked && (
            <ScrollReveal>
              <div className="mt-14 pt-8 border-t border-border/40 text-center">
                <p className="text-muted-foreground mb-5">
                  Register free for the Student Portal to unlock the full podcast series and the Student Resource Centre.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center px-8 py-3 bg-wsa-red text-white font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                >
                  Register free <ArrowRight className="ml-2" size={16} />
                </Link>
              </div>
            </ScrollReveal>
          )}

          <ScrollReveal>
            <div className="mt-14 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-muted-foreground">
                More episodes available on our YouTube channel, university profiles, destination guides, and student stories.
              </p>
              <a
                href="https://www.youtube.com/@WorldStudentAdvisors"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-wsa-red hover:text-wsa-red/80 transition-colors whitespace-nowrap"
              >
                View full channel <ArrowRight className="ml-1.5" size={14} />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Topics covered */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Topics covered</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Practical guidance for every stage
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Each episode answers the questions students and parents actually ask, with honest, practical advice from people who do this work every day.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Choosing the right course", desc: "How to match your academic background, career goals, and personal interests with the right programme and institution." },
              { title: "Visa & immigration", desc: "Step-by-step guidance on CAS letters, bank statements, TB tests, health surcharges, and credibility interviews." },
              { title: "Personal statements", desc: "What admissions teams look for, how to structure your statement, and common mistakes to avoid." },
              { title: "University interviews", desc: "How to prepare for programme-specific interviews, what to expect, and how to present yourself confidently." },
              { title: "Student life abroad", desc: "Accommodation, budgeting, making friends, and settling into a new country. Real advice from real students." },
              { title: "For parents", desc: "Conversations specifically for parents about supporting their child, understanding costs, and staying informed." },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 60}>
                <div className="border-t-2 border-wsa-red/20 pt-6">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 lg:py-40 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15] mb-6">
                Have a question for the podcast?
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-10">
                If there's a topic you'd like us to cover, get in touch. We build episodes around what students and parents actually want to know.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center px-10 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                >
                  Get in touch
                  <ArrowRight className="ml-3" size={20} />
                </Link>
                <a
                  href="https://www.youtube.com/@WorldStudentAdvisors?sub_confirmation=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-8 py-4 border border-white/30 text-white text-base font-medium transition-all duration-200 hover:border-white/60"
                >
                  <Headphones className="mr-2" size={18} />
                  Subscribe on YouTube
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
