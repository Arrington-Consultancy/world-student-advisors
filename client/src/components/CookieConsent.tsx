/*
 * Cookie Consent Banner - WSA design system
 * Navy (#1B2A4A-family) / WSA red accent / cream background tokens.
 * Fixed bottom bar, slides up on first visit, persists choice in localStorage.
 * GDPR/PECR: no non-essential scripts should fire until consent is granted.
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";

const CONSENT_KEY = "wsa-cookie-consent";

export type ConsentValue = "accepted" | "declined";

export function getCookieConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if no prior choice has been recorded
    if (getCookieConsent() === null) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const choose = (value: ConsentValue) => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* storage unavailable — banner will reappear next visit */
    }
    setVisible(false);
    // Notify listeners (e.g. analytics loader) that consent state changed
    window.dispatchEvent(new CustomEvent("wsa-consent-change", { detail: value }));
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] bg-wsa-navy text-white shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
      style={{ animation: "wsa-consent-in 320ms cubic-bezier(0.23, 1, 0.32, 1) both" }}
    >
      <div className="container py-5 lg:py-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1">Your privacy matters</p>
            <p className="text-[13px] text-white/60 leading-relaxed max-w-2xl">
              We use essential cookies to make this site work. With your consent, we'd also like to use
              analytics cookies to understand how families use the site so we can improve it. You can
              change your mind at any time. Read our{" "}
              <Link href="/privacy-policy" className="underline text-white/80 hover:text-white transition-colors">
                Privacy Policy
              </Link>{" "}
              for details.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => choose("declined")}
              className="px-5 py-2.5 text-[13px] font-semibold text-white/70 border border-white/25 hover:border-white/50 hover:text-white transition-colors active:scale-[0.97]"
            >
              Essential only
            </button>
            <button
              onClick={() => choose("accepted")}
              className="px-6 py-2.5 text-[13px] font-semibold bg-wsa-red text-white hover:bg-wsa-red/90 transition-colors active:scale-[0.97]"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
