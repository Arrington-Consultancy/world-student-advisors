import { Link } from "wouter";
import {
  ArrowRight,
  ArrowLeft,
  Download,
  IdCard,
  MessageSquareText,
  GraduationCap,
  Briefcase,
  HeartHandshake,
  Wrench,
  Award,
  CheckCircle2,
  XCircle,
  PlayCircle,
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

/**
 * CV for University Applications — Learning Hub guide.
 *
 * Replaces the brief's mandate to rebuild this resource: the previous
 * "90-Second Advisor" video was a static title-card graphic (no motion,
 * no captions) held for its full 98-second runtime, carrying a script that
 * was almost entirely a WSA sales pitch with no actual CV-writing content.
 * This page delivers the practical teaching content directly and today
 * (the seven sections below), rather than waiting on the video re-shoot.
 *
 * The video slot is deliberately left as an honest "in production" state
 * rather than re-embedding the old file — see the production note in the
 * video panel below. Script and storyboard for the replacement video are
 * tracked separately; this page is built to receive the finished embed
 * once it exists (see the CRIB_SHEET_URL / VIDEO_YOUTUBE_ID constants).
 */

const CRIB_SHEET_URL = "/downloads/cv-university-application-crib-sheet.pdf";

const SECTIONS: {
  icon: typeof IdCard;
  title: string;
  tag?: string;
  points: string[];
}[] = [
  {
    icon: IdCard,
    title: "Personal Details",
    points: ["Name, email, phone number, country", "Keep it professional — no nicknames or casual email addresses"],
  },
  {
    icon: MessageSquareText,
    title: "Personal Profile",
    tag: "4–5 lines",
    points: ["Who you are", "What you want to study", "Your career goal", "Why you're a good fit"],
  },
  {
    icon: GraduationCap,
    title: "Education",
    tag: "Most recent first",
    points: ["Institution and qualification", "Grades — actual or predicted", "Relevant projects or research"],
  },
  {
    icon: Briefcase,
    title: "Work Experience",
    tag: "Include start/end month and year",
    points: ["Don't just list duties — show what you achieved", "Skills you developed", "Responsibilities you held"],
  },
  {
    icon: HeartHandshake,
    title: "Volunteering & Leadership",
    tag: "Universities value students who contribute",
    points: ["Charity work", "Clubs and sports teams", "Student leadership roles"],
  },
  {
    icon: Wrench,
    title: "Skills",
    tag: "Choose skills relevant to your course",
    points: ["Communication, teamwork, leadership", "IT, research, time management"],
  },
  {
    icon: Award,
    title: "Achievements",
    points: ["Awards and scholarships", "Certificates", "Competitions"],
  },
];

const BEFORE_YOU_SUBMIT = [
  "Maximum 2 pages",
  "Easy to read, no spelling mistakes",
  "Professional email address",
  "Tailored to your chosen course",
  "Saved as a PDF",
];

const AVOID_MISTAKES = [
  "Copying someone else's CV",
  "Including irrelevant information",
  "Long paragraphs, poor formatting",
  "Using informal language",
  "Forgetting to proofread",
];

export default function CVUniversityApplication() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-20">
        <div className="container">
          <ScrollReveal>
            <Link href="/learning-hub" className="inline-flex items-center text-sm text-muted-foreground hover:text-wsa-red transition-colors mb-6">
              <ArrowLeft className="mr-1.5" size={14} /> Back to Learning Hub
            </Link>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Application Preparation</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-semibold text-wsa-navy leading-[1.1] mb-6">
                How to Write a University CV That Gets You Noticed
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Your CV is your personal advert — its one job is to answer the question every admissions team is
                asking: <strong className="text-wsa-navy">why should we choose you?</strong> Here are the seven
                sections that matter, presented by Tim Hunt, CEO and Managing Director of WorldStudentAdvisors.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Video — honest production-pending state */}
      <section className="pb-16 lg:pb-20">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-4xl">
              <div className="relative aspect-video bg-wsa-navy overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-wsa-navy to-wsa-navy/85" />
                <div className="relative z-10 text-center px-6 max-w-md">
                  <div className="w-14 h-14 mx-auto mb-5 bg-white/10 border border-white/20 rounded-full flex items-center justify-center">
                    <PlayCircle className="text-white" size={26} aria-hidden="true" />
                  </div>
                  <p className="text-white font-semibold mb-2">New video in production</p>
                  <p className="text-white/70 text-sm leading-relaxed">
                    We're re-filming this guide as a clear, visual walkthrough of the seven sections below. Until
                    it's ready, the full written guide and free checklist give you everything the video will cover.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Presented by Tim Hunt, CEO and Managing Director, WorldStudentAdvisors — 90-Second Advisor series.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* The 7 sections */}
      <section className="pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-4">The 7 essential sections</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15]">
                Build your CV section by section
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-x-10 gap-y-10">
            {SECTIONS.map((section, i) => {
              const Icon = section.icon;
              return (
                <ScrollReveal key={section.title} delay={i * 50}>
                  <div className="flex gap-4">
                    <div className="w-11 h-11 shrink-0 bg-wsa-navy text-white flex items-center justify-center rounded-full">
                      <span className="font-semibold text-sm" aria-hidden="true">{i + 1}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="text-wsa-red" size={18} aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-wsa-navy">{section.title}</h3>
                      </div>
                      {section.tag && (
                        <p className="text-xs font-medium text-wsa-red/80 mb-2">{section.tag}</p>
                      )}
                      <ul className="space-y-1">
                        {section.points.map((point) => (
                          <li key={point} className="text-[15px] text-muted-foreground leading-relaxed">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Before you submit / avoid mistakes */}
      <section className="pb-20 lg:pb-28 bg-wsa-cream">
        <div className="container pt-16 lg:pt-20">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
            <ScrollReveal>
              <div className="bg-white border border-border/40 p-6 lg:p-8 h-full">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-wsa-navy mb-4">
                  <CheckCircle2 className="text-green-700" size={20} aria-hidden="true" /> Before you submit
                </h3>
                <ul className="space-y-2">
                  {BEFORE_YOU_SUBMIT.map((item) => (
                    <li key={item} className="text-[15px] text-muted-foreground leading-relaxed flex items-start gap-2">
                      <span className="text-green-700 mt-1" aria-hidden="true">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={60}>
              <div className="bg-white border border-border/40 p-6 lg:p-8 h-full">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-wsa-navy mb-4">
                  <XCircle className="text-wsa-red" size={20} aria-hidden="true" /> Avoid these mistakes
                </h3>
                <ul className="space-y-2">
                  {AVOID_MISTAKES.map((item) => (
                    <li key={item} className="text-[15px] text-muted-foreground leading-relaxed flex items-start gap-2">
                      <span className="text-wsa-red mt-1" aria-hidden="true">&#10007;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Remember */}
      <section className="py-20 lg:py-28 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Remember</p>
              <p className="text-2xl md:text-3xl font-semibold text-white leading-[1.35]">
                A good university CV doesn't just tell universities what you've done.
                <br className="hidden md:block" /> It shows them the student you have the potential to become.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Crib sheet download */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center border border-border/40 p-10 lg:p-14">
              <div className="w-14 h-14 mx-auto mb-6 bg-wsa-red/10 flex items-center justify-center">
                <Download className="text-wsa-red" size={24} aria-hidden="true" />
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-wsa-navy leading-[1.15] mb-4">
                Get the free CV checklist
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto">
                All seven sections, the before-you-submit checklist, and the common mistakes to avoid — as a
                one-page PDF you can keep open while you write.
              </p>
              <a
                href={CRIB_SHEET_URL}
                download
                className="inline-flex items-center px-8 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
              >
                Download the checklist (PDF)
                <Download className="ml-3" size={18} aria-hidden="true" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Want a second pair of eyes on your CV?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10">
                Apply today and a named Student Counsellor will be in touch within 48 hours — free, no obligation.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center px-10 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="ml-3" size={20} aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
