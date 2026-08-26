import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, LogOut, Search, Video, Mic, Users } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/socialLinks";

interface PortalUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

interface LibraryVideo {
  title: string;
  youtubeId: string;
  duration: string;
  summary: string;
  category: string;
  kind: "video" | "podcast";
}

/**
 * Full WSA media library, available to signed-in portal students.
 * Includes every video and podcast episode from the public site
 * (both the four free items and all portal-gated content).
 */
const LIBRARY: LibraryVideo[] = [
  { title: "The Student Journey: From First Enquiry to Graduation", youtubeId: "ADQ1h0Ofhik", duration: "11:49", summary: "A complete walkthrough of what happens when you study abroad with WSA, from your first question to graduation day. Presented by Tim Hunt.", category: "Getting Started", kind: "podcast" },
  { title: "Ten Steps to UK University Success", youtubeId: "6a7do5dlbOI", duration: "2:57", summary: "A concise overview of the ten key steps from initial research to successful enrolment at a UK university.", category: "Getting Started", kind: "podcast" },
  { title: "UK Student Visa 2026–27 Guide", youtubeId: "RAqz0qd34OA", duration: "8:15", summary: "CAS, bank statements, TB test, IHS, and Graduate Visa advice for the 2026–27 cycle.", category: "Visas & Immigration", kind: "podcast" },
  { title: "Credibility Interviews: How to Prepare for Your CAS & UKVI Interview", youtubeId: "jqaNY_UTekc", duration: "8:11", summary: "What to expect from a credibility interview, how to prepare, and what the interviewer is looking for.", category: "Visas & Immigration", kind: "podcast" },
  { title: "Your Personal Guide to Applying for a UK English Study Visa", youtubeId: "iYvDj1cYrhc", duration: "3:54", summary: "Requirements and timeline for English language study visas.", category: "Visas & Immigration", kind: "podcast" },
  { title: "Guide for International Students: UK Visa, Bank Statements, CAS & Health Charge", youtubeId: "kwxnOj3FXYw", duration: "6:50", summary: "What you need to know about finances and documents for your UK student visa.", category: "Visas & Immigration", kind: "podcast" },
  { title: "Writing a Personal Statement: What UK Universities Expect", youtubeId: "Uwz3OWh8rWA", duration: "3:19", summary: "What admissions teams look for in a personal statement and common mistakes to avoid.", category: "Applications", kind: "podcast" },
  { title: "How to Pass Your UK University Interview", youtubeId: "kYb7iXC2vb4", duration: "4:03", summary: "Interview tips for Nursing, Teaching & Social Work programmes.", category: "Applications", kind: "podcast" },
  { title: "How to Apply for a PhD: A Complete Guide for International Students", youtubeId: "Jo4cT1dC2tc", duration: "1:59", summary: "Finding supervisors, writing research proposals, funding options, and what universities look for in doctoral candidates.", category: "Applications", kind: "video" },
  { title: "Can You Work While You Study? UK Rules for International Students", youtubeId: "qx2yZo3UrM0", duration: "2:39", summary: "UK work rights for international students: allowed hours, permitted work types, and balancing study with employment.", category: "Getting Started", kind: "video" },
  { title: "Study in Hungary 2026–2027: University of Debrecen Guide", youtubeId: "cSEZdgQQR4o", duration: "8:57", summary: "A complete guide to studying at the University of Debrecen in Hungary.", category: "Study Destinations", kind: "video" },
  { title: "An Outstanding UK Study Opportunity: the University of Lincoln", youtubeId: "zm35CMrUAy4", duration: "7:58", summary: "Why the University of Lincoln is an excellent choice for international students.", category: "Study Destinations", kind: "video" },
  { title: "I Would Like to Introduce Aberystwyth University", youtubeId: "r5Dv1BN9G1E", duration: "8:01", summary: "Aberystwyth University: location, programmes, and merit-based awards.", category: "Study Destinations", kind: "video" },
  { title: "Meet Juliet Nnajiofor-Uyi. Lagos, Nigeria", youtubeId: "SZjjr2T3qTU", duration: "2:17", summary: "Juliet introduces herself and how she supports students through applications.", category: "Meet the Team", kind: "video" },
  { title: "Free Accommodation & Up to £3,000 Tuition Discount: Apply to Aberystwyth", youtubeId: "uGX64BevGT8", duration: "7:19", summary: "Scholarship and accommodation offers available when applying to Aberystwyth University through WSA.", category: "Study Destinations", kind: "video" },
  { title: "Zero-Cost Student Housing? Discover Aberystwyth University", youtubeId: "Lb2LDo9Dg6w", duration: "7:14", summary: "How Aberystwyth's accommodation offers can dramatically reduce your cost of studying in the UK.", category: "Study Destinations", kind: "video" },
  { title: "How to Apply for a UK Visitor's Visa: 90-Second Podcast", youtubeId: "JgJuzfEDJNo", duration: "4:13", summary: "The UK Visitor's Visa explained: who needs one, what documents are required, and how to apply.", category: "Visas & Immigration", kind: "podcast" },
  { title: "Your Ideal Student Accommodation Made Easy", youtubeId: "2DSn1BWy54M", duration: "1:55", summary: "How WSA helps you find and secure the right student accommodation.", category: "Getting Started", kind: "video" },
  { title: "UCLan Cyprus: The British University of Cyprus", youtubeId: "MchRH2L-Ulg", duration: "8:27", summary: "An introduction to UCLan Cyprus: UK-quality degrees at significantly lower cost.", category: "Study Destinations", kind: "video" },
  { title: "The First British University in Cyprus", youtubeId: "ZImEfcQdeqo", duration: "8:27", summary: "Discover the British University in Cyprus and its UK-validated degree programmes.", category: "Study Destinations", kind: "video" },
  { title: "UK Student Visa Explained: Bank Statement, IHS and Overall Costs", youtubeId: "yHa95atMY7E", duration: "5:56", summary: "A clear breakdown of the financial requirements behind a UK student visa application.", category: "Visas & Immigration", kind: "podcast" },
  { title: "Introducing the First British University in Cyprus", youtubeId: "ff_fyui8Uws", duration: "8:05", summary: "Why the British University in Cyprus is an excellent lower-cost route to a UK degree.", category: "Study Destinations", kind: "video" },
  { title: "Discover Cyprus West University", youtubeId: "xlJOfunvQYM", duration: "6:18", summary: "A tour of Cyprus West University: practical learning, English-taught degrees, and competitive fees.", category: "Study Destinations", kind: "video" },
  { title: "Pre-Departure for International Students", youtubeId: "rBBAqocqeoY", duration: "3:48", summary: "What to prepare before you fly: documents, packing, money, and your first week abroad.", category: "Getting Started", kind: "podcast" },
  { title: "WSA Code of Conduct and Trust Policy", youtubeId: "4Qh-fbvTPYY", duration: "3:04", summary: "The standards and ethics that govern how WSA counsellors work with students and families.", category: "Getting Started", kind: "podcast" },
  { title: "The Real Costs of Studying Abroad: What You Need to Know", youtubeId: "7hEjR19N4O8", duration: "3:59", summary: "Tuition, living costs, visa fees, and the hidden extras: budgeting honestly for study abroad.", category: "Getting Started", kind: "podcast" },
  { title: "Your Path to a UK Hybrid Undergraduate Degree", youtubeId: "XW4DsdHKRSc", duration: "3:44", summary: "How hybrid study routes can lower the cost of a UK undergraduate degree.", category: "Applications", kind: "podcast" },
  { title: "Reasons to Choose World Student Advisors as Your University Consultant", youtubeId: "aiSXhUTgMKw", duration: "2:07", summary: "What makes WSA different: named counsellors, ethical guidance, and end-to-end support.", category: "Getting Started", kind: "podcast" },
  { title: "Choosing Your Academic Path: Foundation and Undergraduate Courses Explained", youtubeId: "WqNU_CRy_p8", duration: "2:51", summary: "Understanding the difference between Foundation and direct undergraduate entry, and which suits you.", category: "Applications", kind: "podcast" },
];

const CATEGORIES = ["Getting Started", "Visas & Immigration", "Applications", "Study Destinations", "Meet the Team"];

export default function PortalLibrary() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    const userStr = localStorage.getItem("portal_user");
    // Open access: no login required. Personalise only when a session exists.
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_user");
    setUser(null);
    navigate("/");
  };

  const filtered = useMemo(() => {
    return LIBRARY.filter((v) => {
      if (selectedCategory && v.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return v.title.toLowerCase().includes(q) || v.summary.toLowerCase().includes(q);
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-wsa-warm-white pt-32 pb-20 lg:pt-40 lg:pb-28">
      <main className="container">
        <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Link href="/portal" className="mb-6 inline-flex items-center text-sm font-medium text-gray-600 hover:text-wsa-red">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Portal
            </Link>
            <p className="mb-5 text-sm font-medium tracking-[0.2em] uppercase text-wsa-red">Media Library</p>
            <h1 className="mb-5 text-4xl font-semibold leading-[1.08] text-wsa-navy md:text-5xl">
              WSA videos and podcasts, in one place.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-gray-600">
              Watch practical guidance from the WSA team covering applications, visas, destinations, interviews and life as an international student.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact">
              <Button className="bg-wsa-red hover:bg-wsa-red/90 text-white">Apply Now</Button>
            </Link>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-wsa-navy/20 text-wsa-navy hover:border-wsa-red hover:text-wsa-red"
              >
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            )}
          </div>
        </div>

        {/* Search and category filter */}
        <div className="bg-white p-6 mb-8 border border-border/70 shadow-[0_14px_50px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search videos and podcasts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${!selectedCategory ? "bg-wsa-navy text-white" : "bg-wsa-stone text-gray-700 hover:bg-wsa-cream"}`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedCategory === cat ? "bg-wsa-navy text-white" : "bg-wsa-stone text-gray-700 hover:bg-wsa-cream"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Video grid */}
        {filtered.length === 0 ? (
          <div className="bg-white p-12 text-center border border-border/70">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No results found</h3>
            <p className="text-gray-500">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((v) => (
              <div key={v.youtubeId} className="bg-white border border-border/70 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_46px_rgba(15,23,42,0.06)]">
                <div className="relative aspect-video bg-black">
                  {playingId === v.youtubeId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${v.youtubeId}?autoplay=1`}
                      title={v.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <button
                      onClick={() => setPlayingId(v.youtubeId)}
                      className="w-full h-full relative group"
                      aria-label={`Play ${v.title}`}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center shadow group-hover:scale-105 transition-transform">
                          <Video className="text-wsa-navy" size={22} />
                        </span>
                      </span>
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${v.kind === "podcast" ? "bg-purple-100 text-purple-700" : "bg-red-100 text-red-700"}`}>
                      {v.kind === "podcast" ? <Mic size={10} /> : <Video size={10} />}
                      {v.kind === "podcast" ? "Podcast" : "Video"}
                    </span>
                    <span className="text-xs text-gray-400">{v.duration}</span>
                    <span className="text-xs text-gray-400">• {v.category}</span>
                  </div>
                  <h3 className="font-semibold text-wsa-navy text-sm leading-snug mb-1">{v.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{v.summary}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alumni / community links */}
        <div className="mt-12 bg-white border border-border/70 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-wsa-navy flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-wsa-navy mb-2">Join the WSA community</h3>
              <p className="text-gray-600 text-sm mb-4">
                Connect with fellow students and alumni through the International Friendship Society, and follow WSA for updates, events, and opportunities.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={SOCIAL_LINKS.friendshipSociety} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 bg-wsa-navy text-white text-sm font-medium rounded-lg hover:bg-wsa-navy/90 transition-colors">
                  International Friendship Society
                </a>
                <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-700 hover:border-wsa-red hover:text-wsa-red transition-colors">
                  WSA on Facebook
                </a>
                <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-700 hover:border-wsa-red hover:text-wsa-red transition-colors">
                  WSA on LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
