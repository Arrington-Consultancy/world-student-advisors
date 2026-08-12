import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { useState, useEffect, useCallback, useMemo } from "react";

/**
 * WSA Homepage. Emotional Refinement
 *
 * Design philosophy: "The Apple of international education"
 *. Premium, calm, confident, human, personal, trustworthy, distinctive.
 *
 * Key changes from previous version:
 * 1. Tim's real photograph is now central to the experience
 * 2. Video section moved higher (after counsellor) with premium thumbnail treatment
 * 3. CTA hierarchy: Explore → Speak to a counsellor → Get Started
 * 4. One named counsellor placeholder added (clearly labelled)
 * 5. Destinations connected back to personal guidance
 * 6. Trust signals woven into relevant sections, not just a strip
 * 7. Warmer tone throughout, personal, not institutional
 * 8. No invented content, all verified or clearly labelled as placeholder
 */

export default function Home() {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const heroSlides = useMemo(
    () => [
      {
        image: "/manus-storage/hero_1_university_abroad_student_bb3c5236.jpg",
        alt: "Student planning her university application abroad",
        objectPosition: "78% 50%",
        headline: [
          { text: "Study at a Leading University " },
          { text: "Abroad", emphasis: true },
        ],
        body: "Free personal admissions support for universities in the UK, Europe, Canada and the USA",
      },
      {
        image: "/manus-storage/hero_2_counsellor_meeting_3eeb6857.jpg",
        alt: "Student Counsellor meeting one-to-one with a student",
        objectPosition: "74% 50%",
        headline: [
          { text: "Feel the " },
          { text: "Personal", emphasis: true },
          { text: " Touch" },
        ],
        body: "Your own UK Certified Counsellor, supporting you from your first enquiry to enrolment",
      },
      {
        image: "/manus-storage/hero_3_student_visa_airport_76ff2b35.jpg",
        alt: "Student departing for university, family waving her off at the airport",
        objectPosition: "78% 50%",
        headline: [
          { text: "Be Ready for Your Student " },
          { text: "Visa", emphasis: true },
        ],
        body: "AI supported Interview Readiness Coaching and real person mock interviews build your confidence",
      },
      {
        image: "/manus-storage/hero_4_graduate_campus_ed3bb15a.jpg",
        alt: "Graduate in gown standing on a university campus",
        objectPosition: "78% 50%",
        headline: [
          { text: "Your", emphasis: true },
          { text: " Success is Our Success" },
        ],
        body: "We get to know you, understand your ambitions and help you make the right choices for your future",
      },
      {
        image: "/manus-storage/hero_5_graduation_group_efd5c019.jpg",
        alt: "Group of graduates celebrating together",
        objectPosition: "68% 50%",
        headline: [
          { text: "Your Ambition Your " },
          { text: "Achievement", emphasis: true },
        ],
        body: "From your first application to graduation, WSA is with you on your student journey",
      },
    ],
    []
  );

  const slideCount = heroSlides.length;

  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const prevSlide = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <div className="min-h-screen">

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: THE PROMISE
         Hero: five-slide rotating carousel. Clean light layout —
         real HTML headline/body/CTAs on the left, photography on the
         right. No text baked into the images.
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white" aria-roledescription="carousel" aria-label="World Student Advisors introduction">
        <div className="container pt-28 pb-12 md:py-24 lg:py-28">
          <div className="grid md:grid-cols-2 gap-10 md:gap-10 lg:gap-16 items-center">
            {/* Text column */}
            <div className="relative order-2 md:order-1">
              {heroSlides.map((slide, i) => (
                <div
                  key={i}
                  className={`transition-all duration-700 ease-out ${
                    i === activeSlide
                      ? "opacity-100 translate-y-0 relative"
                      : "opacity-0 translate-y-4 absolute inset-0 pointer-events-none"
                  }`}
                  aria-hidden={i === activeSlide ? undefined : true}
                >
                  <h1 className="text-[1.75rem] sm:text-4xl md:text-[2.5rem] lg:text-5xl font-semibold leading-[1.15] text-wsa-navy mb-5">
                    {slide.headline.map((part, p) =>
                      part.emphasis ? (
                        <span key={p} className="text-wsa-red">
                          {part.text}
                        </span>
                      ) : (
                        <span key={p}>{part.text}</span>
                      )
                    )}
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
                    {slide.body}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      href="/counsellors"
                      className="inline-flex items-center justify-center px-7 py-4 border-2 border-wsa-navy text-wsa-navy text-[15px] font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-navy hover:text-white active:scale-[0.98]"
                    >
                      Talk to a Counsellor
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex items-center justify-center px-7 py-4 bg-wsa-red text-white text-[15px] font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                    >
                      Start Your Application
                      <ArrowRight className="ml-2.5" size={18} />
                    </Link>
                  </div>
                </div>
              ))}

              {/* Slide controls: previous/next + indicators */}
              <div className="flex items-center gap-4 mt-10 md:mt-12">
                <button
                  type="button"
                  onClick={prevSlide}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-border text-wsa-navy hover:bg-slate-50 transition-colors"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex gap-2.5">
                  {heroSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === activeSlide ? "w-8 bg-wsa-red" : "w-2 bg-wsa-navy/20 hover:bg-wsa-navy/40"
                      }`}
                      aria-label={`Go to slide ${i + 1} of ${slideCount}`}
                      aria-current={i === activeSlide}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-border text-wsa-navy hover:bg-slate-50 transition-colors"
                  aria-label="Next slide"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Image column */}
            <div className="relative order-1 md:order-2 w-full aspect-[16/11] overflow-hidden bg-slate-50">
              {heroSlides.map((slide, i) => (
                <img
                  key={i}
                  src={slide.image}
                  alt={slide.alt}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out ${
                    i === activeSlide ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ objectPosition: slide.objectPosition }}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
                  aria-hidden={i === activeSlide ? undefined : true}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

     {/* ═══════════════════════════════════════════════════════════════
         SECTION 2: CAN I TRUST THEM?
        Trust signals, kept but refined. British Council prominent.
        Tim's name woven in naturally ("Founded by Tim Hunt in 2012").
    ═══════════════════════════════════════════════════════════════ */}
     <section className="py-6 lg:py-8 border-b border-border/30 bg-slate-50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-4">
            {[
              "British Council Certified Agency",
              "Dedicated Student Counsellor",
              "No fees to students or families",
             "Application and visa guidance",
              "Local staff available",
              "5.0 Google rating",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2.5 text-sm text-wsa-navy/80 font-medium">
                <svg className="w-5 h-5 text-wsa-red flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2B: WHAT WE HELP WITH
         Four linked content blocks showing key service areas.
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <ScrollReveal>
            <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">What we help with</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
              Everything you need to move forward with confidence
            </h2>
            <p className="text-[17px] text-muted-foreground leading-relaxed mb-14 max-w-2xl">
              Your counsellor helps you understand your options, prepare a strong application and manage the practical steps involved in studying abroad.
            </p>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                heading: "University applications",
                copy: "Support with undergraduate, postgraduate and doctoral study, from course selection through to application.",
                href: "/study-options",
              },
              {
                heading: "Schools and pathways",
                copy: "Guidance on boarding schools, foundation programmes, International Year One and other routes into higher education.",
                href: "/international-foundation-programme",
              },
              {
                heading: "Specialist opportunities",
                copy: "Support with sport pathways, summer programmes, creative subjects, healthcare and online learning.",
                href: "/sport-pathways",
              },
              {
                heading: "Visa and preparation support",
                copy: "Help with documents, interviews, visa preparation and the practical steps before departure.",
                href: "/learning-hub",
              },
            ].map((block, i) => (
              <ScrollReveal key={block.heading} delay={i * 80}>
                <Link href={block.href} className="group block h-full">
                  <div className="border border-border/40 p-8 h-full transition-all duration-200 hover:border-wsa-red/30 hover:shadow-sm">
                    <h3 className="text-lg font-semibold text-wsa-navy mb-3 group-hover:text-wsa-red transition-colors duration-200">
                      {block.heading}
                    </h3>
                    <p className="text-[15px] text-muted-foreground leading-relaxed mb-5">
                      {block.copy}
                    </p>
                    <span className="inline-flex items-center text-sm font-medium text-wsa-navy group-hover:text-wsa-red transition-colors duration-200">
                      Learn more
                      <ArrowRight className="ml-1.5" size={14} />
                    </span>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: WHO WILL HELP ME?
         "A real person who is accountable to your family."
         Streamlined. Tim quote opens. One named counsellor placeholder.
         British Council badge woven in naturally.
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <ScrollReveal>
              <div className="relative">
                <img
                  src="/manus-storage/wsa_diverse_student_group_a6478cd9.jpg"
                  alt="A diverse group of international students in a university common room"
                  className="w-full aspect-[4/3] object-cover"
                />
                {/* Named counsellor, clearly labelled placeholder */}
                <div className="mt-6 flex items-center gap-4">
                  <img
                    src="/manus-storage/eldah_therone_6c167959.jpg"
                    alt="Eldah Therone"
                    className="w-12 h-12 object-cover object-top flex-shrink-0"
                  />
                  <div>
                   <p className="text-sm font-semibold text-wsa-navy">Eldah Therone</p>
                   <p className="text-xs text-muted-foreground">Team Leader, Nairobi</p>
                 </div>
               </div>
                <p className="mt-4 text-[15px] text-muted-foreground italic leading-relaxed border-l-2 border-wsa-red/20 pl-4">
                  "I stay with my students from their very first question right through to move-in day. They're not a file number, they're family."
                </p>
             </div>
           </ScrollReveal>
            <ScrollReveal delay={80}>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Your Student Counsellor</p>
                <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-semibold text-wsa-navy leading-[1.12] mb-8">
                  One named professional.<br />Dedicated to your family.
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-6">
                  Every student is assigned a qualified counsellor who knows your name, understands your goals, and stays with you from first enquiry through to your first day of study.
                </p>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-8">
                  Available by phone, email, or WhatsApp. They recommend what's genuinely right, and they never submit anything without your family's approval.
                </p>
                <p className="text-[15px] text-wsa-navy/60 border-l-2 border-wsa-red/30 pl-5 italic mb-10">
                  For parents: your child's counsellor is available to you directly. You'll always know who to call.
                </p>
                <Link
                  href="/counsellors"
                  className="inline-flex items-center text-wsa-navy font-semibold hover:text-wsa-red transition-colors duration-200"
                >
                  Meet the counsellors
                  <ArrowRight className="ml-2" size={16} />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: HEAR FROM TIM
          Moved higher, immediately after the counsellor promise.
          Premium video treatment: Tim's real photo as thumbnail.
          "Here's the person behind the promise."
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-36 bg-wsa-cream">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">From our founder</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  "I started WSA because I believe every student deserves a guide."
                </h2>
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src="/manus-storage/tim_hunt_avatar_f8b93b16.png"
                    alt="Tim Hunt, Founder & Managing Director of World Student Advisors"
                    className="w-24 h-24 object-cover rounded-full border-2 border-wsa-navy/10"
                    
                  />
                  <div>
                    <p className="text-base font-semibold text-wsa-navy">Tim Hunt</p>
                    <p className="text-sm text-muted-foreground">Founder &amp; Managing Director</p>
                  </div>
                </div>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-6">
                  In this 11-minute video, Tim walks through the complete student journey, from first enquiry to graduation. No sales pitch. Just clarity about what happens at every stage.
                </p>
                <Link
                  href="/counsellors"
                  className="inline-flex items-center text-wsa-navy font-semibold hover:text-wsa-red transition-colors duration-200"
                >
                  Speak to a counsellor
                  <ArrowRight className="ml-2" size={16} />
                </Link>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <div className="relative aspect-video bg-wsa-navy overflow-hidden shadow-xl cursor-pointer group"
                onClick={() => setVideoPlaying(true)}
                role="button"
                aria-label="Play video: The Student Journey"
              >
               {!videoPlaying ? (
                 <>
                   <img
                      src="/manus-storage/youtube_thumb_student_journey_a742c8be.jpg"
                      alt="Tim Hunt, click to play The Student Journey video"
                      className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
                        <Play className="text-wsa-navy ml-1" size={32} fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <p className="text-white text-sm font-medium">The Student Journey: From First Enquiry to Graduation</p>
                      <p className="text-white/60 text-xs mt-1">11 minutes</p>
                    </div>
                  </>
                ) : (
                  <iframe
                    src="https://www.youtube.com/embed/ADQ1h0Ofhik?autoplay=1"
                    title="The Student Journey: From First Enquiry to Graduation. WSA"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: THE SIGNATURE MOMENT. "The First Call Home"
          Emotional centrepiece. Unchanged, it works.
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <div className="relative h-[70vh] min-h-[500px] lg:min-h-[650px]">
          <img
            src="/manus-storage/first_call_home_african_student_2f7df693.jpg"
            alt="A student video-calling their proud family from their university room, the first call home"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 pb-16 lg:pb-24">
            <div className="container">
              <ScrollReveal>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-4">The moment that makes it all worth it</p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-[1.12] max-w-2xl mb-5">
                  The first call home
                </h2>
                <p className="text-lg text-white/70 max-w-lg">
                  When your child calls from their new university room, happy, settled, thriving, you'll know every step was worth it.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: WHERE CAN I STUDY?
         Destinations, now connected back to personal guidance.
         One line ties it to the counsellor story.
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-32">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-5 lg:mb-6">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Study destinations</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15]">
                  Where will your future take you?
                </h2>
              </div>
              <Link
                href="/study-options"
                className="mt-6 lg:mt-0 inline-flex items-center text-wsa-navy font-semibold hover:text-wsa-red transition-colors duration-200 flex-shrink-0"
              >
                View all study options
                <ArrowRight className="ml-2" size={16} />
              </Link>
            </div>
            <p className="text-[16px] text-muted-foreground mb-14 max-w-xl">
              Your counsellor helps you choose the right country, institution, and programme based on your goals, budget, and preferences.
            </p>
          </ScrollReveal>

          {/* Asymmetric grid: UK dominates left, USA/Canada + Europe stacked right */}
          <div className="grid lg:grid-cols-5 gap-4 lg:gap-5">
            <ScrollReveal className="lg:col-span-3">
              <Link href="/study-options" className="group block h-full">
                <div className="relative overflow-hidden h-full min-h-[400px] lg:min-h-[600px]">
                  <img
                    src="/manus-storage/wsa_students_london_tower_bridge_d3469c26.jpg"
                    alt="Historic university buildings in golden autumn light. United Kingdom"
                    className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-10">
                    <p className="text-white/60 text-sm font-medium tracking-wide uppercase mb-2">Primary destination</p>
                    <h3 className="text-3xl lg:text-4xl font-semibold text-white mb-2">United Kingdom</h3>
                    <p className="text-white/70 text-base max-w-md">Universities, boarding schools, language programmes, and sport academies.</p>
                  </div>
                </div>
              </Link>
            </ScrollReveal>

            <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-5">
              <ScrollReveal delay={100} className="flex-1">
                <Link href="/study-options" className="group block h-full">
                  <div className="relative overflow-hidden h-full min-h-[190px] lg:min-h-0">
                    <img
                      src="/manus-storage/destination_canada_cb0ebc29.jpg"
                      alt="Modern Canadian university campus"
                      className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                      <h3 className="text-2xl font-semibold text-white mb-1">USA and Canada</h3>
                      <p className="text-white/70 text-sm">Higher-budget pathways with strong post-study work options</p>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
              <ScrollReveal delay={180} className="flex-1">
                <Link href="/study-options" className="group block h-full">
                  <div className="relative overflow-hidden h-full min-h-[190px] lg:min-h-0">
                    <img
                      src="/manus-storage/destination_europe_b3c9ef92.jpg"
                      alt="European university architecture"
                      className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                      <h3 className="text-2xl font-semibold text-white mb-1">Europe</h3>
                      <p className="text-white/70 text-sm">Cyprus, Hungary, and more — lower-budget options with quality programmes</p>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7: WHY WSA?
        Shorter. Bolder. Three human promises, not corporate values.
        Phrased as what a parent/student actually cares about.
     ═══════════════════════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6B: EDUCATION PARTNERS
         Shows partner logos and links to the full partner directory.
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="container">
          <ScrollReveal>
            <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Our partners</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
              Trusted education partners around the world
            </h2>
            <p className="text-[17px] text-muted-foreground leading-relaxed mb-14 max-w-2xl">
              We work with carefully selected schools, colleges, pathway providers and universities that meet WSA's standards for quality, student support and positive outcomes.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={60}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 items-center mb-12">
              {[
                { src: "/manus-storage/into_global_dd630efe.png", alt: "INTO Global" },
                { src: "/manus-storage/oncampus_6bd095a4.png", alt: "ONCAMPUS" },
                { src: "/manus-storage/oxford_international_2d3e6536.jpg", alt: "Oxford International" },
                { src: "/manus-storage/study_group_8ee9a299.jpg", alt: "Study Group" },
                { src: "/manus-storage/fcv_academy_ef4cfccd.png", alt: "FCV Academy" },
                { src: "/manus-storage/ncg_3a880115.png", alt: "NCG" },
                { src: "/manus-storage/royal_holloway_df8182a0.png", alt: "Royal Holloway" },
                { src: "/manus-storage/university_of_greenwich_b554e4c5.png", alt: "University of Greenwich" },
                { src: "/manus-storage/uni_portsmouth_8111efe4.png", alt: "University of Portsmouth" },
                { src: "/manus-storage/birmingham_city_university_final_a71309ee.png", alt: "Birmingham City University" },
                { src: "/manus-storage/bath_spa_university_official_f842eb94.png", alt: "Bath Spa University" },
                { src: "/manus-storage/teesside_university_417c98a8.png", alt: "Teesside University" },
                { src: "/manus-storage/university_of_salford_ef172ca3.png", alt: "University of Salford" },
                { src: "/manus-storage/university_of_bradford_68e012ae.png", alt: "University of Bradford" },
                { src: "/manus-storage/abbey_dld_group_cd40fa74.jpg", alt: "Abbey DLD Group" },
              ].map((logo) => (
                <div key={logo.alt} className="flex items-center justify-center p-3 h-16">
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className="max-h-full max-w-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-200"
                  />
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="text-center">
              <Link
                href="/partners"
                className="inline-flex items-center text-wsa-navy font-semibold hover:text-wsa-red transition-colors duration-200"
              >
                View all education partners
                <ArrowRight className="ml-2" size={16} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6C: LEARNING HUB
         Prominent link to the Learning Hub resources.
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Learning Hub</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-6">
                  Free resources to help you prepare
                </h2>
                <p className="text-[17px] text-muted-foreground leading-relaxed mb-6">
                  Podcasts, study guides, visa preparation tips and practical advice from our counsellors. Everything you need to feel ready before you start.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    { label: "Podcasts with Tim Hunt", href: "/learning-hub/podcasts" },
                    { label: "Study guides and resources", href: "/learning-hub" },
                    { label: "Training and workshops", href: "/training-workshops" },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 text-[16px] text-wsa-navy hover:text-wsa-red transition-colors duration-200 group"
                    >
                      <ArrowRight size={14} className="text-wsa-red group-hover:translate-x-0.5 transition-transform duration-200" />
                      {item.label}
                    </Link>
                  ))}
                </div>
                <Link
                  href="/learning-hub"
                  className="inline-flex items-center text-wsa-navy font-semibold hover:text-wsa-red transition-colors duration-200"
                >
                  Explore the Learning Hub
                  <ArrowRight className="ml-2" size={16} />
                </Link>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <div className="relative">
                <img
                  src="/manus-storage/youtube_thumb_student_journey_a742c8be.jpg"
                  alt="Latest: The Student Journey podcast with Tim Hunt"
                  className="w-full aspect-[4/3] object-cover"
                />
                {/* Text overlay removed: the thumbnail image already has its own
                    caption baked in near the bottom, and the two overlapping
                    text layers were becoming illegible. The caption now lives
                    only in the alt text for accessibility/SEO. If a caption-free
                    thumbnail is supplied later, the overlay can be restored. */}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7: WHY WSA?
         Shorter. Bolder. Three human promises, not corporate values.
         Phrased as what a parent/student actually cares about.
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-32 bg-wsa-navy">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-16 lg:mb-20">
              <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-semibold text-white leading-[1.15]">
                Why families trust WSA
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-px bg-white/10">
            {[
              {
                statement: "You'll always know who to call",
                detail: "One named counsellor for your entire journey. Not a rotating team. Not a chatbot. A professional who answers when you call, available to both students and parents."
              },
              {
                statement: "We recommend what's right",
                detail: "British Council certified. We guide based on what's genuinely best for your child, not what pays the highest commission. If studying abroad isn't the right choice, we'll say so."
              },
              {
                statement: "No fees. No pressure. No surprises.",
                detail: "Our guidance is completely free to families. We're funded by education partners. Nothing is ever submitted without your approval, and there are no hidden costs."
              },
            ].map((item, i) => (
              <ScrollReveal key={item.statement} delay={i * 100}>
                <div className="bg-wsa-navy p-10 lg:p-14 h-full">
                  <h3 className="text-xl font-semibold text-white mb-4">{item.statement}</h3>
                  <p className="text-white/50 leading-relaxed text-[15px]">{item.detail}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-white/60">
              <div className="flex items-center gap-3">
                <img src="/manus-storage/british_council_badge_694f3fc2.png" alt="British Council" className="h-8 w-8" />
                <span className="text-sm">British Council Certified</span>
              </div>
              <span className="hidden sm:inline text-white/20">|</span>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-lg">★★★★★</span>
                <span className="text-sm">5.0 Excellent on Google</span>
             </div>
             <span className="hidden sm:inline text-white/20">|</span>
              <span className="text-sm">Local staff available</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8: GET STARTED
         ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-slate-50">
        <div className="container">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-wsa-navy mb-4">
                Your Student Journey
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From your first conversation to graduation day, we guide you through every stage.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                "Relationship Building",
                "Career Discussion",
                "Country Choice",
                "Course Choice",
                "University Choice",
                "Budget Discussion",
                "Conditional Offer",
                "Meeting Conditions",
                "Unconditional Offer",
                "CAS",
                "CAS Interview",
                "UKVI Interview",
                "Uni Interview",
                "Visa Application",
                "Travel Prep",
                "Enrolment",
              ].map((stage, i) => (
                <div
                  key={i}
                  className="text-center p-3 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-wsa-red/30 transition-all duration-200"
                >
                  <div className="text-sm font-bold text-wsa-red mb-1">{i + 1}</div>
                  <div className="text-xs text-gray-700 leading-tight font-medium">{stage}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div className="text-center mt-10">
              <Link href="/contact" className="inline-flex items-center gap-2 text-wsa-red font-semibold hover:underline">
                Start your journey today <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 9: GET STARTED
         Final CTA. "Get Started" appears here, after full trust.
         Warm, inviting, no pressure.
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-32">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-wsa-navy leading-[1.12] mb-6">
                Your counsellor is ready when you are
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-12">
                Complete a short application and a personal Student Counsellor will be in touch within 48 hours. No fee. No obligation. Students or parents can apply.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center px-10 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="ml-3" size={20} />
              </Link>
              <p className="mt-6 text-sm text-muted-foreground/70">
                If WSA isn't the right fit, we'll tell you honestly.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
