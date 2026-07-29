import { Link } from "wouter";
import { ArrowRight, CheckCircle, Mail } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const yearStructure = [
  { title: "Year 1 (Level 4)", desc: "Core subject knowledge and essential academic skills." },
  { title: "Year 2 (Level 5)", desc: "Specialised study with greater emphasis on analysis and independent thinking." },
  { title: "Final Year (Level 6)", desc: "Advanced understanding, independent research, and subject mastery." },
];

const benefits = [
  { title: "Internationally Recognised", desc: "UK bachelor's degrees are respected by employers and institutions worldwide, opening doors across every industry and country." },
  { title: "Clear Academic Progression", desc: "A structured Level 4–6 framework ensures students know exactly where they are and where they are heading at every stage." },
  { title: "Industry Connections", desc: "Strong links between UK universities and industry provide students with access to placements, networks, and real-world experience." },
  { title: "Placement Opportunities", desc: "Industrial training and sandwich year options allow students to gain professional experience before they graduate." },
];

const supportItems = [
  { title: "Academic & Career Pathway Guidance", desc: "Honest, personalised advice on the most suitable degree pathway based on academic background and career goals." },
  { title: "Course & University Selection", desc: "Careful matching of students to the right course and university based on academic profile, ambitions, and entry requirements." },
  { title: "Entry Requirement Assessment", desc: "A thorough review of academic qualifications and language requirements to identify the most direct and appropriate entry route." },
  { title: "Application & Admissions Support", desc: "Full support with UCAS or direct applications, personal statements, references, and all required documentation." },
  { title: "Ongoing Student Advice", desc: "Continued support from enrolment through to graduation, we remain available to students and families throughout the degree." },
];

export default function UndergraduateDegrees() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Study Pathway</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Undergraduate Degree (UK)
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                A trusted pathway to professional careers and postgraduate study
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
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="/manus-storage/pathway_ug_tower_bridge_70a774ab.jpg"
                  alt="Tower Bridge, London, iconic symbol of UK study"
                  className="w-full aspect-[3/4] object-cover"
                />
                <img
                  src="/manus-storage/pathway_ug_basketball_1dee43ab.jpg"
                  alt="Students playing basketball at a UK university"
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  What is an Undergraduate Degree?
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    An undergraduate degree is the entry-level qualification at university, typically completed over three academic years of full-time study. It provides students with strong academic foundations, subject-specific expertise, and essential transferable skills required by employers and postgraduate institutions worldwide.
                  </p>
                  <p>
                    UK undergraduate degrees are structured within the UK Qualifications Framework, ensuring a clear and progressive academic journey that builds knowledge, independence, and professional readiness.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Year structure */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Programme structure</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Understanding UK Academic Levels
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                From pre-university preparation through to postgraduate study, a clear, progressive framework.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {yearStructure.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 80}>
                <div className="bg-white p-8 border-t-2 border-wsa-red/20 h-full">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <div className="bg-white p-8 lg:p-10">
              <h3 className="text-lg font-semibold text-wsa-navy mb-3">Duration & Credit Requirements</h3>
              <p className="text-muted-foreground leading-relaxed text-[15px] mb-4">
                UK undergraduate degrees provide a structured, progressive academic experience over three full-time academic years. Each year of study is worth 120 credits, with a total of 360 credits required to complete a standard three-year bachelor's degree.
              </p>
              <p className="text-muted-foreground leading-relaxed text-[15px]">
                Successful completion leads to the award of a bachelor's degree. BA, BSc, BEng, BNurs, or equivalent, depending on the subject. Some universities also offer Foundation Year degrees (four-year programmes) and Sandwich degrees, which include an additional year in industry.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Industrial placements */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Employability</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Industrial Training & Work Placement Opportunities
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    A key advantage of studying an undergraduate degree in the UK is the strong emphasis on employability and industry engagement. Many universities offer industrial training or work placement opportunities, usually undertaken after Year 2 (Level 5).
                  </p>
                </div>
                <h3 className="text-lg font-semibold text-wsa-navy mt-8 mb-4">Progression, Employment & Further Study</h3>
                <ul className="space-y-3">
                  {[
                    "Strong employment prospects in the UK and internationally",
                    "Eligibility to progress to master's degrees (Level 7)",
                    "A solid foundation for future doctoral (PhD) study",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                      <span className="text-[17px] text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <img
                src="/manus-storage/pathway_ug_coach_9a57a3c6.jpg"
                alt="Students boarding a coach for a university trip"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Why choose UK */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Why the UK</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Why Choose an Undergraduate Degree in the UK?
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((item, i) => (
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

      {/* CTA mid-page */}
      <section className="py-16 bg-wsa-stone">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold text-wsa-navy mb-2">Not sure which degree is right for your student?</h3>
                <p className="text-muted-foreground">Our advisors are happy to review your student's background, academic history, and career goals, and recommend the most suitable degree pathway.</p>
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
                At WSA, we provide end-to-end guidance to help students and families make informed, confident decisions about undergraduate study in the UK.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {supportItems.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 60}>
                <div className="bg-wsa-cream p-8 h-full">
                  <h3 className="text-base font-semibold text-wsa-navy mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <p className="mt-10 text-sm text-muted-foreground italic">
              Whatever your starting point, A Levels, a Foundation programme, or an international qualification, your counsellor will map out a clear route to a UK undergraduate degree. WorldStudentAdvisors is a registered UCAS Centre.
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
                <h3 className="text-xl font-semibold text-wsa-navy">Pre-Master's & Top-Up Degrees</h3>
                <p className="text-muted-foreground mt-1">Pathways for students who need additional preparation before postgraduate study.</p>
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
                If you would like guidance on undergraduate degrees, entry requirements, or long-term academic planning, our advisors are happy to help.
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
