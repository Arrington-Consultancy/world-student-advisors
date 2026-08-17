import { Link } from "wouter";
import { ArrowRight, CheckCircle, HelpCircle } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const requirementCards = [
  {
    title: "Your undergraduate degree",
    text: "Universities assess your degree award, transcript, subject background and how closely it matches the Master's course.",
  },
  {
    title: "Course-specific requirements",
    text: "Some programmes need previous study in a related subject, professional experience, a portfolio, technical modules or an interview.",
  },
  {
    title: "English-language evidence",
    text: "WAEC or other school evidence may be considered by some institutions, but requirements vary. Others may require IELTS, PTE, TOEFL or another accepted test.",
  },
];

const choiceFactors = [
  "Subject fit and career objective",
  "Entry requirements and admissions realism",
  "University and location",
  "Tuition budget, deposit and living costs",
  "September or January intake",
  "CAS and visa preparation timeline",
];

const visaPreparation = [
  "CAS preparation and university pre-CAS checks",
  "Financial evidence and the 28-day rule",
  "TB testing through an approved clinic where required",
  "Visa and Immigration Health Surcharge costs",
  "Immigration history and previous refusals",
  "Credibility interview preparation where relevant",
];

const faqs = [
  {
    question: "Can I apply for a UK Master's with a Nigerian degree?",
    answer:
      "Yes, Nigerian graduates can apply for UK taught Master's programmes, but each university assesses the degree, grade, transcript, subject background and course fit differently.",
  },
  {
    question: "Do UK universities accept WAEC as evidence of English?",
    answer:
      "Some institutions may consider WAEC or similar evidence; others require a recognised English test. WSA checks the exact policy for the university and course you are applying to.",
  },
  {
    question: "Can Nigerian students get UK Master's scholarships?",
    answer:
      "Scholarships and tuition discounts can be available, but full funding is not the normal position for most taught Master's applicants. Plan on having a realistic funding route before applying.",
  },
  {
    question: "Can I bring dependants on a taught Master's?",
    answer:
      "For courses starting from 1 January 2024, GOV.UK says dependant eligibility for postgraduate students is generally limited to PhD, doctorate or research-based higher degree routes, unless another qualifying category applies. Always check the current GOV.UK rules before making plans.",
  },
  {
    question: "How much money will I need?",
    answer:
      "You need to plan for tuition fees, deposits, living costs and visa-related costs. The exact financial evidence required depends on your CAS, study location and current Student visa rules.",
  },
  {
    question: "Can I start in January?",
    answer:
      "Some UK universities offer January starts for selected taught Master's courses. Choice is usually narrower than September, so course selection and timing matter.",
  },
  {
    question: "Does WSA charge students?",
    answer:
      "WSA's student counselling and university application support is free to students. A Student Counsellor will explain the support available before you apply.",
  },
  {
    question: "How long does an application take?",
    answer:
      "It varies by university, course and document readiness. You should allow time for shortlisting, applications, offer conditions, deposits, CAS preparation and Student Visa preparation.",
  },
];

const counsellorStages = [
  "Understand your degree, grades, subject interest, budget and preferred intake",
  "Shortlist realistic UK taught Master's options",
  "Check Nigerian qualification and English-language evidence requirements",
  "Support CV, personal statement and application documents where applicable",
  "Follow up admissions and help you understand offer conditions",
  "Prepare for CAS, Student Visa information requirements and enrolment",
];

export default function UKMastersNigeria() {
  return (
    <div className="min-h-screen">
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28 bg-wsa-navy text-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                  Nigerian graduates
                </p>
                <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold leading-[1.1] mb-8">
                  Study a taught Master's in the UK from Nigeria
                </h1>
                <p className="text-xl text-white/70 leading-relaxed mb-8 max-w-2xl">
                  Personal WSA Student Counsellor support for Nigerian graduates choosing MSc, MA, MBA and other taught Master's routes in the UK.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center px-8 py-4 bg-wsa-red text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                  >
                    Start Your Application
                    <ArrowRight className="ml-2.5" size={18} />
                  </Link>
                  <Link
                    href="/counsellors"
                    className="inline-flex items-center justify-center px-8 py-4 border border-white/25 text-white text-sm font-semibold tracking-wide transition-colors hover:border-white hover:bg-white/5"
                  >
                    Speak to a Student Counsellor
                  </Link>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="bg-white/8 p-8 lg:p-10 border border-white/10">
                <p className="text-sm font-semibold text-white mb-5">Why this page is specific to Nigeria</p>
                <ul className="space-y-4">
                  {[
                    "WSA has a Nigeria office in Ibadan, Oyo State",
                    "The counsellor team includes Nigeria-based higher education advisors",
                    "Nigerian applicants often need clarity on WAEC, funding evidence, TB testing and realistic UK university options",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="text-wsa-red mt-0.5 shrink-0" size={18} aria-hidden="true" />
                      <span className="text-white/75 text-[15px] leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                  MSc, MA and MBA
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Choose a taught postgraduate route, not a research route
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    This page is for students considering taught Master's study: MSc, MA, MBA, LLM and similar structured postgraduate courses. It is not aimed at MRes, MPhil, PhD or doctorate applicants.
                  </p>
                  <p>
                    Taught Master's courses normally combine modules, assignments, exams or projects, and a final dissertation or major project. The right choice depends on your previous degree, the subject you want to study and what you want the qualification to help you do next.
                  </p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <img
                src="/manus-storage/pathway_masters_nurse_bf753768.jpg"
                alt="Postgraduate student in professional training"
                className="w-full aspect-[4/3] object-cover"
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mb-14">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                Entry requirements
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Nigerian qualifications are assessed course by course
              </h2>
              <p className="text-[17px] text-muted-foreground leading-relaxed">
                There is no single UK Master's requirement that applies to every Nigerian applicant. Universities make decisions based on the actual course, the university policy and the evidence in your application.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-6">
            {requirementCards.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 80}>
                <div className="bg-white p-8 h-full border-t-2 border-wsa-red/25">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                  Course choice
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  A good shortlist is realistic, not just impressive
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-8">
                  Rankings can be useful context, but they should not be the whole decision. A Nigerian applicant needs a course and university that fit the academic record, career plan, budget and timing.
                </p>
                <Link href="/uk-masters-study" className="inline-flex items-center text-wsa-red font-semibold hover:underline">
                  Read the general UK taught Master's guide
                  <ArrowRight className="ml-2" size={16} />
                </Link>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="bg-wsa-stone p-8 lg:p-10">
                <h3 className="text-xl font-semibold text-wsa-navy mb-6">What WSA compares</h3>
                <ul className="space-y-4">
                  {choiceFactors.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="text-wsa-red mt-0.5 shrink-0" size={18} aria-hidden="true" />
                      <span className="text-wsa-navy text-[15px] leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-wsa-stone">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                  Intakes, costs and funding
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Plan the money before you apply
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    September is the main intake for many UK taught Master's courses. January can work for some students, but available courses, scholarship windows and CAS timelines vary by university.
                  </p>
                  <p>
                    A serious plan should include tuition fees, deposit timing, living costs, visa application cost, Immigration Health Surcharge, TB test, travel and emergency funds. Scholarships may reduce the cost, but they should not be treated as guaranteed.
                  </p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="bg-white p-8 lg:p-10">
                <h3 className="text-xl font-semibold text-wsa-navy mb-5">Funding conversations should be direct</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  WSA should know early whether you are self-funded, family-funded, sponsored, seeking partial scholarship support or still unsure. That affects the universities and courses worth considering.
                </p>
                <Link href="/contact" className="inline-flex items-center text-wsa-red font-semibold hover:underline">
                  Start Your Application
                  <ArrowRight className="ml-2" size={16} />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                  CAS and Student Visa preparation
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Avoid preventable preparation mistakes
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    You need an unconditional offer and CAS before you can apply for a UK Student visa. The university will only issue a CAS when its own requirements have been met.
                  </p>
                  <p>
                    WSA helps Nigerian students prepare information carefully, understand what the university or visa process is asking for, and practise for credibility interviews where relevant. WSA does not provide regulated immigration advice.
                  </p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="bg-wsa-cream p-8 lg:p-10">
                <h3 className="text-xl font-semibold text-wsa-navy mb-6">Preparation areas</h3>
                <ul className="space-y-4">
                  {visaPreparation.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="text-wsa-red mt-0.5 shrink-0" size={18} aria-hidden="true" />
                      <span className="text-wsa-navy text-[15px] leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-wsa-cream">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                  Personal counsellor support
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  What your WSA Student Counsellor actually does
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-8">
                  Your counsellor is there to help you make practical decisions, prepare accurately and keep the application moving from first conversation to enrolment.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center px-8 py-4 bg-wsa-red text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                  >
                    Start Your Application
                    <ArrowRight className="ml-2.5" size={18} />
                  </Link>
                  <Link
                    href="/counsellors"
                    className="inline-flex items-center justify-center px-8 py-4 border border-wsa-navy/25 text-wsa-navy text-sm font-semibold tracking-wide transition-colors hover:border-wsa-red hover:text-wsa-red"
                  >
                    Speak to a Student Counsellor
                  </Link>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="bg-white p-8 lg:p-10">
                <ul className="space-y-4">
                  {counsellorStages.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="text-wsa-red mt-0.5 shrink-0" size={18} aria-hidden="true" />
                      <span className="text-wsa-navy text-[15px] leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mb-14">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                FAQs
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15]">
                Common questions from Nigerian Master's applicants
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-6">
            {faqs.map((item, i) => (
              <ScrollReveal key={item.question} delay={i * 40}>
                <div className="bg-white border border-border/60 p-7 h-full">
                  <div className="flex items-start gap-3 mb-3">
                    <HelpCircle className="text-wsa-red shrink-0 mt-0.5" size={19} aria-hidden="true" />
                    <h3 className="text-base font-semibold text-wsa-navy">{item.question}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15] mb-6">
                Ask WSA to review your Master's options
              </h2>
              <p className="text-lg text-white/65 leading-relaxed mb-10">
                Share your degree, preferred subject, funding position and target intake. WSA will help you understand which UK taught Master's routes are worth pursuing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-8 py-4 bg-wsa-red text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                >
                  Start Your Application
                  <ArrowRight className="ml-2.5" size={18} />
                </Link>
                <Link
                  href="/counsellors"
                  className="inline-flex items-center justify-center px-8 py-4 border border-white/25 text-white text-sm font-semibold tracking-wide transition-colors hover:border-white hover:bg-white/5"
                >
                  Speak to a Student Counsellor
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
