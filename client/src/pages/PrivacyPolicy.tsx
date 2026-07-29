import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export default function PrivacyPolicy() {
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
                Privacy Policy
              </h1>
              <p className="text-muted-foreground text-sm">
                Version 1.0 &middot; Last updated: January 2026 &middot; Next review: January 2027
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="py-10 bg-wsa-cream/50 border-b border-border/40">
        <div className="container">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-wsa-navy mb-4">Contents</p>
            <nav className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm text-muted-foreground">
              <a href="#s1" className="hover:text-wsa-navy transition-colors">1. Policy Statement</a>
              <a href="#s9" className="hover:text-wsa-navy transition-colors">9. Data Security & Control Measures</a>
              <a href="#s2" className="hover:text-wsa-navy transition-colors">2. Scope</a>
              <a href="#s10" className="hover:text-wsa-navy transition-colors">10. Data Retention & Record Keeping</a>
              <a href="#s3" className="hover:text-wsa-navy transition-colors">3. Legal & Regulatory Framework</a>
              <a href="#s11" className="hover:text-wsa-navy transition-colors">11. Your Rights</a>
              <a href="#s4" className="hover:text-wsa-navy transition-colors">4. Governance & Accountability</a>
              <a href="#s12" className="hover:text-wsa-navy transition-colors">12. Incident Reporting & Breach Management</a>
              <a href="#s5" className="hover:text-wsa-navy transition-colors">5. Data Collection & Processing</a>
              <a href="#s13" className="hover:text-wsa-navy transition-colors">13. Monitoring & Assurance</a>
              <a href="#s6" className="hover:text-wsa-navy transition-colors">6. Lawful Basis for Processing</a>
              <a href="#s14" className="hover:text-wsa-navy transition-colors">14. Policy Review</a>
              <a href="#s7" className="hover:text-wsa-navy transition-colors">7. Data Sharing & Third Parties</a>
              <a href="#s15" className="hover:text-wsa-navy transition-colors">15. Contact & Data Protection Enquiries</a>
              <a href="#s8" className="hover:text-wsa-navy transition-colors">8. International Data Transfers</a>
            </nav>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="max-w-3xl space-y-14">
            <ScrollReveal>
              <div id="s1">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">1 &nbsp;Policy Statement</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors operates a structured and compliance-led approach to the processing of personal data, ensuring that all information is handled lawfully, fairly, and transparently.</p>
                  <p>The organisation maintains appropriate technical and organisational controls to protect personal data and to ensure alignment with UK data protection legislation and the compliance expectations of university partners and UKVI.</p>
                  <p>This policy forms part of the wider WorldStudentAdvisors compliance framework and should be read in conjunction with the <Link href="/code-of-conduct" className="text-wsa-red hover:underline">Code of Conduct</Link> and <Link href="/anti-bribery-and-anti-corruption-policy" className="text-wsa-red hover:underline">Anti-Bribery and Anti-Corruption Policy</Link>.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s2">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">2 &nbsp;Scope</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>This policy applies to:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>The Managing Director</li>
                    <li>All employees, consultants, and contractors</li>
                    <li>Overseas representatives, agents, sub-agents, and referral partners</li>
                    <li>Any third party acting on behalf of WorldStudentAdvisors</li>
                  </ul>
                  <p>This policy applies to all personal data processed by WorldStudentAdvisors in the United Kingdom and across all international operations.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s3">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">3 &nbsp;Legal & Regulatory Framework</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors processes personal data in accordance with:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>UK General Data Protection Regulation (UK GDPR)</li>
                    <li>Data Protection Act 2018</li>
                    <li>Applicable international data protection legislation</li>
                    <li>Contractual obligations with university partners</li>
                  </ul>
                  <p>This policy is aligned with:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>British Council National Code of Ethical Practice for UK Education Agents</li>
                    <li>British Council Agent Quality Framework (AQF)</li>
                    <li>UKVI expectations relating to compliance, transparency, and data handling within international student recruitment</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s4">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">4 &nbsp;Governance & Accountability</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors operates a UK Head Office-led governance structure with defined oversight of all data processing activities.</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>The UK Head Office retains responsibility for compliance, control, and oversight</li>
                    <li>Data processing activities undertaken by regional operations are conducted under UK Head Office authority</li>
                    <li>Accountability for data protection remains with WorldStudentAdvisors as Data Controller</li>
                  </ul>
                  <p>The Managing Director holds overall responsibility for ensuring compliance with this policy.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s5">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">5 &nbsp;Data Collection & Processing Activities</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors collects and processes personal data necessary to support student recruitment, counselling, and application management. Categories of data include:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Identity and contact data</li>
                    <li>Academic and application data</li>
                    <li>Immigration and financial documentation (where required)</li>
                    <li>Technical and usage data</li>
                  </ul>
                  <p>Data is collected through:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Website and enquiry forms</li>
                    <li>Direct communication channels (email, telephone, WhatsApp)</li>
                    <li>Structured counselling and case management processes</li>
                  </ul>
                  <p>All data collection is limited to what is necessary and proportionate for defined purposes.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s6">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">6 &nbsp;Lawful Basis for Processing</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>Personal data is processed under one or more of the following lawful bases: Consent, Contractual necessity, Legal obligation, or Legitimate interests.</p>
                  <p>Processing is undertaken strictly for defined purposes, including:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Provision of student advisory services</li>
                    <li>Application preparation and submission</li>
                    <li>Visa and documentation support</li>
                    <li>Compliance with partner and regulatory requirements</li>
                    <li>Service monitoring and improvement</li>
                  </ul>
                  <p>All processing activities are conducted within a controlled and auditable case management framework.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s7">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">7 &nbsp;Data Sharing & Third-Party Controls</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors does not sell or commercially exploit personal data. Data may be shared, where necessary and proportionate, with:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>University partners</li>
                    <li>Government and immigration authorities (including UKVI)</li>
                    <li>Approved service providers supporting operational delivery</li>
                  </ul>
                  <p>All third parties are subject to due diligence, operate under contractual data protection obligations, and are restricted to processing data for defined purposes only. WorldStudentAdvisors retains responsibility for data processed by third parties acting on its behalf.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s8">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">8 &nbsp;International Data Transfers</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>Given the international scope of operations, personal data may be transferred outside the UK or EEA. Where this occurs, WorldStudentAdvisors ensures appropriate safeguards are implemented, including:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Standard Contractual Clauses (SCCs)</li>
                    <li>Data processing agreements</li>
                    <li>Controlled and limited transfer mechanisms</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s9">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">9 &nbsp;Data Security & Control Measures</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors implements proportionate security controls, including:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Secure systems and controlled access permissions</li>
                    <li>Encryption and secure storage protocols</li>
                    <li>Staff training in data protection and confidentiality</li>
                    <li>Ongoing monitoring and internal review</li>
                  </ul>
                  <p>Access to personal data is restricted to authorised personnel with a defined business need.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s10">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">10 &nbsp;Data Retention & Record Keeping</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>Personal data is retained only for as long as necessary to:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Deliver services</li>
                    <li>Meet legal and regulatory obligations</li>
                    <li>Support audit, compliance, and reporting requirements</li>
                  </ul>
                  <p>Records are maintained in a structured and traceable manner to support audit and verification processes.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s11">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">11 &nbsp;Your Rights</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>As a data subject, you have the following rights under UK GDPR:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Right of access to your personal data</li>
                    <li>Right to rectification of inaccurate data</li>
                    <li>Right to erasure (right to be forgotten)</li>
                    <li>Right to restrict processing</li>
                    <li>Right to data portability</li>
                    <li>Right to object to processing</li>
                    <li>Right to withdraw consent at any time</li>
                  </ul>
                  <p>WorldStudentAdvisors will respond to all requests in accordance with applicable data protection legislation and within required statutory timeframes.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s12">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">12 &nbsp;Incident Reporting & Breach Management</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>Any actual or suspected data breach must be reported immediately to the Managing Director. WorldStudentAdvisors will assess the nature and impact of the breach, take appropriate remedial action, and notify relevant authorities where required. All incidents are documented and reviewed as part of ongoing compliance monitoring.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s13">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">13 &nbsp;Monitoring & Assurance</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors maintains ongoing oversight of data protection through:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Internal monitoring of data handling practices</li>
                    <li>Review of access controls and system usage</li>
                    <li>Case file audits and documentation checks</li>
                    <li>Feedback from partners and stakeholders</li>
                  </ul>
                  <p>Findings are used to strengthen controls and ensure continuous improvement.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s14">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">14 &nbsp;Policy Review</h2>
                <p className="text-[16px] text-muted-foreground leading-relaxed">
                  This policy is subject to periodic review to ensure continued alignment with UK legislation, UKVI and university partner expectations, and sector best practice.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="s15">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">15 &nbsp;Contact & Data Protection Enquiries</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>All data protection enquiries, including Subject Access Requests (SARs), should be directed to:</p>
                  <div className="bg-wsa-cream/60 border border-border/40 p-6 rounded-sm">
                    <p className="font-medium text-wsa-navy">Tim Hunt, Managing Director / Data Protection Manager</p>
                    <p className="mt-2">Email: <a href="mailto:gdpr@worldstudentadvisors.com" className="text-wsa-red hover:underline">gdpr@worldstudentadvisors.com</a></p>
                    <p className="mt-4 text-sm text-muted-foreground">
                      WorldStudentAdvisors Limited &middot; Registered in England and Wales &middot; Company Number: 09532724<br />
                      2 Newport Close, Clevedon, North Somerset, BS21 5DZ, United Kingdom<br />
                      Tel: +44 791 4797 830 &middot; <a href="mailto:ask@worldstudentadvisors.com" className="text-wsa-red hover:underline">ask@worldstudentadvisors.com</a>
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
