import { Link } from "wouter";
import { ArrowRight, CheckCircle, GraduationCap, Landmark, WalletCards } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const taughtRoutes = [
  { title: "MSc", text: "Usually chosen for science, technology, engineering, data, health, business and technical subjects." },
  { title: "MA", text: "Common in arts, humanities, education, media, policy and some social science subjects." },
  { title: "MBA", text: "Designed for business and management development, often with professional experience expectations." },
  { title: "Other taught Master's", text: "Some subjects use titles such as LLM, MEd or specialist professional awards." },
];

const counsellorSteps = [
  "Understand your academic background, budget, career aim and preferred intake",
  "Identify suitable taught Master's courses and realistic university options",
  "Check entry requirements for the actual course and institution",
  "Support application documents, admissions follow-up and interview preparation where needed",
  "Help you prepare for CAS, Student Visa information requirements and enrolment steps",
];

const applicationStages = [
  { title: "Course and university shortlist", text: "Your counsellor helps compare academic fit, location, cost, intake and realistic admissions position." },
  { title: "Application preparation", text: "You prepare the documents each university asks for, including statements, CVs, references or portfolios where relevant." },
  { title: "Admissions and offers", text: "WSA helps you understand offer conditions, deposits, deadlines and the next actions needed to keep the application moving." },
  { title: "CAS and visa preparation", text: "Once the university is ready to issue a CAS, WSA helps you prepare information carefully within its lawful support role." },
];

export default function UKMastersStudy() {
  return (
    <div className="min-h-screen">
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28 bg-wsa-cream">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                  UK taught Master's study
                </p>
                <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                  Study a taught Master's degree in the UK
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                  Clear, practical guidance for international graduates considering MSc, MA, MBA and other taught Master's degrees in the UK.
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
              <img
                src="/manus-storage/pathway_masters_engineering_fe606fa1.jpg"
                alt="Postgraduate student working in a UK engineering lab"
                className="w-full aspect-[4/3] object-cover"
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mb-14">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                What it is
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                A focused postgraduate route, not a research degree
              </h2>
              <p className="text-[17px] text-muted-foreground leading-relaxed">
                A UK taught Master's is normally a Level 7 postgraduate qualification built around structured modules, assessments and a final project or dissertation. It is different from an MRes, MPhil or PhD, where the main focus is independent research.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {taughtRoutes.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 70}>
                <div className="h-full bg-white border border-border/60 p-7">
                  <h3 className="text-xl font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-wsa-stone">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                icon: GraduationCap,
                title: "Who it suits",
                text: "Graduates who already hold an undergraduate degree and want advanced academic knowledge, a career change, professional development or a stronger route into a specialist field.",
              },
              {
                icon: Landmark,
                title: "Choosing well",
                text: "The right course is not just a famous university name. Subject fit, entry requirements, location, fees, intake and career direction all matter.",
              },
              {
                icon: WalletCards,
                title: "Funding honestly",
                text: "Scholarships and discounts can help, but most students still need a realistic funding plan for tuition, deposits, living costs and visa-related costs.",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <ScrollReveal key={item.title} delay={i * 80}>
                  <div className="bg-white p-8 h-full border-t-2 border-wsa-red/25">
                    <Icon className="text-wsa-red mb-5" size={28} aria-hidden="true" />
                    <h2 className="text-xl font-semibold text-wsa-navy mb-3">{item.title}</h2>
                    <p className="text-muted-foreground leading-relaxed text-[15px]">{item.text}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                  Entry and timing
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Requirements vary by course and university
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    Most taught Master's courses require an undergraduate degree and evidence that your academic background is suitable for the subject. Some programmes ask for specific modules, professional experience, a portfolio, an interview or a stronger grade profile.
                  </p>
                  <p>
                    English-language evidence also varies. Some universities accept specific school or degree evidence, while others require IELTS, TOEFL, PTE or another approved test. WSA checks the requirement for the course and institution you are actually applying to.
                  </p>
                  <p>
                    September remains the main intake for many UK Master's courses. January entry can be available for some subjects and universities, but options are narrower and timelines vary.
                  </p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="bg-wsa-cream p-8 lg:p-10">
                <h3 className="text-xl font-semibold text-wsa-navy mb-6">What your counsellor checks</h3>
                <ul className="space-y-4">
                  {[
                    "Academic background and subject match",
                    "Course-specific entry requirements",
                    "English-language evidence",
                    "September or January availability",
                    "Tuition fee, deposit and living-cost implications",
                    "Application documents and likely admissions position",
                  ].map((item) => (
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
          <ScrollReveal>
            <div className="max-w-3xl mb-14">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                Application to enrolment
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                The process is more than submitting a form
              </h2>
              <p className="text-[17px] text-muted-foreground leading-relaxed">
                A strong application needs the right course choice, the right documents and enough time for admissions, offer conditions, deposit decisions, CAS preparation and Student Visa preparation.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {applicationStages.map((stage, i) => (
              <ScrollReveal key={stage.title} delay={i * 70}>
                <div className="bg-white p-7 h-full">
                  <p className="text-xs font-semibold tracking-[0.18em] uppercase text-wsa-red mb-4">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{stage.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{stage.text}</p>
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
                  Student Visa preparation
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Prepare early, and stay inside the rules
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    You need a CAS from a licensed student sponsor before applying for a UK Student visa. If applying from outside the UK, GOV.UK currently says the earliest you can apply is six months before the course starts.
                  </p>
                  <p>
                    WSA can help you understand CAS preparation, financial evidence, the 28-day rule, TB testing where required, IHS and visa costs, immigration history questions and credibility interviews. WSA does not replace regulated immigration advice.
                  </p>
                </div>
                <div className="mt-8">
                  <Link href="/WebUKVisa" className="inline-flex items-center text-wsa-red font-semibold hover:underline">
                    Read the UK Student Visa guide
                    <ArrowRight className="ml-2" size={16} />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="bg-wsa-navy p-8 lg:p-10 text-white">
                <h3 className="text-xl font-semibold mb-6">What WSA support includes</h3>
                <ul className="space-y-4">
                  {counsellorSteps.map((item) => (
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

      <section className="py-20 lg:py-28 bg-wsa-stone">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                Applying from Nigeria?
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Read the Nigeria Master's guide
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-9">
                Nigerian graduates have specific questions around entry requirements, WAEC evidence, funding, TB testing, CAS preparation and realistic university choices.
              </p>
              <Link
                href="/uk-masters-nigeria"
                className="inline-flex items-center px-8 py-4 bg-wsa-navy text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-navy/90 active:scale-[0.98]"
              >
                Master's Study from Nigeria
                <ArrowRight className="ml-2.5" size={18} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-24 lg:py-32 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15] mb-6">
                Get a realistic Master's shortlist
              </h2>
              <p className="text-lg text-white/65 leading-relaxed mb-10">
                Tell WSA about your degree, preferred subject, budget and intake. A Student Counsellor will help you understand your options before you apply.
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
