import { Link } from "wouter";
import { ArrowRight, CheckCircle, Mail } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const ucasPoints = [
  { grade: "A*", points: "56 pts" },
  { grade: "A", points: "48 pts" },
  { grade: "B", points: "40 pts" },
  { grade: "C", points: "32 pts" },
  { grade: "D", points: "24 pts" },
  { grade: "E", points: "16 pts" },
  { grade: "U", points: "0 pts" },
];

const pathwayExamples = [
  { title: "Medicine", subjects: "Chemistry and Biology required. Mathematics and/or Physics strongly recommended." },
  { title: "Engineering", subjects: "Mathematics and Physics required. Further Mathematics and Chemistry often preferred." },
  { title: "Art, Design & Creative", subjects: "Art & Design or related subjects, supported by complementary academic subjects." },
  { title: "Politics & Diplomacy", subjects: "Politics, History, Economics, often with a modern foreign language." },
];

const benefits = [
  { title: "Internationally Recognised", desc: "Accepted by leading universities across the UK, Europe, North America, Australia and beyond." },
  { title: "Competitive Degree Prep", desc: "Strong preparation for Medicine, Engineering, Law and other highly competitive programmes." },
  { title: "Academic Depth & Rigour", desc: "Specialist programmes that develop true subject mastery and independent thinking." },
  { title: "Ideal for High Achievers", desc: "Particularly suitable for students aiming for top-tier universities worldwide." },
];

const supportItems = [
  "Academic and career guidance",
  "A Level subject selection advice",
  "UK boarding school placement",
  "Ongoing student support",
  "University application support via UCAS",
];

export default function ALevels() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Study Pathway</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                A Levels at UK Boarding Schools
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                A trusted academic pathway to leading universities worldwide
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
                  src="/manus-storage/pathway_alevels_academic_c4180d23.jpg"
                  alt="A Level academic learning environment"
                  className="w-full aspect-[3/4] object-cover"
                />
                <img
                  src="/manus-storage/pathway_alevels_boarding1_a1189a1f.jpg"
                  alt="UK boarding school campus"
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Choosing the Right Pathway
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    Choosing the right education pathway is one of the most important decisions a student, family, or sponsor can make. At WorldStudentAdvisors, we guide students and families through this process with care, clarity, and experience.
                  </p>
                  <p>
                    A Levels are widely regarded as the gold-standard academic qualification for entry to UK universities and are also recognised internationally. When studied within a UK boarding school environment, they combine academic rigour with strong pastoral care, personal development, and preparation for university life.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* What are A Levels */}
          <ScrollReveal>
            <div className="max-w-3xl mb-20">
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                What Are A Levels?
              </h2>
              <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                <p>
                  A Levels are UK Level 3 qualifications and form the standard entry route to a three-year undergraduate degree in the UK, as well as many universities overseas.
                </p>
                <p>
                  They are usually studied over two academic years and allow students to develop subject depth, independent learning skills, and academic maturity before progressing to university.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Programme structure */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Programme structure</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                How the A Level Programme Works
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { title: "Year 1. AS Level", desc: "Subject foundations and academic skills. Students build core knowledge and develop independent study habits." },
              { title: "Year 2. A Level", desc: "Advanced study and final examinations. Students deepen expertise, sit external exams, and complete UCAS applications." },
              { title: "Intakes Available", desc: "Most years run September to June. Some boarding schools also offer January intakes for international students." },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 80}>
                <div className="bg-white p-8 border-t-2 border-wsa-red/20 h-full">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* UCAS Tariff Points */}
          <ScrollReveal>
            <div className="bg-white p-8 lg:p-12">
              <h3 className="text-2xl font-semibold text-wsa-navy mb-4">A Level Grades & UCAS Tariff Points</h3>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
                A Levels are graded A*, A, B, C, D, E, or U (Unclassified / Fail). Universities set entry requirements based on the competitiveness of each course. Many universities use UCAS Tariff Points. Offers may be based on grades (e.g. AAB) or total UCAS points (e.g. 128 points from three A Levels).
              </p>
              <div className="grid grid-cols-7 gap-2 max-w-xl">
                {ucasPoints.map((item) => (
                  <div key={item.grade} className="text-center">
                    <div className="bg-wsa-navy text-white font-semibold py-2 text-sm">{item.grade}</div>
                    <div className="bg-wsa-stone py-2 text-xs text-muted-foreground font-medium">{item.points}</div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Most students take three or four A Level subjects, selected to reflect academic strengths, personal interests, and intended degree or career plans.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* University pathways */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">University entry</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                A Levels & Future University Pathways
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The subjects you choose at A Level directly influence which university courses are available to you. These examples illustrate typical requirements, entry requirements vary by university and course.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {pathwayExamples.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 60}>
                <div className="border-t-2 border-wsa-red/20 pt-6">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.subjects}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Medicine spotlight */}
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <img
                src="/manus-storage/pathway_alevels_medicine_a8399d7d.jpg"
                alt="Medical students in a clinical setting"
                className="w-full aspect-[4/3] object-cover"
              />
              <div>
                <h3 className="text-2xl font-semibold text-wsa-navy mb-6">Medicine: A Level Pathway</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Medicine is one of the most competitive degree programmes in the UK and requires early, careful planning.
                </p>
                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="text-sm font-semibold text-wsa-navy uppercase tracking-wide mb-2">Typical Requirements</h4>
                    <ul className="space-y-2 text-[15px] text-muted-foreground">
                      <li>Grades: AAA to A*AA</li>
                      <li>UCAS points: approximately 168–192</li>
                      <li>Chemistry (mandatory) and Biology (usually required)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-wsa-navy uppercase tracking-wide mb-2">Additional Requirements</h4>
                    <ul className="space-y-2 text-[15px] text-muted-foreground">
                      <li>Admissions tests (such as UCAT)</li>
                      <li>Interviews, often Multiple Mini Interviews (MMI)</li>
                      <li>Relevant work experience and a strong personal statement</li>
                    </ul>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  WorldStudentAdvisors supports students in understanding, responding to, and accepting offers correctly and on time.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Why families choose */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Why A Levels</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Why Families Choose A Levels
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                While some students progress via a Foundation Year, A Levels remain the preferred route for families seeking academic depth and flexibility.
              </p>
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

      {/* Boarding schools */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Boarding schools</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  The Benefits of UK Boarding Schools
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-6">
                  UK boarding schools offer a structured, supportive environment valued by international families worldwide. Many schools also offer football and sports academies, allowing students to combine A Levels with high-level training.
                </p>
                <Link
                  href="/sport-pathways"
                  className="inline-flex items-center text-sm font-medium text-wsa-navy hover:text-wsa-red transition-colors"
                >
                  Explore Sport Pathways <ArrowRight className="ml-1.5" size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="/manus-storage/pathway_alevels_boarding2_c125e5f1.jpg"
                  alt="UK boarding school campus"
                  className="w-full aspect-[3/4] object-cover"
                />
                <img
                  src="/manus-storage/pathway_alevels_football_female_e3a1c2e0.webp"
                  alt="Female football academy at a UK boarding school"
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
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Our support</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-8">
                  How WorldStudentAdvisors Supports You
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-8">
                  We work closely with students, parents, and sponsors to provide:
                </p>
                <ul className="space-y-4">
                  {supportItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                      <span className="text-[17px] text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-sm text-muted-foreground italic">
                  WorldStudentAdvisors is a registered UCAS Centre, allowing us to submit and manage applications directly. Our advice is ethical, personalised, and focused on long-term success.
                </p>
              </div>
              <div className="flex flex-col justify-center">
                <div className="bg-white p-8 lg:p-10">
                  <h3 className="text-xl font-semibold text-wsa-navy mb-4">Ready to explore A Levels?</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Our team is here to help you choose the right pathway, select the right school, and plan ahead with confidence. No obligation, just honest, expert guidance.
                  </p>
                  <a
                    href="mailto:Advice@WorldStudentAdvisors.com"
                    className="inline-flex items-center text-wsa-red font-medium hover:underline"
                  >
                    <Mail className="mr-2" size={16} />
                    Advice@WorldStudentAdvisors.com
                  </a>
                </div>
              </div>
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
                If you would like guidance on A Levels, boarding schools, or university progression, our team is ready to help. We will be happy to advise whether A Levels are the right pathway and help you plan with confidence.
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
