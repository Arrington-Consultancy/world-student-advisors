import { Link } from "wouter";
import { ArrowRight, GraduationCap, School, Trophy, Route, Globe, MapPin } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

/**
 * Our Global Education Partners
 * Content source: worldstudentadvisors.com/our-global-education-partners (approved)
 * All partner names, descriptions, and categorisation from the current live site.
 * No invented content, testimonials, or relationships.
 */

interface Partner {
  name: string;
  location: string;
  description: string;
  strengths: string;
  usp: string;
  logo?: string;
}

interface PartnerCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  intro: string;
  image?: string;
  imageAlt?: string;
  partners: Partner[];
}

const categories: PartnerCategory[] = [
  {
    id: "boarding-schools",
    title: "Boarding Schools",
    subtitle: "Premium boarding schools offering GCSEs, A Levels, and Foundation programmes",
    icon: School,
    intro: "Premium boarding schools offering exceptional academic programmes and pastoral care for students aged 13–19.",
    image: "/manus-storage/partner_abbey_cambridge_b1ad33ce.webp",
    imageAlt: "Abbey College Cambridge campus and students",
    partners: [
      {
        name: "Abbey College Cambridge",
        location: "Cambridge",
        description: "A purpose-built, co-educational boarding school for students aged 13–19, renowned for outstanding academic results and progression to leading universities.",
        strengths: "Science, Mathematics",
        usp: "Outstanding academic results; top UK university progression",
        logo: "/manus-storage/abbey_dld_group_cd40fa74.jpg",
      },
      {
        name: "Abbey College Manchester",
        location: "Manchester",
        description: "Provides a supportive, co-educational boarding school experience with small class sizes and personalised teaching. Offers a unique Academic Studies with Football Training programme.",
        strengths: "Medicine, Business, Creative Arts, Football Training",
        usp: "Small classes; Academic Studies with Football Training",
        logo: "/manus-storage/abbey_dld_group_cd40fa74.jpg",
      },
      {
        name: "DLD College London",
        location: "London (Westminster Bridge)",
        description: "A modern, co-educational boarding school and part of the Abbey College Group. Offers GCSEs, A Levels, BTECs and International Foundation Programmes with excellent boarding facilities in central London.",
        strengths: "Broad curriculum, Sport & Clubs",
        usp: "Modern central London campus; excellent boarding; Abbey College Group",
        logo: "/manus-storage/dld_college_6d21e1d8.png",
      },
      {
        name: "Brooke House College",
        location: "Market Harborough",
        description: "A co-educational boarding and day school for students aged 11–19. Internationally renowned for its Football Academy, providing professional coaching, fitness and video analysis for over 150 student players.",
        strengths: "Football Academy, English support",
        usp: "Elite football training + trusted academic progression",
        logo: "/manus-storage/brooke_house_87454a0b.png",
      },
      {
        name: "David Game College",
        location: "London & Bath",
        description: "A well-established independent sixth form college offering GCSEs, A Levels and University Foundation Programmes across its London and Bath campuses. Known for small class sizes, expert teaching and a personalised approach.",
        strengths: "Broad academic strengths",
        usp: "Long-established college with small classes; campuses in London and Bath",
        logo: "/manus-storage/david_game_a2eb159d.jpg",
      },
    ],
  },
  {
    id: "colleges",
    title: "Colleges",
    subtitle: "Vocational and applied learning institutions with specialist programmes",
    icon: GraduationCap,
    intro: "In the UK, a college usually refers to an institution that prepares students aged 16–18 for higher education or employment. Colleges tend to focus on vocational and applied learning, offering Level 3 courses equivalent to A Levels, as well as Foundation pathways that bridge the gap to university.",
    image: "/manus-storage/partner_fcv_academy_46400204.webp",
    imageAlt: "FCV International Football Academy students training on pitch",
    partners: [
      {
        name: "FCV International Football Academy",
        location: "Stamford",
        description: "The UK's leading private football academy for aspiring players aged 16+. Students follow academic courses alongside a structured daily football training programme with professional coaching and sports science support.",
        strengths: "Football performance & coaching",
        usp: "UK's first private football academy combining study & training",
        logo: "/manus-storage/fcv_academy_ef4cfccd.png",
      },
      {
        name: "New College Group (NCG)",
        location: "Manchester & Liverpool",
        description: "Provides high-quality English language training and academic preparation courses. WSA has a direct partnership with NCG and has successfully sent English language students to their programmes.",
        strengths: "Language training, cultural immersion, academic skills",
        usp: "Strong WSA partnership; city-centre campuses",
        logo: "/manus-storage/ncg_3a880115.png",
      },
    ],
  },
  {
    id: "sports-camps",
    title: "Sports Camps (UK June–August)",
    subtitle: "Summer sports and activity camps for international students aged 11–18",
    icon: Trophy,
    intro: "During the UK summer months, a wide variety of short-term sports and activity camps are available to international students. These programmes are ideal for 11–18-year-olds who want to combine their passion for sport with language learning, cultural experiences and personal development.",
    image: "/manus-storage/partner_sports_camp_63a5c8f6.webp",
    imageAlt: "International students at a UK summer sports camp",
    partners: [
      {
        name: "Brooke House College Sports Camps",
        location: "Market Harborough",
        description: "Well-established Football Sports Camps for boys and girls aged 12–19. Camps combine daily football coaching with English language tuition and cultural activities in boarding accommodation.",
        strengths: "Football training, boarding school life",
        usp: "Combines football coaching with English tuition & cultural trips",
        logo: "/manus-storage/brooke_house_87454a0b.png",
      },
      {
       name: "CMT Learning Sports Camps",
       location: "Multiple UK venues",
       description: "Delivers a range of elite sports and education camps in partnership with leading football clubs and institutions. Programmes include football, tennis and multi-sport options, often combined with English tuition.",
       strengths: "Elite coaching, club partnerships",
        usp: "Delivered programmes in partnership with leading football clubs",
        logo: "/manus-storage/cmt_learning_73f8af96.png",
      },
      {
        name: "FCV International Football Academy Camps",
        location: "Stamford",
        description: "Intensive Football Sports Camps for players aged 15–19. Camps focus on technical development, fitness and match play, with pathways for talented players to join FCV's longer-term academic programmes.",
        strengths: "Technical football training, UEFA coaches",
        usp: "Intensive player development + pathway to academy",
        logo: "/manus-storage/fcv_academy_ef4cfccd.png",
      },
      {
        name: "New College Group (NCG) Summer Schools",
        location: "Manchester & Liverpool",
        description: "English Language Summer Schools combining English tuition with sports and cultural activities. Students enjoy excursions, social events and the chance to practise English in real-world settings.",
        strengths: "Language learning + cultural immersion",
        usp: "Combines English tuition with sport & social programme",
        logo: "/manus-storage/ncg_3a880115.png",
      },
    ],
  },
  {
    id: "pathway-providers",
    title: "Pathway Providers",
    subtitle: "Foundation and preparation programmes for university entry",
    icon: Route,
    intro: "Pathway providers offer Foundation, International Year One and Pre-Masters programmes that prepare international students for direct entry to university degree programmes.",
    image: "/manus-storage/partner_pathway_provider_29469e26.webp",
    imageAlt: "University pathway programme students in a lecture hall",
    partners: [
      {
        name: "INTO Global",
        location: "UK, USA, Australia",
        description: "Partners with universities in the UK, USA and Australia, with centres based directly on campus. Students can choose Foundation, International Year One and Pre-Masters programmes. Over 90% of INTO students successfully progress to their chosen degree.",
        strengths: "Business, Engineering, Computer Science",
        usp: "Full on-campus integration with strong academic and English support",
        logo: "/manus-storage/into_global_dd630efe.png",
      },
      {
        name: "ONCAMPUS",
        location: "UK, France, Ireland, Netherlands, USA",
        description: "Operates centres in the UK, France, Ireland, the Netherlands and the USA, including a flagship at the University of Amsterdam. Especially strong in Medicine and Science pathways, preparing students for competitive routes such as Medicine, Dentistry and Engineering.",
        strengths: "Medicine, Dentistry, Science, Engineering",
        usp: "Strong Medicine/Science focus; guaranteed progression",
        logo: "/manus-storage/oncampus_6bd095a4.png",
      },
      {
        name: "Oxford International Education",
        location: "UK, USA, Canada, Germany, Australia",
        description: "Delivers pathway programmes with Foundation, International Year One and Pre-Masters courses across the UK, USA, Canada, Germany and Australia. Known for small class sizes and personalised support, it also builds employability skills.",
        strengths: "Personalised learning, employability",
        usp: "Small classes, mentoring, employability focus across global destinations",
        logo: "/manus-storage/oxford_international_2d3e6536.jpg",
      },
      {
        name: "Study Group",
        location: "UK, Europe, N. America, South East Asia",
        description: "One of the largest pathway providers, working with over 50 universities globally across the UK, Europe, North America, France, Ireland and South East Asia. Through International Study Centres, it offers Foundation, International Year One and Pre-Masters programmes.",
        strengths: "Business, Law, Engineering, Creative Arts",
        usp: "Prestigious global university partnerships and subject-specialist pathways",
        logo: "/manus-storage/study_group_8ee9a299.jpg",
      },
    ],
  },
  {
    id: "uk-universities",
    title: "UK Universities",
    subtitle: "WSA partner universities across England, Wales, and Scotland",
    icon: GraduationCap,
    intro: "WSA partners with a diverse range of UK universities, historic and modern, city and campus, so you can match your ambitions with the right environment and course. Our partners are known for strong teaching, research and employability.",
    image: "/manus-storage/partner_college_campus_d8738bbe.webp",
    imageAlt: "UK university campus with students",
    partners: [
      { name: "Aberystwyth University", location: "Aberystwyth, Wales", description: "A historic coastal university with strong rankings in research and teaching.", strengths: "Agriculture, International Politics, Business", usp: "Excellent student satisfaction", logo: "/manus-storage/aberystwyth_university_d2521ae4.png" },
      { name: "Anglia Ruskin University", location: "Cambridge, Chelmsford, Peterborough & London Campus", description: "Modern, career-focused university with multiple campuses, including a dedicated London Campus.", strengths: "Health, Business, Technology", usp: "Excellent employability support", logo: "/manus-storage/anglia_ruskin_university_3f41a15b.svg" },
      { name: "Bath Spa University", location: "Bath", description: "Set in a World Heritage city, renowned for Creative Arts, Humanities and Education.", strengths: "Creative Arts, Humanities, Education", usp: "Supportive community feel in a beautiful setting", logo: "/manus-storage/bath_spa_university_official_f842eb94.png" },
      { name: "Birmingham City University", location: "Birmingham", description: "Dynamic and industry-focused university in the UK's second city.", strengths: "Media, Business, Engineering", usp: "Strong employer links", logo: "/manus-storage/birmingham_city_university_final_a71309ee.png" },
      { name: "BPP University", location: "London & regional centres", description: "Specialist private university with a focus on practical training closely linked to industry.", strengths: "Law, Business, Professional Studies", usp: "Industry-focused training", logo: "/manus-storage/bpp_university_2a600f2b.svg" },
      { name: "London South Bank University", location: "London", description: "Located in central London with strong vocational courses.", strengths: "Engineering, Health, Business", usp: "Excellent graduate employability", logo: "/manus-storage/london_south_bank_university_58c20e3d.svg" },
      { name: "University of Bradford", location: "Bradford", description: "Research-active university with global outlook.", strengths: "Peace Studies, Management, Engineering, Healthcare", usp: "Global outlook and research strength", logo: "/manus-storage/university_of_bradford_68e012ae.png" },
      { name: "University of Greenwich", location: "Greenwich, Avery Hill & Medway", description: "Beautiful riverside campus at Greenwich, plus the Avery Hill campus in south-east London and the Medway campus in Kent, with strong support for international students.", strengths: "Business, Computing, Education", usp: "Three campuses: riverside Greenwich, Avery Hill and Medway", logo: "/manus-storage/university_of_greenwich_b554e4c5.png" },
      { name: "University of Hertfordshire", location: "Hatfield", description: "Modern, career-focused university with strong links to industry.", strengths: "Aerospace, Creative Arts, Business", usp: "High employability rates", logo: "/manus-storage/university_of_hertfordshire_feb44208.svg" },
      { name: "University of Lincoln", location: "Lincoln", description: "Award-winning city-centre campus with modern facilities.", strengths: "Media, Business, Engineering", usp: "Top student experience rankings", logo: "/manus-storage/uni_lincoln_d6978fdc.jpg" },
      { name: "University of Portsmouth", location: "Portsmouth & London Campus", description: "Harbourside university with global outlook and a dedicated London Campus.", strengths: "Computing, Business, Marine Studies", usp: "High student satisfaction", logo: "/manus-storage/uni_portsmouth_8111efe4.png" },
      { name: "University of Salford", location: "Manchester", description: "Industry-driven university in Greater Manchester.", strengths: "Media, Health, Business, Engineering", usp: "MediaCityUK campus", logo: "/manus-storage/university_of_salford_ef172ca3.png" },
      { name: "Solent University", location: "Southampton", description: "Modern, practical university with focus on Creative Industries.", strengths: "Creative Industries, Business, Maritime", usp: "Excellent international student support", logo: "/manus-storage/solent_university_9a46ff46.svg" },
      { name: "Teesside University", location: "Middlesbrough & London Campus", description: "Innovative university with affordable cost of living and a dedicated London Campus.", strengths: "Digital, Animation, Business, Health", usp: "Affordable cost of living and strong employability", logo: "/manus-storage/teesside_university_417c98a8.png" },
      { name: "University of the West of England (UWE)", location: "Bristol — Frenchay, City & Glenside Campuses", description: "Large modern university with focus on career preparation, spread across the Frenchay, City and Glenside campuses in Bristol.", strengths: "Business, Law, Engineering, Creative Industries", usp: "Career preparation focus", logo: "/manus-storage/uwe_bristol_b713e57b.svg" },
      { name: "University of Winchester", location: "Winchester", description: "Historic city campus with strong values-based education.", strengths: "Education, Arts, Humanities", usp: "Supportive community", logo: "/manus-storage/university_of_winchester_c9d6a7df.svg" },
      { name: "Royal Holloway, University of London", location: "Egham, Surrey", description: "Part of the University of London, known for its iconic campus.", strengths: "Humanities, Business, Sciences", usp: "Excellent research reputation", logo: "/manus-storage/royal_holloway_df8182a0.png" },
    ],
  },
  {
    id: "non-uk-universities",
    title: "Non-UK Universities",
    subtitle: "International university partners in Europe and beyond",
    icon: Globe,
    intro: "WSA has carefully selected direct international university partners in Europe that combine academic quality, recognised degrees and competitive tuition fees. These universities all sit within the Schengen visa region, allowing students easy mobility across Europe.",
    image: "/manus-storage/partner_pathway_2_8831de3c.webp",
    imageAlt: "European university campus",
    partners: [
      {
        name: "Cyprus West University (CWU)",
        location: "Famagusta, Cyprus",
        description: "A dynamic and student-focused university emphasising practical learning and a supportive environment. Tuition fees are highly competitive, making CWU one of the most affordable European options.",
        strengths: "Practical, hands-on learning in English",
        usp: "Cost-effective degrees with a practical learning style",
        logo: "/manus-storage/cyprus_west_university_db0efd8e.png",
      },
      {
        name: "The British University in Cyprus (BUC)",
        location: "Larnaca, Cyprus",
        description: "Offers UK-quality education at significantly lower costs, with all degrees validated by the University of Central Lancashire (UCLan). Students graduate with a UK university degree.",
        strengths: "UK degrees awarded by UCLan",
        usp: "British degrees at a fraction of UK tuition fees",
        logo: "/manus-storage/british_university_cyprus_3c641222.svg",
      },
      {
        name: "University of Debrecen",
        location: "Debrecen, Hungary",
        description: "One of Central Europe's oldest and most prestigious universities, especially renowned for its Medical School which is recognised by the World Health Organization (WHO).",
        strengths: "Medicine, Health Sciences, STEM",
        usp: "WHO-recognised Medical School at far lower cost than UK/USA",
        logo: "/manus-storage/uni_debrecen_7c870373.jpg",
      },
    ],
  },
];

export default function Partners() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Education Partners</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Our Global Education Partners
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                We work with a carefully selected group of educational institutions across the UK, Europe, and beyond. We prioritise partners who share our commitment to academic quality, student wellbeing, and employability outcomes.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Category index */}
      <section className="pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-10">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-4">Partner Categories</p>
              <h2 className="text-2xl font-semibold text-wsa-navy">Browse by category</h2>
            </div>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, i) => (
              <ScrollReveal key={cat.id} delay={i * 60}>
                <a
                  href={`#${cat.id}`}
                  className="flex items-start gap-4 p-5 border border-border/40 hover:border-wsa-red/30 transition-colors group"
                >
                  <cat.icon size={22} className="text-wsa-red mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-base font-semibold text-wsa-navy group-hover:text-wsa-red transition-colors">{cat.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{cat.subtitle}</p>
                  </div>
                </a>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Partner philosophy */}
      <section className="py-20 lg:py-24 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
              {[
                { title: "Quality first", text: "We only partner with institutions we've vetted and trust. If we wouldn't recommend it to our own family, we don't recommend it to yours." },
                { title: "Student welfare", text: "Every partner institution must demonstrate strong student support services, pastoral care, and a genuine commitment to international student success." },
                { title: "Ethical recruitment", text: "As an agency with British Council Certified Counsellors, we maintain strict ethical standards. We never recommend an institution solely because of commercial incentives." },
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

      {/* Partner categories - full directory */}
      {categories.map((cat, catIndex) => (
        <section
          key={cat.id}
          id={cat.id}
          className={`py-24 lg:py-32 ${catIndex % 2 === 1 ? "bg-wsa-cream" : ""}`}
        >
          <div className="container">
            <ScrollReveal>
              <div className="grid lg:grid-cols-[1fr,320px] gap-10 lg:gap-16 items-start mb-12">
                <div>
                <div className="flex items-center gap-3 mb-4">
                  <cat.icon size={24} className="text-wsa-red" />
                  <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red">
                    {catIndex + 1}. {cat.title}
                  </p>
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                  {cat.title}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {cat.intro}
                </p>
                </div>
                {cat.image && (
                  <div className="hidden lg:block aspect-[4/3] overflow-hidden">
                    <img
                      src={cat.image}
                      alt={cat.imageAlt || `${cat.title} partner institutions`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Partner cards */}
            <div className={`grid gap-6 items-stretch ${cat.partners.length > 6 ? "md:grid-cols-2 lg:grid-cols-3" : cat.partners.length > 3 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
              {cat.partners.map((partner, i) => (
               <ScrollReveal key={partner.name} delay={i * 40} className="h-full">
                  <div className="border border-border/40 p-6 h-full bg-white flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-3 min-h-[2.5rem]">
                      <h3 className="text-base font-semibold text-wsa-navy leading-snug flex-1">{partner.name}</h3>
                      {partner.logo && (
                        <div className="shrink-0 w-12 h-12 flex items-center justify-center">
                          <img
                            src={partner.logo}
                            alt={`${partner.name} logo`}
                            className="max-w-full max-h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mb-4">
                      <MapPin size={13} className="text-muted-foreground/60" />
                      <span className="text-sm text-muted-foreground">{partner.location}</span>
                    </div>
                    <p className="text-[14px] text-muted-foreground leading-relaxed mb-4 flex-1">{partner.description}</p>
                    <div className="pt-3 border-t border-border/30 space-y-2 mt-auto">
                      <p className="text-xs text-wsa-navy/70">
                        <span className="font-medium">Strengths:</span> {partner.strengths}
                      </p>
                      <p className="text-xs text-wsa-red/80">
                        <span className="font-medium">USP:</span> {partner.usp}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Note about wider support */}
      <section className="py-16 lg:py-20 border-t border-border/40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg text-muted-foreground leading-relaxed">
                All institutions listed above are official World Student Advisors partners. Where a student expresses interest in a destination not shown here, we may still be able to support the application.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* For institutions CTA */}
      <section className="py-28 lg:py-40 bg-wsa-navy text-white">
        <div className="container">
          <ScrollReveal>
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">For institutions</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15] mb-8">
                  Partner with WSA
                </h2>
                <div className="space-y-5 text-[17px] text-white/60 leading-relaxed">
                  <p>
                    If you represent a university, school, or education provider and would like to explore a partnership with World Student Advisors, we'd welcome a conversation.
                  </p>
                  <p>
                    We have British Council Certified Counsellors, with offices in the UK, Kenya, Nigeria, and Ghana. We support students from across Sub-Saharan Africa with ethical, personalised guidance.
                  </p>
                  <p className="text-white font-medium">
                    We partner based on quality and shared values, not volume targets.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex items-center mt-8 px-8 py-4 bg-wsa-red text-white text-base font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
                >
                  Get in touch
                  <ArrowRight className="ml-2.5" size={18} />
                </Link>
              </div>
              <div className="hidden lg:block">
                <img
                  src="/manus-storage/wsa_partners_hero_66daa91a.jpg"
                  alt="University campus architecture"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
