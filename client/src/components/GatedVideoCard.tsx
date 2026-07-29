import { Link } from "wouter";
import { Lock, ArrowRight } from "lucide-react";

/**
 * Shared gating helpers for portal video content.
 *
 * OPEN ACCESS (user request 28 Jul 2026): the Student Portal no longer
 * requires sign-in — every visitor can watch all content. These helpers now
 * always report an active session / public content so every embed renders
 * unlocked. The LockedVideoOverlay component is retained only in case
 * gating needs to be reinstated later.
 */

export function usePortalSession(): boolean {
  return true;
}

/** YouTube IDs of the four publicly available videos (brief S14). */
export const PUBLIC_VIDEO_IDS = new Set([
  "ADQ1h0Ofhik", // The Student Journey
  "Uwz3OWh8rWA", // Writing a Personal Statement
]);

/** Titles that are public regardless of video ID (PhD / work-while-studying guides reuse IDs). */
export const PUBLIC_TITLE_PATTERNS = [
  /student journey/i,
  /personal statement/i,
  /apply for a phd/i,
  /work while you study/i,
];

export function isPublicContent(title: string, youtubeId?: string): boolean {
  // Open access: all content is public.
  return true;
}

/**
 * Locked video placeholder: same card footprint as an embed, but with a lock
 * overlay and CTA to register / log in.
 */
export function LockedVideoOverlay({ title }: { title: string }) {
  return (
    <div className="relative aspect-video bg-wsa-navy mb-5 overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-wsa-navy to-wsa-navy/80" />
      <div className="relative z-10 text-center px-6">
        <div className="w-14 h-14 mx-auto mb-4 bg-white/10 border border-white/20 flex items-center justify-center">
          <Lock className="text-white" size={24} />
        </div>
        <p className="text-white text-sm font-medium mb-1">Student Portal content</p>
        <p className="text-white/60 text-xs mb-4 max-w-xs mx-auto">
          Register free to unlock this video and the full Student Resource Centre.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center px-4 py-2 bg-wsa-red text-white text-xs font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
          >
            Register free <ArrowRight className="ml-1.5" size={12} />
          </Link>
          <Link
            href="/portal/login"
            className="inline-flex items-center px-4 py-2 border border-white/30 text-white text-xs font-medium transition-colors hover:bg-white/10"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
