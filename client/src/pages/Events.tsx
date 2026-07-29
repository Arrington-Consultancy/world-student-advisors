import { Link } from "wouter";
import { ArrowRight, Calendar, Users, Video, Lock } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { isPublicContent, usePortalSession, LockedVideoOverlay } from "@/components/GatedVideoCard";

/**
 * Events & Webinars page
 * Content source: worldstudentadvisors.com/events (approved)
 * YouTube videos: curated from @WorldStudentAdvisors channel
 * Social channels: YouTube, WhatsApp integrated where they add value
 */

interface EventVideo {
  title: string;
  youtubeId: string;
  duration: string;
  summary: string;
  category: string;
}

// Curated selection of the strongest event-relevant videos from the WSA YouTube channel
const onDemandVideos: EventVideo[] = [
  {
    title: "The Student Journey: From First Enquiry to Graduation",
    youtubeId: "ADQ1h0Ofhik",
    duration: "11:49",
    summary: "A complete walkthrough of what happens when you study abroad with WSA, from your first question to graduation day.",
    category: "Getting Started",
  },
  {
    title: "UK Student Visa 2026–27 Guide",
    youtubeId: "RAqz0qd34OA",
    duration: "8:15",
    summary: "CAS, bank statements, TB test, IHS, and Graduate Visa advice. Everything you need to know about the UK student visa process.",
    category: "Visa & Immigration",
  },
  {
    title: "How to Pass Your UK University Interview",
    youtubeId: "kYb7iXC2vb4",
    duration: "4:03",
    summary: "Interview tips for Nursing, Teaching & Social Work programmes. What interviewers look for and how to present yourself confidently.",
    category: "Application Workshop",
  },
  {
    title: "Credibility Interviews: How to Prepare",
    youtubeId: "jqaNY_UTekc",
    duration: "8:11",
    summary: "What to expect from a credibility interview, how to prepare, and what the interviewer is looking for.",
    category: "Visa & Immigration",
  },
  {
    title: "Writing a Personal Statement: What UK Universities Expect",
    youtubeId: "Uwz3OWh8rWA",
    duration: "3:19",
    summary: "What admissions teams look for in a personal statement, common mistakes to avoid, and how to get it right.",
    category: "Application Workshop",
  },
  {
    title: "Ten Steps to UK University Success",
    youtubeId: "6a7do5dlbOI",
    duration: "2:57",
    summary: "A concise overview of the ten key steps from initial research to successful enrolment at a UK university.",
    category: "Getting Started",
  },
];

export default function Events() {
  const unlocked = usePortalSession();
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Events & Webinars</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Stay informed and connected
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Hear directly from UK universities, specialist counsellors, and students already on their journey. Join live events or watch on-demand content at your convenience.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Event categories */}
      <section className="pb-20 lg:pb-28">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Calendar,
                title: "Upcoming Webinars",
                desc: "Upcoming webinars on visas, scholarships and course choices. Register to attend live and ask questions directly.",
              },
              {
                icon: Users,
                title: "Live Q&A Sessions",
                desc: "Live Q&A sessions with counsellors and admissions officers. Get your specific questions answered in real time.",
              },
              {
                icon: Video,
                title: "On-Demand Content",
                desc: "Recorded events available to watch at your convenience. Never miss important guidance, watch when it suits you.",
              },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 80}>
                <div className="border border-border/40 p-8 h-full">
                  <item.icon size={28} className="text-wsa-red mb-5" />
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming events */}
      <section className="py-20 lg:py-28 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Upcoming</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15]">
                Scheduled sessions
              </h2>
            </div>
          </ScrollReveal>

         <ScrollReveal>
           <div className="border border-border/40 bg-white p-12 lg:p-16 text-center">
             <p className="text-lg text-muted-foreground mb-6">
                New live sessions are announced regularly throughout the year.
             </p>
             <p className="text-sm text-muted-foreground mb-8">
                Register your interest below and we'll email you as soon as the next date is confirmed, typically within a few weeks.
             </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center px-6 py-3 bg-wsa-red text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                >
                  Register your interest <ArrowRight className="ml-2" size={14} />
                </Link>
                <a
                  href="https://www.youtube.com/@WorldStudentAdvisors?sub_confirmation=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 border border-wsa-navy/20 text-sm font-medium text-wsa-navy hover:border-wsa-red hover:text-wsa-red transition-colors"
                >
                  Subscribe on YouTube <ArrowRight className="ml-2" size={14} />
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* On-demand recordings - curated YouTube videos */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-14">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">On-Demand</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Watch expert guidance anytime
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Curated recordings from WSA's qualified counsellors covering visas, applications, interviews, and the student journey. Watch at your own pace.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {onDemandVideos.map((video, i) => {
              const isFree = isPublicContent(video.title, video.youtubeId);
              const canWatch = isFree || unlocked;
              return (
                <ScrollReveal key={video.youtubeId} delay={i * 60}>
                  <div className="border-t-2 border-wsa-red/20 pt-6">
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
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-medium tracking-wider uppercase text-wsa-red/70">{video.category}</span>
                      <span className="text-xs text-muted-foreground">{video.duration}</span>
                      {isFree ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5">Free</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-wsa-navy/60 bg-wsa-navy/5 px-2 py-0.5">
                          <Lock size={10} /> Portal
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-wsa-navy mb-3 leading-snug">{video.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-[15px]">{video.summary}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {!unlocked && (
            <ScrollReveal>
              <div className="mt-14 text-center">
                <p className="text-muted-foreground mb-5">
                  Register free for the Student Portal to unlock all recorded events and webinars.
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
                More videos available on our YouTube channel, visa guides, university profiles, and student advice.
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

      {/* What to expect */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">What to expect</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Sessions designed for students and parents
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our webinars are led by WSA's qualified counsellors and cover the topics that matter most to families considering studying abroad.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Application workshops", desc: "Step-by-step guidance on personal statements, documents, and deadlines. Practical advice you can act on immediately." },
              { title: "Visa & immigration", desc: "Understanding the visa process, timelines, and what documentation you'll need. Country-specific sessions available." },
              { title: "Destination overviews", desc: "What it's really like to study in the UK, USA, Canada, or Europe. Cost of living, student life, and career prospects." },
              { title: "For parents", desc: "Sessions specifically for parents covering safeguarding, communication with counsellors, and what to expect at each stage." },
              { title: "Q&A with counsellors", desc: "Open sessions where you can ask our team anything. No question is too basic or too specific." },
              { title: "Student life preparation", desc: "Practical sessions on accommodation, budgeting, health insurance, and settling into a new country." },
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

      {/* CTA with WhatsApp */}
      <section className="py-28 lg:py-40 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15] mb-6">
                Can't wait for an event?
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-10">
                Speak to a counsellor directly. Get started and your Student Counsellor can answer your questions within 48 hours, or message us on WhatsApp for a quick response.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center px-10 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                >
                  Get Started
                  <ArrowRight className="ml-3" size={20} />
                </Link>
                <a
                  href="https://wa.me/447914797830"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-8 py-4 border border-white/30 text-white text-base font-medium transition-all duration-200 hover:border-white/60"
                >
                  WhatsApp us
                  <ArrowRight className="ml-2" size={16} />
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
