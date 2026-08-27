import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { GraduationCap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { StudentForm } from "./Contact";

/**
 * In-portal "complete your application" — the counterpart to the public
 * /contact page for a student who's already signed in (light signup or
 * Google) but has no application on file yet. Auth-gated the same way
 * Portal.tsx is; redirects to /portal if the account is already linked
 * (nothing to complete) so this can't be reached as a second registration.
 */
export default function PortalApply() {
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

  const meQuery = trpc.portal.me.useQuery({ token: token ?? "" }, { enabled: !!token });
  const dashboardQuery = trpc.portal.dashboard.useQuery({ token: token ?? "" }, { enabled: !!token });

  useEffect(() => {
    if (meQuery.data === null || dashboardQuery.data?.status === "unauthenticated") {
      localStorage.removeItem("portal_token");
      localStorage.removeItem("portal_user");
      navigate("/portal/login");
      return;
    }
    // Already linked — nothing to complete, and this page must never act as
    // a second registration step. Straight back to the real dashboard.
    if (dashboardQuery.data?.status === "ok") {
      navigate("/portal");
    }
  }, [meQuery.data, dashboardQuery.data]);

  if (!checkedStorage || !token || !meQuery.data || dashboardQuery.data?.status !== "no_application") {
    return null;
  }

  const { firstName, lastName, email } = meQuery.data;

  return (
    <div className="min-h-screen bg-wsa-warm-white pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div className="container max-w-3xl">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-wsa-navy flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red">Complete Your Application</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.1] mb-4">
            Almost there, {firstName}.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Your account is set up. Complete the details below and a named Student Counsellor will be assigned to guide your application.
          </p>
        </div>
        <div className="bg-white border border-border/70 p-8 md:p-10">
          <StudentForm
            portalMode={{
              token,
              firstName,
              lastName,
              email,
              onSuccess: () => navigate("/portal"),
            }}
          />
        </div>
      </div>
    </div>
  );
}
