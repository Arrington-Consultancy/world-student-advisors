import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export default function SubSaharanPolicy() {
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
                Sub-Saharan Regional Office<br />
                <span className="text-3xl md:text-4xl">Compliance & Operational Policy</span>
              </h1>
              <p className="text-muted-foreground text-sm">
                Version 1.1 &middot; Last updated: January 2026 &middot; Next review: January 2027
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
              <a href="#ss1" className="hover:text-wsa-navy transition-colors">1. Purpose</a>
              <a href="#ss8" className="hover:text-wsa-navy transition-colors">8. Compliance Framework</a>
              <a href="#ss2" className="hover:text-wsa-navy transition-colors">2. Organisational Structure</a>
              <a href="#ss9" className="hover:text-wsa-navy transition-colors">9. Monitoring & Quality Assurance</a>
              <a href="#ss3" className="hover:text-wsa-navy transition-colors">3. Operational Model</a>
              <a href="#ss10" className="hover:text-wsa-navy transition-colors">10. Physical Presence & Audit</a>
              <a href="#ss4" className="hover:text-wsa-navy transition-colors">4. Application Management</a>
              <a href="#ss11" className="hover:text-wsa-navy transition-colors">11. Partner Engagement</a>
              <a href="#ss5" className="hover:text-wsa-navy transition-colors">5. Visa Guidance & Case Oversight</a>
              <a href="#ss12" className="hover:text-wsa-navy transition-colors">12. Operating Approach</a>
              <a href="#ss6" className="hover:text-wsa-navy transition-colors">6. Staff Competency & Training</a>
              <a href="#ss13" className="hover:text-wsa-navy transition-colors">13. Policy Review</a>
              <a href="#ss7" className="hover:text-wsa-navy transition-colors">7. Process Control & Records</a>
              <a href="#ssA" className="hover:text-wsa-navy transition-colors">Appendix A</a>
            </nav>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="max-w-3xl space-y-14">
            <ScrollReveal>
              <div id="ss1">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">1 &nbsp;Purpose</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>This policy defines the operational structure, management oversight, and compliance controls governing the WorldStudentAdvisors Sub-Saharan Regional Office, based in Nairobi, Kenya.</p>
                  <p>It is intended to provide assurance to university partners and relevant stakeholders that student recruitment activities are conducted in a controlled, transparent, and accountable manner.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss2">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">2 &nbsp;Organisational Structure & Accountability</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors operates a <strong>UK Head Office-led structure</strong>, supported by a Sub-Saharan Regional Office.</p>
                  <div className="grid sm:grid-cols-2 gap-6 mt-4">
                    <div className="bg-wsa-cream/60 border border-border/40 p-5 rounded-sm">
                      <p className="font-medium text-wsa-navy text-sm mb-2">UK Head Office, United Kingdom</p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Governance and compliance oversight</li>
                        <li>Partner contracts and institutional relationships</li>
                        <li>Approval and control of recruitment activity</li>
                        <li>Monitoring of application, visa, and enrolment outcomes</li>
                      </ul>
                    </div>
                    <div className="bg-wsa-cream/60 border border-border/40 p-5 rounded-sm">
                      <p className="font-medium text-wsa-navy text-sm mb-2">Sub-Saharan Regional Office, Nairobi, Kenya</p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Student engagement and advisory activity</li>
                        <li>Application preparation and documentation handling</li>
                        <li>Initial case assessment and preparation</li>
                      </ul>
                    </div>
                  </div>
                  <p>All Regional Office activities are conducted under the direction and authority of the UK Head Office. Responsibility for final decisions and compliance oversight remains with the UK Head Office.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss3">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">3 &nbsp;Operational Model</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors operates a <strong>centralised control model with regional delivery capability</strong>.</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>A verifiable operational presence is maintained in Nairobi, Kenya</li>
                    <li>Student-facing services are delivered across multiple Sub-Saharan African markets</li>
                    <li>Oversight, control, and accountability are maintained by the UK Head Office</li>
                  </ul>
                  <p>This structure ensures consistency of approach while maintaining appropriate local accessibility.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss4">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">4 &nbsp;Application Management & Submission Control</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>All applications supported by WorldStudentAdvisors are managed within a <strong>controlled and standardised process</strong>.</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Applications are prepared through structured counselling and document collection</li>
                    <li>Cases are reviewed against internal criteria prior to submission</li>
                    <li>Submission to partner institutions is undertaken under UK Head Office oversight where required</li>
                  </ul>
                  <p>This approach ensures applications are complete, accurate, and aligned with institutional requirements.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss5">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">5 &nbsp;Visa Guidance & Case Oversight</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors provides structured guidance to students in relation to visa preparation.</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Students are informed of financial and documentation requirements</li>
                    <li>Case preparation is supported by trained staff</li>
                    <li>Cases identified as complex or higher risk are subject to additional internal review</li>
                  </ul>
                  <p>WorldStudentAdvisors does not provide regulated immigration advice but supports students in preparing documentation in line with current requirements. Structured informational resources are provided to improve student preparedness and support informed decision-making.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss6">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">6 &nbsp;Staff Competency & Training</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors maintains defined standards for staff involved in student recruitment.</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Staff are required to operate within structured internal processes and supervision</li>
                    <li>Relevant staff hold, or are working towards, British Council Agent Training certification</li>
                    <li>Ongoing training is provided in UK study requirements, visa processes, and ethical recruitment practice</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss7">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">7 &nbsp;Process Control & Record Keeping</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors utilises a structured case management approach, supported by a centralised CRM system, to ensure control and traceability.</p>
                  <p>Student cases are progressed through defined stages from initial enquiry through to enrolment and post-enrolment outcomes. Key actions, documentation status, and decision points are recorded at each stage. Outcome stages capture visa decisions, enrolment status, and fee payment confirmation, providing a clear and auditable record of each student case.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss8">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">8 &nbsp;Compliance Framework</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors operates in alignment with recognised sector expectations, including:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>UKVI requirements relating to international student recruitment</li>
                    <li>British Council guidance on agent good practice</li>
                    <li>University partner contractual and compliance frameworks</li>
                  </ul>
                  <p>The organisation applies the following principles:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Clear and accurate representation of institutions and courses</li>
                    <li>Documented and traceable student interactions</li>
                    <li>Defined accountability across all stages of the process</li>
                    <li>Appropriate escalation and oversight where required</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss9">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">9 &nbsp;Monitoring & Quality Assurance</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>The UK Head Office undertakes ongoing monitoring of recruitment activity, including:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Internal review of student cases and documentation</li>
                    <li>Monitoring of application progression and outcomes</li>
                    <li>Review of visa and enrolment data</li>
                    <li>Consideration of feedback from students and partners</li>
                  </ul>
                  <p>Findings are used to inform process improvement and maintain standards.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss10">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">10 &nbsp;Physical Presence & Audit Access</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>The Sub-Saharan Regional Office provides:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>A verifiable operational location in Nairobi, Kenya</li>
                    <li>A base for regional coordination and oversight</li>
                    <li>Availability for partner engagement and audit verification where required</li>
                  </ul>
                  <p>The office operates on an appointment-based model, consistent with current sector practice.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss11">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">11 &nbsp;Partner Engagement</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors maintains professional engagement with university partners and stakeholders.</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Communication is managed in a structured and timely manner</li>
                    <li>Requests for information, clarification, or audit are responded to appropriately</li>
                    <li>Recruitment activity is conducted in line with agreed partner expectations</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss12">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">12 &nbsp;Operating Approach</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors adopts an advisory-led approach to student recruitment.</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Students are provided with information and options relevant to their circumstances</li>
                    <li>Decisions are made by the student based on informed choice</li>
                    <li>Recruitment activity is conducted without undue pressure or misrepresentation</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ss13">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">13 &nbsp;Policy Review</h2>
                <p className="text-[16px] text-muted-foreground leading-relaxed">
                  This policy is subject to periodic review to ensure continued alignment with regulatory requirements, university partner expectations, and sector best practice.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div id="ssA">
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">Appendix A: Student Recruitment & Case Management Overview</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors operates a structured process to manage student progression from initial enquiry through to enrolment. All stages are recorded within the centralised CRM system, ensuring consistency, visibility, and auditability across all student cases.</p>
                  <ol className="list-decimal pl-6 space-y-1.5">
                    <li>Initial enquiry and qualification</li>
                    <li>Academic and financial assessment</li>
                    <li>Counselling and option development</li>
                    <li>Document preparation and verification</li>
                    <li>Application submission</li>
                    <li>Offer management</li>
                    <li>Visa preparation and guidance</li>
                    <li>Pre-departure support</li>
                    <li>Enrolment confirmation and outcome tracking</li>
                  </ol>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div className="bg-wsa-cream/60 border border-border/40 p-6 rounded-sm text-[16px] text-muted-foreground leading-relaxed">
                <p className="font-medium text-wsa-navy">Contact</p>
                <p className="mt-2">Email: <a href="mailto:ask@worldstudentadvisors.com" className="text-wsa-red hover:underline">ask@worldstudentadvisors.com</a></p>
                <p className="mt-1"><a href="https://www.worldstudentadvisors.com" className="text-wsa-red hover:underline">www.worldstudentadvisors.com</a></p>
                <p className="mt-4 text-sm">
                  WorldStudentAdvisors Limited &middot; Registered in England and Wales &middot; Company Number: 09532724<br />
                  2 Newport Close, Clevedon, North Somerset, BS21 5DZ, United Kingdom
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
