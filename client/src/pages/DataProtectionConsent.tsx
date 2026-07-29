import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export default function DataProtectionConsent() {
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
                Data Protection Consent
              </h1>
              <p className="text-muted-foreground text-sm">
                Last updated: April 2026 &middot; Next review: on request
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
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">1 &nbsp;About This Statement</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>This page sets out the data protection consent statement used on the WorldStudentAdvisors sign-up and enquiry forms. It explains how we collect and use your personal data, and confirms the legal basis on which we process it.</p>
                  <p>This statement is displayed at the point of data collection and must be actively confirmed by the individual before submitting their details.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">2 &nbsp;Consent Statement</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>The following consent statement appears on our sign-up and enquiry forms:</p>
                  <div className="bg-wsa-cream/60 border border-border/40 p-6 rounded-sm">
                    <p className="font-medium text-wsa-navy mb-2">Data Protection Consent (Required)</p>
                    <p className="flex items-start gap-2">
                      <span className="mt-0.5">☐</span>
                      <span>I consent to WorldStudentAdvisors processing my personal data for the purpose of providing application and visa counselling services, in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</span>
                    </p>
                  </div>
                  <p>This field is marked as required. Individuals may not submit the form without providing their consent.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">3 &nbsp;What Data We Collect</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>When you complete our sign-up or enquiry form, we may collect:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Your name and contact details (email address, phone number)</li>
                    <li>Your country of residence and nationality</li>
                    <li>Your study interests, academic background, and intended level of study</li>
                    <li>Any additional information you choose to provide</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">4 &nbsp;How We Use Your Data</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>Your data is used solely for the purpose of providing you with personalised guidance, including:</p>
                  <ul className="list-disc pl-6 space-y-1.5">
                    <li>Responding to your enquiry</li>
                    <li>Providing study and application advice relevant to your circumstances</li>
                    <li>Supporting you through application, visa, and enrolment processes</li>
                    <li>Communicating relevant updates and information</li>
                  </ul>
                  <p>Your data will not be sold or shared with third parties for marketing purposes.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">5 &nbsp;Your Rights</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>You have the right to withdraw your consent at any time, and to access, correct, or request deletion of your personal data. To exercise any of these rights, please contact us using the details below.</p>
                  <p>For full details of how we handle your personal data, please read our <Link href="/privacy-policy" className="text-wsa-red hover:underline">Privacy Policy</Link>.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4">6 &nbsp;Contact</h2>
                <div className="space-y-4 text-[16px] text-muted-foreground leading-relaxed">
                  <p>Data protection enquiries, including requests to withdraw consent or exercise your data rights, should be directed to:</p>
                  <div className="bg-wsa-cream/60 border border-border/40 p-6 rounded-sm">
                    <p className="font-medium text-wsa-navy">Tim Hunt, Managing Director / Data Protection Manager</p>
                    <p className="mt-2">Email: <a href="mailto:gdpr@worldstudentadvisors.com" className="text-wsa-red hover:underline">gdpr@worldstudentadvisors.com</a></p>
                    <p className="mt-1">Email: <a href="mailto:tim.hunt@worldstudentadvisors.com" className="text-wsa-red hover:underline">tim.hunt@worldstudentadvisors.com</a></p>
                    <p className="mt-4 text-sm text-muted-foreground">
                      WorldStudentAdvisors Limited &middot; Registered in England and Wales &middot; Company Number: 09532724<br />
                      2 Newport Close, Clevedon, North Somerset, BS21 5DZ, United Kingdom<br />
                      Tel: +44 791 4797 830 &middot; <a href="mailto:ask@worldstudentadvisors.com" className="text-wsa-red hover:underline">ask@worldstudentadvisors.com</a> &middot; <a href="https://www.worldstudentadvisors.com" className="text-wsa-red hover:underline">www.worldstudentadvisors.com</a>
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
