import { Link } from "wouter";
import { ArrowLeft, Download, ShieldCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const VAVITA_DUE_DILIGENCE_PDF =
  "/downloads/worldstudentadvisors-vavita-due-diligence-review-august-2026.pdf";

export default function DDVavita() {
  return (
    <div className="min-h-screen">
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-20 border-b border-border/40">
        <div className="container">
          <ScrollReveal>
            <Link href="/compliance" className="inline-flex items-center text-sm text-wsa-red hover:text-wsa-red/80 transition-colors mb-8">
              <ArrowLeft size={14} className="mr-1.5" /> Back to Compliance & Policies
            </Link>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                Due Diligence Review
              </p>
              <h1 className="text-4xl md:text-5xl font-semibold text-wsa-navy leading-[1.1] mb-6">
                WorldStudentAdvisors Due Diligence Review - Vavita
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                WorldStudentAdvisors has built its reputation on trust. Before introducing Vavita to our students and families, we therefore carried out our own due diligence review of the company and its services.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mt-5">
                You can read the WorldStudentAdvisors Due Diligence Review of Vavita below.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl bg-wsa-cream/50 border border-border/40 rounded-sm p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                <div className="flex-shrink-0 w-12 h-12 rounded-sm bg-wsa-red/10 flex items-center justify-center">
                  <ShieldCheck size={22} className="text-wsa-red" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-wsa-navy mb-2">
                    Vavita due diligence document
                  </h2>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Published for students, families, partners and advisers who want to review the due diligence carried out before Vavita was introduced.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <a
                  href={VAVITA_DUE_DILIGENCE_PDF}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-4 bg-wsa-red text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                >
                  Download Due Diligence Review
                  <Download size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
