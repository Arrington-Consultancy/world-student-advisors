import { useState, useEffect } from "react";
import type React from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Mic, LogOut, ChevronRight, Video, Users, Phone, Mail, Clock, ShieldCheck } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/socialLinks";
import { trpc } from "@/lib/trpc";

/** Mirrors server/portal-stages.ts's STAGE_DISPLAY entry count — keep in sync. */
const TOTAL_STAGES = 6;

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-wsa-warm-white pt-32 pb-20 flex items-center justify-center p-4">
      <div className="text-center">{children}</div>
    </div>
  );
}

/**
 * Auth-gated: this page requires a valid portal session. No visitor — logged
 * out, or logged in with a database/Pipedrive outage — ever sees the
 * resource-hub content below by accident. See server/routers.ts's
 * portal.dashboard for the exact status states this renders.
 */
export default function Portal() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("portal_token");
    if (!stored) {
      navigate("/portal/login");
      return;
    }
    setToken(stored);
    setCheckedStorage(true);
  }, []);

  const dashboardQuery = trpc.portal.dashboard.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  useEffect(() => {
    if (dashboardQuery.data?.status === "unauthenticated") {
      localStorage.removeItem("portal_token");
      localStorage.removeItem("portal_user");
      navigate("/portal/login");
    }
  }, [dashboardQuery.data]);

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_user");
    navigate("/");
  };

  // Redirecting to login, or haven't checked localStorage yet — render
  // nothing rather than flash any portal content.
  if (!checkedStorage || !token) {
    return null;
  }

  if (dashboardQuery.isLoading) {
    return (
      <PortalShell>
        <p className="text-gray-500">Loading your portal…</p>
      </PortalShell>
    );
  }

  if (dashboardQuery.data?.status === "unauthenticated") {
    return null; // redirecting via the effect above
  }

  // Real account, but no application on file yet (e.g. signed in with
  // Google but hasn't submitted the full WSA registration form) — not an
  // outage, so it gets its own friendlier, actionable message rather than
  // the "temporarily unavailable" copy below.
  if (dashboardQuery.data?.status === "no_application") {
    return (
      <PortalShell>
        <GraduationCap className="w-10 h-10 text-wsa-navy mx-auto mb-3" />
        <h1 className="text-xl font-bold text-wsa-navy mb-2">
          {dashboardQuery.data.name ? `Welcome, ${dashboardQuery.data.name}!` : "Almost there!"}
        </h1>
        <p className="text-gray-600 max-w-sm mx-auto mb-6">
          We don't have an application on file for this account yet. Complete your registration to unlock your student dashboard.
        </p>
        <Link href="/contact">
          <Button className="bg-wsa-red hover:bg-wsa-red/90 text-white">Start Your Application</Button>
        </Link>
      </PortalShell>
    );
  }

  // Database unavailable. Never falls back to the resource-hub content
  // below — an authenticated student on a down database sees this, not an
  // ungated version of the portal.
  if (!dashboardQuery.data || dashboardQuery.data.status === "unavailable" || dashboardQuery.isError) {
    return (
      <PortalShell>
        <GraduationCap className="w-10 h-10 text-wsa-navy mx-auto mb-3" />
        <h1 className="text-xl font-bold text-wsa-navy mb-2">Student Portal temporarily unavailable</h1>
        <p className="text-gray-600 max-w-sm mx-auto">
          We're unable to load your portal right now. Please try again shortly, or contact your Student Counsellor directly.
        </p>
      </PortalShell>
    );
  }

  const { name, progress } = dashboardQuery.data;

  return (
    <div className="min-h-screen bg-wsa-warm-white pt-32 pb-20 lg:pt-40 lg:pb-28">
      <main className="container">
        <div className="mb-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-5 text-sm font-medium tracking-[0.2em] uppercase text-wsa-red">Interview Readiness Coach (IRC)</p>
            <h1 className="mb-5 text-4xl font-semibold leading-[1.08] text-wsa-navy md:text-5xl">
              Welcome back, {name}.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-gray-600">
              Your WSA tools, resources and adviser-led next steps are gathered here so your study abroad journey stays clear.
            </p>
          </div>
          <div className="border-t-2 border-wsa-red/20 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-wsa-red" />
              <p className="text-sm font-semibold text-wsa-navy">Personal Student Counsellor support</p>
            </div>
            <p className="mb-5 text-sm leading-6 text-gray-600">
              Use the portal alongside your named WSA adviser. For decisions, documents and applications, your counsellor remains your first point of contact.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/contact">
                <Button className="bg-wsa-red hover:bg-wsa-red/90 text-white">Apply Now</Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-wsa-navy/20 text-wsa-navy hover:border-wsa-red hover:text-wsa-red"
              >
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Student Resource Centre */}
          <Link href="/portal/resources">
            <div className="bg-white border border-border/70 p-8 cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-wsa-navy flex items-center justify-center shrink-0">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-wsa-navy mb-2 group-hover:text-wsa-red transition-colors">
                    Student Resource Centre
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Guides, videos, podcasts, and downloads to support you at every stage of your journey.
                  </p>
                  <div className="flex items-center text-wsa-red text-sm font-medium">
                    Explore Resources <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Media Library */}
          <Link href="/portal/library">
            <div className="bg-white border border-border/70 p-8 cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-wsa-red flex items-center justify-center shrink-0">
                  <Video className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-wsa-navy mb-2 group-hover:text-wsa-red transition-colors">
                    Media Library
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Every WSA video and podcast episode, unlocked. Visa guides, interview preparation, university profiles, and more.
                  </p>
                  <div className="flex items-center text-wsa-red text-sm font-medium">
                    Watch Now <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Interview Readiness Coach */}
          <Link href="/portal/interview-coach">
            <div className="bg-white border border-border/70 p-8 cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-wsa-navy flex items-center justify-center shrink-0">
                  <Mic className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-wsa-navy mb-2 group-hover:text-wsa-red transition-colors">
                    AI Interview Coach
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Practise CAS, UKVI, university, and course interviews. Marked against an 85% pass mark with honest feedback — never model answers.
                  </p>
                  <div className="flex items-center text-wsa-red text-sm font-medium">
                    Start Practising <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Community & Alumni */}
          <div className="bg-white border border-border/70 p-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-wsa-red flex items-center justify-center shrink-0">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-wsa-navy mb-2">Community & Alumni</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Connect with fellow students and alumni through the International Friendship Society and WSA's social channels.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href={SOCIAL_LINKS.friendshipSociety} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 bg-wsa-navy text-white text-xs font-medium rounded-lg hover:bg-wsa-navy/90 transition-colors">
                    International Friendship Society
                  </a>
                  <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg text-gray-700 hover:border-wsa-red hover:text-wsa-red transition-colors">
                    Facebook
                  </a>
                  <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg text-gray-700 hover:border-wsa-red hover:text-wsa-red transition-colors">
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Your Progress — live from Pipedrive at read time, never cached/stored */}
        <div className="mt-12 bg-white border border-border/70 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h3 className="text-xl font-bold text-wsa-navy mb-6">Your Progress</h3>

          {progress.state === "pipedrive_unavailable" && (
            <div className="flex items-center gap-3 text-gray-500">
              <Clock className="w-5 h-5 shrink-0" />
              <p className="text-sm">Your live progress is temporarily unavailable. Please check back shortly.</p>
            </div>
          )}

          {progress.state === "no_record" && (
            <p className="text-sm text-gray-600">
              We don't have an active enquiry on file for your account yet. If you've just signed up, this can take a little time to appear.
            </p>
          )}

          {progress.state === "resolved" && (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-lg font-semibold text-wsa-navy">{progress.stageLabel}</p>
                {progress.position > 0 && (
                  <p className="text-xs text-gray-500">Step {progress.position} of {TOTAL_STAGES}</p>
                )}
              </div>
              {progress.position > 0 && (
                <div className="w-full h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-wsa-red rounded-full"
                    style={{ width: `${(progress.position / TOTAL_STAGES) * 100}%` }}
                  />
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">{progress.nextAction}</p>
              {progress.counsellor && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Your Student Counsellor:</span> {progress.counsellor}
                </p>
              )}
            </>
          )}
        </div>

        {/* Need Help — helpline contact details */}
        <div className="mt-12 bg-wsa-navy p-8 text-white shadow-[0_18px_60px_rgba(15,23,42,0.14)]">
          <h3 className="text-xl font-bold mb-2">Need help?</h3>
          <p className="text-white/70 text-sm mb-6">
            Your Student Counsellor is your first point of contact. You can also reach our offices directly.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-semibold mb-1.5">United Kingdom (HQ)</p>
              <p className="flex items-center gap-2 text-white/80 mb-1"><Phone className="w-3.5 h-3.5 shrink-0" /> WhatsApp: +44 791 479 7830</p>
              <a href="mailto:UKHeadOffice@worldstudentadvisors.com" className="flex items-center gap-2 text-white/80 hover:text-white break-all"><Mail className="w-3.5 h-3.5 shrink-0" /> UKHeadOffice@worldstudentadvisors.com</a>
            </div>
            <div>
              <p className="font-semibold mb-1.5">Kenya</p>
              <p className="flex items-center gap-2 text-white/80 mb-1"><Phone className="w-3.5 h-3.5 shrink-0" /> +254 702 096 419</p>
              <a href="mailto:KenyaOffice@worldstudentadvisors.com" className="flex items-center gap-2 text-white/80 hover:text-white break-all"><Mail className="w-3.5 h-3.5 shrink-0" /> KenyaOffice@worldstudentadvisors.com</a>
            </div>
            <div>
              <p className="font-semibold mb-1.5">Nigeria</p>
              <p className="flex items-center gap-2 text-white/80 mb-1"><Phone className="w-3.5 h-3.5 shrink-0" /> WhatsApp: +234 812 929 2769</p>
              <a href="mailto:NigeriaOffice@worldstudentadvisors.com" className="flex items-center gap-2 text-white/80 hover:text-white break-all"><Mail className="w-3.5 h-3.5 shrink-0" /> NigeriaOffice@worldstudentadvisors.com</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
