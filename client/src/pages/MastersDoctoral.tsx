import { Link } from "wouter";
import { ArrowRight, CheckCircle, Mail } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const mastersRequirements = [
  "Completed undergraduate degree at Level 6 (honours)",
  "English language proficiency. IELTS or equivalent",
  "Personal statement and academic references",
  "Relevant academic or professional background",
];

const phdPoints = [
  "Entry normally requires a Master's degree at Level 7",
  "A detailed and well-structured research proposal is essential",
  "Identifying a willing supervisor before applying significantly improves success",
  "Many students use their Master's dissertation as the foundation for their PhD proposal",
];

const placementBenefits = [
  "Valuable UK work experience added to your CV",
  "Significantly increased graduate employability",
  "Professional references from within your chosen industry",
  "Strong placement performance can lead directly to employment after graduation",
  "Your dissertation can often be based on a real project from your placement organisation",
];

export default function MastersDoctoral() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Study Pathway</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Postgraduate Study in the UK
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Clear, honest guidance on Master's degrees and PhD study for international students and families
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Intro */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20 lg:mb-28">
              <div>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    Choosing the right postgraduate pathway is an important decision. At WorldStudentAdvisors, we help students, parents, and sponsors understand UK postgraduate education clearly and realistically, so decisions are made with confidence and purpose.
                  </p>
                  <p>
                    The standard entry requirement for a Master's degree is a completed undergraduate degree at Level 6. A Master's degree is itself awarded at Level 7. This distinction matters, and it is one that is often misunderstood by students and families.
                  </p>
                  <p>
                    A PhD is the highest academic qualification available, awarded at Level 8. Entry normally requires a Master's degree at Level 7, along with a detailed research proposal and, in most cases, a willing academic supervisor at the target university.
                  </p>
                </div>
              </div>
              <img
                src="/manus-storage/pathway_masters_nurse_bf753768.jpg"
                alt="Postgraduate healthcare student"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Taught Masters */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Taught programmes</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Master's Degrees in the UK
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-6">
                  The most common postgraduate route for international students is a taught Master's degree. These programmes provide structure, clear assessment, and strong employability outcomes. On successful completion, the student is awarded a Level 7 qualification, one of the most valued postgraduate credentials in the world.
                </p>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-8">
                  Taught Master's degrees include the MA (Master of Arts), MSc (Master of Science), and MBA (Master of Business Administration). Most programmes last 12 months full-time, or 18 months where a work placement is included.
                </p>
                <h3 className="text-lg font-semibold text-wsa-navy mb-4">Standard entry requirements:</h3>
                <ul className="space-y-3">
                  {mastersRequirements.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                      <span className="text-[15px] text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <img
                src="/manus-storage/pathway_masters_engineering_fe606fa1.jpg"
                alt="Engineering lab. Master's degree study"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Research & PhD */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <img
                src="/manus-storage/pathway_masters_lab_bb048c49.jpg"
                alt="Laboratory, research and PhD study"
                className="w-full aspect-[4/3] object-cover"
              />
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Research programmes</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Research Master's and PhD Study
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-6">
                  Research Master's degrees, the MRes and MPhil, are much more independent in nature. Students work largely on their own research, supported by academic supervision and limited taught content. These programmes are best suited to students who are highly self-disciplined and are considering progression to a PhD.
                </p>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-8">
                  A PhD normally takes three years full-time and represents an original contribution to knowledge in your chosen field. It is the highest academic qualification available and requires a detailed research proposal, a willing supervisor, and a strong academic track record.
                </p>
                <ul className="space-y-3 mb-8">
                  {phdPoints.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                      <span className="text-[15px] text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="p-6 bg-wsa-cream border-l-4 border-wsa-red">
                  <p className="text-[15px] text-wsa-navy font-medium">
                    Most failed PhD applications are due to applying to the wrong universities, institutions with no research interest in the proposed topic, or failing to identify a willing supervisor before submitting. At WorldStudentAdvisors, we help students approach this process strategically.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Conversion & Placements */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Flexibility</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Conversion Master's and Work Placements
              </h2>
              <p className="text-[17px] text-muted-foreground leading-relaxed mb-6">
                A conversion Master's degree allows students to study a subject at postgraduate level without having studied it at undergraduate level. This is an excellent opportunity to change academic or career direction. Common conversion subjects include Law (LLM), Computing, IT, Data Science, and a range of business disciplines.
              </p>
              <p className="text-[17px] text-muted-foreground leading-relaxed">
                Where possible, WorldStudentAdvisors recommends choosing a Master's programme that includes a work placement. The benefits are significant and long-lasting:
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <ul className="space-y-4 max-w-3xl mb-10">
              {placementBenefits.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                  <span className="text-[17px] text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-[15px] text-muted-foreground italic max-w-3xl">
              Thinking about your dissertation from the very beginning of your programme is a significant advantage. If your programme includes a work placement, it is often possible to base your dissertation on a real project from your placement organisation, strengthening your academic work and impressing future employers.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA mid-page */}
      <section className="py-16 bg-wsa-stone">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold text-wsa-navy mb-2">Not sure which postgraduate route is right?</h3>
                <p className="text-muted-foreground">Our advisors will review your student's qualifications and academic background and give you a clear, honest recommendation.</p>
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

      {/* Advice philosophy */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Our approach</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-8">
                  Advice Based on Outcomes, Not Convenience
                </h2>
                <div className="space-y-6">
                  {[
                    { title: "Honest Assessment", desc: "We review your student's qualifications and give a clear, unbiased recommendation, not the easiest or most profitable one." },
                    { title: "Long-Term Thinking", desc: "We consider where the student wants to be in five years, not just which programme they can enrol in next September." },
                    { title: "Family-Centred Guidance", desc: "We advise as we would for our own family, with care, transparency, and a genuine commitment to the right outcome." },
                  ].map((item) => (
                    <div key={item.title}>
                      <h3 className="text-base font-semibold text-wsa-navy mb-1">{item.title}</h3>
                      <p className="text-muted-foreground text-[15px] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="/manus-storage/pathway_masters_two_students_82996ec0.jpg"
                  alt="Two students working together"
                  className="w-full aspect-[3/4] object-cover"
                />
                <img
                  src="/manus-storage/pathway_masters_graduation_f1865516.jpg"
                  alt="Graduation, postgraduate success"
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* How WSA supports */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Our support</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                How WorldStudentAdvisors Supports You
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: "Master's Guidance", desc: "Personalised advice on taught Master's, conversion programmes, and research degrees, matched to your academic background and career goals." },
              { title: "PhD Pathways", desc: "Strategic support for doctoral applications, including research proposal development, supervisor identification, and targeting the right universities." },
              { title: "Application Support", desc: "Guidance on personal statements, academic references, and university selection, ensuring your application presents your strongest case." },
              { title: "PhD Applications Podcast", desc: "We offer a dedicated PhD applications podcast, practical insight and honest advice for students planning doctoral study." },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 60}>
                <div className="bg-white p-8 border-t-2 border-wsa-red/20 h-full">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Previous step */}
      <section className="py-16 bg-wsa-stone border-t border-border/40">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-wsa-red mb-1">Related pathway</p>
                <h3 className="text-xl font-semibold text-wsa-navy">Pre-Master's & Top-Up Degrees</h3>
                <p className="text-muted-foreground mt-1">For students who do not yet meet the entry requirements for a Master's degree.</p>
              </div>
              <Link
                href="/pre-masters-top-up-degrees"
                className="inline-flex items-center whitespace-nowrap text-wsa-navy font-semibold hover:text-wsa-red transition-colors"
              >
                Explore Pre-Master's <ArrowRight className="ml-2" size={16} />
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
                If you are considering postgraduate study in the UK, our advisors are happy to review your background and give you a clear, honest recommendation on the right route, whether that is a taught Master's, a research degree, or a PhD.
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

