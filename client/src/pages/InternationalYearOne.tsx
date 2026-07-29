import { Link } from "wouter";
import { ArrowRight, CheckCircle, Mail } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const suitableFor = [
  "Have completed high school or some higher education",
  "Need additional academic preparation before entering Year Two",
  "Require further development of academic English skills",
  "Want a supported transition into UK university study",
  "Prefer smaller class sizes and structured academic guidance",
];

const subjectStreams = [
  { title: "Business & Management", desc: "Economics, finance, marketing, and management fundamentals aligned to business degree entry." },
  { title: "Engineering & Technology", desc: "Mathematics, physics, and technical foundations for engineering and technology programmes." },
  { title: "Science", desc: "Biology, chemistry, and laboratory skills preparing students for science and health degrees." },
  { title: "Humanities & Social Sciences", desc: "History, politics, sociology, and academic writing for humanities and social science degrees." },
  { title: "Arts & Creative Subjects", desc: "Creative practice, design theory, and portfolio development for arts and creative degree pathways." },
];

const benefits = [
  { title: "University-Level Preparation", desc: "Strong academic preparation at university level from day one." },
  { title: "English & Study Skills", desc: "Development of academic English and the study skills needed for success." },
  { title: "UK Academic Familiarity", desc: "Familiarity with UK teaching, assessment styles, and academic culture." },
  { title: "Personalised Support", desc: "Smaller class sizes and personalised academic and pastoral support." },
  { title: "Clear Route to Year Two", desc: "A clearly defined and supported progression route directly into Year Two of the undergraduate degree." },
];

export default function InternationalYearOne() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Study Pathway</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                International Year One in the UK
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                A structured university pathway, from your country to Year Two
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
                  src="/manus-storage/pathway_iy1_airport_5245e89c.jpg"
                  alt="Student at airport farewell, beginning the journey to the UK"
                  className="w-full aspect-[3/4] object-cover"
                />
                <img
                  src="/manus-storage/pathway_iy1_welcome_efec3b2e.jpg"
                  alt="Students welcomed on arrival in the UK"
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  What is an International Year One?
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    International Year One is a Level 4 university pathway programme, academically equivalent to the first year of a UK undergraduate degree. It is delivered by UK universities or approved pathway providers and leads directly into Year Two of a full undergraduate degree.
                  </p>
                  <p>
                    It is intended for international students who have completed secondary education or prior study but do not yet meet the entry requirements for direct admission into Year Two of an undergraduate degree. The programme bridges that gap, academically, linguistically, and culturally.
                  </p>
                  <p>
                    On successful completion, students progress directly into Year Two of their chosen undergraduate programme at a UK university. This means the overall time to degree completion remains the same as for domestic students.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Who is it for */}
          <ScrollReveal>
            <div className="max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Who is International Year One For?
              </h2>
              <p className="text-[17px] text-muted-foreground leading-relaxed mb-6">
                International Year One is suitable for students who are ready to take the step into UK university life but need a structured and supported entry point. It is designed for students who:
              </p>
              <ul className="space-y-3 mb-6">
                {suitableFor.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="text-wsa-red mt-0.5 flex-shrink-0" size={18} />
                    <span className="text-[17px] text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[17px] text-muted-foreground leading-relaxed">
                This pathway is particularly well suited to students who are academically capable but would benefit from confidence-building and familiarity with UK teaching and assessment methods. It is not a remedial programme, it is a deliberate, strategic step towards a successful undergraduate degree.
              </p>
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
                How the International Year One Works
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                International Year One programmes typically last one academic year and follow a structured, progressive format. Each term builds on the last.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { title: "Term 1. Foundations", desc: "Core academic skills, English language development, and an introduction to UK academic expectations. Students begin to adapt to the pace and style of UK university learning." },
              { title: "Term 2. Subject Development", desc: "Subject-specific modules aligned to the intended degree, alongside continued academic and language support. Students begin building the specialist knowledge required for Year Two." },
              { title: "Term 3. Advanced Study", desc: "Advanced study, assessments, and preparation for progression into Year Two. Students demonstrate readiness for full undergraduate study through assessed work and examinations." },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 80}>
                <div className="bg-white p-8 border-t-2 border-wsa-red/20 h-full">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <img
                src="/manus-storage/pathway_iy1_classroom_fb7a88b1.jpg"
                alt="Students in a UK university classroom"
                className="w-full aspect-[4/3] object-cover"
              />
              <div>
                <p className="text-sm text-muted-foreground mb-4">Most programmes run from September to June, with some universities also offering January or May intakes.</p>
                <h3 className="text-xl font-semibold text-wsa-navy mb-3">Visa & UK Study Compliance</h3>
                <p className="text-muted-foreground leading-relaxed text-[15px]">
                  International Year One programmes are delivered by UK universities or approved pathway providers with UKVI-compliant sponsorship. Eligible students can apply for a UK Student visa, subject to meeting academic, financial, and immigration requirements. WorldStudentAdvisors supports students throughout the visa process to ensure compliance, accuracy, and peace of mind.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Subject streams */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Subject areas</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                What Do Students Study?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Students typically study 4–6 modules during their International Year One, selected to align with their academic background, chosen undergraduate degree, and future career aspirations.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {subjectStreams.map((item, i) => (
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

      {/* Why families choose */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Benefits</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Why Families Choose International Year One
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                <h3 className="text-xl font-semibold text-wsa-navy mb-2">Not sure if International Year One is the right fit?</h3>
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
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Our support</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-8">
                  How WorldStudentAdvisors Supports You
                </h2>
                <div className="space-y-6">
                  {[
                    { title: "Honest Pathway Advice", desc: "Honest advice on whether International Year One is the right pathway for your student." },
                    { title: "Programme Matching", desc: "Careful programme and university matching based on academic background and degree goals." },
                    { title: "Application Support", desc: "Full application and document support from start to enrolment." },
                    { title: "Visa Guidance", desc: "Visa guidance and compliance checks to ensure accuracy and peace of mind throughout the process." },
                  ].map((item) => (
                    <div key={item.title}>
                      <h3 className="text-base font-semibold text-wsa-navy mb-1">{item.title}</h3>
                      <p className="text-muted-foreground text-[15px] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-8 text-sm text-muted-foreground italic">
                  We provide pre-departure preparation and ongoing student support throughout the year. Our advice is ethical, personalised, and focused on long-term outcomes. WorldStudentAdvisors is a registered UCAS Centre.
                </p>
              </div>
              <img
                src="/manus-storage/pathway_iy1_lab_d9989db6.jpg"
                alt="Student working in a university laboratory"
                className="w-full aspect-[4/3] object-cover"
              />
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
                <h3 className="text-xl font-semibold text-wsa-navy">Undergraduate Degree (UK)</h3>
                <p className="text-muted-foreground mt-1">Successful completion provides a direct route into Year Two of a UK undergraduate degree.</p>
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
                If you would like guidance on International Year One programmes, undergraduate progression routes, or long-term academic planning, our advisors are happy to help.
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
