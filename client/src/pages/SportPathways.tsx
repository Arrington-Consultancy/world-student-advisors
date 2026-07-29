import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export default function SportPathways() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Sport Pathways</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Combine elite sport with top-level UK education
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                For student athletes who want both, academic qualifications and competitive sport training. Your counsellor will help you find institutions that support both ambitions equally.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* What we offer */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            <ScrollReveal>
              <div>
                <img
                  src="/manus-storage/wsa_sport_pathway_hero_f9bad8af.jpg"
                  alt="Athletes training on a university track"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <div className="flex flex-col justify-center">
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Academic study and sport training in one programme
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    Many universities and specialist academies offer programmes designed specifically for student athletes. These combine degree-level study with professional coaching, competitive fixtures, and access to elite training facilities.
                  </p>
                  <p>
                    WSA works with institutions that genuinely support dual careers, not just universities with a sports team, but programmes built around the athlete's schedule.
                  </p>
                  <p className="text-wsa-navy font-medium">
                    Your counsellor will assess your sporting level, academic goals, and preferred destination to find the right fit.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Sports covered */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Sports we support</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Pathways across multiple disciplines
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We support student athletes across a range of sports. If your discipline isn't listed, ask your counsellor, we may still be able to help.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
            {[
              "Football",
              "Rugby",
              "Athletics",
              "Swimming",
              "Tennis",
              "Basketball",
              "Cricket",
              "Golf",
              "Netball",
            ].map((sport, i) => (
              <ScrollReveal key={sport} delay={i * 40}>
                <div className="border-b border-border/40 pb-4">
                  <span className="text-[17px] text-wsa-navy font-medium">{sport}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <p className="mt-10 text-sm text-muted-foreground italic">
              This is not an exhaustive list. Your counsellor can advise on pathways for other sports.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* How it works */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">How it works</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15]">
                Your counsellor guides the process
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-x-16 gap-y-10 max-w-4xl">
            {[
              { step: "01", title: "Assessment", desc: "Your counsellor reviews your sporting achievements, academic profile, and goals to understand what you're looking for." },
              { step: "02", title: "Matching", desc: "They identify institutions with programmes that genuinely fit, considering coaching quality, competition level, and academic standards." },
              { step: "03", title: "Application", desc: "Your counsellor supports the full application including sporting CVs, highlight reels, and academic documentation." },
              { step: "04", title: "Enrolment", desc: "Once accepted, they help with visa, accommodation, and preparation, including connecting you with coaching staff before arrival." },
            ].map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 60}>
                <div>
                  <span className="text-xs font-medium tracking-[0.2em] text-wsa-red/60">{item.step}</span>
                  <h3 className="text-xl font-semibold text-wsa-navy mt-2 mb-3">{item.title}</h3>
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
                Ready to explore sport pathways?
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-10">
                Get started and your counsellor will assess your sporting and academic profile to find the right programme for you.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center px-10 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="ml-3" size={20} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
