/**
 * Which Staff Portal section is open, carried in the URL as ?section=<id>.
 *
 * It was React state alone, which meant a refresh lost your place, a
 * section could not be linked to, and a section reachable only through the
 * account menu was unreachable whenever that menu was. Tom Arrington, on a
 * phone, 12 September 2026: the marketing header is fixed to the top of the
 * viewport and sat over the portal's own navigation, so Staff access could
 * not be opened at all.
 *
 * Addressability is not access. The server decides what a section may do:
 * opening ?section=access renders the screen and every call it makes is
 * refused unless the signed-in member holds access_admin.
 *
 * Kept free of React so it can be tested directly.
 */
export type StaffSection =
  | "reception"
  | "uniportals"
  | "students"
  | "interviews"
  | "social"
  | "content"
  | "team"
  | "channels"
  | "resources"
  | "access"
  | "routing";

export const SECTION_IDS: readonly StaffSection[] = [
  "reception", "uniportals", "students", "interviews", "social", "content", "team", "channels", "resources", "access", "routing",
];

export function sectionFromSearch(search: string): StaffSection | null {
  const raw = new URLSearchParams(search).get("section");
  return SECTION_IDS.find(id => id === raw) ?? null;
}

/** Replaces rather than pushes, so Back leaves the portal instead of walking its sections. */
export function writeSectionToUrl(id: StaffSection | null): void {
  const url = new URL(window.location.href);
  if (id === null) url.searchParams.delete("section");
  else url.searchParams.set("section", id);
  window.history.replaceState({}, "", url.toString());
}
