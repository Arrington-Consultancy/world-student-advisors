import { describe, expect, it, vi, afterEach } from "vitest";
import { createStudentLead } from "./pipedrive";

// This cut deliberately does NOT set owner_id or any allocation logic — see
// the doc comment on createStudentLead in server/pipedrive.ts. These tests
// exist specifically to prove that in code, since the whole point of this
// branch is to restore Leads without introducing a second, competing
// allocation mechanism until the existing one is understood.
//
// Tim and Eldah are added as Person followers (visibility, not ownership)
// on every enquiry — separately tested below to keep that distinction
// explicit rather than folded into the no-owner_id assertions.
const TIM_USER_ID = 25629968;
const ELDAH_USER_ID = 25633444;

const baseData = {
  firstName: "Test",
  middleName: "",
  lastName: "Student",
  gender: "female",
  dateOfBirth: "2000-01-01",
  passportNumber: "",
  phone: "+441234567890",
  email: "test.student@example.com",
  nationality: "British",
  country: "United Kingdom",
  highestQualification: "bachelors",
  desiredLevel: "postgraduate",
  areaOfStudy: "Computer Science",
  preferredMode: "full-time",
  preferredStartMonth: "January",
  preferredDestination: "uk",
  educationFunding: "self-funded",
  promoCode: "",
  referredToWSA: "",
  referredByWhom: "",
  recommendedCounsellor: "eldah",
  gdprConsent: true,
};

type Call = { url: string; method: string; body: any };

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

function installMockFetch() {
  const calls: Call[] = [];

  const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
    const method = opts?.method ?? "GET";
    const body = typeof opts?.body === "string" ? JSON.parse(opts.body) : undefined;
    calls.push({ url, method, body });

    if (url.includes("/persons/search")) {
      return jsonResponse({ success: true, data: { items: [] } });
    }
    if (url.includes("/persons") && method === "POST") {
      return jsonResponse({ success: true, data: { id: 9001 } });
    }
    if (url.includes("/leads") && method === "POST") {
      return jsonResponse({ success: true, data: { id: "58be91f0-90c4-11f1-b0fa-7d61200439c7" } });
    }
    if (url.includes("/deals")) {
      throw new Error("TEST FAILURE: /deals was called — this cut must create Leads, not Deals");
    }
    if (url.includes("/notes") && method === "POST") {
      return jsonResponse({ success: true, data: { id: 1 } });
    }
    if (url.includes("/followers") && method === "POST") {
      return jsonResponse({ success: true, data: {} });
    }
    throw new Error(`Unexpected fetch call in test: ${method} ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof fetch;
  return calls;
}

function callsTo(calls: Call[], pathFragment: string, method?: string) {
  return calls.filter(c => c.url.includes(pathFragment) && (!method || c.method === method));
}

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("createStudentLead — Leads only, no owner/allocation logic", () => {
  it("creates exactly one Person, one Lead (never a Deal), one Note, with no owner_id set", async () => {
    const calls = installMockFetch();

    const result = await createStudentLead(baseData);

    expect(result.personId).toBe(9001);
    expect(result.leadId).toBe("58be91f0-90c4-11f1-b0fa-7d61200439c7");
    expect(result.reusedExistingPerson).toBe(false);

    const personCreates = callsTo(calls, "/persons", "POST").filter(c => !c.url.includes("followers"));
    expect(personCreates).toHaveLength(1);

    const leadCreates = callsTo(calls, "/leads", "POST");
    expect(leadCreates).toHaveLength(1);
    expect(leadCreates[0].body.person_id).toBe(9001);
    // The core assertion for this cut: no owner_id anywhere on the Lead body.
    expect(leadCreates[0].body).not.toHaveProperty("owner_id");
    expect(Object.keys(leadCreates[0].body).sort()).toEqual(["person_id", "title"]);

    expect(callsTo(calls, "/deals")).toHaveLength(0);

    const noteCreates = callsTo(calls, "/notes", "POST");
    expect(noteCreates).toHaveLength(1);
    expect(noteCreates[0].body.lead_id).toBe(result.leadId);
    expect(noteCreates[0].body.deal_id).toBeUndefined();
    expect(noteCreates[0].body.pinned_to_lead_flag).toBe(1);
  });

  it("adds both Tim and Eldah as Person followers on every enquiry — visibility, not ownership", async () => {
    const calls = installMockFetch();

    const result = await createStudentLead({ ...baseData, recommendedCounsellor: "manet" });

    const followerCalls = callsTo(calls, `/persons/${result.personId}/followers`, "POST");
    expect(followerCalls).toHaveLength(2);
    const followedUserIds = followerCalls.map(c => c.body.user_id).sort();
    expect(followedUserIds).toEqual([TIM_USER_ID, ELDAH_USER_ID].sort());

    // Followers are added on the Person, never on the Lead, and this must
    // never be confused with owner_id.
    const leadCreates = callsTo(calls, "/leads", "POST");
    expect(leadCreates[0].body).not.toHaveProperty("owner_id");
  });

  it("includes the recommended counsellor's name in the Lead title, and returns it as a label", async () => {
    const calls = installMockFetch();

    const result = await createStudentLead({ ...baseData, recommendedCounsellor: "sarafina" });

    expect(result.recommendedCounsellorLabel).toBe("Sarafina Kihumbu");
    const leadCreates = callsTo(calls, "/leads", "POST");
    expect(leadCreates[0].body.title).toContain("[Rec: Sarafina Kihumbu]");
  });

  it("labels an empty recommendedCounsellor as 'Help me choose', in both the title and the return value", async () => {
    const calls = installMockFetch();

    const result = await createStudentLead({ ...baseData, recommendedCounsellor: "" });

    expect(result.recommendedCounsellorLabel).toBe("Help me choose");
    const leadCreates = callsTo(calls, "/leads", "POST");
    expect(leadCreates[0].body.title).toContain("[Rec: Help me choose]");
  });

  it("still sets the recommendedCounsellor Person custom field exactly as before, unrelated to ownership", async () => {
    const calls = installMockFetch();

    await createStudentLead({ ...baseData, recommendedCounsellor: "glenice" });

    const personCreates = callsTo(calls, "/persons", "POST").filter(c => !c.url.includes("followers"));
    expect(personCreates).toHaveLength(1);
    // 91cce905e99d4d7ad6a8e2b4db41b89f8a5a72cf = PF.recommendedCounsellor,
    // 96 = COUNSELLOR_MAP["glenice"] — both unchanged from the existing mapping.
    expect(personCreates[0].body["91cce905e99d4d7ad6a8e2b4db41b89f8a5a72cf"]).toBe(96);
  });

  it("reuses an existing Person (by email) without creating a duplicate, still no owner_id", async () => {
    const calls: Call[] = [];
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      const method = opts?.method ?? "GET";
      const body = typeof opts?.body === "string" ? JSON.parse(opts.body) : undefined;
      calls.push({ url, method, body });

      if (url.includes("/persons/search")) {
        return jsonResponse({ success: true, data: { items: [{ item: { id: 5555 } }] } });
      }
      if (url.includes("/persons/5555") && method === "PUT") {
        return jsonResponse({ success: true, data: { id: 5555 } });
      }
      if (url.includes("/leads") && method === "POST") {
        return jsonResponse({ success: true, data: { id: "lead-uuid-repeat" } });
      }
      if (url.includes("/notes") && method === "POST") {
        return jsonResponse({ success: true, data: { id: 1 } });
      }
      if (url.includes("/followers") && method === "POST") {
        return jsonResponse({ success: true, data: {} });
      }
      throw new Error(`Unexpected fetch call: ${method} ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await createStudentLead(baseData);

    expect(result.reusedExistingPerson).toBe(true);
    expect(result.personId).toBe(5555);
    expect(callsTo(calls, "/persons", "POST").filter(c => !c.url.includes("followers"))).toHaveLength(0);
    expect(callsTo(calls, "/persons/5555", "PUT")).toHaveLength(1);

    const leadCreates = callsTo(calls, "/leads", "POST");
    expect(leadCreates).toHaveLength(1);
    expect(leadCreates[0].body).not.toHaveProperty("owner_id");
  });
});
