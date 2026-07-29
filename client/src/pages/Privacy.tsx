import ScrollReveal from "@/components/ScrollReveal";

export default function Privacy() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-20">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Legal</p>
              <h1 className="text-4xl md:text-5xl font-semibold text-wsa-navy leading-[1.1] mb-6">
                Privacy Policy
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
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Who we are</h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  World Student Advisors (WSA) is an international education advisory service founded in 2012. We are a British Council Certified Agency with offices in the United Kingdom, Kenya, Nigeria, and Ghana. This privacy policy explains how we collect, use, and protect your personal information when you use our website or services.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Information we collect</h2>
                <div className="space-y-3 text-[17px] text-muted-foreground leading-relaxed">
                  <p>When you apply for our services or contact us, we may collect:</p>
                  <p className="pl-6">Your name, email address, phone number, and country of residence.</p>
                  <p className="pl-6">Academic qualifications, transcripts, and supporting documents you provide.</p>
                  <p className="pl-6">Information about your study preferences, including destination, subject, and level of study.</p>
                  <p className="pl-6">Any additional information you choose to share with your Student Counsellor.</p>
                  <p>We also collect basic analytics data about how you use our website (pages visited, time on site) to improve our services. This data is anonymised and cannot identify you personally.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">How we use your information</h2>
                <div className="space-y-3 text-[17px] text-muted-foreground leading-relaxed">
                  <p>We use your personal information to:</p>
                  <p className="pl-6">Provide personalised education advisory services through your assigned counsellor.</p>
                  <p className="pl-6">Process applications to educational institutions on your behalf.</p>
                  <p className="pl-6">Communicate with you about your application progress and study options.</p>
                  <p className="pl-6">Share relevant information with educational institutions as part of your application (only with your consent).</p>
                  <p className="pl-6">Improve our services and website experience.</p>
                  <p>We will never sell your personal information to third parties. We will never share your information without your explicit consent, except where required by law.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Data protection</h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  We take the security of your personal data seriously. We use appropriate technical and organisational measures to protect your information against unauthorised access, alteration, disclosure, or destruction. Your Student Counsellor is trained in data protection and handles your information with care and confidentiality.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Your rights</h2>
                <div className="space-y-3 text-[17px] text-muted-foreground leading-relaxed">
                  <p>You have the right to:</p>
                  <p className="pl-6">Access the personal information we hold about you.</p>
                  <p className="pl-6">Request correction of inaccurate information.</p>
                  <p className="pl-6">Request deletion of your personal data.</p>
                  <p className="pl-6">Withdraw consent for data processing at any time.</p>
                  <p className="pl-6">Request a copy of your data in a portable format.</p>
                  <p>To exercise any of these rights, contact your Student Counsellor or email us directly.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Cookies</h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  Our website uses essential cookies to ensure proper functionality and anonymous analytics cookies to help us understand how visitors use our site. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, though this may affect your experience of our website.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-4">Contact us</h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  If you have any questions about this privacy policy or how we handle your personal information, please contact us through our website or speak directly to your Student Counsellor.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
