import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export default function OnlineLearning() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Online Learning</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Accredited degrees without leaving home
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                For students who want internationally recognised qualifications but need the flexibility of studying remotely. Same counsellor support. Same quality guidance. Different delivery.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Why online */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Why online</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                The same qualifications, delivered flexibly
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Online programmes from accredited institutions carry the same academic weight as on-campus degrees. They're designed for students who need flexibility, whether for financial, family, or professional reasons.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Accredited institutions", desc: "We only recommend online programmes from institutions with recognised accreditation. Your qualification will be respected globally." },
              { title: "Flexible scheduling", desc: "Study around your commitments. Most programmes offer asynchronous learning with optional live sessions." },
              { title: "Full counsellor support", desc: "Your Student Counsellor guides you through applications, enrolment, and ongoing support, exactly as they would for on-campus study." },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 80}>
                <div className="border-t-2 border-wsa-red/20 pt-6">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Who it's for</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-8">
                  Online study might be right for you if...
                </h2>
                <div className="space-y-4 text-[17px] text-muted-foreground leading-relaxed">
                  <p>You want an internationally recognised qualification but can't relocate right now.</p>
                  <p>You're working and need to study around your job.</p>
                  <p>You want to start your degree while preparing for future on-campus study.</p>
                  <p>Visa or financial constraints make on-campus study difficult at this stage.</p>
                  <p>You prefer self-paced learning with structured support.</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <div className="flex flex-col justify-center">
                <div className="bg-white p-10 lg:p-12">
                  <h3 className="text-xl font-semibold text-wsa-navy mb-4">Not sure if online is right?</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Your counsellor can help you weigh up the options. They'll explain the differences between online and on-campus programmes, help you understand what employers value, and recommend the best path for your specific goals.
                  </p>
                  <p className="text-wsa-navy font-medium text-sm">
                    There's no pressure to choose one path over another. Your counsellor's job is to help you make the right decision for your circumstances.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Available subjects</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Programmes across multiple disciplines
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Online programmes are available at undergraduate and postgraduate level across a range of subjects. Your counsellor will help you find the right programme.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
            {[
              "Business & Management",
              "Computer Science & IT",
              "Health & Social Care",
              "Education",
              "Law",
              "Engineering",
              "Psychology",
              "Finance & Accounting",
              "Marketing & Communications",
            ].map((subject, i) => (
              <ScrollReveal key={subject} delay={i * 40}>
                <div className="border-b border-border/40 pb-4">
                  <span className="text-[17px] text-wsa-navy font-medium">{subject}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <p className="mt-10 text-sm text-muted-foreground italic">
              Subject availability depends on institution and level of study. Your counsellor will confirm options based on your goals.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 lg:py-40 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15] mb-6">
                Explore online study options
              </h2>
              <p className="text-lg text-white/60 leading-relaxed mb-10">
                Get started and your counsellor will help you understand what's available, what's accredited, and what's right for your goals.
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
