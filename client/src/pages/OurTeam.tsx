import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Mail, Phone, ExternalLink, FileText } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { WSA_TEAM, SUPPORT_JOURNEY, whatsappLink, type TeamMember } from "@/lib/team";

/**
 * OUR TEAM, restructured on 14 September 2026 to the approved implementation
 * direction (`16_WEBSITE_Ai/06 Counsellors/
 * WSA_OUR_TEAM_Page_Implementation_Direction_14_Sep_2026.md`), replacing the
 * country-sectioned counsellors page at /counsellors, which now 301s here.
 *
 * One WSA team in the approved organisational order, no country headings, and
 * a separate student journey that starts with Claudia. The people records,
 * including the regional representatives this page no longer lists publicly,
 * live in @/lib/team.
 */

/** The blue British Council mark. Text-free by design: the graphic that reads
 * "Certified Agent" is never used, because every certificate states the
 * British Council does not endorse, accredit or validate agents. */
const BRITISH_COUNCIL_MARK = "/manus-storage/british_council_badge_694f3fc2.png";

function ContactLinks({ person, size = "sm" }: { person: TeamMember; size?: "sm" | "md" }) {
  const text = size === "md" ? "text-sm" : "text-xs";
  const icon = size === "md" ? 14 : 11;
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-2 ${text}`}>
      <a
        href={`mailto:${person.email}`}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-wsa-navy transition-colors"
      >
        <Mail size={icon} />
        Email
      </a>
      {person.phoneKind === "whatsapp" && (
        <a
          href={whatsappLink(person.phone)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-green-600 transition-colors"
        >
          <Phone size={icon} />
          WhatsApp
        </a>
      )}
      {person.phoneKind === "telephone" && (
        <a
          href={`tel:${person.phone.replace(/[^0-9+]/g, "")}`}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-wsa-navy transition-colors"
        >
          <Phone size={icon} />
          {size === "md" ? person.phone : "Telephone"}
        </a>
      )}
    </div>
  );
}

/** The badge only ever appears for a current certificate holder. Where that
 * person has also consented to their certificate being published, it becomes
 * a link that says so; where they have not, it stays a plain mark. */
function BritishCouncilBadge({ person }: { person: TeamMember }) {
  if (!person.britishCouncil) return null;
  const label = `${person.name} holds a current British Council UK knowledge agent and counsellor training certificate`;
  if (!person.certificate) {
    return (
      <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm" title={label}>
        <img src={BRITISH_COUNCIL_MARK} alt={label} className="w-6 h-6" />
      </span>
    );
  }
  return (
    <a
      href={person.certificate}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      title={`${label}. Opens the certificate.`}
      aria-label={`View ${person.name}'s British Council certificate`}
      className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm hover:bg-white transition-colors"
    >
      <img src={BRITISH_COUNCIL_MARK} alt={label} className="w-6 h-6" />
    </a>
  );
}

function ProfileDialog({ person, onClose }: { person: TeamMember | null; onClose: () => void }) {
  return (
    <Dialog open={person !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {person && (
          <div className="grid sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] gap-0">
            <div className="bg-wsa-cream">
              {/* A banner on phones so the biography is not pushed off-screen,
                  and a full-height column once there is room beside it. */}
              <img
                src={person.photo}
                alt={person.name}
                className="w-full h-56 sm:h-full sm:min-h-[22rem] object-cover object-top"
              />
            </div>
            <div className="p-6 sm:p-8 min-w-0">
              <DialogTitle className="text-2xl font-semibold text-wsa-navy mb-1">{person.name}</DialogTitle>
              <DialogDescription className="text-wsa-red/90 text-base mb-1">{person.role}</DialogDescription>
              <p className="text-sm text-muted-foreground mb-5">{person.roleAtWsa}</p>

              {person.britishCouncil && (
                <div className="flex items-start gap-3 border border-border/40 bg-wsa-cream/50 p-4 mb-6">
                  <img src={BRITISH_COUNCIL_MARK} alt="" className="w-8 h-8 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-wsa-navy">British Council UK knowledge-trained</p>
                    {person.certificate ? (
                      <a
                        href={person.certificate}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-wsa-red hover:underline mt-1"
                      >
                        <FileText size={13} />
                        View certificate
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        Certificate held by WSA and available on request.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 text-[15px] text-muted-foreground leading-relaxed">
                {person.biography.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-border/40">
                <ContactLinks person={person} size="md" />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function OurTeam() {
  const [selected, setSelected] = useState<TeamMember | null>(null);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Meet the WSA team</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                The people behind WSA
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                At <strong>World</strong><em>Student</em>Advisors, our strength lies in our people. Our UK Head Office and Sub-Saharan Africa Regional Office work together as one team, supporting students from their first enquiry through application, visa preparation and enrolment.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* British Council */}
      <section className="py-12 bg-wsa-cream border-y border-border/30">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 justify-center">
              <img
                src={BRITISH_COUNCIL_MARK}
                alt="British Council UK knowledge-trained counsellors"
                className="h-16 w-auto"
              />
              <div className="text-center sm:text-left">
                <p className="text-lg font-semibold text-wsa-navy">British Council UK knowledge-trained counsellors</p>
                <p className="text-sm text-muted-foreground">Supporting students with trusted international education guidance since 2012.</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* The three WSA principles */}
      <section className="py-20 lg:py-24">
        <div className="container">
          <ScrollReveal>
            <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
              {[
                { title: "Named and accountable", text: "Your assigned counsellor has a name, a face, and a direct line. Once matched, you'll always know exactly who to contact." },
                { title: "Qualified and trained", text: "Our Student Counsellors support students through international admissions, student visa preparation and the wider student journey." },
                { title: "Ethical and honest", text: "Your counsellor recommends what's right for you, not what pays the highest commission. If studying abroad isn't the right choice, they'll say so." },
              ].map((item, i) => (
                <ScrollReveal key={item.title} delay={i * 80}>
                  <div>
                    <h3 className="text-lg font-semibold text-wsa-navy mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-[15px]">{item.text}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* One WSA team */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16 lg:mb-20">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Our team</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                One team behind every student
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Select any name to read their own words, see what they do at WSA and contact them directly.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-6">
            {WSA_TEAM.map((person, i) => (
              <ScrollReveal key={person.slug} delay={i * 50} className="h-full">
                <div className="bg-white border border-border/30 overflow-hidden group h-full flex flex-col min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelected(person)}
                    aria-label={`Read ${person.name}'s profile`}
                    className="block w-full text-left aspect-[3/4] overflow-hidden bg-gray-100 relative cursor-pointer"
                  >
                    <img
                      src={person.photo}
                      alt={person.name}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <BritishCouncilBadge person={person} />
                  </button>
                  <div className="p-5 flex flex-col flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelected(person)}
                      className="text-left text-base font-semibold text-wsa-navy mb-0.5 hover:text-wsa-red transition-colors"
                    >
                      {person.name}
                    </button>
                    <p className="text-sm text-wsa-red/80 mb-2">{person.role}</p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{person.roleAtWsa}</p>
                    <div className="mt-auto pt-3 border-t border-border/30 flex flex-col gap-3">
                      <ContactLinks person={person} />
                      <button
                        type="button"
                        onClick={() => setSelected(person)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-wsa-navy hover:text-wsa-red transition-colors self-start"
                      >
                        Read profile
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How we support you */}
      <section className="py-28 lg:py-40 bg-wsa-navy text-white">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">How we support you</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15] mb-5">
                From your first message to your first day
              </h2>
              <p className="text-lg text-white/60 leading-relaxed">
                Every student follows the same path through WSA, and you always know whose hands you are in.
              </p>
            </div>
          </ScrollReveal>
          <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
            {SUPPORT_JOURNEY.map((stage, i) => (
              <ScrollReveal key={stage.step} delay={i * 60}>
                <li className="border-l-2 border-wsa-red/40 pl-6 list-none">
                  <p className="text-xs font-medium tracking-[0.2em] uppercase text-wsa-red mb-2">Step {i + 1}</p>
                  <h3 className="text-lg font-semibold text-white mb-2">{stage.step}</h3>
                  <p className="text-white/50 leading-relaxed text-[15px]">{stage.text}</p>
                </li>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </section>

      {/* What your counsellor does for you */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Your counsellor</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15]">
                What your counsellor does for you
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 max-w-4xl">
            {[
              { title: "Listens first", text: "Before recommending anything, your counsellor takes time to understand your academic background, career goals, budget, and family circumstances." },
              { title: "Explores options honestly", text: "They present a range of suitable destinations, courses, and institutions, explaining the trade-offs clearly so you can make an informed decision." },
              { title: "Guides applications", text: "Step-by-step support with personal statements, documents, references, and deadlines. Everything is reviewed before submission." },
              { title: "Supports through to arrival", text: "Visa applications, accommodation, pre-departure preparation, and ongoing support after you arrive. They don't disappear once you've enrolled." },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 80}>
                <div className="border-l-2 border-wsa-red/40 pl-6">
                  <h3 className="text-lg font-semibold text-wsa-navy mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">{item.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <div className="mt-16 text-center">
              <p className="text-sm text-muted-foreground">
                We support students in <span className="font-medium text-wsa-navy">Kenya, Nigeria, Ghana, Zambia, Malawi, Zimbabwe,</span> and <span className="font-medium text-wsa-navy">Angola</span>.{" "}
                <Link href="/contact" className="text-wsa-red hover:underline">See our office contact details</Link>.
              </p>
            </div>
          </ScrollReveal>

          {/* Google Reviews — genuine reviews on Google, no content reproduced here */}
          <ScrollReveal>
            <div className="mt-16 border border-border/40 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 bg-wsa-cream/40">
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-wsa-navy mb-2">What students say about us</h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed max-w-xl">
                  Read genuine, independent reviews from students and families on our Google profile, or leave one of your own after working with your counsellor.
                </p>
              </div>
              <a
                href="https://www.google.com/search?kgmid=/g/11dyn90b42&hl=en-GB&q=World+Student+Advisors#lrd=/g/11dyn90b42,1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-4 bg-wsa-navy text-white font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-navy/90 active:scale-[0.98] shrink-0"
              >
                Read our Google Reviews
                <ExternalLink className="ml-2.5" size={16} />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* For parents */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">For parents</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-8">
                  You'll always know who is supporting your child
                </h2>
                <div className="space-y-5 text-[17px] text-muted-foreground leading-relaxed">
                  <p>
                    We understand that sending your child abroad is one of the most significant decisions your family will make. You need to know that someone trustworthy is guiding them.
                  </p>
                  <p>
                    Your child's counsellor is available to you directly, by phone, email, or WhatsApp, at every stage. You'll know their name, their qualifications, and exactly what's happening with your child's application.
                  </p>
                  <p className="text-wsa-navy font-medium">
                    You're never left wondering. You're never left out.
                  </p>
                </div>
              </div>
              <img
                src="/manus-storage/wsa_counsellors_banner_948050db.jpg"
                alt="WSA counsellors with students"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Your counsellor is ready when you are
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10">
                Apply today and a named counsellor will contact you within 48 hours. No fees. No obligation. Just a conversation about your future.
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

      <ProfileDialog person={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
