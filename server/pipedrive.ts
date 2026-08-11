import { ENV } from "./_core/env";

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

interface StudentFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  passportNumber: string;
  phone: string;
  email: string;
  nationality: string;
  country: string;
  highestQualification: string;
  desiredLevel: string;
  areaOfStudy: string;
  preferredMode: string;
  preferredStartMonth: string;
  preferredDestination: string;
  educationFunding: string;
  promoCode: string;
  referredToWSA: string;
  referredByWhom?: string;
  recommendedCounsellor: string;
  gdprConsent: boolean;
}

async function pipedriveRequest(endpoint: string, method: string, body?: Record<string, unknown>) {
  const url = `${PIPEDRIVE_BASE}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_token=${ENV.pipedriveApiToken}`;
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Never include the request URL/token in thrown error text that might be logged upstream.
    console.error(`[Pipedrive] API error (${response.status}) on ${method} ${endpoint}: ${errorText}`);
    throw new Error(`Pipedrive API error (${response.status}) on ${endpoint}`);
  }

  return response.json();
}

// ===== PIPEDRIVE FIELD KEYS =====
// Person custom fields — verified 2026-07-29 against the live WSA Pipedrive
// account's /personFields. Every key below matches the live schema exactly.
const PF = {
  middleName: "698bb0af1557c96b6af870cb523ba231a27e302c",
  gender: "6769fddb9f06852f7c76a5096e8e5343e7780937",
  passportNumber: "e356695ee8528b30890e38e5f0875afb6644d61c",
  nationality: "266a5abd49db981b98afac3ee06c92f499622602",
  countryOfResidence: "ebad876a224a8854ced5b40ea3fd41852e864a3a",
  highestQualification: "590bcf6368003ba531fabf02b2d53427ab927b11",
  desiredLevel: "307e8c7f3a14e8f6a24839151f093ce0f9c93365",
  areaOfInterest: "dff00d3ccfa48561ed413b93d78bae921d3b26e1",
  preferredMode: "d84b4ab9275964922508fd8b5c2b4d8fff67a697",
  preferredStartMonth: "3c131beee887a4391db98adf659bf03b67c2d576",
  preferredDestination: "1f3f30e974eaf7b88d1cd95b43efffc129abd71c",
  educationFunding: "147e0f451a4bd38bc35d7c1fe8c8631fee212160",
  promoCode: "7243d4c977d88d238d62f109f4e8c9a323a7f23a",
  referredBy: "a08cf6343f3d302fdf15306c24d01e004ab47724",
  recommendedCounsellor: "91cce905e99d4d7ad6a8e2b4db41b89f8a5a72cf",
  gdprConsent: "507b7011ec6784002524c02f940ef8610059cd1e",
};

// ===== ENUM OPTION ID MAPS =====
// Every numeric ID below was verified 2026-07-29 against the live WSA
// Pipedrive account's /personFields option lists. Where the front-end offers
// a choice with no live Pipedrive equivalent, it's mapped to the closest
// existing option (commented) rather than left to silently drop the field.
const GENDER_MAP: Record<string, number> = {
  male: 27, Male: 27,
  female: 28, Female: 28,
  "prefer not to say": 29, "Prefer not to say": 29,
  other: 30, Other: 30,
};

const QUALIFICATION_MAP: Record<string, number> = {
  secondary: 31, // High School (closest — no dedicated Secondary/GCSE option)
  "a-level": 31, // High School (closest — no dedicated A-Level option here)
  hnd: 32,
  diploma: 36, // Other (no dedicated Diploma/Foundation option)
  bachelors: 33, // Undergraduate
  masters: 34,
  doctorate: 35, // PhD
  other: 36,
};

const LEVEL_MAP: Record<string, number> = {
  foundation: 39, // International Foundation Program
  undergraduate: 41, // Undergraduate (Bachelor's)
  "top-up": 42, // Top-Up Degree
  "pre-masters": 261, // Pre Masters
  postgraduate: 43, // Taught Master's
  doctorate: 45, // PhD Doctorate
  boarding: 38, // GCSE (closest — no dedicated boarding-school option)
  language: 46, // Other
  summer: 46, // Other
  online: 46, // Other
  other: 46,
};

const AREA_MAP: Record<string, number> = {
  "AI & Data Science": 47, "ai-data": 47,
  "Art & Design": 48, "art-design": 48,
  "Business & Management": 49, "business": 49,
  "Education & Teaching": 50, "education": 50,
  "Engineering": 51, "engineering": 51,
  "Science & Research": 52, "science": 52,
  "Design & Creative Arts": 53, "creative": 53,
  "Media & Communications": 54, "media": 54,
  "Nursing & Healthcare": 55, "healthcare": 55,
  "Sports & Performance": 56, "sports": 56,
  "IT & Computing": 57, "computing": 57,
  "Other / Not Sure": 58, "other": 58,
  "Law": 58, "law": 58,
  "International Relations": 58, "international-relations": 58,
};

const MODE_MAP: Record<string, number> = {
  "full-time": 59, // Study Abroad Full Time
  "part-time": 65, // Other (no dedicated part-time option)
  online: 64,
  blended: 63, // Hybrid (online & abroad) — closest match
};

const MONTH_MAP: Record<string, number> = {
  January: 66, February: 67, March: 68, April: 69,
  May: 70, June: 71, July: 72, August: 73,
  September: 74, October: 75, November: 76, December: 77,
};

const DESTINATION_MAP: Record<string, number> = {
  uk: 78, "United Kingdom": 78, "United Kingdom (UK)": 78,
  cyprus: 79, Cyprus: 79,
  hungary: 80, Hungary: 80,
  usa: 85, "United States": 85, USA: 85,
  canada: 86, Canada: 86,
  europe: 84, Europe: 84, "Other European Counties": 84,
  multiple: 88, "Not Sure": 88, "Not Sure - Need Advice": 88,
  // No live "Australia" option exists in Pipedrive's Preferred Study
  // Destination field. "Australia" was removed from the public dropdown
  // (client/src/pages/Contact.tsx) rather than silently recording it as New
  // Zealand — do not re-add either without a real Pipedrive option first.
  "new-zealand": 87,
};

const FUNDING_MAP: Record<string, number> = {
  "self-funded": 89,
  loan: 89, // Self-funded (closest — no dedicated loan option)
  scholarship: 92, // Looking for a partial scholarship (closest generic "scholarship" bucket)
  sponsor: 90, // Funded by parents or relatives (closest — no dedicated third-party sponsor option)
  mixed: 92, // Looking for a partial scholarship (closest — implies partial self + other funding)
};

const COUNSELLOR_MAP: Record<string, number> = {
  eldah: 95, "Eldah Therone": 95, Eldah: 95,
  glenice: 96, "Glenice Owino": 96, Glenice: 96,
  manet: 97, "Manet Khamayo": 97, Manet: 97,
  sarafina: 98, "Sarafina Kihumbu": 98, Sarafina: 98,
  "help-me-choose": 99, "Help me choose": 99, "": 99,
};

/** Display-only label for the recommendedCounsellor form value (a slug like
 * "eldah") — used to make the selection immediately readable in the Lead
 * title and staff email, nowhere else. Not a Pipedrive ID of any kind. */
const COUNSELLOR_LABELS: Record<string, string> = {
  eldah: "Eldah Therone",
  glenice: "Glenice Owino",
  manet: "Manet Khamayo",
  sarafina: "Sarafina Kihumbu",
};

/** "Unallocated", not "None" — no counsellor was selected, which is a
 * distinct, meaningful state (not an absence of information) and reads
 * that way in the Lead title and staff email. */
function resolveCounsellorLabel(recommendedCounsellor: string): string {
  return COUNSELLOR_LABELS[recommendedCounsellor] ?? "Unallocated";
}

// ===== FOLLOWER USER IDS — visibility only, NOT ownership =====
// Real Pipedrive user IDs, used exclusively to add Tim and Eldah as
// followers on the Person record for every enquiry, so both have
// standing visibility on every new Lead regardless of who or what
// Pipedrive assigns as its owner. This is deliberately not owner_id and
// not an allocation mechanism: no Lead created by this codebase has ever
// had an explicit owner set. The mechanism that currently assigns Lead
// ownership is not yet understood (see createStudentLead's doc comment),
// and this must not become a second, competing one — a follower has
// visibility on the record, nothing more.
const FOLLOWER_USER_IDS = {
  tim: 25629968,
  eldah: 25633444,
} as const;

/**
 * Best-effort: adds a user as a follower on a Person record. Pipedrive's
 * Leads API has no followers endpoint (confirmed against the official API
 * docs), so this is the closest native mechanism for giving someone
 * Pipedrive-side visibility on an enquiry without making them the Lead
 * owner. Never blocks or fails the submission — a follower-add failure
 * (e.g. already following) is logged and swallowed.
 */
async function addPersonFollower(personId: number, userId: number): Promise<void> {
  try {
    await pipedriveRequest(`/persons/${personId}/followers`, "POST", { user_id: userId });
  } catch (error) {
    console.warn(
      `[Pipedrive] Could not add follower ${userId} to person ${personId}:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

const levelLabels: Record<string, string> = {
  foundation: "Foundation / Pathway",
  undergraduate: "Undergraduate (Bachelor's)",
  "top-up": "Top-up Degree",
  "pre-masters": "Pre-Master's",
  postgraduate: "Postgraduate (Master's)",
  doctorate: "Doctorate (PhD)",
  boarding: "Boarding School",
  language: "Language Programme",
  summer: "Summer Programme",
  online: "Online / Distance Learning",
  other: "Other / Not Sure",
};

const destinationLabels: Record<string, string> = {
  uk: "United Kingdom", usa: "United States", canada: "Canada",
  europe: "Europe", multiple: "Multiple / Not sure",
};

interface PipedrivePersonSearchItem {
  item?: { id?: number };
}

/**
 * Look up an existing Person by exact email match, then (if not found) by
 * phone. Returns the Pipedrive person id, or null if no match — callers
 * create a new Person in that case rather than risk merging unrelated
 * records automatically.
 */
async function findExistingPersonId(email: string, phone: string): Promise<number | null> {
  if (email) {
    const result = await pipedriveRequest(
      `/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true`,
      "GET"
    );
    const items: PipedrivePersonSearchItem[] = result?.data?.items ?? [];
    const found = items.find(i => typeof i.item?.id === "number");
    if (found?.item?.id) return found.item.id;
  }

  if (phone) {
    const result = await pipedriveRequest(
      `/persons/search?term=${encodeURIComponent(phone)}&fields=phone&exact_match=true`,
      "GET"
    );
    const items: PipedrivePersonSearchItem[] = result?.data?.items ?? [];
    const found = items.find(i => typeof i.item?.id === "number");
    if (found?.item?.id) return found.item.id;
  }

  return null;
}

/**
 * Extract the month name from a preferredStartMonth value like "January 2027"
 */
function extractMonth(value: string): string {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  for (const m of months) {
    if (value.toLowerCase().includes(m.toLowerCase())) return m;
  }
  return value;
}

function buildPersonPayload(data: StudentFormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: `${data.firstName}${data.middleName ? " " + data.middleName : ""} ${data.lastName}`,
    email: [{ value: data.email, primary: true, label: "work" }],
    phone: data.phone ? [{ value: data.phone, primary: true, label: "mobile" }] : undefined,
    [PF.middleName]: data.middleName || undefined,
    [PF.gender]: GENDER_MAP[data.gender] || undefined,
    [PF.passportNumber]: data.passportNumber || undefined,
    [PF.nationality]: data.nationality || undefined,
    [PF.countryOfResidence]: data.country || undefined,
    [PF.highestQualification]: QUALIFICATION_MAP[data.highestQualification] || undefined,
    [PF.desiredLevel]: LEVEL_MAP[data.desiredLevel] || undefined,
    [PF.areaOfInterest]: AREA_MAP[data.areaOfStudy] || undefined,
    [PF.preferredMode]: MODE_MAP[data.preferredMode] || undefined,
    [PF.preferredStartMonth]: MONTH_MAP[extractMonth(data.preferredStartMonth)] || undefined,
    [PF.preferredDestination]: DESTINATION_MAP[data.preferredDestination] || undefined,
    [PF.educationFunding]: FUNDING_MAP[data.educationFunding] || undefined,
    [PF.promoCode]: data.promoCode || undefined,
    [PF.referredBy]: data.referredToWSA === "yes" && data.referredByWhom ? `yes — ${data.referredByWhom}` : (data.referredToWSA || undefined),
    [PF.recommendedCounsellor]: COUNSELLOR_MAP[data.recommendedCounsellor] ?? COUNSELLOR_MAP["help-me-choose"],
    [PF.gdprConsent]: data.gdprConsent ? 105 : 106,
  };

  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
}

function buildNote(data: StudentFormData): string {
  const lines = [
    `## Student Sign-up Summary`,
    `**Full Name:** ${data.firstName}${data.middleName ? " " + data.middleName : ""} ${data.lastName}`,
    `**Date of Birth:** ${data.dateOfBirth || "—"}`,
    `**Email:** ${data.email}`,
    `**Phone:** ${data.phone || "—"}`,
    `**Gender:** ${data.gender || "—"}`,
    `**Passport Number:** ${data.passportNumber || "—"}`,
    `**Nationality:** ${data.nationality || "—"}`,
    `**Country of Residence:** ${data.country || "—"}`,
    `**Highest Qualification:** ${data.highestQualification || "—"}`,
    `**Desired Level of Study:** ${levelLabels[data.desiredLevel] || data.desiredLevel || "—"}`,
    `**Area of Interest:** ${data.areaOfStudy || "—"}`,
    `**Preferred Mode:** ${data.preferredMode || "—"}`,
    `**Preferred Start Month:** ${data.preferredStartMonth || "—"}`,
    `**Preferred Destination:** ${destinationLabels[data.preferredDestination] || data.preferredDestination || "—"}`,
    `**Education Funding:** ${data.educationFunding || "—"}`,
    `**Promotional Code:** ${data.promoCode || "—"}`,
    `**Referred to WSA:** ${data.referredToWSA === "yes" ? "Yes" : data.referredToWSA === "no" ? "No" : "—"}`,
    `**Referrer Name:** ${data.referredToWSA === "yes" && data.referredByWhom ? data.referredByWhom : "—"}`,
    `**Recommended Student Counsellor:** ${data.recommendedCounsellor || "Help me choose"}`,
    `**GDPR Consent:** ${data.gdprConsent ? "Yes" : "No"}`,
    ``,
    `**Source:** WSA Website - Sign-up Form`,
  ];
  return lines.join("\n");
}

/**
 * Create or reuse a Person and Lead in Pipedrive from the Sign-up Form.
 * Searches for an existing Person by email, then phone, before creating a
 * new one — avoids duplicate Person records for repeat submissions.
 *
 * Creates a Lead (Leads Inbox), not a Deal. The brief 2026-08-05/06 switch
 * to Deals was premature — real evidence (a staff member's Leads-Inbox
 * owner filter, not a broken integration) showed enquiries were reaching
 * Pipedrive successfully the whole time. Reverted here without introducing
 * any explicit owner/assignment logic: it is not yet established what
 * currently allocates genuine website Leads across counsellors (Pipedrive
 * automation and/or staff workflow — a live labelled test on 2026-08-07
 * showed a Lead land owned by Tim Hunt despite Eldah being the selection,
 * proving this codebase's silence on owner_id isn't the cause), and a
 * second, competing allocation mechanism must not be introduced until
 * that's understood. person_id and the existing recommendedCounsellor
 * custom field (COUNSELLOR_MAP, unchanged) are set exactly as before; no
 * owner_id is set on the Lead.
 *
 * Two visibility-only additions on top of that, neither touching
 * ownership: the Lead title now includes the recommended counsellor's
 * name so it's readable straight from the Leads Inbox list view, and Tim
 * and Eldah are both added as Person followers on every enquiry (not just
 * an unallocated case — Pipedrive's Leads API has no followers endpoint,
 * confirmed against the official docs, so this is the closest native
 * mechanism for standing visibility regardless of who ends up owning it).
 */
export async function createStudentLead(data: StudentFormData) {
  const existingPersonId = await findExistingPersonId(data.email, data.phone);
  const personPayload = buildPersonPayload(data);

  let personId: number;
  if (existingPersonId) {
    await pipedriveRequest(`/persons/${existingPersonId}`, "PUT", personPayload);
    personId = existingPersonId;
  } else {
    const created = await pipedriveRequest("/persons", "POST", personPayload);
    personId = created.data.id;
  }

  const recommendedCounsellorLabel = resolveCounsellorLabel(data.recommendedCounsellor);
  const leadTitle = `${data.firstName} ${data.lastName} - ${levelLabels[data.desiredLevel] || data.desiredLevel} [Rec: ${recommendedCounsellorLabel}]`;

  const leadResult = await pipedriveRequest("/leads", "POST", {
    title: leadTitle,
    person_id: personId,
  });

  const leadId = leadResult.data.id;

  await pipedriveRequest("/notes", "POST", {
    lead_id: leadId,
    content: buildNote(data),
    pinned_to_lead_flag: 1,
  });

  await addPersonFollower(personId, FOLLOWER_USER_IDS.tim);
  await addPersonFollower(personId, FOLLOWER_USER_IDS.eldah);

  return { personId, leadId, recommendedCounsellorLabel, reusedExistingPerson: Boolean(existingPersonId) };
}
