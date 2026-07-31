import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export default function StudyOptions() {
  return (
    <div className="min-h-screen">
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Study options</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Where will your future take you?
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                From boarding schools and universities to sport academies and online programmes, your counsellor will help you find the right fit based on your goals, budget, and circumstances.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="pb-28 lg:pb-40">
        <div className="container">
          <ScrollReveal>
            <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-10">Destinations</p>
          </ScrollReveal>

          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20 lg:mb-28">
              <div className="relative overflow-hidden">
                <img
                  src="/manus-storage/wsa_students_london_tower_bridge_d3469c26.jpg"
                  alt="Historic university buildings in golden autumn light. United Kingdom"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">Primary destination</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">United Kingdom</h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    The UK remains WSA's primary destination, with strong institutions at every level, from boarding schools and language programmes to undergraduate degrees and postgraduate research.
                  </p>
                  <p>
                    Your counsellor will explain the UK education system, clarify entry requirements, and identify institutions that genuinely match your academic profile and career ambitions.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-border/40">
                  <p className="text-sm text-muted-foreground mb-3">We support applications to</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {["UK Universities", "Non-UK Universities", "Pathway Providers", "Boarding Schools", "Colleges", "Sports Camps", "Sport Academies"].map((item) => (
                      <span key={item} className="text-sm font-medium text-wsa-navy">{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <ScrollReveal>
              <div>
                <div className="relative overflow-hidden mb-6">
                  <img
                    src="/manus-storage/destination_canada_cb0ebc29.jpg"
                    alt="Modern Canadian university campus"
                    className="w-full aspect-[3/2] object-cover"
                  />
                </div>
                <h3 className="text-2xl font-semibold text-wsa-navy mb-3">USA and Canada</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Undergraduate and postgraduate pathways with strong post-study work options. The USA and Canada offer high-quality education in welcoming, multicultural environments.
                </p>
                <p className="text-sm text-muted-foreground">Your counsellor can advise on Canadian institutions, application timelines, and visa requirements.</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div>
                <div className="relative overflow-hidden mb-6">
                  <img
                    src="/manus-storage/destination_europe_b3c9ef92.jpg"
                    alt="European university architecture"
                    className="w-full aspect-[3/2] object-cover"
                  />
                </div>
                <h3 className="text-2xl font-semibold text-wsa-navy mb-3">Europe</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Cyprus, Hungary, and other European destinations, often with lower tuition fees and unique programme structures. A growing option for internationally-minded students.
                </p>
                <p className="text-sm text-muted-foreground">Your counsellor can explain the differences between European education systems and help you decide.</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Specialist pathways</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Beyond traditional university
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Not every student follows the same path. We support a range of specialist programmes for students with specific ambitions.
              </p>
            </div>
          </ScrollReveal>

         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "A Levels", desc: "The gold-standard academic qualification for entry to UK universities. Studied over two years within a UK boarding school environment.", link: "/a-levels" },
              { title: "Foundation Programme", desc: "A one-year preparatory qualification for international students who require additional academic or English language preparation.", link: "/international-foundation-programme" },
              { title: "International Year One", desc: "A Level 4 university pathway programme leading directly into Year Two of a full undergraduate degree.", link: "/international-year-one" },
              { title: "Undergraduate Degrees", desc: "Three-year bachelor's degrees providing subject expertise, transferable skills, and strong career foundations.", link: "/undergraduate-degrees" },
              { title: "Pre-Master's & Top-Up", desc: "Two distinct routes for students who do not yet meet the entry requirements for a Master's degree.", link: "/pre-masters-top-up-degrees" },
              { title: "Master's & Doctoral", desc: "Advanced programmes for specialist knowledge, career progression, or academic research at the highest level.", link: "/masters-doctoral-degrees" },
              { title: "Sport Pathways", desc: "Football, rugby, athletics, and more. Combine elite sport training with academic study at specialist academies and universities.", link: "/sport-pathways" },
              { title: "Online Learning", desc: "Accredited online degrees and programmes for students who need flexibility without compromising on quality.", link: "/online-learning" },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 60}>
                <div className="bg-white p-8 h-full border-t-2 border-wsa-red/20 flex flex-col">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px] mb-4 flex-1">{item.desc}</p>
                  <Link href={item.link} className="inline-flex items-center text-sm font-medium text-wsa-navy hover:text-wsa-red transition-colors mt-auto">
                    Learn more <ArrowRight className="ml-1.5" size={14} />
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Coming soon pathways - clearly separated */}
          <ScrollReveal>
            <div className="mt-16 pt-12 border-t border-border/30">
              <h3 className="text-xl font-semibold text-wsa-navy mb-2">Expanding soon</h3>
              <p className="text-muted-foreground mb-8 text-[15px]">We're developing dedicated guidance for these specialist areas. Register your interest and we'll notify you when they launch.</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: "STEM Programmes", desc: "Science, technology, engineering, and mathematics" },
                  { title: "Healthcare & Life Sciences", desc: "Medicine, nursing, biomedical sciences, pharmacy" },
                  { title: "Creative & Digital Arts", desc: "Animation, design, film, music, and digital media" },
                  { title: "Sports Camps", desc: "Short-term sport, academic and cultural experiences" },
                ].map((item) => (
                  <div key={item.title} className="p-5 bg-wsa-cream/50 border border-border/20">
                    <h4 className="text-sm font-semibold text-wsa-navy mb-1">{item.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Your counsellor's role</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-8">
                  Not sure where to start? That's exactly what we're here for.
                </h2>
                <div className="space-y-5 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    Most students don't arrive knowing exactly what they want. Your counsellor will listen to your ambitions, understand your circumstances, and help you explore options you may not have considered.
                  </p>
                  <p>
                    They'll explain the differences between education systems, help you understand entry requirements, and guide you toward institutions that genuinely fit, not just the ones that are easiest to get into.
                  </p>
                  <p className="text-wsa-navy font-medium">
                    The right choice is the one that's right for you. Your counsellor's job is to help you find it.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex items-center mt-8 px-8 py-4 bg-wsa-red text-white text-base font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                >
                  Explore your options
                  <ArrowRight className="ml-2.5" size={18} />
                </Link>
              </div>
              <img
                src="/manus-storage/wsa_student_london_individual_a5d95740.jpg"
                alt="A counsellor reviewing options with a student"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
