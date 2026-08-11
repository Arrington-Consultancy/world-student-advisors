import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Download, ExternalLink, Play } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

/**
 * UK Student Visa Webinar landing page
 * Route: /WebUKVisa
 * Expected production URL: https://www.worldstudentadvisors.com/WebUKVisa
 *
 * This exact URL is encoded in campaign QR artwork — do not change.
 *
 * CTAs:
 *  1. REGISTER FOR THE FREE WEBINAR → Google Form (external, new tab)
 *  2. DOWNLOAD THE FREE VISA SUMMARY → /downloads/uk-student-visa-summary-2026-27.pdf
 *  3. START YOUR APPLICATION → /contact
 *
 * Podcast embed: YouTube video ID -l-HNsIcqUY (do not substitute the older visa ID)
 *
 * Note: No analytics library is currently implemented in this app.
 * When one is added, hook the four CTA clicks below:
 *   - webinar_register_click
 *   - podcast_watch_click
 *   - visa_summary_download_click
 *   - start_application_click
 */

const WEBINAR_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSef6LohZ-KU5ZBf0Hbyc6q-QGn3C4nzdgqEMufzLxsJKKJHYg/viewform?pli=1";
const PODCAST_YOUTUBE_ID = "-l-HNsIcqUY";
const VISA_SUMMARY_PDF = "/downloads/uk-student-visa-summary-2026-27.pdf";

const coverTopics = [
  "The 28-day bank statement rule",
  "How much money you need to show",
  "What happens before your university issues your CAS",
  "Why your immigration and visa refusal history matters",
  "The Immigration Health Surcharge",
  "TB testing requirements",
  "Credibility interviews and how to prepare",
  "Common mistakes that can delay or damage a visa application",
];

export default function WebUKVisa() {
  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-6">
                Free UK Student Visa Webinar
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white leading-[1.15] mb-6">
                Planning to study in the UK in 2026–27?
              </h1>
              <p className="text-lg sm:text-xl text-white/70 leading-relaxed mb-8 max-w-2xl mx-auto">
                Join WorldStudentAdvisors for a practical live webinar explaining the key steps towards
                a successful UK Student Visa application.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
                <span className="text-white/80 font-medium">Thursday 20 August 2026</span>
                <span className="hidden sm:block text-white/30">·</span>
                <span className="text-white/60 text-sm">
                  Presented by Tim Hunt — Managing Director, WorldStudentAdvisors
                </span>
              </div>
              <a
                href={WEBINAR_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-wsa-red text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                aria-label="Register for the free UK Student Visa webinar (opens in new tab)"
              >
                Register for the free webinar
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── WHAT WE WILL COVER ── */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                What we will cover
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Everything you need to know about your UK Student Visa
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10">
                A successful visa application starts long before you submit your application to UKVI.
                During this webinar we will explain:
              </p>
              <ul className="space-y-4 mb-8" role="list">
                {coverTopics.map((topic) => (
                  <li key={topic} className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="text-wsa-red mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-wsa-navy leading-snug">{topic}</span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                There will also be an opportunity to ask questions.
              </p>
              <div className="mt-10">
                <a
                  href={WEBINAR_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-wsa-red text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                  aria-label="Register for the free UK Student Visa webinar (opens in new tab)"
                >
                  Register for the free webinar
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── PODCAST / VIDEO SECTION ── */}
      <section className="py-20 lg:py-28 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                Watch before the webinar
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-3">
                UK Student Visa Guide 2026–27
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Watch our practical guide to preparing for your UK Student Visa.
              </p>
              {/* Responsive 16:9 embed */}
              <div
                className="relative w-full bg-wsa-navy/10 mb-8 overflow-hidden"
                style={{ paddingBottom: "56.25%" }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${PODCAST_YOUTUBE_ID}`}
                  title="UK Student Visa Guide 2026–27 — WorldStudentAdvisors"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              <a
                href={`https://youtu.be/${PODCAST_YOUTUBE_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 border border-wsa-navy/20 text-wsa-navy text-sm font-semibold tracking-wide transition-colors hover:border-wsa-red hover:text-wsa-red"
                aria-label="Watch the UK Student Visa Guide on YouTube (opens in new tab)"
              >
                <Play size={16} aria-hidden="true" />
                Watch the UK Student Visa Guide
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── PDF DOWNLOAD SECTION ── */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                Free resource
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Download the podcast summary
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10">
                We have also prepared a simple UK Student Visa Summary covering the main points from the
                podcast. Keep it with you as you prepare your application and use it as a reference
                throughout the process.
              </p>
              <a
                href={VISA_SUMMARY_PDF}
                download="uk-student-visa-summary-2026-27.pdf"
                className="inline-flex items-center gap-2 px-8 py-4 bg-wsa-navy text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-navy/90 active:scale-[0.98]"
                aria-label="Download the free UK Student Visa Summary PDF"
              >
                <Download size={16} aria-hidden="true" />
                Download the free visa summary
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FULL WSA REGISTRATION ── */}
      <section className="py-20 lg:py-28 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">
                Full WSA support
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                Want WSA to help with your application?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                World Student Advisors provides one-to-one support from your first university enquiry
                through application, offer, CAS, visa preparation and enrolment. Our student counselling
                and university application service is free to students.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-10">
                Complete the short form and a WSA Student Counsellor will contact you within 24 hours.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-wsa-red text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                aria-label="Start your application with World Student Advisors"
              >
                Start your application
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CLOSING ── */}
      <section className="py-20 lg:py-28 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-xl mx-auto text-center">
              <p className="text-sm font-medium tracking-[0.25em] uppercase text-wsa-red mb-4">
                Your future is our mission
              </p>
              <p className="text-2xl md:text-3xl font-semibold text-white mb-4">
                WorldStudentAdvisors
              </p>
              <p className="text-white/60 leading-relaxed">
                Personal guidance. Real people. Support from application to enrolment.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
