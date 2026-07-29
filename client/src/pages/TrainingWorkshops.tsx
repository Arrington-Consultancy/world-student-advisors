import { Link } from "wouter";
import { ArrowRight, Users, GraduationCap, Presentation } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

/**
 * Training & Workshops - Holding Page
 * 
 * A placeholder page for future training and storyboard-led learning content.
 * No courses, dates, prices, qualifications, or delivery formats are invented.
 * CTA links to the general enquiry form with pre-selected subject.
 */

export default function TrainingWorkshops() {
  return (
    <div className="min-h-screen">
      {/* Hero - clean editorial layout, no image */}
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-24">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                Training & Workshops
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Practical learning built around real situations
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mb-4">
                WSA is developing a new range of practical training sessions and storyboard-led learning resources for students, parents, counsellors and education partners.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                The content will turn complex parts of the international education journey into clear, structured sessions that are easier to understand, discuss and apply.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* What we are developing */}
      <section className="py-20 lg:py-28 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-14">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-4">In development</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15]">
                What we are developing
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <ScrollReveal delay={0}>
              <div className="bg-white p-8 lg:p-10 h-full border border-border/50">
                <div className="w-12 h-12 flex items-center justify-center bg-wsa-red/10 mb-6">
                  <GraduationCap className="text-wsa-red" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-wsa-navy mb-4">
                  Student and parent sessions
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Clear guidance covering applications, interviews, visas, preparation and the wider study-abroad journey.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={80}>
              <div className="bg-white p-8 lg:p-10 h-full border border-border/50">
                <div className="w-12 h-12 flex items-center justify-center bg-wsa-red/10 mb-6">
                  <Users className="text-wsa-red" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-wsa-navy mb-4">
                  Counsellor and team training
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Structured learning resources designed to support consistent, informed and ethical student guidance.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={160}>
              <div className="bg-white p-8 lg:p-10 h-full border border-border/50">
                <div className="w-12 h-12 flex items-center justify-center bg-wsa-red/10 mb-6">
                  <Presentation className="text-wsa-red" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-wsa-navy mb-4">
                  Storyboard-led learning
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Visual, scenario-based sessions that make complex subjects easier to follow and discuss.
                </p>
              </div>
            </ScrollReveal>
          </div>

          {/* Holding statement */}
          <ScrollReveal>
            <div className="mt-14 border-l-2 border-wsa-red/30 pl-6 max-w-2xl">
              <p className="text-muted-foreground leading-relaxed italic">
                This area is currently being developed. Full details will be added once the programme content and delivery format have been approved.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Interested in future training?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10">
                Tell us what type of training or learning support would be useful to you, and we will keep you informed as the content develops.
              </p>
              <Link
                href="/contact?tab=general&subject=Training+%26+Workshops+interest"
                className="inline-flex items-center px-10 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
              >
                Register your interest
                <ArrowRight className="ml-3" size={20} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
