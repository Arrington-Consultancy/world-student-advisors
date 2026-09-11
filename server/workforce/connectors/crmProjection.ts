/**
 * What each worker is shown from the WSA Pipedrive record.
 *
 * Tom Arrington, 11 September 2026: do not artificially restrict useful
 * reads to the seven-field staff lookup if that prevents the worker doing
 * its approved job; inspect the actual schema and create the minimum
 * useful projection for each worker from its approved remit.
 *
 * The schema was inventoried from production on 11 September 2026 (the
 * pipedrive-schema-inventory workflow): 73 person fields, 106 deal fields,
 * one pipeline "WSA Student Journey" with six stages S5 to S10. Every key
 * below is a real key from that inventory, quoted by its Pipedrive label,
 * and every worker's list is derived from its approved brief. A field a
 * remit does not need is not here, and three fields are on no list at all:
 * Passport Number, Birthday and Notes. Passport and birthday are identity
 * documents no worker's job requires in the Staff Portal, and Notes is
 * free text that can hold anything at all.
 *
 * Grace's list is the union, because an audit has to see what the case
 * workers saw. It is still not the raw record.
 */
import type { WorkerId } from "../types";

export type FieldSource = "person" | "deal";

export interface ProjectedField {
  /** The label the worker sees. The Pipedrive label, unchanged. */
  label: string;
  source: FieldSource;
  /** Pipedrive field key: a system key or a 40-character custom-field hash. */
  key: string;
  /** For enum fields the API returns an option id; the inventory's labels resolve it. */
  options?: Record<string, string>;
}

const P = (label: string, key: string, options?: Record<string, string>): ProjectedField => ({ label, source: "person", key, options });
const D = (label: string, key: string, options?: Record<string, string>): ProjectedField => ({ label, source: "deal", key, options });

// Person fields (from the 11 September 2026 inventory).
const LABEL = P("Label", "label");
const HIGHEST_QUALIFICATION = P("Highest Qualification", "590bcf6368003ba531fabf02b2d53427ab927b11");
const DESIRED_LEVEL = P("Desired Level of Study", "307e8c7f3a14e8f6a24839151f093ce0f9c93365");
const AREA_OF_INTEREST = P("Area of Interest", "dff00d3ccfa48561ed413b93d78bae921d3b26e1");
const PREFERRED_MODE = P("Preferred Mode of Study", "d84b4ab9275964922508fd8b5c2b4d8fff67a697");
const PREFERRED_START = P("Preferred Start Month", "3c131beee887a4391db98adf659bf03b67c2d576");
const PREFERRED_DESTINATION = P("Preferred Study Destination", "1f3f30e974eaf7b88d1cd95b43efffc129abd71c");
const COUNTRY_OF_RESIDENCE = P("Country of Residence", "ebad876a224a8854ced5b40ea3fd41852e864a3a");
const NATIONALITY = P("Nationality", "266a5abd49db981b98afac3ee06c92f499622602");
const EDUCATION_FUNDING = P("Education Funding", "147e0f451a4bd38bc35d7c1fe8c8631fee212160");
const FUNDING_SOURCE = P("Funding Source", "ccc2c853c22101435d6059306fcb644e2bf0a284");
const SOURCE_OWNER = P("Source Owner", "53cb3275d869ebba9f3c350bcc2c03cebe4b5977");
const RECOMMENDED_COUNSELLOR = P("Recommended Student Counsellor", "91cce905e99d4d7ad6a8e2b4db41b89f8a5a72cf");
const REFERRED_BY = P("Referred By", "a08cf6343f3d302fdf15306c24d01e004ab47724");
const GDPR_CONSENT = P("GDPR Consent", "507b7011ec6784002524c02f940ef8610059cd1e");
const PERSON_CREATED = P("Person created", "add_time");
const STUDENT_ID = P("Student ID", "4359a2a21d6baf8c1e9a24500ea6b7b15ed012b5");
const CAS_NUMBER_PERSON = P("CAS Number", "e5b5d3d771ebfa0bf1b23e5b7b87225ad97106ff");

// Deal fields.
const LEAD_STATUS = D("Lead Status", "90ce14e0ac23333a12a581b6a14d76f26aa5a998");
const STUDY_LEVEL = D("Study Level", "37b61490222fe0b16f689eddfeceda32859822c9");
const DESTINATION_FINAL = D("Destination (Final)", "2f3f1ec03dda5400266044ae0df790d4668fc4c7");
const FINANCIAL_TIER = D("Financial Tier", "b62843b58696420733fcde40ca6334e51dbfe966");
const FINANCIAL_CONFIDENCE = D("Financial Confidence", "9afbd7ea44b67f4b95ed95bf9e03e4d89d63b145");
const CONFIRMED_BUDGET = D("Confirmed Budget (GBP)", "618f62532ad7b2a74cc6f4d2e1d2b2ad98743e53");
const NUMBER_OF_APPLICATIONS = D("Number of Applications (Max 3)", "095bcb52b3d4d09c915c16bcb1e15ae54af4a0b6");
const VISA_STATUS = D("Visa Status", "09e06525aa7a92b7c708943893e8a867eec98b7e");
const VISA_DATE = D("Visa Date", "430b8fa3616d77ba03f0839b767e2102deccf9de");
const CAS_STATUS = D("CAS Status", "281c39e1c789dae2c1536d369515fc8d803a93c3");
const CAS_DATE = D("CAS Date", "04d9d800a0bbc38e7d7f7cc2bf74b8675f180b54");
const WSA_PARTNER = D("WSA Partner", "132d914a4223c49f858ea067ea9cd8edc0f461ae");

const APPLICATION_SLOTS: ProjectedField[] = [
  D("Institution 1", "e3ea8a2d13c05d110950ac2650088c50ec4947f1"), D("Course 1", "9cf19971683610f1aad9cedf9ba80779b9b956db"),
  D("Country 1", "f76a50925ee40cb703808afe41b3ac92e498a1d0"), D("Application Date 1", "b0339770af83990456128c2e2cff8776ac7a4ee0"),
  D("Offer Status 1", "dd78518894a6401f45384636d22c131786c42a2e"), D("Application ID 1", "993d6986146ae4f306e2f085ea7ee964cb80cd57"),
  D("Institution 2", "519c5e0780715e5a77f98afa26853ca2f6858e6c"), D("Course 2", "38b71ca29ae128bd93b9f7812733cf9700019c68"),
  D("Country 2", "f8f276507ff52322a3a2560ac7e107a51cb45e13"), D("Application Date 2", "4f6fefb7f3522572065f2fc4fe7f91cb6120a66c"),
  D("Offer Status 2", "cf730056e5400bdf0083d04e4899871d342b9b6f"),
  D("Institution 3", "98c2a49ef594347babb9c5aca3aa5b0bc43506f2"), D("Course 3", "d3b4235464e16be7e322b2e918a590dff7f3414c"),
  D("Country 3", "a3de56ca0625b1feb7ec2a7f6fd615dc366010be"), D("Application Date 3", "8a63bab19061b4c514675d29e8c7f2fbad7b3351"),
  D("Offer Status 3", "a1c53a7e681aed0c690fcc21356c9efd3d9b895f"),
];

const FUNDING_SLOTS: ProjectedField[] = [
  D("Tuition Fee 1", "df8198c963b2ba069d8ef1cf3d9154c3409b96dd"), D("Deposit 1", "584bbe1f1abcd28f32b8f9fcc80b9e89889672c5"),
  D("Partial Discount 1", "88dffa26a6d96c428f0ce0fafd96ec9a846fe195"),
  D("Tuition Fee 2", "55d8edb30b2b20a9fb803167ec1bc808167a3784"), D("Deposit 2", "4601c3019a35b7e6689bfbec138d9a9780968229"),
  D("Partial Discount 2", "6032de5b8d723d8d7684cd6cd27a160f956097bc"),
  D("Tuition Fee 3", "3e0b84615f66db83076413238c4874c3ca682a51"), D("Deposit 3", "c29e769cf9b22337fc2ea0d4eccd622b99ca0075"),
  D("Partial Discount 3", "b9c0d17d2d58ed4162c2a619f597ec5174b98475"),
];

const EDUCATION_PROFILE = [HIGHEST_QUALIFICATION, DESIRED_LEVEL, AREA_OF_INTEREST, PREFERRED_MODE, PREFERRED_START, PREFERRED_DESTINATION, COUNTRY_OF_RESIDENCE];

/**
 * Per worker, the fields beyond the base record (id, name, email, phone,
 * counsellor, stage, last updated) that its approved remit needs.
 */
export const WORKER_CRM_FIELDS: Readonly<Partial<Record<WorkerId, readonly ProjectedField[]>>> = Object.freeze({
  // Triage: is this person already known, who brought them in, what do they want, and did they consent.
  sophie: [LABEL, PERSON_CREATED, SOURCE_OWNER, RECOMMENDED_COUNSELLOR, REFERRED_BY, GDPR_CONSENT, DESIRED_LEVEL, PREFERRED_DESTINATION, PREFERRED_START, LEAD_STATUS],
  // Discovery: the student's academic position, goals and circumstances.
  daniel: [...EDUCATION_PROFILE, EDUCATION_FUNDING, LEAD_STATUS],
  // Suitability: the evidenced profile and the options on the table.
  oliver: [...EDUCATION_PROFILE, STUDY_LEVEL, DESTINATION_FINAL, ...APPLICATION_SLOTS.filter(f => /^(Institution|Course|Country)/.test(f.label))],
  // Admissions: the applications and their state.
  james: [STUDY_LEVEL, DESTINATION_FINAL, NUMBER_OF_APPLICATIONS, ...APPLICATION_SLOTS, STUDENT_ID],
  // Visa and compliance preparation: the case facts an authorised human will need. Never passport or birthday.
  priya: [NATIONALITY, COUNTRY_OF_RESIDENCE, DESTINATION_FINAL, CAS_STATUS, CAS_DATE, CAS_NUMBER_PERSON, VISA_STATUS, VISA_DATE, ...APPLICATION_SLOTS.filter(f => /^(Institution|Course|Offer Status)/.test(f.label))],
  // Funding: the student's funding position and the figures.
  harper: [EDUCATION_FUNDING, FUNDING_SOURCE, FINANCIAL_TIER, FINANCIAL_CONFIDENCE, CONFIRMED_BUDGET, STUDY_LEVEL, DESTINATION_FINAL, ...FUNDING_SLOTS, ...APPLICATION_SLOTS.filter(f => /^(Institution|Course)/.test(f.label))],
  // Pre-arrival: where they are going, when, and whether CAS and visa are in place.
  olivia: [DESTINATION_FINAL, PREFERRED_START, CAS_STATUS, CAS_DATE, VISA_STATUS, VISA_DATE, ...APPLICATION_SLOTS.filter(f => /^(Institution|Course|Country|Offer Status)/.test(f.label))],
  // Audit: what the case workers could see, so a defect in their work is checkable.
  grace: [
    LABEL, PERSON_CREATED, SOURCE_OWNER, RECOMMENDED_COUNSELLOR, REFERRED_BY, GDPR_CONSENT, ...EDUCATION_PROFILE, NATIONALITY,
    EDUCATION_FUNDING, FUNDING_SOURCE, LEAD_STATUS, STUDY_LEVEL, DESTINATION_FINAL, FINANCIAL_TIER, FINANCIAL_CONFIDENCE, CONFIRMED_BUDGET,
    NUMBER_OF_APPLICATIONS, ...APPLICATION_SLOTS, ...FUNDING_SLOTS, CAS_STATUS, CAS_DATE, VISA_STATUS, VISA_DATE, WSA_PARTNER, STUDENT_ID,
  ],
});

/** Keys no projection may ever include, whatever a list above says. Checked by a test and at projection time. */
export const NEVER_PROJECTED_KEYS: readonly string[] = Object.freeze([
  "e356695ee8528b30890e38e5f0875afb6644d61c", // Passport Number
  "birthday",
  "notes",
  "postal_address",
  "owner_id",
  "visible_to",
]);

/** A single projected value: the label and a plain value. Enum ids are passed through as-is when unresolvable. */
export type ProjectedValues = Record<string, string | number | null>;

function plain(value: unknown): string | number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.value === "string" || typeof v.value === "number") return v.value as string | number;
    if (typeof v.name === "string") return v.name;
    if (Array.isArray(value)) return value.map(plain).filter(x => x !== null).join(", ") || null;
  }
  return null;
}

/**
 * Project raw records to a worker's approved fields. The raw objects are
 * consumed here and nothing else about them survives the call.
 */
export function projectFieldsFor(
  workerId: WorkerId,
  raw: { person: Record<string, unknown> | null; deal: Record<string, unknown> | null },
): ProjectedValues {
  const out: ProjectedValues = {};
  for (const field of WORKER_CRM_FIELDS[workerId] ?? []) {
    if (NEVER_PROJECTED_KEYS.includes(field.key)) continue;
    const source = field.source === "person" ? raw.person : raw.deal;
    if (!source) continue;
    out[field.label] = plain(source[field.key]);
  }
  return out;
}
