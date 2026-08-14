import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

/**
 * About WSA Page
 *
 * Design system: Editorial Calm (frozen homepage blueprint)
 * Typography: Poppins headings, Poppins body
 * Structure: Every section answers a question, builds trust
 * No fake claims. Verified facts only.
 */

export default function About() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">About <strong>World</strong><em>Student</em>Advisors</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Personal guidance for students who want to study abroad
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Since 2012, we've guided students and families from first questions through to enrolment, with a dedicated Student Counsellor by their side at every step.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Full-width image */}
      <section className="pb-0">
        <div className="container">
          <ScrollReveal>
            <img
              src="/manus-storage/wsa_who_we_are_banner_02a48684.jpg"
              alt="International students walking together on a university campus"
              className="w-full aspect-[21/9] object-cover"
            />
          </ScrollReveal>
        </div>
      </section>

      {/* Why we exist */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Why we exist</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-8">
                  Studying abroad is life-changing. It shouldn't feel overwhelming.
                </h2>
                <div className="space-y-5 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    For many families, the decision to study abroad is one of the biggest they'll ever make, financially, emotionally, and practically. The process can feel complex, unfamiliar, and high-stakes.
                  </p>
                 <p>
                    Tim Hunt founded WSA in 2012 because he believed every student deserves a qualified professional who takes the time to understand their ambitions, circumstances, and concerns, and who stays by their side until they're settled, thriving, and calling home with good news.
                  </p>
                  <p>
                    As Managing Director, Tim still personally oversees the counsellor team and remains available to families who want to speak directly with the person behind the organisation.
                 </p>
                  <p className="text-wsa-navy font-medium">
                    That's not a service we offer. It's why we exist.
                  </p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="space-y-8 lg:pt-8">
                {[
                  { label: "Founded", value: "2012" },
                  { label: "Certification", value: "British Council Certified Agency" },
                  { label: "Model", value: "One dedicated counsellor per student" },
                  { label: "Cost to families", value: "Free, funded by education partners" },
                  { label: "Offices", value: "United Kingdom, Kenya, Nigeria, Ghana" },
                  { label: "Reach", value: "Students from 8+ African countries" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-baseline border-b border-border/40 pb-4">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-base font-semibold text-wsa-navy text-right max-w-[60%]">{item.value}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* What we believe */}
      <section className="py-28 lg:py-40 bg-wsa-navy text-white">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-6">What we believe</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.2]">
                Our principles
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 max-w-4xl mx-auto">
            {[
              { title: "Personal, not automated", text: "Every student gets a named counsellor, not a chatbot, not a rotating team, not an anonymous support desk. Real relationships produce better outcomes." },
              { title: "Ethical, always", text: "We recommend what's genuinely right for the student, not what pays the highest commission. If studying abroad isn't the right choice, we'll say so honestly." },
              { title: "Transparent from day one", text: "No hidden fees, no pressure, no surprises. Families know exactly what's happening at every stage. Nothing is submitted without their full approval." },
              { title: "End-to-end commitment", text: "We don't disappear after enrolment. Your counsellor stays in touch through visa applications, pre-departure, arrival, and beyond." },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 80}>
                <div className="border-l-2 border-wsa-red/40 pl-6">
                  <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-white/50 leading-relaxed text-[15px]">{item.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Where we are */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Where we are</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                A global team with local understanding
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our offices are based in the communities we serve. We understand where our students are coming from, culturally, financially, and practically.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { country: "United Kingdom", city: "Clevedon, England", role: "Headquarters", detail: "2 Newport Close, BS21 5DZ" },
              { country: "Kenya", city: "Nairobi", role: "Sub-Saharan Regional Office", detail: "Waiyaki Way, Off Uthiru-Cooperation, Nafra Building" },
              { country: "Nigeria", city: "Ibadan, Oyo State", role: "West Africa Office", detail: "DSTV Complex, Akala Express Way" },
              { country: "Ghana", city: "Accra, East Legon", role: "West Africa Office", detail: "Afotey Osapesua Avenue" },
            ].map((office, i) => (
              <ScrollReveal key={office.country} delay={i * 60}>
                <div className="border-t-2 border-wsa-red/30 pt-6">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-1">{office.country}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{office.city}</p>
                  <p className="text-xs font-medium tracking-wide uppercase text-wsa-red/70 mb-2">{office.role}</p>
                  <p className="text-sm text-muted-foreground">{office.detail}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* British Council certification */}
      <section className="py-20 lg:py-24 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Certification</p>
              <img
                src="/manus-storage/british_council_certified_b72a19c7.png"
                alt="British Council Certified Agency"
                className="h-20 w-auto mx-auto mb-6"
              />
              <h2 className="text-2xl md:text-3xl font-semibold text-wsa-navy leading-[1.2] mb-6">
                British Council Certified Agency
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                This certification means WSA meets strict standards set by the British Council for ethical practice, accurate information, professional conduct, and student welfare. It is independently verified and regularly reviewed.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                5.0 ★ Excellent on Google &nbsp;·&nbsp; Supporting students since 2012
              </p>
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
                Ready to explore your options?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10">
                Complete a short application and a personal Student Counsellor will contact you within 48 hours. There's no fee, no obligation, and no pressure.
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
