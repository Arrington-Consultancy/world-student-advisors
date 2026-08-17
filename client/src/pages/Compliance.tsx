import { Link } from "wouter";
import { Shield, FileText, Users, Globe, Lock, ShieldCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const policies = [
  {
    title: "Privacy Policy",
    description: "How we collect, use, and protect your personal data under UK GDPR and the Data Protection Act 2018.",
    href: "/privacy-policy",
    icon: Lock,
    version: "v1.0, January 2026",
  },
  {
    title: "Code of Conduct",
    description: "Standards of behaviour expected of all individuals representing WorldStudentAdvisors.",
    href: "/code-of-conduct",
    icon: Users,
    version: "v1.0, January 2026",
  },
  {
    title: "Anti-Bribery & Anti-Corruption Policy",
    description: "Zero-tolerance approach to bribery and corruption in all forms, aligned with the UK Bribery Act 2010.",
    href: "/anti-bribery-and-anti-corruption-policy",
    icon: Shield,
    version: "v1.1, January 2026",
  },
  {
    title: "Data Protection Consent",
    description: "The consent statement used on our sign-up and enquiry forms, explaining how we collect and use your data.",
    href: "/data-protection-consent",
    icon: FileText,
    version: "April 2026",
  },
  {
    title: "Sub-Saharan Regional Office Policy",
    description: "Operational structure, management oversight, and compliance controls for our Nairobi-based regional office.",
    href: "/sub-saharan-regional-office-policy",
    icon: Globe,
    version: "v1.1, January 2026",
  },
  {
    title: "Vavita Due Diligence Review",
    description: "WorldStudentAdvisors' due diligence review before introducing Vavita to students and families.",
    href: "/DDVavita",
    icon: ShieldCheck,
    version: "August 2026",
  },
];

export default function Compliance() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-20">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Governance</p>
              <h1 className="text-4xl md:text-5xl font-semibold text-wsa-navy leading-[1.1] mb-6">
                Compliance & Policies
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                WorldStudentAdvisors maintains a structured compliance framework aligned with UK legislation, British Council standards, and university partner expectations. Our policies are published here for transparency and are available to partners, auditors, and regulatory bodies upon request.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Policy Cards */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <div className="max-w-4xl space-y-4">
            {policies.map((policy, i) => (
              <ScrollReveal key={policy.href} delay={i * 80}>
                <Link href={policy.href}>
                  <div className="group flex items-start gap-5 p-6 lg:p-8 border border-border/60 rounded-sm hover:border-wsa-red/30 hover:bg-wsa-cream/30 transition-all duration-200 cursor-pointer">
                    <div className="flex-shrink-0 w-10 h-10 rounded-sm bg-wsa-navy/5 flex items-center justify-center group-hover:bg-wsa-red/10 transition-colors">
                      <policy.icon size={18} className="text-wsa-navy/60 group-hover:text-wsa-red transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-wsa-navy group-hover:text-wsa-red transition-colors mb-1">
                        {policy.title}
                      </h2>
                      <p className="text-[15px] text-muted-foreground leading-relaxed mb-2">
                        {policy.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70">{policy.version}</p>
                    </div>
                    <div className="flex-shrink-0 text-muted-foreground/40 group-hover:text-wsa-red transition-colors mt-1">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>

          {/* Note about additional policies */}
          <div className="max-w-4xl mt-12">
            <ScrollReveal>
              <div className="bg-wsa-cream/50 border border-border/40 p-6 rounded-sm">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-wsa-navy">Additional policies</strong>: Complaints Procedure, Safeguarding Policy, and Terms & Conditions are currently under review and will be published here once finalised. For enquiries about any of these documents, please contact <a href="mailto:ask@worldstudentadvisors.com" className="text-wsa-red hover:underline">ask@worldstudentadvisors.com</a>.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
