/**
 * The visitor's stored cookie choice, as the banner (CookieConsent.tsx)
 * records it. Kept in its own module so the tag loaders can read it
 * without importing a React component: the Meta Pixel needs it to decide,
 * at load, whether to queue a consent revoke (see metaPixel.ts).
 */
export const CONSENT_KEY = "wsa-cookie-consent";

export type ConsentValue = "accepted" | "declined";

export function getCookieConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}
