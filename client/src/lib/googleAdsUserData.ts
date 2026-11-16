/**
 * The hashed user data sent alongside the Submit lead form conversion.
 *
 * Tom Arrington, 18 September 2026, deciding open point AB-A10. Google
 * matches a web conversion to the click that produced it. Where the click
 * carries a gclid that is straightforward, but a click recorded under gbraid
 * or wbraid has no per-click identifier to match on, and those conversions
 * were going unattributed. Sending a hash of the student's email address and
 * phone number gives Google a second way to match.
 *
 * What is sent, and what is not. The address and the number are normalised
 * to Google's rules (shared/googleUserData.ts, the same rules the server
 * uses for the Qualified Lead upload) and then hashed with SHA-256 in the
 * browser. Google receives 64 hexadecimal characters and never the address
 * or the number. A hash is still personal data, which is why this is Tom's
 * decision and not a technical one, but it cannot be read back.
 *
 * When nothing is sent. No analytics consent, so no tag and no conversion at
 * all (CookieConsent.tsx). No secure context, so no WebCrypto. An address
 * that is not an address. A phone number with no country code: it is refused
 * rather than guessed, exactly as the server refuses it, because a hash of
 * the wrong number matches the wrong person.
 */
import { normaliseEmail, normalisePhone } from "@shared/googleUserData";

/** Google's field names for data the caller has already hashed. */
export type HashedUserData = {
  sha256_email_address?: string;
  sha256_phone_number?: string;
};

async function sha256Hex(value: string): Promise<string | null> {
  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  // Absent outside a secure context, and in some older browsers.
  if (!subtle) return null;
  try {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

/**
 * The hashed identifiers for one signup, or null when there is nothing that
 * can be sent. Never throws: a conversion must still be reported if this
 * cannot be produced.
 */
export async function hashedUserData(
  email: string | null | undefined,
  phone: string | null | undefined,
): Promise<HashedUserData | null> {
  const data: HashedUserData = {};

  const normalisedEmail = normaliseEmail(email);
  if (normalisedEmail) {
    const hash = await sha256Hex(normalisedEmail);
    if (hash) data.sha256_email_address = hash;
  }

  const normalisedPhone = normalisePhone(phone);
  if (normalisedPhone) {
    const hash = await sha256Hex(normalisedPhone);
    if (hash) data.sha256_phone_number = hash;
  }

  return Object.keys(data).length > 0 ? data : null;
}
