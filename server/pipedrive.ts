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

interface GeneralFormData {
  name: string;
  organisation?: string;
  email: string;
  role: string;
  message: string;
}

async function pipedriveRequest(endpoint: string, method: string, body?: Record<string, unknown>) {
  const url = `${PIPEDRIVE_BASE}${endpoint}?api_token=${ENV.pipedriveApiToken}`;
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Pipedrive] API error (${response.status}): ${errorText}`);
    throw new Error(`Pipedrive API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ===== PIPEDRIVE FIELD KEYS =====
// Person custom fields
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
const GENDER_MAP: Record<string, number> = {
  male: 27, Male: 27,
  female: 28, Female: 28,
  "prefer not to say": 29, "Prefer not to say": 29,
  other: 30, Other: 30,
};

const QUALIFICATION_MAP: Record<string, number> = {
  "High School Diploma": 31, "high school": 31, "High School": 31,
  "HND": 32, "hnd": 32,
  "Undergraduate Degree": 33, "undergraduate": 33, "Undergraduate": 33,
  "Master's Degree": 34, "masters": 34, "Masters": 34,
  "PhD": 35, "phd": 35,
  "Other": 36, "other": 36,
  "A-Level or equivalent": 31, // Map to High School as closest
};

const LEVEL_MAP: Record<string, number> = {
  "foundation": 39, "Foundation / Pathway": 39,
  "undergraduate": 41, "Undergraduate (Bachelor's)": 41,
  "postgraduate": 43, "Postgraduate (Master's)": 43, "masters": 262,
  "doctorate": 45, "PhD Doctorate": 45,
  "boarding": 38, // Map to GCSE as closest for boarding school
  "language": 46, // Other
  "summer": 46, // Other
  "online": 46, // Other
  "other": 46,
  "a-level": 40,
  "hnd": 46, // Other (no dedicated HND option in desired-level field)
  "top-up": 41, // Map to Undergraduate as closest
  "pre-masters": 43, // Map to Postgraduate as closest
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
  "Full-time on campus": 59, "full-time": 59,
  "Sports Camp": 60, "sports-camp": 60,
  "Summer School": 61, "summer-school": 61,
  "Short Course": 62, "short-course": 62,
  "Hybrid (online & abroad)": 63, "hybrid": 63,
  "Online / Distance": 64, "online": 64,
  "Other": 65, "other": 65,
};

const MONTH_MAP: Record<string, number> = {
  "January": 66, "February": 67, "March": 68, "April": 69,
  "May": 70, "June": 71, "July": 72, "August": 73,
  "September": 74, "October": 75, "November": 76, "December": 77,
};

const DESTINATION_MAP: Record<string, number> = {
  "uk": 78, "United Kingdom": 78, "United Kingdom (UK)": 78,
  "cyprus": 79, "Cyprus": 79,
  "hungary": 80, "Hungary": 80,
  "usa": 85, "United States": 85, "USA": 85,
  "canada": 86, "Canada": 86,
  "europe": 84, "Europe": 84, "Other European Counties": 84,
  "australia": 87, // Map to New Zealand as closest
  "multiple": 88, "Not Sure": 88, "Not Sure - Need Advice": 88,
  "new-zealand": 87,
};

const FUNDING_MAP: Record<string, number> = {
  "Self-funded": 89, "self-funded": 89,
  "Family-funded": 90, "family-funded": 90, "Parents or relatives": 90,
  "Government scholarship": 91, "government-scholarship": 91,
  "Looking for scholarship": 92, "looking-scholarship": 92,
  "Applied for scholarship": 93, "applied-scholarship": 93,
  "No funding source": 94, "no-funding": 94,
  "Loan": 89, "loan": 89, // Map to self-funding as closest
};

const COUNSELLOR_MAP: Record<string, number> = {
  "eldah": 95, "Eldah Therone": 95, "Eldah": 95,
  "glenice": 96, "Glenice Owino": 96, "Glenice": 96,
  "manet": 97, "Manet Khamayo": 97, "Manet": 97,
  "sarafina": 98, "Sarafina Kihumbu": 98, "Sarafina": 98,
  "help-me-choose": 99, "Help me choose": 99, "": 99,
};

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

/**
 * Create a Person and Lead in Pipedrive from student application form.
 * Maps all form fields to the correct Pipedrive custom fields.
 * Leads appear in the Leads Inbox.
 */
export async function createStudentLead(data: StudentFormData) {
  // 1. Create the person with ALL custom fields mapped
  const personPayload: Record<string, unknown> = {
    name: `${data.firstName}${data.middleName ? " " + data.middleName : ""} ${data.lastName}`,
    email: [{ value: data.email, primary: true, label: "work" }],
    phone: data.phone ? [{ value: data.phone, primary: true, label: "mobile" }] : undefined,
    // Custom fields
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
    [PF.recommendedCounsellor]: COUNSELLOR_MAP[data.recommendedCounsellor] || COUNSELLOR_MAP["help-me-choose"],
    [PF.gdprConsent]: data.gdprConsent ? 105 : 106,
  };

  // Remove undefined values
  Object.keys(personPayload).forEach(key => {
    if (personPayload[key] === undefined) delete personPayload[key];
  });

  const personResult = await pipedriveRequest("/persons", "POST", personPayload);
  const personId = personResult.data.id;

  // 2. Create a lead linked to the person (appears in Leads Inbox)
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

  const leadTitle = `${data.firstName} ${data.lastName} - ${levelLabels[data.desiredLevel] || data.desiredLevel}`;

  const leadResult = await pipedriveRequest("/leads", "POST", {
    title: leadTitle,
    person_id: personId,
  });

  const leadId = leadResult.data.id;

  // 3. Add a summary note (for quick reference in the lead view)
  const destinationLabels: Record<string, string> = {
    uk: "United Kingdom", usa: "United States", canada: "Canada",
    europe: "Europe", australia: "Australia", multiple: "Multiple / Not sure",
  };

  const noteLines = [
    `## Student Application Summary`,
    `**Name:** ${data.firstName}${data.middleName ? " " + data.middleName : ""} ${data.lastName}`,
    `**Date of Birth:** ${data.dateOfBirth}`,
    `**Mobile:** ${data.phone}`,
    `**Email:** ${data.email}`,
    `**Nationality:** ${data.nationality}`,
    `**Country of Residence:** ${data.country}`,
    `**Desired Level:** ${levelLabels[data.desiredLevel] || data.desiredLevel}`,
    `**Area of Study:** ${data.areaOfStudy}`,
    `**Destination:** ${destinationLabels[data.preferredDestination] || data.preferredDestination}`,
    `**Start:** ${data.preferredStartMonth}`,
    `**Funding:** ${data.educationFunding}`,
    data.recommendedCounsellor ? `**Preferred Counsellor:** ${data.recommendedCounsellor}` : "",
    data.referredToWSA === "yes" && data.referredByWhom ? `**Referred by:** ${data.referredByWhom}` : "",
    ``,
    `*All fields also mapped to Person custom fields.*`,
    `**Source:** WSA Website - Student Registration Form`,
  ].filter(Boolean);

  await pipedriveRequest("/notes", "POST", {
    lead_id: leadId,
    content: noteLines.join("\n"),
    pinned_to_lead_flag: 1,
  });

  return { personId, leadId };
}

/**
 * Create a Person and Lead in Pipedrive from general enquiry form.
 * Leads appear in the Leads Inbox.
 */
export async function createGeneralEnquiry(data: GeneralFormData) {
  // 1. Create the person
  const personResult = await pipedriveRequest("/persons", "POST", {
    name: data.name,
    email: [{ value: data.email, primary: true, label: "work" }],
  });

  const personId = personResult.data.id;

  // 2. Create a lead (appears in Leads Inbox)
  const roleLabels: Record<string, string> = {
    institution: "Education Institution / University",
    agent: "Education Agent",
    media: "Media / Press",
    "parent-not-ready": "Parent (not ready to apply)",
    other: "Other",
  };

  const leadTitle = `${data.name} - General Enquiry (${roleLabels[data.role] || data.role})`;

  const noteLines = [
    `**Enquiry type:** ${roleLabels[data.role] || data.role}`,
    data.organisation ? `**Organisation:** ${data.organisation}` : "",
    `**Message:** ${data.message}`,
    `**Source:** WSA Website - General Enquiry Form`,
  ].filter(Boolean);

  const leadResult = await pipedriveRequest("/leads", "POST", {
    title: leadTitle,
    person_id: personId,
  });

  const leadId = leadResult.data.id;

  // 3. Add a note linked to the lead
  await pipedriveRequest("/notes", "POST", {
    lead_id: leadId,
    content: noteLines.join("\n"),
    pinned_to_lead_flag: 1,
  });

  return { personId, leadId };
}
