import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export default function CodeOfConduct() {
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
                Code of Conduct
              </h1>
              <p className="text-muted-foreground text-sm">
                Version 1.0 &middot; Last updated: January 2026 &middot; Next review: January 2027
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
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">1 &nbsp;Purpose</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>This Code of Conduct defines the standards of behaviour expected of all individuals representing WorldStudentAdvisors.</p>
                  <p>It provides a framework to ensure that all activities are carried out with integrity, professionalism, and in alignment with regulatory and partner expectations.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">2 &nbsp;Scope</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>This Code applies to:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>The Managing Director</li>
                    <li>All employees, consultants, and contractors</li>
                    <li>Overseas representatives, agents, sub-agents, and referral partners</li>
                    <li>Any third party acting on behalf of WorldStudentAdvisors</li>
                  </ul>
                  <p>This Code applies to all WorldStudentAdvisors activities in the United Kingdom and internationally.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">3 &nbsp;Operating Principles</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors operates in accordance with the principles of transparency, integrity, and accountability, underpinned by an advisory-led approach to student engagement.</p>
                  <p>WorldStudentAdvisors adopts the principle of <strong>Extreme Trust</strong>, meaning that relationships with students, partners, and colleagues are based on:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Clear and honest communication</li>
                    <li>Consistent and reliable conduct</li>
                    <li>Appropriate sharing of information to support informed decision-making</li>
                  </ul>
                  <p>This approach is aligned with the British Council National Code of Ethical Practice for UK Education Agents and recognised sector expectations for ethical international student recruitment.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">4 &nbsp;Standards of Conduct</h2>
                <div className="space-y-6 text-[16px] text-muted-foreground leading-relaxed">
                  <div>
                    <h3 className="text-base font-semibold text-wsa-navy mb-2">4.1 Integrity and Honesty</h3>
                    <ul className="list-disc pl-6 space-y-1.5">
                      <li>Act honestly and fairly in all professional dealings</li>
                      <li>Provide accurate and complete information</li>
                      <li>Avoid any form of misrepresentation</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-wsa-navy mb-2">4.2 Objectivity and Professional Competence</h3>
                    <ul className="list-disc pl-6 space-y-1.5">
                      <li>Exercise professional judgement without bias or undue influence</li>
                      <li>Avoid conflicts of interest, or declare them where they arise</li>
                      <li>Maintain up-to-date knowledge of study options, processes, and requirements</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-wsa-navy mb-2">4.3 Transparency and Confidentiality</h3>
                    <ul className="list-disc pl-6 space-y-1.5">
                      <li>Communicate services, processes, and expectations clearly</li>
                      <li>Disclose any relevant relationships or potential conflicts</li>
                      <li>Always protect personal data and confidential information</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-wsa-navy mb-2">4.4 Professional Behaviour</h3>
                    <ul className="list-disc pl-6 space-y-1.5">
                      <li>Comply with applicable laws, regulations, and partner requirements</li>
                      <li>Conduct themselves in a professional and respectful manner</li>
                      <li>Avoid behaviour that could bring WorldStudentAdvisors or its partners into disrepute</li>
                    </ul>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">5 &nbsp;Student Engagement</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors adopts a structured, advisory-led approach to student support. Representatives are expected to:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Provide clear explanations of study options, pathways, and processes</li>
                    <li>Offer advice aligned with the student's academic and financial circumstances</li>
                    <li>Avoid undue pressure or sales-led behaviour</li>
                    <li>Support students in making informed decisions</li>
                  </ul>
                  <p>Where appropriate, engagement may continue beyond placement to support transition and enrolment.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">6 &nbsp;Internal Collaboration</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors promotes a coordinated and consistent approach to student support. Representatives are expected to:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Share relevant information to support case management</li>
                    <li>Communicate clearly and professionally with colleagues</li>
                    <li>Provide support on complex or high-risk cases where required</li>
                    <li>Maintain consistency in the advice provided to students</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">7 &nbsp;Compliance & Accountability</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>All individuals operating under the WorldStudentAdvisors name are responsible for:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Complying with this Code of Conduct</li>
                    <li>Acting in accordance with WorldStudentAdvisors policies and procedures</li>
                    <li>Reporting concerns or breaches where identified</li>
                  </ul>
                  <p>Failure to comply with this Code may result in disciplinary action or termination of contractual relationships.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">8 &nbsp;Monitoring & Review</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>WorldStudentAdvisors monitors adherence to this Code through:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Ongoing oversight of student interactions and case handling</li>
                    <li>Feedback from students and partners</li>
                    <li>Internal review processes</li>
                  </ul>
                  <p>This Code is reviewed periodically to ensure alignment with regulatory requirements, university partner expectations, and sector best practice.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">9 &nbsp;Publication</h2>
                <p className="text-[16px] text-muted-foreground leading-relaxed">
                  This Code of Conduct is published on the WorldStudentAdvisors website and may be provided to university partners, auditors, or regulatory bodies upon request.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
