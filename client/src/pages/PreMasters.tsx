import { Link } from "wouter";
import { ArrowRight, CheckCircle, Info, Mail } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const topUpBenefits = [
  "Taught and assessed by a university, degree-awarded at Level 6",
  "Replaces an HND on the CV with a full UK honours degree",
  "Creates a clean, unquestionable route into Master's study",
  "Internationally recognised, stronger academically and professionally",
];

const whyTopUp = [
  "A Top-Up degree delivers a universally recognised academic outcome",
  "It strengthens the student's CV and long-term employability",
  "It creates a clean, unquestionable route into Master's study",
  "It avoids reliance on progression conditions set by pathway providers",
  "It is taught and awarded by an established university, often with strong teaching and assessment standards",
];

const preMastersCaveats = [
  "A Pre-Master's is a qualification, but it is not a degree",
  "It is not awarded by a university, pathway providers are not degree-awarding bodies",
  "It does not change a student's academic level on paper",
  "Progression to a Master's depends on meeting conditions set by the pathway provider",
];

export default function PreMasters() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Study Pathway</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Pre-Master's & Top-Up Degrees
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Two distinct routes for students who do not yet meet the entry requirements for a Master's degree
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Intro */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start mb-20 lg:mb-28">
              <div>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    Not every student progresses to postgraduate study in a straight line. Some hold an HND, a non-honours degree, or a third-class degree, qualifications that sit below the standard Level 6 threshold required for Master's entry. At WorldStudentAdvisors, we provide honest, outcome-focused guidance to help students understand their options clearly and choose the route that is genuinely right for them.
                  </p>
                  <p>
                    To study for a Master's degree in the UK, the academic entry requirement is a Level 6 qualification. A Master's degree itself is awarded at Level 7. This distinction matters, and it is one that is often misunderstood by students, families, and even some advisors.
                  </p>
                  <p>
                    A Higher National Diploma (HND) is awarded at Level 5, one level below the entry requirement for a Master's degree. A non-honours degree or a third-class degree is also commonly treated as below the standard Level 6 threshold.
                  </p>
                  <p>
                    In these situations, students do not meet the academic entry requirement for a Master's degree, regardless of motivation or work experience. Understanding the difference between the two available routes is essential for making an informed, long-term decision.
                  </p>
                </div>
              </div>
              <img
                src="/manus-storage/pathway_pm_gym_female_f633ea33.jpg"
                alt="Student at the gym, university life"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Pre-Master's section */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Option A</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Pre-Master's Programme
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-6">
                  A Pre-Master's programme is a bridging course, typically lasting around nine months, built to prepare students academically for study at Level 7. These programmes are normally delivered by pathway providers such as INTO Global, OnCampus, Study Group, and others.
                </p>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-8">
                  Pre-Master's programmes focus on developing the academic skills and English language proficiency required for postgraduate study, rather than delivering subject-specific academic content at degree level.
                </p>
                <h3 className="text-lg font-semibold text-wsa-navy mb-4">Important to understand:</h3>
                <ul className="space-y-3">
                  {preMastersCaveats.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Info className="text-wsa-navy/60 mt-0.5 flex-shrink-0" size={18} />
                      <span className="text-[15px] text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <img
                src="/manus-storage/pathway_pm_gym_male_1f1f4e94.jpg"
                alt="Student studying"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Top-Up Degree section */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <img
                src="/manus-storage/pathway_pm_medics_7107cd63.jpg"
                alt="Medical students at university"
                className="w-full aspect-[4/3] object-cover"
              />
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Option B</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Top-Up Degree
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-6">
                  A Top-Up degree allows a student to enter at Level 5 and exit at Level 6, graduating with a full UK honours degree. This is a fundamentally different outcome from a Pre-Master's programme.
                </p>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-8">
                  A student with an HND can replace it on their CV with a UK bachelor's degree. They then formally meet the Level 6 requirement for Master's entry, and the qualification is internationally recognised and degree-awarded by a university.
                </p>
                <ul className="space-y-3">
                  {topUpBenefits.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                      <span className="text-[17px] text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 p-6 bg-wsa-cream border-l-4 border-wsa-red">
                  <p className="text-[15px] text-wsa-navy font-medium">
                    A student cannot replace an HND on their CV with a Pre-Master's qualification. They can replace it with a UK honours degree gained through a Top-Up. This difference has lasting consequences for career prospects and postgraduate applications.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Why WSA recommends Top-Up */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Our recommendation</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Why WorldStudentAdvisors Usually Recommends a Top-Up Degree
              </h2>
              <p className="text-[17px] text-muted-foreground leading-relaxed">
                Based on many years of experience in higher education, WorldStudentAdvisors generally recommends a Top-Up degree in preference to a Pre-Master's, where the student is eligible. The reasons are straightforward:
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <ul className="space-y-4 max-w-3xl mb-10">
              {whyTopUp.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                  <span className="text-[17px] text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-[15px] text-muted-foreground italic max-w-3xl">
              Pre-Master's programmes do have a role, particularly where academic skills or English language development are the primary barrier. However, where a student holds an HND or equivalent, a Top-Up degree is usually the academically stronger, more honest, and more durable solution.
            </p>
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
                    { title: "Student-Centred Guidance", desc: "We advise as we would want for ourselves, with care, transparency, and a genuine commitment to the right outcome." },
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
                  src="/manus-storage/pathway_pm_african_girl_d2a0bb6a.jpg"
                  alt="Student at university"
                  className="w-full aspect-[3/4] object-cover"
                />
                <img
                  src="/manus-storage/pathway_pm_graduate_172b33cc.jpg"
                  alt="Graduate celebrating with family"
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA mid-page */}
      <section className="py-16 bg-wsa-stone">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold text-wsa-navy mb-2">Not sure which route is right for your student?</h3>
                <p className="text-muted-foreground">Our advisors will review your student's qualifications and academic history and give you a clear, honest recommendation.</p>
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

      {/* Next step */}
      <section className="py-16 bg-wsa-cream border-t border-border/40">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-wsa-red mb-1">Next step</p>
                <h3 className="text-xl font-semibold text-wsa-navy">Master's & Doctoral Degrees</h3>
                <p className="text-muted-foreground mt-1">Advanced programmes for specialist knowledge, career progression, or academic research.</p>
              </div>
              <Link
                href="/masters-doctoral-degrees"
                className="inline-flex items-center whitespace-nowrap text-wsa-navy font-semibold hover:text-wsa-red transition-colors"
              >
                Explore Master's Programmes <ArrowRight className="ml-2" size={16} />
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
                If you are unsure whether a Pre-Master's or Top-Up degree is the right route for your student, our advisors are happy to review their background and give you a clear, honest recommendation.
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
