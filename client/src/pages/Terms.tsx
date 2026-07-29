import ScrollReveal from "@/components/ScrollReveal";

export default function Terms() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-20">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Legal</p>
              <h1 className="text-4xl md:text-5xl font-semibold text-wsa-navy leading-[1.1] mb-6">
                Terms of Service
              </h1>
              <p className="text-muted-foreground">
                Last updated: July 2026
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Content */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <div className="max-w-3xl space-y-12">
            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">About our services</h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  World Student Advisors (WSA) provides international education advisory services. We help students and their families understand study options, prepare applications, and work through the process of studying abroad. Our services are provided through personal Student Counsellors who work with each student individually.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Our role</h2>
                <div className="space-y-3 text-[17px] text-muted-foreground leading-relaxed">
                  <p>WSA acts as an advisory and application support service. We:</p>
                  <p className="pl-6">Provide guidance on study options based on your academic profile, goals, and preferences.</p>
                  <p className="pl-6">Help prepare and submit applications to educational institutions on your behalf.</p>
                  <p className="pl-6">Offer advice on visa processes, accommodation, and preparation for study abroad.</p>
                  <p className="pl-6">Maintain communication between you and educational institutions during the application process.</p>
                  <p>WSA does not guarantee admission to any institution. Admission decisions are made solely by the educational institutions themselves. We provide honest, accurate guidance and recommend options we believe are genuinely suitable for each student.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Your responsibilities</h2>
                <div className="space-y-3 text-[17px] text-muted-foreground leading-relaxed">
                  <p>When using our services, you agree to:</p>
                  <p className="pl-6">Provide accurate and truthful information about your academic history, qualifications, and personal circumstances.</p>
                  <p className="pl-6">Respond to communications from your counsellor in a timely manner to avoid missing deadlines.</p>
                  <p className="pl-6">Review all documents and applications before they are submitted on your behalf.</p>
                  <p className="pl-6">Inform your counsellor of any changes to your circumstances that may affect your application.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Fees and payments</h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  Initial consultations with WSA are provided at no cost. Any fees associated with our services will be clearly communicated to you before you commit. We will never charge hidden fees or pressure you into paying for services you do not need. Your counsellor will explain all costs transparently before any financial commitment is required.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Ethical standards</h2>
                <div className="space-y-3 text-[17px] text-muted-foreground leading-relaxed">
                  <p>As a British Council Certified Agency, WSA adheres to strict ethical standards:</p>
                  <p className="pl-6">We recommend institutions and programmes based on what is right for the student, not what is most profitable for WSA.</p>
                  <p className="pl-6">We provide honest assessments of a student's chances of admission.</p>
                  <p className="pl-6">We will advise against applying to programmes we believe are not suitable, even if the student requests it.</p>
                  <p className="pl-6">If WSA is not the right fit for a student's needs, we will say so honestly.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Limitation of liability</h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  While we make every effort to provide accurate and up-to-date information, WSA cannot be held liable for decisions made by educational institutions, changes to immigration policies, or circumstances beyond our control. We provide guidance based on the best information available at the time, but policies and requirements can change without notice.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Website use</h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  The content on this website is provided for general information purposes. While we strive to keep information accurate and current, we make no guarantees about the completeness or accuracy of website content. For personalised advice specific to your situation, please speak to a counsellor directly.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Changes to these terms</h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  We may update these terms from time to time. Any significant changes will be communicated to active clients through their Student Counsellor. The date at the top of this page indicates when these terms were last updated.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Contact</h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  If you have any questions about these terms, please contact us through our website or speak directly to your Student Counsellor.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
