import { useState, useEffect, type FormEvent } from "react";
import { Lock, LogOut, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

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

  if (checkingSession) {
    return (
      <Shell>
        <p className="text-center text-gray-500">Checking session…</p>
      </Shell>
    );
  }

  if (authenticated) {
    return (
      <div className="min-h-screen bg-wsa-warm-white pt-32 pb-20 lg:pt-40 lg:pb-28">
        <main className="container max-w-2xl">
          <p className="mb-5 text-sm font-medium tracking-[0.2em] uppercase text-wsa-red">Staff Portal</p>
          <div className="flex items-start justify-between gap-6 mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold text-wsa-navy leading-[1.1]">Staff area</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-wsa-navy/20 text-wsa-navy hover:border-wsa-red hover:text-wsa-red shrink-0"
            >
              <LogOut className="w-4 h-4 mr-1" /> Sign out
            </Button>
          </div>
          <div className="bg-white border border-border/70 p-8">
            <p className="text-gray-600 leading-relaxed">
              The university application portal directory is not built yet. It will live here once the list of
              portals is available.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-6 bg-wsa-navy flex items-center justify-center">
          <Lock className="text-white" size={22} />
        </div>
        <h1 className="text-2xl font-bold text-wsa-navy mb-2">Staff Portal</h1>
        <p className="text-gray-600 text-sm">Internal WSA staff only.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white border border-border/70 p-6 space-y-4">
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
