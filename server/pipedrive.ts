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

/**
 * Thrown on any non-OK Pipedrive response. Carries a safe, credential-free
 * summary (status, endpoint, truncated response body) so callers can surface
 * genuinely diagnostic detail in a failure notification without ever risking
 * the API token leaking — the token lives only in the request URL, which is
 * never included here or in .message.
 */
export class PipedriveApiError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly safeDetail: string;

  constructor(status: number, endpoint: string, responseBody: string) {
    const safeDetail = responseBody.slice(0, 500);
    super(`Pipedrive API error (${status}) on ${endpoint}: ${safeDetail}`);
    this.name = "PipedriveApiError";
    this.status = status;
    this.endpoint = endpoint;
    this.safeDetail = safeDetail;
  }
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
    throw new PipedriveApiError(response.status, endpoint, errorText);
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
  hnd: 46, // Other (no dedicated HND option in this field — HND lives on Highest Qualification instead)
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

// ===== PIPEDRIVE USER (OWNER) IDS =====
// Real Pipedrive user IDs — a completely different ID space from
// COUNSELLOR_MAP above, which maps to option IDs on a display-only custom
// field. These IDs are used for actual Lead/Person ownership and were
// looked up live against the WSA Pipedrive account on 2026-08-06 (all five
// confirmed active).
const PIPEDRIVE_USER_IDS = {
  tim: 25629968,
  eldah: 25633444,
  glenice: 25633433,
  manet: 25633422,
  sarafina: 25633455,
} as const;

const COUNSELLOR_OWNER_MAP: Record<string, { id: number; name: string }> = {
  eldah: { id: PIPEDRIVE_USER_IDS.eldah, name: "Eldah Therone" },
  "Eldah Therone": { id: PIPEDRIVE_USER_IDS.eldah, name: "Eldah Therone" },
  Eldah: { id: PIPEDRIVE_USER_IDS.eldah, name: "Eldah Therone" },
  glenice: { id: PIPEDRIVE_USER_IDS.glenice, name: "Glenice Owino" },
  "Glenice Owino": { id: PIPEDRIVE_USER_IDS.glenice, name: "Glenice Owino" },
  Glenice: { id: PIPEDRIVE_USER_IDS.glenice, name: "Glenice Owino" },
  manet: { id: PIPEDRIVE_USER_IDS.manet, name: "Manet Khamayo" },
  "Manet Khamayo": { id: PIPEDRIVE_USER_IDS.manet, name: "Manet Khamayo" },
  Manet: { id: PIPEDRIVE_USER_IDS.manet, name: "Manet Khamayo" },
  sarafina: { id: PIPEDRIVE_USER_IDS.sarafina, name: "Sarafina Kihumbu" },
  "Sarafina Kihumbu": { id: PIPEDRIVE_USER_IDS.sarafina, name: "Sarafina Kihumbu" },
  Sarafina: { id: PIPEDRIVE_USER_IDS.sarafina, name: "Sarafina Kihumbu" },
};

/** Owner assigned when no counsellor was selected — an explicit allocation
 * queue, not a silent default. Both this user and Tim get added as
 * followers on the Person record (see addPersonFollower) so allocation
 * doesn't depend on one person's inbox. */
const UNALLOCATED_OWNER = { id: PIPEDRIVE_USER_IDS.eldah, name: "Eldah Therone" };

interface OwnerResolution {
  ownerId: number;
  ownerName: string;
  needsAllocation: boolean;
}

/** Resolves a form's recommendedCounsellor value to a real Pipedrive owner. */
function resolveOwner(recommendedCounsellor: string): OwnerResolution {
  const selected = COUNSELLOR_OWNER_MAP[recommendedCounsellor];
  if (selected) {
    return { ownerId: selected.id, ownerName: selected.name, needsAllocation: false };
  }
  return { ownerId: UNALLOCATED_OWNER.id, ownerName: UNALLOCATED_OWNER.name, needsAllocation: true };
}

const levelLabels: Record<string, string> = {
  foundation: "Foundation / Pathway",
  hnd: "HND",
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
 * Best-effort: adds a user as a follower on a Person record. Pipedrive's
 * Leads API has no followers endpoint (confirmed against the official API
 * docs 2026-08-06 — Persons/Deals/Organizations support followers, Leads do
 * not), so this is the closest native mechanism for giving a second person
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

/**
 * Create or reuse a Person and Lead in Pipedrive from the Sign-up Form.
 * Searches for an existing Person by email, then phone, before creating a
 * new one — avoids duplicate Person records for repeat submissions.
 *
 * Creates a Lead (Leads Inbox), not a Deal — this is the correct, evidenced
 * workflow; new enquiries become Deals only once the HUB team qualifies
 * them. A brief period (2026-08-05/06) incorrectly switched this to Deals
 * after "missing enquiries" turned out to be a Leads Inbox owner-filter
 * issue, not a broken integration — see the explicit owner_id below, which
 * is the actual fix.
 *
 * The Lead's owner_id is always set explicitly (never left to Pipedrive's
 * default assignment, which is what caused enquiries to appear "missing" to
 * staff filtering the Leads Inbox by their own name): the selected
 * counsellor if one was chosen, otherwise Eldah Therone as the unallocated
 * queue owner, with both Eldah and Tim Hunt added as Person-level followers
 * so allocation doesn't depend on one person's inbox.
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

  const { ownerId, ownerName, needsAllocation } = resolveOwner(data.recommendedCounsellor);

  const leadTitle = `${data.firstName} ${data.lastName} - ${levelLabels[data.desiredLevel] || data.desiredLevel}`;

  const leadResult = await pipedriveRequest("/leads", "POST", {
    title: leadTitle,
    person_id: personId,
    owner_id: ownerId,
  });

  const leadId: string = leadResult.data.id;

  await pipedriveRequest("/notes", "POST", {
    lead_id: leadId,
    content: buildNote(data),
    pinned_to_lead_flag: 1,
  });

  if (needsAllocation) {
    await addPersonFollower(personId, PIPEDRIVE_USER_IDS.eldah);
    await addPersonFollower(personId, PIPEDRIVE_USER_IDS.tim);
  }

  // Safe logging only — Person ID, Lead ID, owner, and a short API-result
  // summary. Never the API token, never the full note/payload content.
  console.log(
    `[Pipedrive] Created Lead ${leadId} (person ${personId}) — owner: ${ownerName} (${ownerId})` +
      (needsAllocation ? " [unallocated — Eldah + Tim notified as followers]" : "")
  );

  return { personId, leadId, ownerId, ownerName, needsAllocation, reusedExistingPerson: Boolean(existingPersonId) };
}
