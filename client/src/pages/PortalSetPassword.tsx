import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortalAuthShell, PortalMessageShell } from "@/components/PortalBrandShell";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function PortalSetPassword() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const emailParam = params.get("email") || "";
  const tokenParam = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const setPasswordMutation = trpc.portal.setPassword.useMutation({
    onSuccess: (data) => {
      if (data.success && data.token) {
        localStorage.setItem("portal_token", data.token);
        localStorage.setItem("portal_user", JSON.stringify(data.user));
        setSuccess(true);
        setTimeout(() => navigate("/portal"), 2000);
      } else {
        setError(data.error || "Failed to set password");
      }
    },
    onError: () => setError("Something went wrong. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setPasswordMutation.mutate({ email: emailParam, token: tokenParam, password });
  };

  if (!emailParam || !tokenParam) {
    return (
      <PortalMessageShell
        title="Invalid link"
        message="This password creation link is invalid or has expired."
      >
        <Button onClick={() => navigate("/portal/login")} className="bg-wsa-red hover:bg-wsa-red/90 text-white">
          Go to Login
        </Button>
      </PortalMessageShell>
    );
  }

  if (success) {
    return (
      <PortalMessageShell
        title="Password created"
        message="Redirecting to your Student Portal..."
        icon={<CheckCircle className="h-6 w-6" />}
      />
    );
  }

  return (
    <PortalAuthShell title="Create your password" description="Set a password to access your Student Portal.">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <Input type="email" value={emailParam} disabled className="h-11 bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-wsa-red hover:bg-wsa-red/90 text-white"
            disabled={setPasswordMutation.isPending}
          >
            {setPasswordMutation.isPending ? "Creating..." : "Create Password & Enter Portal"}
          </Button>
        </form>
    </PortalAuthShell>
  );
}
