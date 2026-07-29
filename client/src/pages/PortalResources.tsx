import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap,
  BookOpen,
  Mic,
  Video,
  FileText,
  Download,
  Search,
  ChevronRight,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/socialLinks";

// Resource categories from the brief
const CATEGORIES = [
  { id: "explore-options", label: "Explore Your Options", icon: "🔍" },
  { id: "prepare-application", label: "Prepare Your Application", icon: "📝" },
  { id: "receive-offer", label: "Receive Your Offer", icon: "🎉" },
  { id: "student-visa", label: "Student Visa", icon: "🛂" },
  { id: "before-travel", label: "Before You Travel", icon: "✈️" },
  { id: "while-studying", label: "While You're Studying", icon: "📚" },
  { id: "graduation-beyond", label: "Graduation and Beyond", icon: "🎓" },
];

// Resource types with icons
const RESOURCE_TYPES = [
  { id: "podcast", label: "Podcast", icon: Mic, color: "text-purple-600 bg-purple-100" },
  { id: "guide", label: "Guide", icon: BookOpen, color: "text-blue-600 bg-blue-100" },
  { id: "video", label: "Video", icon: Video, color: "text-red-600 bg-red-100" },
  { id: "download", label: "Download", icon: Download, color: "text-green-600 bg-green-100" },
];

// Portal resources organized by category.
// Video resources carry a youtubeId and are embedded inside the portal (brief S15):
// portal-only videos are watchable here after login, not on the public site.
const SAMPLE_RESOURCES: {
  id: number;
  title: string;
  category: string;
  type: string;
  summary: string;
  youtubeId?: string;
  duration?: string;
  externalUrl?: string;
  externalLabel?: string;
}[] = [
  // Explore Your Options
  { id: 1, title: "Career Guidance", category: "explore-options", type: "guide", summary: "Explore career paths and understand how your study choices connect to your professional goals." },
  { id: 2, title: "Which Country Should I Choose?", category: "explore-options", type: "guide", summary: "Compare study destinations including the UK, USA, Canada, Europe, and Australia." },
  { id: 3, title: "Choosing the Right University", category: "explore-options", type: "guide", summary: "Key factors to consider when selecting your ideal university." },
  { id: 4, title: "Choosing the Right Course", category: "explore-options", type: "guide", summary: "How to match your interests and career goals with the right programme." },
  { id: 5, title: "Foundation Programmes", category: "explore-options", type: "guide", summary: "Everything you need to know about international foundation programmes." },
  { id: 6, title: "Undergraduate Study", category: "explore-options", type: "guide", summary: "A complete guide to undergraduate degree options abroad." },
  { id: 7, title: "Master's Programmes", category: "explore-options", type: "guide", summary: "Explore postgraduate master's degree opportunities." },
  { id: 8, title: "PhD Research", category: "explore-options", type: "guide", summary: "How to apply for a PhD and what to expect from doctoral research." },
  // Prepare Your Application
  { id: 9, title: "University CV", category: "prepare-application", type: "guide", summary: "How to write an effective academic CV for university applications." },
  { id: 10, title: "Personal Statement", category: "prepare-application", type: "guide", summary: "Step-by-step guide to writing a compelling personal statement." },
  { id: 11, title: "References", category: "prepare-application", type: "guide", summary: "Who to ask and how to prepare strong academic references." },
  { id: 12, title: "Document Preparation", category: "prepare-application", type: "download", summary: "Checklist and templates for preparing your application documents." },
  { id: 13, title: "English Language Tests", category: "prepare-application", type: "guide", summary: "IELTS, TOEFL, and other English language requirements explained." },
  { id: 14, title: "Meeting Entry Requirements", category: "prepare-application", type: "guide", summary: "Understanding and meeting academic entry requirements." },
  // Receive Your Offer
  { id: 15, title: "Conditional Offers", category: "receive-offer", type: "guide", summary: "What a conditional offer means and what you need to do next." },
  { id: 16, title: "Paying Your Deposit", category: "receive-offer", type: "guide", summary: "Understanding deposits, deadlines, and payment methods." },
  { id: 17, title: "Meeting Outstanding Conditions", category: "receive-offer", type: "guide", summary: "How to meet the conditions of your offer." },
  { id: 18, title: "Unconditional Offers", category: "receive-offer", type: "guide", summary: "What happens when you receive an unconditional offer." },
  { id: 19, title: "Understanding CAS", category: "receive-offer", type: "guide", summary: "Your Confirmation of Acceptance for Studies explained." },
  // Student Visa
  { id: 20, title: "Bank Statements", category: "student-visa", type: "guide", summary: "Financial evidence requirements for your student visa." },
  { id: 21, title: "CAS Interview", category: "student-visa", type: "video", summary: "Preparing for your CAS credibility interview.", youtubeId: "jqaNY_UTekc", duration: "8:11" },
  { id: 22, title: "Professional Interviews", category: "student-visa", type: "video", summary: "What to expect from professional and course-specific interviews.", youtubeId: "kYb7iXC2vb4", duration: "4:03" },
  { id: 23, title: "Applying for Your Visa", category: "student-visa", type: "guide", summary: "Step-by-step guide to the student visa application process." },
  { id: 24, title: "Immigration Health Surcharge", category: "student-visa", type: "guide", summary: "Understanding the IHS payment and what it covers." },
  // Before You Travel
  { id: 25, title: "Accommodation", category: "before-travel", type: "guide", summary: "Finding and securing student accommodation." },
  { id: 26, title: "Flights", category: "before-travel", type: "guide", summary: "Booking flights and travel planning tips." },
  { id: 27, title: "Airport Transfers", category: "before-travel", type: "guide", summary: "Getting from the airport to your accommodation." },
  { id: 28, title: "Packing", category: "before-travel", type: "download", summary: "Essential packing list for international students." },
  { id: 29, title: "Arrival Checklist", category: "before-travel", type: "download", summary: "Everything you need to do in your first week." },
  // While You're Studying
  { id: 30, title: "Working While Studying", category: "while-studying", type: "guide", summary: "Understanding work rights and finding part-time employment." },
  { id: 31, title: "Staying in Touch with WSA", category: "while-studying", type: "guide", summary: "How your counsellor continues to support you during your studies." },
  { id: 32, title: "Student Wellbeing", category: "while-studying", type: "guide", summary: "Mental health support and wellbeing resources." },
  { id: 33, title: "Renewing Visas", category: "while-studying", type: "guide", summary: "How to extend or renew your student visa." },
  { id: 34, title: "Academic Support", category: "while-studying", type: "guide", summary: "Getting help with your studies and academic challenges." },
  // Graduation and Beyond
  { id: 35, title: "Inviting Family", category: "graduation-beyond", type: "guide", summary: "How to invite family to your graduation ceremony." },
  { id: 36, title: "Graduate Visa", category: "graduation-beyond", type: "guide", summary: "Post-study work visa options and how to apply." },
  { id: 37, title: "Careers", category: "graduation-beyond", type: "guide", summary: "Career planning and job search support after graduation." },
  { id: 38, title: "Alumni & International Friendship Society", category: "graduation-beyond", type: "guide", summary: "Join the WSA alumni network and connect with the International Friendship Society community on Facebook.", externalUrl: SOCIAL_LINKS.friendshipSociety, externalLabel: "Join the International Friendship Society" },
  // Portal-only video library (gated on the public site per brief S14/S15)
  { id: 39, title: "UK Student Visa 2026–27 Guide", category: "student-visa", type: "video", summary: "CAS, bank statements, TB test, IHS, and Graduate Visa advice for 2026–27.", youtubeId: "RAqz0qd34OA", duration: "8:15" },
  { id: 40, title: "Guide for International Students: UK Visa, Bank Statements, CAS & Health Charge", category: "student-visa", type: "video", summary: "What you need to know about finances and documents for your UK student visa.", youtubeId: "kwxnOj3FXYw", duration: "6:50" },
  { id: 41, title: "Your Personal Guide to Applying for a UK English Study Visa", category: "student-visa", type: "video", summary: "Requirements and timeline for English language study visas.", youtubeId: "iYvDj1cYrhc", duration: "3:54" },
  { id: 42, title: "Ten Steps to UK University Success", category: "explore-options", type: "video", summary: "The ten key steps from initial research to successful enrolment at a UK university.", youtubeId: "6a7do5dlbOI", duration: "2:57" },
  { id: 43, title: "Study in Hungary 2026–2027: University of Debrecen Guide", category: "explore-options", type: "video", summary: "A complete guide to studying at the University of Debrecen in Hungary.", youtubeId: "cSEZdgQQR4o", duration: "8:57" },
  { id: 44, title: "An Outstanding UK Study Opportunity: the University of Lincoln", category: "explore-options", type: "video", summary: "Why the University of Lincoln is an excellent choice for international students.", youtubeId: "zm35CMrUAy4", duration: "7:58" },
  { id: 45, title: "I Would Like to Introduce Aberystwyth University", category: "explore-options", type: "video", summary: "Aberystwyth University: location, programmes, merit-based awards.", youtubeId: "r5Dv1BN9G1E", duration: "8:01" },
  { id: 46, title: "Meet Juliet Nnajiofor-Uyi. Lagos, Nigeria", category: "explore-options", type: "video", summary: "Juliet introduces herself and how she supports students through applications.", youtubeId: "SZjjr2T3qTU", duration: "2:17" },
];

interface PortalUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export default function PortalResources() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [openVideoId, setOpenVideoId] = useState<number | null>(null);

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

  const filteredResources = useMemo(() => {
    return SAMPLE_RESOURCES.filter((r) => {
      if (selectedCategory && r.category !== selectedCategory) return false;
      if (selectedType && r.type !== selectedType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q);
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedType]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Portal Header */}
      <header className="bg-wsa-navy text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            <div>
              <h1 className="text-lg font-bold">Student Resource Centre</h1>
              <p className="text-sm text-white/70">Guides, videos, podcasts and downloads</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/portal" className="text-sm text-white/80 hover:text-white">
              ← Back to Portal
            </Link>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-white/30 text-white hover:bg-white/10"
              >
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {RESOURCE_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(selectedType === type.id ? null : type.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedType === type.id
                        ? "bg-wsa-navy text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Category Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Categories</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      !selectedCategory ? "bg-wsa-navy text-white" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    All Resources
                  </button>
                </li>
                {CATEGORIES.map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        selectedCategory === cat.id ? "bg-wsa-navy text-white" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span className="mr-2">{cat.icon}</span>
                      {cat.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Resource Grid */}
          <div className="flex-1">
            {selectedCategory && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-wsa-navy">
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                </h2>
              </div>
            )}

            {filteredResources.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No resources found</h3>
                <p className="text-gray-500">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredResources.map((resource) => {
                  const typeInfo = RESOURCE_TYPES.find((t) => t.id === resource.type);
                  const TypeIcon = typeInfo?.icon || FileText;
                  const isPlayableVideo = Boolean(resource.youtubeId);
                  const isOpen = openVideoId === resource.id;
                  return (
                    <div
                      key={resource.id}
                      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all group ${isPlayableVideo ? "cursor-pointer" : ""} ${isOpen ? "sm:col-span-2" : ""}`}
                      onClick={() => {
                        if (isPlayableVideo) setOpenVideoId(isOpen ? null : resource.id);
                      }}
                    >
                      {isOpen && resource.youtubeId && (
                        <div className="relative aspect-video mb-4 overflow-hidden rounded-lg bg-black" onClick={(e) => e.stopPropagation()}>
                          <iframe
                            src={`https://www.youtube.com/embed/${resource.youtubeId}?autoplay=1`}
                            title={resource.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${typeInfo?.color || "bg-gray-100 text-gray-600"}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-wsa-navy group-hover:text-wsa-red transition-colors text-sm">
                            {resource.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{resource.summary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 capitalize">
                              {resource.type}
                            </span>
                            {resource.duration && (
                              <span className="text-xs text-gray-400">{resource.duration}</span>
                            )}
                            {isPlayableVideo && (
                              <span className="text-xs text-wsa-red font-medium">
                                {isOpen ? "Playing — click to close" : "Click to watch"}
                              </span>
                            )}
                          </div>
                          {resource.externalUrl && (
                            <a
                              href={resource.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 bg-wsa-navy text-white text-xs font-medium rounded-lg hover:bg-wsa-navy/90 transition-colors"
                            >
                              {resource.externalLabel || "Open link"}
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
