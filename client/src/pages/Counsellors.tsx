import { Link } from "wouter";
import { ArrowRight, Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const counsellors = [
  {
    name: "Tim Hunt",
    role: "Managing Director",
    location: "England, UK",
    region: "UK",
    email: "tim.hunt@worldstudentadvisors.com",
    whatsapp: "+44 7914 797830",
    photo: "/manus-storage/tim_hunt_219af817.jpg",
    britishCouncil: false,
  },
  {
    name: "Tom Arrington",
    role: "Business Consultant",
    location: "England, UK",
    region: "UK",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/tom_arrington_professional_66e673df.png",
    britishCouncil: false,
  },
  {
    name: "Babatunde Abdulia Azeez",
    role: "Senior Director for Nigeria",
    location: "Ibadan, Oyo State, Nigeria",
    region: "Nigeria",
    email: "babtunde@worldstudentadvisors.co.uk",
    whatsapp: "+234 812 929 2769",
    photo: "/manus-storage/babatunde_azeez_1f9d8fb7.png",
    britishCouncil: false,
  },
  {
    name: "Eldah Therone",
    role: "Team Leader",
    location: "Nairobi, Kenya",
    region: "Kenya",
    email: "eldah@worldstudentadvisors.com",
    whatsapp: "+44 747 068 9849",
    photo: "/manus-storage/eldah_therone_6c167959.jpg",
    britishCouncil: true,
  },
  {
    name: "Sarafina Kihumbu",
    role: "Senior Student Counsellor",
    location: "Nairobi, Kenya",
    region: "Kenya",
    email: "sarafina@worldstudentadvisors.com",
    whatsapp: "+44 734 190 5979",
    photo: "/manus-storage/sarafina_kihumbu_bf76c0cc.jpg",
    britishCouncil: true,
  },
  {
    name: "Glenice Owino",
    role: "Student Counsellor",
    location: "Nairobi, Kenya",
    region: "Kenya",
    email: "glenice@worldstudentadvisors.com",
    whatsapp: "+44 7914 797830",
    photo: "/manus-storage/glenice_owino_d9dc75c4.jpg",
    britishCouncil: true,
  },
  {
    name: "Manet Khamayo",
    role: "Student Counsellor",
    location: "Nairobi, Kenya",
    region: "Kenya",
    email: "manet@worldstudentadvisors.com",
    whatsapp: "+44 755 554 6016",
    photo: "/manus-storage/manet_khamayo_0ae2601a.jpg",
    britishCouncil: true,
  },
  {
    name: "Gladys Naadi Banhu",
    role: "Regional Director – Ghana",
    location: "Ghana",
    region: "Ghana",
    email: "",
    whatsapp: "+233 55 610 2870",
    photo: "/manus-storage/gladys_naadi_banhu_7d1e632e.jpg",
    britishCouncil: true,
  },
  {
    name: "Dr. Dele Kogbe",
    role: "Higher Education Consultant",
    location: "Nigeria",
    region: "Nigeria",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/dr_dele_kogbe_7c9976ca.jpg",
    britishCouncil: false,
  },
  {
    name: "Dr. Domoyi Castro Mathew",
    role: "Director of Higher Education",
    location: "Nigeria",
    region: "Nigeria",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/dr_domoyi_castro_1b8b8a74.jpg",
    britishCouncil: false,
  },
  {
    name: "Pedro Bezerra",
    role: "Director of Lusophone Countries",
    location: "Angola",
    region: "Angola",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/pedro_bezerra_9d17852a.jpg",
    britishCouncil: false,
  },
  {
    name: "Juliet Nnajiofor-Uyi",
    role: "Higher Education Advisor",
    location: "Nigeria",
    region: "Nigeria",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/juliet_nnajiofor_uyi_7b797464.jpg",
    britishCouncil: false,
  },
  {
    name: "Winnie Kamuya",
    role: "Higher Education Consultant",
    location: "Kenya",
    region: "Kenya",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/winnie_kamuya_6f2fe224.jpg",
    britishCouncil: false,
  },
  {
    name: "Maryam Lawal",
    role: "Director for Nigeria",
    location: "Nigeria",
    region: "Nigeria",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/maryam_lawal_52fa19ff.png",
    britishCouncil: false,
  },
  {
    name: "Madalitso Dube",
    role: "Director for Malawi",
    location: "Malawi",
    region: "Malawi",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/madalitso_dube_5417ba52.jpg",
    britishCouncil: false,
  },
  {
    name: "Tobrise Arhawarien",
    role: "Student Counsellor",
    location: "Nigeria",
    region: "Nigeria",
    email: "",
    whatsapp: "",
    photo: "/manus-storage/tobrise_arhawarien_724d3107.jpg",
    britishCouncil: false,
  },
];

const offices = [
  {
    country: "United Kingdom",
    flag: "🇬🇧",
    label: "UK Headquarters",
    address: "2 Newport Close, Clevedon, BS21 5DZ, England, UK",
    whatsapp: "+44 791 479 7830",
    email: "UKHeadOffice@worldstudentadvisors.com",
  },
  {
    country: "Kenya",
    flag: "🇰🇪",
    label: "Sub-Saharan Regional Office",
    address: "Waiyaki Way, Off Uthiru-Cooperation, Nafra Building, Nairobi, Kenya",
    whatsapp: "+44 7470 689 849",
    email: "KenyaOffice@worldstudentadvisors.com",
    phone: "+254 702 096 419",
  },
  {
    country: "Nigeria",
    flag: "🇳🇬",
    label: "Nigeria Office",
    address: "DSTV Complex, Along Akala Express Way, New Garage, Ibadan, Oyo State, Nigeria",
    whatsapp: "+234 812 929 2769",
    email: "NigeriaOffice@worldstudentadvisors.com",
  },
  {
    country: "Ghana",
    flag: "🇬🇭",
    label: "Ghana Office",
    address: "Afotey Osapesua Avenue, Adjiringanor, East Legon, Accra, Ghana",
    whatsapp: "+233 55 610 2870",
    email: "GhanaOffice@worldstudentadvisors.com",
  },
];

export default function Counsellors() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Meet the counsellors</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Your local experts
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                At <strong>World</strong><em>Student</em>Advisors, our strength lies in our people. We have a dedicated global team of Student Counsellors, Regional Directors, and Higher Education Consultants based across the UK, Africa, and beyond.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* British Council Trust Badge */}
      <section className="py-12 bg-wsa-cream border-y border-border/30">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 justify-center">
              <img
                src="/manus-storage/british_council_certified_b72a19c7.png"
                alt="British Council Certified Agency"
                className="h-16 w-auto"
              />
              <div className="text-center sm:text-left">
                <p className="text-lg font-semibold text-wsa-navy">British Council Certified Agency</p>
                <p className="text-sm text-muted-foreground">Supporting students with trusted international education guidance since 2012.</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 lg:py-24">
        <div className="container">
          <ScrollReveal>
            <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
             {[
                { title: "Named and accountable", text: "Your assigned counsellor has a name, a face, and a direct line. Once matched, you'll always know exactly who to contact." },
                { title: "Qualified and trained", text: "Every counsellor is trained in international admissions, visa processes, and student welfare. They understand the systems you're navigating." },
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

      {/* Team Grid */}
      <section className="py-28 lg:py-40 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16 lg:mb-20">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Our team</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                The people behind <strong>World</strong><em>Student</em>Advisors
              </h2>
             <p className="text-lg text-muted-foreground leading-relaxed">
                Meet the counsellors and regional directors you'll work with directly. Each student is assigned one named counsellor who stays with them throughout.
             </p>
            </div>
          </ScrollReveal>

          {["UK", "Kenya", "Nigeria", "Ghana", "Angola", "Malawi"].filter((region) => counsellors.some((p) => p.region === region)).map((region) => (
          <div key={region} className="mb-14">
            <h3 className="text-xl font-semibold text-wsa-navy mb-6 pb-3 border-b border-border/40 flex items-center gap-2">
              <MapPin size={18} className="text-wsa-red" />
              {region === "UK" ? "United Kingdom" : region}
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-6">
            {counsellors.filter(p => p.region === region).map((person, i) => (
             <ScrollReveal key={person.name} delay={i * 50} className="h-full">
                <div className="bg-white border border-border/30 overflow-hidden group hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                  <div className="aspect-[3/4] overflow-hidden bg-gray-100 relative">
                    <img
                      src={person.photo}
                      alt={person.name}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    {person.britishCouncil && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5" title="British Council Certified">
                        <img
                          src="/manus-storage/british_council_badge_694f3fc2.png"
                          alt="British Council Certified"
                          className="w-6 h-6"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-base font-semibold text-wsa-navy mb-0.5">{person.name}</h3>
                    <p className="text-sm text-wsa-red/80 mb-1">{person.role}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-auto">
                      <MapPin size={11} />
                      {person.location}
                    </p>
                    {(person.email || person.whatsapp) && (
                      <div className="mt-3 pt-3 border-t border-border/30 flex flex-wrap gap-2 mt-auto">
                        {person.email && (
                          <a
                            href={`mailto:${person.email}`}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-wsa-navy transition-colors"
                          >
                            <Mail size={11} />
                            Email
                          </a>
                        )}
                        {person.whatsapp && (
                          <a
                            href={`https://wa.me/${person.whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-green-600 transition-colors"
                          >
                            <Phone size={11} />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            ))}
            </div>
          </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-28 lg:py-40 bg-wsa-navy text-white">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">How it works</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-white leading-[1.15]">
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
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-white/50 leading-relaxed text-[15px]">{item.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Office Locations */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-16 lg:mb-20">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Our locations</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.15] mb-5">
                Contact your regional team
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Reach out directly to the office nearest to you. Every team is ready to help.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            {offices.map((office, i) => (
              <ScrollReveal key={office.country} delay={i * 80} className="h-full">
                <div className="border border-border/40 p-8 hover:border-wsa-red/30 transition-colors h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{office.flag}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-wsa-navy">{office.country}</h3>
                      <p className="text-sm text-muted-foreground">{office.label}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 flex items-start gap-2 flex-1">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    {office.address}
                  </p>
                  <div className="space-y-2 mt-auto">
                    {office.phone && (
                      <a href={`tel:${office.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-wsa-navy transition-colors">
                        <Phone size={13} />
                        {office.phone}
                      </a>
                    )}
                    <a
                      href={`https://wa.me/${office.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-green-600 transition-colors"
                    >
                      <Phone size={13} />
                      WhatsApp: {office.whatsapp}
                    </a>
                    <a href={`mailto:${office.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-wsa-navy transition-colors">
                      <Mail size={13} />
                      {office.email}
                    </a>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                We also support students in <span className="font-medium text-wsa-navy">Zambia, Malawi, Zimbabwe,</span> and <span className="font-medium text-wsa-navy">Angola</span>.
              </p>
            </div>
          </ScrollReveal>

          {/* Google Reviews — genuine reviews on Google, no content reproduced here */}
          <ScrollReveal>
            <div className="mt-16 border border-border/40 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 bg-wsa-cream/40">
              <div>
                <h3 className="text-xl font-semibold text-wsa-navy mb-2">What students say about us</h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed max-w-xl">
                  Read genuine, independent reviews from students and families on our Google profile — or leave one of your own after working with your counsellor.
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
              <div>
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
    </div>
  );
}
