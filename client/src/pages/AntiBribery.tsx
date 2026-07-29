import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export default function AntiBribery() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-20 border-b border-border/40">
        <div className="container">
          <ScrollReveal>
            <Link href="/compliance" className="inline-flex items-center text-sm text-wsa-red hover:text-wsa-red/80 transition-colors mb-8">
              <ArrowLeft size={14} className="mr-1.5" /> Back to Compliance & Policies
            </Link>
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-semibold text-wsa-navy leading-[1.1] mb-4">
                Anti-Bribery & Anti-Corruption Policy
              </h1>
              <p className="text-muted-foreground text-sm">
                Version 1.1 &middot; Last updated: January 2026 &middot; Next review: January 2027
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="max-w-3xl space-y-14">
            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">1 &nbsp;Policy Statement</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors maintains a zero-tolerance approach to bribery and corruption in all forms. This policy defines the standards expected of all individuals representing the organisation and establishes the controls in place to prevent, detect, and respond to any form of corrupt activity.</p>
                  <p>WorldStudentAdvisors is committed to conducting all activities with integrity, transparency, and in full compliance with the UK Bribery Act 2010 and applicable international anti-corruption legislation.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">2 &nbsp;Scope</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>This policy applies to:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>The Managing Director</li>
                    <li>All employees, consultants, and contractors</li>
                    <li>Overseas representatives, agents, sub-agents, and referral partners</li>
                    <li>Any third party acting on behalf of WorldStudentAdvisors</li>
                  </ul>
                  <p>This policy applies to all WorldStudentAdvisors activities in the United Kingdom and internationally.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">3 &nbsp;Legal Framework</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>This policy is aligned with:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>UK Bribery Act 2010</li>
                    <li>Applicable international anti-corruption legislation</li>
                    <li>British Council Agent Quality Framework (AQF)</li>
                    <li>University partner compliance requirements</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">4 &nbsp;Definitions</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p><strong>Bribery</strong>: Offering, promising, giving, requesting, or accepting a financial or other advantage to induce or reward improper performance of a function or activity.</p>
                  <p><strong>Corruption</strong>: The misuse of entrusted power or position for private gain, including but not limited to bribery, fraud, extortion, and conflicts of interest.</p>
                  <p><strong>Facilitation payments</strong>: Small unofficial payments made to secure or expedite routine actions. These are prohibited under this policy regardless of local custom or practice.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">5 &nbsp;Prohibited Conduct</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>The following activities are strictly prohibited:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Offering, promising, or giving any bribe or improper inducement</li>
                    <li>Requesting or accepting any bribe or improper inducement</li>
                    <li>Making facilitation payments of any kind</li>
                    <li>Offering gifts, hospitality, or payments intended to influence decisions</li>
                    <li>Misrepresenting student credentials, qualifications, or documentation</li>
                    <li>Falsifying records, reports, or compliance documentation</li>
                    <li>Engaging in any activity that could reasonably be perceived as corrupt</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">6 &nbsp;Gifts, Hospitality & Expenses</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors recognises that modest gifts and hospitality may form part of normal business relationships. However:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Gifts or hospitality must never be offered or accepted where they could influence or be perceived to influence a business decision</li>
                    <li>Gifts or hospitality of significant value must be declared and approved</li>
                    <li>Cash payments or cash equivalents are never acceptable</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">7 &nbsp;Due Diligence & Third-Party Controls</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors applies proportionate due diligence to third parties, including:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Assessment of third-party relationships prior to engagement</li>
                    <li>Contractual obligations requiring compliance with anti-bribery standards</li>
                    <li>Ongoing monitoring of third-party conduct</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">8 &nbsp;Reporting & Whistleblowing</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>Any individual who suspects or becomes aware of bribery or corruption must report the matter immediately to the Managing Director.</p>
                  <p>Reports may be made in confidence and without fear of retaliation. WorldStudentAdvisors will not tolerate any form of victimisation against individuals who raise genuine concerns in good faith.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">9 &nbsp;Consequences of Non-Compliance</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>Any breach of this policy will be treated as a serious matter and may result in:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Disciplinary action, including termination of employment or contract</li>
                    <li>Termination of partnership or agency agreements</li>
                    <li>Referral to relevant authorities where criminal conduct is suspected</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">10 &nbsp;Training & Awareness</h2>
                <p className="text-[16px] text-muted-foreground leading-relaxed">
                  WorldStudentAdvisors provides training and guidance to ensure that all relevant individuals understand their responsibilities under this policy. Training is provided as part of induction and refreshed periodically.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">11 &nbsp;Monitoring & Review</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors monitors compliance through:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Internal review of financial transactions and third-party relationships</li>
                    <li>Case file audits and documentation checks</li>
                    <li>Feedback from partners and stakeholders</li>
                  </ul>
                  <p>This policy is reviewed periodically to ensure alignment with legislation, partner expectations, and sector best practice.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">12 &nbsp;Contact</h2>
                <div className="bg-wsa-cream/60 border border-border/40 p-6 rounded-sm text-[16px] text-muted-foreground leading-relaxed">
                  <p className="font-medium text-wsa-navy">Tim Hunt, Managing Director</p>
                  <p className="mt-2">Email: <a href="mailto:tim.hunt@worldstudentadvisors.com" className="text-wsa-red hover:underline">tim.hunt@worldstudentadvisors.com</a></p>
                  <p className="mt-4 text-sm">
                    WorldStudentAdvisors Limited &middot; Registered in England and Wales &middot; Company Number: 09532724<br />
                    2 Newport Close, Clevedon, North Somerset, BS21 5DZ, United Kingdom
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
