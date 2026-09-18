/**
 * How a student's email address and phone number are normalised before they
 * are hashed for Google.
 *
 * Google matches a conversion to a click by comparing hashes, so both sides
 * must normalise identically or the hash simply never matches and the data
 * was sent for nothing. WSA sends these hashes from two places: the server,
 * with the Qualified Lead upload through the Data Manager API, and the
 * browser, alongside the Submit lead form conversion. The rules live here so
 * the two cannot drift apart.
 *
 * These functions normalise only. Hashing is done where it belongs: Node's
 * crypto on the server, the browser's WebCrypto on the client. Neither the
 * raw address nor the raw number ever leaves in either path.
 *
 * Moved out of server/ads/googleDataManager.ts on 18 September 2026, when
 * the browser began sending user-provided data too, on Tom Arrington's
 * decision of the same day (open point AB-A10).
 */

/**
 * Lower case, whitespace removed; for gmail.com and googlemail.com the dots
 * in the local part are removed as well. Null when it is not an address.
 */
export function normaliseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.replace(/\s+/g, "").toLowerCase();
  const at = value.lastIndexOf("@");
  if (at <= 0 || at === value.length - 1 || !value.includes(".", at)) return null;
  let local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

/**
 * E.164 only: a leading plus followed by 8 to 15 digits. Punctuation and
 * spaces are dropped, "00" becomes "+". A number with no country code is
 * refused rather than guessed, because a wrong identifier is worse than
 * none. The website already sends Nigerian numbers in international form.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // "(0)" is the written trunk prefix ("+44 (0)7555 ..."), never part of the
  // international number, so it goes before the ordinary punctuation does.
  let value = raw.replace(/\(0\)/g, "").replace(/[\s().-]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(value)) return null;
  return value;
}
