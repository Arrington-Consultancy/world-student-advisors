/**
 * His Royal Highness's Annual Quranic Memorisation Competition: the school
 * registration form on the Sarkin Fulani Future Leaders Programme page.
 *
 * WHY THIS IS SEPARATE. Farooq Gajo, Office of the Sarkin Fulani of Lagos,
 * 29 September 2026: the competition is the King's own, it is to appear on
 * the page as its own clearly identified section, and a school's
 * registration goes to the Competition Committee in Nigeria, not into WSA's
 * student enquiry process. So this form does not create a Pipedrive Lead
 * and does not notify WSA's Student Counsellors. It is emailed to the
 * Committee's address (server/_core/env.ts) and nowhere else.
 *
 * WHAT IS PROVISIONAL. Tim Hunt, 8 October 2026: the Committee's contact
 * details and the fields it requires are not yet known. The fields below
 * are a sensible working set for a school to register its interest, to be
 * finalised with Farooq. Until the Committee's address is supplied, the
 * server sends registrations to a holding address so none is lost.
 *
 * The field list lives here, shared by the browser form and the server's
 * validation, so the two cannot disagree about what a registration holds.
 */

export const SCHOOL_TYPES = Object.freeze([
  "Islamiyya school",
  "Tahfeez school",
  "Primary school",
  "Secondary school",
  "Other",
] as const);

export type SchoolType = (typeof SCHOOL_TYPES)[number];

export function isSchoolType(value: string): value is SchoolType {
  return (SCHOOL_TYPES as readonly string[]).includes(value);
}

/** The states of Nigeria and the Federal Capital Territory, for the school's location. */
export const NIGERIAN_STATES = Object.freeze([
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "Federal Capital Territory", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const);

export type NigerianState = (typeof NIGERIAN_STATES)[number];

export function isNigerianState(value: string): value is NigerianState {
  return (NIGERIAN_STATES as readonly string[]).includes(value);
}

/** Upper bounds shared by the form and the server, so neither accepts what the other would reject. */
export const QURANIC_FIELD_LIMITS = Object.freeze({
  schoolName: 160,
  town: 80,
  contactName: 120,
  contactRole: 80,
  phone: 40,
  email: 120,
  expectedEntrants: 10,
  ageGroups: 120,
  message: 1500,
});

/**
 * What a school tells the Committee. Everything here is the school's own
 * answer; nothing is inferred or added by WSA.
 */
export interface QuranicSchoolRegistration {
  schoolName: string;
  schoolType: SchoolType;
  town: string;
  state: NigerianState;
  contactName: string;
  contactRole: string;
  phone: string;
  /** Optional: many schools in Nigeria work by WhatsApp alone. */
  email: string;
  /** Free text, so "about 12" or "10 to 15" is accepted as the school wrote it. */
  expectedEntrants: string;
  ageGroups: string;
  takenPartBefore: "yes" | "no" | "not-sure";
  message: string;
}

export const TAKEN_PART_OPTIONS: ReadonlyArray<{ value: QuranicSchoolRegistration["takenPartBefore"]; label: string }> =
  Object.freeze([
    { value: "yes", label: "Yes, our school has taken part before" },
    { value: "no", label: "No, this would be our first year" },
    { value: "not-sure", label: "Not sure" },
  ]);

/** The form type recorded if a registration cannot be sent (drizzle: varchar(30)). */
export const QURANIC_FAILED_SUBMISSION_TYPE = "quranic-school-registration";
