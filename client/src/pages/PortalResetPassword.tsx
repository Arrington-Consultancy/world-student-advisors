import { useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortalAuthShell, PortalMessageShell } from "@/components/PortalBrandShell";
import { trpc } from "@/lib/trpc";
import { CheckCircle } from "lucide-react";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";
import { useTurnstileSiteKey } from "@/hooks/useTurnstileSiteKey";

export default function PortalResetPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstileSiteKey = useTurnstileSiteKey();

  const resetMutation = trpc.portal.requestReset.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: err => {
      setError(err.message || "Something went wrong. Please try again.");
      setTurnstileToken("");
      turnstileRef.current?.reset();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!turnstileToken) {
      setError("Please complete the verification check below, then try again.");
      return;
    }
    resetMutation.mutate({ email, turnstileToken });
  };

  if (submitted) {
    return (
      <PortalMessageShell
        title="Check your email"
        message={`If an account exists with ${email}, we've sent a password reset link.`}
        icon={<CheckCircle className="h-6 w-6" />}
      >
        <Link href="/portal/login">
          <Button className="bg-wsa-navy hover:bg-wsa-navy/90 text-white">Back to Login</Button>
        </Link>
      </PortalMessageShell>
    );
  }

  return (
    <PortalAuthShell title="Reset password" description="Enter your email to receive a reset link.">
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

          <TurnstileWidget
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken("")}
            onError={() => setTurnstileToken("")}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            className="w-full h-11 bg-wsa-red hover:bg-wsa-red/90 text-white"
            disabled={resetMutation.isPending || !turnstileToken}
          >
            {resetMutation.isPending ? "Sending..." : "Send Reset Link"}
          </Button>

          <div className="text-center pt-2">
            <Link href="/portal/login" className="text-sm text-wsa-red hover:underline">
              Back to Login
            </Link>
          </div>
        </form>
    </PortalAuthShell>
  );
}
