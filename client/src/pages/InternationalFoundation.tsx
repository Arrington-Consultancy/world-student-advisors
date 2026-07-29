import { Link } from "wouter";
import { ArrowRight, CheckCircle, Mail } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const suitableFor = [
  "Hold international qualifications not equivalent to UK A Levels",
  "Require additional academic or English language preparation",
  "Are transitioning from different education systems",
  "Wish to gain confidence before entering undergraduate study",
];

const benefits = [
  { title: "Clear Structured Route", desc: "A defined, well-supported path directly into UK undergraduate study." },
  { title: "Aligned Preparation", desc: "Academic preparation aligned to UK entry standards and expectations." },
  { title: "International Support", desc: "Strong pastoral and academic support tailored for international students." },
  { title: "Confident Transition", desc: "A focused bridge into university-level learning that builds genuine academic readiness." },
];

const supportItems = [
  { title: "Eligibility Assessment", desc: "Assessment of academic background and eligibility for foundation programmes." },
  { title: "Programme Advice", desc: "Advice on suitable foundation programmes and partner universities." },
  { title: "Progression Guidance", desc: "Guidance on progression routes from foundation to undergraduate degrees." },
  { title: "Application Support", desc: "Full application and admissions support from start to enrolment." },
];

export default function InternationalFoundation() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Study Pathway</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                International Foundation Programme
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                A trusted academic pathway to UK undergraduate study
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Intro with images */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20 lg:mb-28">
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="/manus-storage/pathway_ifp_campus_arrival_c464415d.jpg"
                  alt="Students arriving on campus"
                  className="w-full aspect-[3/4] object-cover"
                />
                <img
                  src="/manus-storage/pathway_ifp_accommodation_9135740b.jpg"
                  alt="Students in university accommodation"
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  What is an International Foundation Programme?
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    The International Foundation Programme (IFP) is a well-established pathway designed for international students who require additional academic or English language preparation before entering undergraduate study at a UK university.
                  </p>
                  <p>
                    An IFP is a one-year preparatory qualification, typically aligned to UK Level 3, built to bridge the gap between a student's existing qualifications and the entry requirements of a UK undergraduate degree.
                  </p>
                  <p>
                    It supports students whose current qualifications, academic background, or English language level do not yet meet the requirements of their intended undergraduate degree.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* How it works */}
          <ScrollReveal>
            <div className="max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                How the International Foundation Programme Works
              </h2>
              <p className="text-[17px] text-muted-foreground leading-relaxed mb-8">
                The programme is usually studied over one academic year and combines academic subject preparation with university-level English, study skills, and personal development.
              </p>
              <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                <p className="flex items-start gap-3">
                  <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                  <span>Academic English language development</span>
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                  <span>Subject-specific foundations aligned to intended degree pathways</span>
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                  <span>Study skills, research methods, and academic writing</span>
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                  <span>Independent learning and critical thinking</span>
                </p>
              </div>
              <p className="mt-8 text-[17px] text-muted-foreground leading-relaxed">
                Teaching methods typically include lectures, seminars, tutorials, group work, and guided independent study, reflecting undergraduate-style learning environments.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Who is it for */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Eligibility</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-8">
                  Who is the IFP for & Where Does it Lead?
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-8">
                  Successful completion of an International Foundation Programme allows students to progress to UK undergraduate degree programmes at Level 4, subject to meeting progression criteria set by the university or pathway provider.
                </p>
                <h3 className="text-lg font-semibold text-wsa-navy mb-4">The IFP is suitable for students who:</h3>
                <ul className="space-y-3">
                  {suitableFor.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                      <span className="text-[17px] text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-muted-foreground italic">
                  It is a widely used and UKVI-compliant route into UK higher education.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <div className="flex flex-col gap-6">
                <img
                  src="/manus-storage/pathway_ifp_studying_2d93f0ce.jpg"
                  alt="Students studying together"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="bg-white p-8">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">IFP vs A Levels</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">
                    While A Levels are often preferred by families seeking maximum academic depth and global flexibility, the IFP provides an effective alternative for students who need a more supported transition into university study. Both pathways lead to undergraduate degrees in the UK, the most suitable route depends on a student's academic background, age, subject goals, and long-term plans.
                  </p>
                  <Link href="/a-levels" className="inline-flex items-center mt-4 text-sm font-medium text-wsa-navy hover:text-wsa-red transition-colors">
                    Learn about A Levels <ArrowRight className="ml-1.5" size={14} />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Why families choose */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Benefits</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Why Families Choose an International Foundation Programme
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 60}>
                <div className="border-t-2 border-wsa-red/20 pt-6 h-full">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA mid-page */}
      <section className="py-16 bg-wsa-stone">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold text-wsa-navy mb-2">Not sure if a Foundation Programme is the right fit?</h3>
                <p className="text-muted-foreground">Our advisors are happy to review your student's background and recommend the most suitable pathway, no obligation, just honest guidance.</p>
              </div>
              <a
                href="mailto:Advice@WorldStudentAdvisors.com"
                className="inline-flex items-center whitespace-nowrap px-6 py-3 bg-wsa-red text-white font-semibold transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
              >
                <Mail className="mr-2" size={16} />
                Email Us
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* How WSA supports */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Our support</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                How WorldStudentAdvisors Supports You
              </h2>
              <p className="text-[17px] text-muted-foreground leading-relaxed">
                At WSA, we support students at every stage of the foundation pathway.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            {supportItems.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 60}>
                <div className="bg-wsa-cream p-8 h-full">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <p className="mt-10 text-sm text-muted-foreground italic">
              Our advice is ethical, personalised, and focused on long-term academic and career success. WorldStudentAdvisors is a registered UCAS Centre.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Next step */}
      <section className="py-16 bg-wsa-cream border-t border-border/40">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-wsa-red mb-1">Next step</p>
                <h3 className="text-xl font-semibold text-wsa-navy">Undergraduate Degree (UK)</h3>
                <p className="text-muted-foreground mt-1">Successful completion of an IFP provides a direct route to undergraduate study in the UK.</p>
              </div>
              <Link
                href="/undergraduate-degrees"
                className="inline-flex items-center whitespace-nowrap text-wsa-navy font-semibold hover:text-wsa-red transition-colors"
              >
                Explore Undergraduate Degrees <ArrowRight className="ml-2" size={16} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 lg:py-40 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15] mb-6">
                Get Advice from WorldStudentAdvisors
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-10">
                If you would like guidance on International Foundation Programmes and undergraduate progression, our team is ready to help. We will be happy to advise whether an IFP is the right pathway and help you plan with confidence.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center px-10 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
              >
                Get Expert Advice
                <ArrowRight className="ml-3" size={20} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
