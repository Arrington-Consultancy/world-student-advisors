import { ArrowRight, ArrowUpRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { Link } from "wouter";
import { STUDENT_SUPPORT_LIBRARY } from "@/lib/studentSupportLibrary";

/**
 * Student Support Library — Stage 1.
 *
 * A simple, scannable, mobile-first resource index: category heading + a
 * clean list of clickable titles per category. No thumbnails, no per-video
 * pages, no invented descriptions. Some resources intentionally appear in
 * more than one category — see client/src/lib/studentSupportLibrary.ts.
 */
export default function StudentSupportLibrary() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-24">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Student Support Library</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Free guidance for every stage of your journey
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Videos and guides from WSA's counsellors, organised by where you are in the process — from your first question to arriving abroad. All free to watch, no sign-up needed.
              </p>
            </div>
          </ScrollReveal>

          {/* Jump-to category nav — helps scanning on long pages, especially mobile */}
          <ScrollReveal delay={100}>
            <nav aria-label="Jump to category" className="flex flex-wrap gap-2 mt-12 pt-6 border-t border-border">
              {STUDENT_SUPPORT_LIBRARY.map((cat, i) => (
                <a
                  key={cat.title}
                  href={`#category-${i + 1}`}
                  className="px-3 py-1.5 text-xs font-medium text-wsa-navy/70 border border-border hover:border-wsa-red hover:text-wsa-red transition-colors"
                >
                  {i + 1}. {cat.title}
                </a>
              ))}
            </nav>
          </ScrollReveal>
        </div>
      </section>

      {/* Categories */}
      <section className="pb-24 lg:pb-32">
        <div className="container max-w-4xl">
          {STUDENT_SUPPORT_LIBRARY.map((cat, catIndex) => (
            <ScrollReveal key={cat.title} delay={Math.min(catIndex * 40, 200)}>
              <div
                id={`category-${catIndex + 1}`}
                className={`py-10 lg:py-12 scroll-mt-28 ${catIndex > 0 ? "border-t border-border" : ""}`}
              >
                <h2 className="text-2xl md:text-3xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  <span className="text-wsa-red/70 mr-2">{catIndex + 1}.</span>
                  {cat.title}
                </h2>
                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
                  {cat.resources.map(resource => (
                    <li key={`${cat.title}-${resource.title}-${resource.url}`}>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-2 py-2.5 text-[15px] text-wsa-navy/90 hover:text-wsa-red transition-colors border-b border-border/40 sm:border-none"
                      >
                        <span className="leading-snug">{resource.title}</span>
                        <ArrowUpRight
                          size={14}
                          className="shrink-0 mt-1 text-wsa-navy/30 group-hover:text-wsa-red transition-colors"
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          ))}
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
    </div>
  );
}
