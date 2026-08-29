import { useState, useEffect, type FormEvent } from "react";
import { Lock, LogOut, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { WorkerCard, type WorkforceWorker } from "@/components/workforce/WorkerCard";
import { WorkerWorkspace } from "@/components/workforce/WorkerWorkspace";
import { Receptionist } from "@/components/workforce/Receptionist";

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

  const microsoftLoginUrlMutation = trpc.staffPortal.microsoftLoginUrl.useMutation({
    onSuccess: data => {
      window.location.href = data.authorizeUrl;
    },
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
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      microsoftCallbackMutation.mutate({ code, state });
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

  if (checkingSession || microsoftCallbackMutation.isPending) {
    return (
      <Shell>
        <p className="text-center text-gray-500">{microsoftCallbackMutation.isPending ? "Completing Microsoft sign-in…" : "Checking session…"}</p>
      </Shell>
    );
  }

  if (authenticated) {
    return <WorkforceHome token={token as string} onLogout={handleLogout} />;
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
        {!ssoConfigured && (
          <p className="text-xs text-gray-400 text-center">Microsoft sign-in is not yet configured — use your password below.</p>
        )}
        {microsoftCallbackMutation.isError || (microsoftCallbackMutation.data && !microsoftCallbackMutation.data.success) ? (
          <p className="text-sm text-red-600 text-center">{error}</p>
        ) : null}

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
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
function WorkforceHome({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [openWorker, setOpenWorker] = useState<WorkforceWorker | null>(null);
  const workersQuery = trpc.workforce.listWorkers.useQuery({ token });

  return (
    <div className="min-h-screen bg-wsa-warm-white pt-32 pb-20 lg:pt-40 lg:pb-28">
      <main className="container max-w-5xl">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <p className="mb-2 text-sm font-medium tracking-[0.2em] uppercase text-wsa-red">Staff Portal</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.1]">WSA AI Workforce</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="border-wsa-navy/20 text-wsa-navy hover:border-wsa-red hover:text-wsa-red shrink-0"
          >
            <LogOut className="w-4 h-4 mr-1" /> Sign out
          </Button>
        </div>

        <p className="mb-8 max-w-2xl text-sm text-gray-600">
          Sophie is the only worker currently approved at the specification level, and her Staff Portal deployment
          channel is still undecided. Every other worker below is in design and not yet approved for live case work
          — the estate is currently awaiting independent Governance &amp; Assurance review before any further
          approval.
        </p>

        <div className="mb-8">
          <Receptionist token={token} />
        </div>

        {workersQuery.isLoading && <p className="text-sm text-gray-500">Loading the worker estate…</p>}
        {workersQuery.error && <p className="text-sm text-red-600">Could not load the worker estate.</p>}

        {workersQuery.data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workersQuery.data.workers.map(worker => (
              <WorkerCard key={worker.id} worker={worker} onOpen={setOpenWorker} />
            ))}
          </div>
        )}

        <WorkerWorkspace worker={openWorker} open={openWorker !== null} onOpenChange={open => !open && setOpenWorker(null)} />
      </main>
    </div>
  );
}
