import { useState, useEffect, type FormEvent } from "react";
import {
  Lock, LogOut, Eye, EyeOff, ArrowLeft,
  MessageSquareText, GraduationCap, Users, Share2, Radio, FileCheck2, FolderOpen, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ChannelsPanel } from "@/components/staff/ChannelsPanel";
import { TeamPanel } from "@/components/staff/TeamPanel";
import { ContentCheckPanel } from "@/components/staff/ContentCheckPanel";
import { SocialMediaPanel } from "@/components/staff/SocialMediaPanel";
import { Receptionist } from "@/components/workforce/Receptionist";
import { AccessBanner } from "@/components/workforce/AccessBanner";
import { AccessAdmin } from "@/components/workforce/AccessAdmin";
import { StudentLookup } from "@/components/workforce/StudentLookup";
import { ResourcesPanel } from "@/components/workforce/ResourcesPanel";
import { UniversityPortalsPanel } from "@/components/workforce/UniversityPortalsPanel";

const PENDING_PROVIDER_KEY = "wsa-staff-pending-provider";
const STORAGE_KEY = "staff_portal_token";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-wsa-warm-white pt-32 pb-20 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

/**
 * Staff-only area, gated by a single shared password verified server-side
 * (server/staffPortalAuth.ts) against STAFF_PORTAL_PASSWORD_HASH. No
 * protected content is ever rendered client-side without the server first
 * confirming the session token — this is not a cosmetic client-side gate.
 *
 * Stage 1: the login gate and an empty placeholder only. The intended
 * university application portal directory is not built here — no source
 * data for it exists yet in the repository or the brief.
 */
export default function StaffPortal() {
  const [token, setToken] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem(STORAGE_KEY));
    setCheckedStorage(true);
  }, []);

  const meQuery = trpc.staffPortal.me.useQuery({ token: token ?? "" }, { enabled: !!token });
  const ssoStatusQuery = trpc.staffPortal.microsoftSsoStatus.useQuery();
  const googleStatusQuery = trpc.staffPortal.googleSsoStatus.useQuery();

  const microsoftLoginUrlMutation = trpc.staffPortal.microsoftLoginUrl.useMutation({
    onSuccess: data => {
      sessionStorage.setItem(PENDING_PROVIDER_KEY, "microsoft");
      window.location.href = data.authorizeUrl;
    },
  });

  // Both providers return to this same page with ?code&state, so the one
  // that started the redirect is remembered here. sessionStorage rather than
  // a query parameter: Google matches redirect_uri exactly, and a parameter
  // a person could edit is not a thing to route an auth callback on.
  const googleLoginUrlMutation = trpc.staffPortal.googleLoginUrl.useMutation({
    onSuccess: data => {
      sessionStorage.setItem(PENDING_PROVIDER_KEY, "google");
      window.location.href = data.authorizeUrl;
    },
  });

  // Work email and password: the third route in. Signup and reset collect an
  // address only. The password is chosen on the page the emailed link opens,
  // so the form here only ever reports that an email is on its way.
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [workEmail, setWorkEmail] = useState("");
  const [workPassword, setWorkPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // Set only when arriving on a link from an email. While it is set, the
  // page shows the set-password form and nothing else.
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkPurpose, setLinkPurpose] = useState<"signup" | "reset">("signup");
  const [linkEmail, setLinkEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const signUpMutation = trpc.staffPortal.signUpWithPassword.useMutation({
    onSuccess: data => { setNotice(data.message); setError(""); },
    onError: () => setError("Signup could not be completed. Please try again."),
  });

  const resetRequestMutation = trpc.staffPortal.requestPasswordReset.useMutation({
    onSuccess: data => { setNotice(data.message); setError(""); },
    onError: () => setError("That request could not be completed. Please try again."),
  });

  const passwordSignInMutation = trpc.staffPortal.passwordSignIn.useMutation({
    onSuccess: data => {
      if ("token" in data) {
        localStorage.setItem(STORAGE_KEY, data.token);
        setToken(data.token);
      } else {
        setError(data.error);
      }
    },
    onError: () => setError("Sign-in could not be completed. Please try again."),
  });

  // Checks the link without spending it, so a person who types a password
  // that is too short is told so and can try again on the same link.
  const checkLinkMutation = trpc.staffPortal.checkSignupLink.useMutation({
    onSuccess: (data, variables) => {
      if (data.valid) {
        setLinkToken(variables.token);
        setLinkPurpose(data.purpose === "reset" ? "reset" : "signup");
        setLinkEmail(data.email ?? "");
        setError("");
      } else {
        setError(data.reason ?? "That link is not valid.");
      }
    },
    onError: () => setError("That link could not be checked. Please try again."),
  });

  const setPasswordMutation = trpc.staffPortal.setPasswordFromLink.useMutation({
    onSuccess: data => {
      if (data.ok && data.token) {
        localStorage.setItem(STORAGE_KEY, data.token);
        setToken(data.token);
        setLinkToken(null);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        // A password the rules refuse is caught before the link is spent, so
        // the form stays open and the same link still works. Any other
        // refusal means the link is gone and the message says to start again.
        setError(data.reason ?? "That password could not be set.");
      }
    },
    onError: () => setError("That password could not be set. Please try again."),
  });

  const googleCallbackMutation = trpc.staffPortal.googleCallback.useMutation({
    onSuccess: data => {
      if (data.success) {
        localStorage.setItem(STORAGE_KEY, data.token);
        setToken(data.token);
      } else {
        setError(data.error);
      }
    },
    onError: () => setError("Google sign-in failed. Please try again."),
  });

  const microsoftCallbackMutation = trpc.staffPortal.microsoftCallback.useMutation({
    onSuccess: data => {
      if (data.success) {
        localStorage.setItem(STORAGE_KEY, data.token);
        setToken(data.token);
      } else {
        setError(data.error);
      }
    },
    onError: () => setError("Microsoft sign-in failed. Please try again."),
  });

  // Completes the Entra ID redirect: Microsoft returns here with ?code&state
  // in the query string. Handled once, then the params are stripped from
  // the URL so a page refresh doesn't try to replay a spent auth code.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get("verify");
    if (verify) {
      // Checked, not spent. The token is held in state rather than left in
      // the address bar, so it does not sit in browser history or get pasted
      // into a support chat along with the URL.
      checkLinkMutation.mutate({ token: verify });
      const vurl = new URL(window.location.href);
      vurl.searchParams.delete("verify");
      window.history.replaceState({}, "", vurl.toString());
      return;
    }
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      const provider = sessionStorage.getItem(PENDING_PROVIDER_KEY);
      sessionStorage.removeItem(PENDING_PROVIDER_KEY);
      if (provider === "google") {
        googleCallbackMutation.mutate({ code, state });
      } else {
        microsoftCallbackMutation.mutate({ code, state });
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      window.history.replaceState({}, "", url.toString());
    }
    // Runs once on mount only — this reads the initial redirect, not live state.
  }, []);

  useEffect(() => {
    if (meQuery.data && !meQuery.data.authenticated) {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
    }
  }, [meQuery.data]);

  const loginMutation = trpc.staffPortal.login.useMutation({
    onSuccess: data => {
      if (data.success) {
        localStorage.setItem(STORAGE_KEY, data.token);
        setToken(data.token);
        setPassword("");
      } else {
        setError(data.error);
      }
    },
    onError: () => setError("Something went wrong. Please try again."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ password });
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  };

  if (!checkedStorage) return null;

  const authenticated = !!token && meQuery.data?.authenticated === true;
  const checkingSession = !!token && meQuery.isLoading;

  if (checkingSession || microsoftCallbackMutation.isPending || googleCallbackMutation.isPending || checkLinkMutation.isPending) {
    return (
      <Shell>
        <p className="text-center text-gray-500">{microsoftCallbackMutation.isPending ? "Completing Microsoft sign-in…" : googleCallbackMutation.isPending ? "Completing Google sign-in…" : "Checking session…"}</p>
      </Shell>
    );
  }

  if (authenticated) {
    return <WorkforceHome token={token as string} onLogout={handleLogout} />;
  }

  // Arrived on a link from an email. This is where the password is chosen,
  // and it is the only place it ever is.
  if (linkToken) {
    const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
    return (
      <Shell>
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-6 bg-wsa-navy flex items-center justify-center">
            <Lock className="text-white" size={22} />
          </div>
          <h1 className="text-2xl font-bold text-wsa-navy mb-2">
            {linkPurpose === "reset" ? "Set a new password" : "Set your password"}
          </h1>
          <p className="text-gray-600 text-sm">{linkEmail}</p>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            setError("");
            if (newPassword !== confirmPassword) {
              setError("Those two passwords are not the same.");
              return;
            }
            setPasswordMutation.mutate({ token: linkToken, password: newPassword });
          }}
          className="bg-white border border-border/70 p-6 space-y-4"
        >
          <Input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="New password, at least 12 characters"
            autoComplete="new-password"
            required
            autoFocus
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Type it again"
            autoComplete="new-password"
            required
          />
          <p className="text-xs text-gray-500">
            A long phrase you will remember makes a better password than a short scramble. Twelve
            characters is the minimum.
          </p>
          {mismatch && <p className="text-sm text-red-600">Those two passwords are not the same.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={setPasswordMutation.isPending || mismatch}
            className="w-full bg-wsa-red hover:bg-wsa-red/90 text-white"
          >
            {setPasswordMutation.isPending
              ? "Saving…"
              : linkPurpose === "reset" ? "Save new password" : "Set password and sign in"}
          </Button>
        </form>
      </Shell>
    );
  }

  const ssoConfigured = ssoStatusQuery.data?.configured === true;

  return (
    <Shell>
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-6 bg-wsa-navy flex items-center justify-center">
          <Lock className="text-white" size={22} />
        </div>
        <h1 className="text-2xl font-bold text-wsa-navy mb-2">Staff Portal</h1>
        <p className="text-gray-600 text-sm">Internal WSA staff only.</p>
      </div>

      <div className="bg-white border border-border/70 p-6 space-y-4">
        <Button
          type="button"
          variant="outline"
          disabled={!ssoConfigured || microsoftLoginUrlMutation.isPending}
          onClick={() => microsoftLoginUrlMutation.mutate()}
          className="w-full border-wsa-navy/20 text-wsa-navy"
        >
          {microsoftLoginUrlMutation.isPending ? "Redirecting…" : "Sign in with Microsoft"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!googleStatusQuery.data?.configured || googleLoginUrlMutation.isPending}
          onClick={() => googleLoginUrlMutation.mutate()}
          className="w-full border-wsa-navy/20 text-wsa-navy"
        >
          {googleLoginUrlMutation.isPending ? "Redirecting…" : "Sign in with Google"}
        </Button>
        <p className="text-xs text-gray-500 text-center">
          Google sign-in works only for addresses Tom has approved. Ask him if yours is not yet on the list.
        </p>
        {!ssoConfigured && (
          <p className="text-xs text-gray-400 text-center">Microsoft sign-in is not yet configured. Use your password below.</p>
        )}
        {microsoftCallbackMutation.isError ||
        googleCallbackMutation.isError ||
        (microsoftCallbackMutation.data && !microsoftCallbackMutation.data.success) ||
        (googleCallbackMutation.data && !googleCallbackMutation.data.success) ? (
          <p className="text-sm text-red-600 text-center">{error}</p>
        ) : null}

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <div className="bg-white border border-border/70 p-6 space-y-4 mt-4">
        <div className="flex gap-1 border-b border-border">
          {(["signin", "signup"] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); setNotice(null); }}
              aria-current={mode === m ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                mode === m || (m === "signin" && mode === "forgot")
                  ? "border-wsa-red text-wsa-red"
                  : "border-transparent text-gray-500 hover:text-wsa-navy"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create an account"}
            </button>
          ))}
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            setError("");
            setNotice(null);
            if (mode === "signup") signUpMutation.mutate({ email: workEmail });
            else if (mode === "forgot") resetRequestMutation.mutate({ email: workEmail });
            else passwordSignInMutation.mutate({ email: workEmail, password: workPassword });
          }}
          className="space-y-4"
        >
          <Input
            type="email"
            value={workEmail}
            onChange={e => setWorkEmail(e.target.value)}
            placeholder="you@worldstudentadvisors.com"
            autoComplete="username"
            required
          />
          {/* Only signing in asks for a password here. Signup and reset send a
              link, and the password is chosen on the page that link opens. */}
          {mode === "signin" && (
            <Input
              type="password"
              value={workPassword}
              onChange={e => setWorkPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          )}
          {mode === "signup" && (
            <p className="text-xs text-gray-500">
              Use your WSA work address. We send a link there to confirm it is you, and you set your
              password on the page it opens.
            </p>
          )}
          {mode === "forgot" && (
            <p className="text-xs text-gray-500">
              Enter your WSA work address and we send a link there. Open it to set a new password. If
              you sign in with Microsoft or Google, you have no password here and nothing to reset.
            </p>
          )}
          {notice && <p className="text-sm text-wsa-navy">{notice}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={signUpMutation.isPending || passwordSignInMutation.isPending || resetRequestMutation.isPending}
            className="w-full bg-wsa-red hover:bg-wsa-red/90 text-white"
          >
            {mode === "signup"
              ? signUpMutation.isPending ? "Sending…" : "Email me a link"
              : mode === "forgot"
                ? resetRequestMutation.isPending ? "Sending…" : "Email me a reset link"
                : passwordSignInMutation.isPending ? "Checking…" : "Sign in"}
          </Button>
          {mode !== "signup" && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "forgot" ? "signin" : "forgot");
                setError("");
                setNotice(null);
              }}
              className="w-full text-xs text-gray-500 hover:text-wsa-navy underline"
            >
              {mode === "forgot" ? "Back to signing in" : "Forgotten your password?"}
            </button>
          )}
        </form>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-border/70 p-6 space-y-4 mt-4">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoFocus
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full bg-wsa-red hover:bg-wsa-red/90 text-white"
        >
          {loginMutation.isPending ? "Checking…" : "Enter"}
        </Button>
      </form>
    </Shell>
  );
}

/**
 * The real WSA AI Workforce home, replacing the Stage 1 placeholder. Every
 * worker's status shown here is what server/workforce/registry.ts
 * actually reports — this component has no local notion of who is
 * "ready"; it only renders what workforce.listWorkers returns.
 */
type StaffSection =
  | "reception"
  | "uniportals"
  | "students"
  | "social"
  | "channels"
  | "team"
  | "content"
  | "resources"
  | "access";

/**
 * The Staff Portal home, rebuilt on 11 September 2026.
 *
 * WHAT WAS WRONG. Eight sections sat in one row of 14px tabs. On a phone,
 * which is where Eldah and Glenice actually opened this, that row ran off
 * the screen, and the labels were single words with nothing to say what any
 * of them did. Tom's words were "looks crap", "text is too small" and "not
 * intuitive", and all three were fair.
 *
 * WHAT REPLACED IT. A home screen of large cards, each naming a section and
 * saying in one line what it is for, and a section view with an obvious way
 * back. It reads like an app launcher because that is the mental model
 * staff already have, and because a card with a sentence on it answers
 * "which one do I want" in a way a one-word tab never can.
 *
 * Sizes are deliberate rather than decorative. Body text is 16px, the
 * minimum that is comfortable at arm's length and the size below which iOS
 * zooms a form on focus. Every tap target is at least 48px high, which is
 * the smallest reliably hittable with a thumb. Cards go one per row on a
 * phone and three across on a desktop.
 *
 * Reception stays first because it is the front door: say what you need and
 * be pointed at whoever owns it.
 */
const SECTIONS: {
  id: StaffSection;
  label: string;
  blurb: string;
  icon: typeof MessageSquareText;
}[] = [
  {
    id: "reception",
    label: "Reception",
    blurb: "Not sure who does what? Say what you need and get pointed at the right place.",
    icon: MessageSquareText,
  },
  {
    id: "uniportals",
    label: "University portals",
    blurb: "Every university application portal in one place, with the instructions for each.",
    icon: GraduationCap,
  },
  {
    id: "students",
    label: "Find a student",
    blurb: "Look up a student by phone, email or name across the CRM.",
    icon: Users,
  },
  {
    id: "social",
    label: "Social media",
    blurb: "Draft and check posts for the WSA channels.",
    icon: Share2,
  },
  {
    id: "channels",
    label: "Channels",
    blurb: "Who owns which channel, and what each one is for.",
    icon: Radio,
  },
  {
    id: "team",
    label: "The AI team",
    blurb: "Who each AI worker is, what they can do, and what they cannot.",
    icon: FileCheck2,
  },
  {
    id: "content",
    label: "Content check",
    blurb: "Run wording past the WSA writing standard before it goes out.",
    icon: FileCheck2,
  },
  {
    id: "resources",
    label: "Resources",
    blurb: "Intakes, partner institutions, templates and training.",
    icon: FolderOpen,
  },
  {
    id: "access",
    label: "Staff access",
    blurb: "Who can see what, and who approved it.",
    icon: ShieldCheck,
  },
];

function WorkforceHome({ token, onLogout }: { token: string; onLogout: () => void }) {
  // null means the home screen. A section is somewhere you go deliberately,
  // and coming back is one obvious control rather than hunting the tab you
  // were on before.
  const [section, setSection] = useState<StaffSection | null>(null);
  const current = SECTIONS.find(s => s.id === section) ?? null;

  return (
    <div className="min-h-screen bg-wsa-warm-white pt-28 pb-20 lg:pt-36 lg:pb-28">
      <main className="container max-w-5xl">
        {/* Stacks below the sm breakpoint. Side by side, the title cannot
            shrink below its longest word and the Sign out button is
            shrink-0, so on a narrow phone the pair has no room to give. A
            full-width button under the title avoids the question entirely
            and is a bigger tap target, which is the point on mobile. */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-wsa-red">
              Staff Portal
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-wsa-navy md:text-4xl">
              World Student Advisors
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={onLogout}
            className="min-h-[48px] w-full shrink-0 border-wsa-navy/20 px-4 text-base text-wsa-navy hover:border-wsa-red hover:text-wsa-red sm:w-auto"
          >
            <LogOut className="mr-2 h-5 w-5" /> Sign out
          </Button>
        </div>

        <AccessBanner token={token} />

        {current === null ? (
          <>
            <h2 className="mb-5 mt-8 text-xl font-semibold text-wsa-navy">What do you need?</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSection(s.id)}
                      className="flex h-full w-full flex-col items-start rounded-xl border border-wsa-navy/10 bg-white p-5 text-left transition-colors hover:border-wsa-red focus:border-wsa-red focus:outline-none focus:ring-2 focus:ring-wsa-red/20"
                    >
                      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-wsa-navy/5 text-wsa-navy">
                        <Icon className="h-6 w-6" aria-hidden />
                      </span>
                      <span className="text-lg font-semibold text-wsa-navy">{s.label}</span>
                      <span className="mt-1.5 text-base leading-relaxed text-gray-600">{s.blurb}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSection(null)}
              className="mb-6 inline-flex min-h-[48px] items-center gap-2 text-base font-semibold text-wsa-navy transition-colors hover:text-wsa-red"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
              All sections
            </button>

            <h2 className="text-2xl font-semibold text-wsa-navy md:text-3xl">{current.label}</h2>
            <p className="mb-7 mt-2 text-base leading-relaxed text-gray-600">{current.blurb}</p>

            {section === "reception" && (
              <div className="mx-auto max-w-2xl">
                <Receptionist token={token} />
              </div>
            )}
            {section === "uniportals" && <UniversityPortalsPanel token={token} />}
            {section === "students" && <StudentLookup token={token} />}
            {section === "social" && <SocialMediaPanel token={token} />}
            {section === "channels" && <ChannelsPanel token={token} />}
            {section === "team" && <TeamPanel token={token} />}
            {section === "content" && <ContentCheckPanel token={token} />}
            {section === "resources" && <ResourcesPanel token={token} />}
            {section === "access" && <AccessAdmin token={token} />}
          </>
        )}
      </main>
    </div>
  );
}
