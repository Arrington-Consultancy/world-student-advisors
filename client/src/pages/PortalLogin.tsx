import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortalAuthShell } from "@/components/PortalBrandShell";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff } from "lucide-react";

type LoginErrorNotice = {
  message: string;
  contactLabel?: string;
};

export function getLoginErrorNotice(oauthError: string | null): LoginErrorNotice | null {
  if (!oauthError) return null;

  const messages: Record<string, LoginErrorNotice> = {
    google_denied: { message: "Google sign-in was cancelled." },
    google_token: { message: "Could not complete Google sign-in. Please try again." },
    google_verify: { message: "Google sign-in verification failed. Please try again." },
    google_claims: { message: "Google did not provide the required account information." },
    google_account: { message: "We couldn't access your student portal account. Please contact support." },
    google_no_account: {
      message:
        "No student portal account exists for that Google account. Please contact WSA to complete your registration.",
      contactLabel: "Complete registration",
    },
    google_account_inactive: {
      message: "Your student portal account is inactive. Please contact WSA for help reactivating it.",
      contactLabel: "Contact WSA",
    },
    google_account_conflict: {
      message:
        "We couldn't sign you in because this Google account does not match your student portal account details. Please contact WSA for assistance.",
      contactLabel: "Contact WSA",
    },
  };

  return messages[oauthError] ?? { message: "Google sign-in failed. Please try again." };
}

/** Navigates to the Google OAuth start endpoint. Call from an event handler only — never during render. */
function startGoogleLogin() {
  const origin = window.location.origin;
  const nonce = crypto.randomUUID();
  // Bind the nonce to this browser tab so the callback can verify it
  document.cookie = `__Host-portal_oauth_state=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  window.location.href = `/api/portal/auth/google?origin=${encodeURIComponent(origin)}`;
}

export default function PortalLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<LoginErrorNotice | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return getLoginErrorNotice(params.get("error"));
  });

  // Handle token delivered by the Google OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const oauthError = params.get("error");

    if (token) {
      // Store the portal JWT and navigate to the portal
      localStorage.setItem("portal_token", token);
      // We don't have the user object here, but the portal dashboard will
      // fetch it from the JWT on load
      navigate("/portal");
      return;
    }

    if (oauthError) setError(getLoginErrorNotice(oauthError));
  }, [navigate]);

  const loginMutation = trpc.portal.login.useMutation({
    onSuccess: (data) => {
      if (data.success && data.token) {
        localStorage.setItem("portal_token", data.token);
        localStorage.setItem("portal_user", JSON.stringify(data.user));
        navigate("/portal");
      } else {
        setError({ message: data.error || "Login failed" });
      }
    },
    onError: () => setError({ message: "Something went wrong. Please try again." }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate({ email, password });
  };

  return (
    <PortalAuthShell title="Student Portal" description="Sign in to access your resources and tools.">
        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <p>{error.message}</p>
              {error.contactLabel && (
                <Link href="/contact" className="mt-2 inline-block font-medium underline">
                  {error.contactLabel}
                </Link>
              )}
            </div>
          )}

          {/* Google sign-in */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 flex items-center justify-center gap-3 border-gray-300"
            onClick={() => startGoogleLogin()}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-wsa-red hover:bg-wsa-red/90 text-white"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center space-y-2 pt-2">
            <Link href="/portal/reset-password" className="text-sm text-wsa-red hover:underline block">
              Forgot your password?
            </Link>
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <Link href="/contact" className="text-wsa-red hover:underline">
                Apply Now
              </Link>
            </p>
          </div>
        </div>
    </PortalAuthShell>
  );
}
