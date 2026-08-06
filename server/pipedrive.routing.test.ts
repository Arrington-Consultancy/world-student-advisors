import { describe, expect, it, vi, afterEach } from "vitest";
import { createStudentLead } from "./pipedrive";

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
  recommendedCounsellor: "",
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

/** Fresh mock fetch per test — no existing Person, so every case creates a new one. */
function installMockFetch() {
  const calls: Call[] = [];
  let leadCounter = 0;

  const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
    const method = opts?.method ?? "GET";
    const body = typeof opts?.body === "string" ? JSON.parse(opts.body) : undefined;
    calls.push({ url, method, body });

    if (url.includes("/persons/search")) {
      return jsonResponse({ success: true, data: { items: [] } });
    }
    if (/\/persons\/\d+\/followers/.test(url) && method === "POST") {
      return jsonResponse({ success: true, data: {} });
    }
    if (url.includes("/persons") && method === "POST") {
      return jsonResponse({ success: true, data: { id: 9001 } });
    }
    if (url.includes("/leads") && method === "POST") {
      leadCounter++;
      return jsonResponse({ success: true, data: { id: `lead-uuid-${leadCounter}` } });
    }
    if (url.includes("/deals")) {
      throw new Error("TEST FAILURE: /deals was called — workflow must create Leads, not Deals");
    }
    if (url.includes("/notes") && method === "POST") {
      return jsonResponse({ success: true, data: { id: 1 } });
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

describe.each([
  ["eldah", "Eldah Therone", 25633444],
  ["glenice", "Glenice Owino", 25633433],
  ["manet", "Manet Khamayo", 25633422],
  ["sarafina", "Sarafina Kihumbu", 25633455],
] as const)("recommendedCounsellor = %s (selected counsellor case)", (counsellorValue, expectedName, expectedOwnerId) => {
  it("creates exactly one Person, one Lead (never a Deal), one Note, owned by the selected counsellor, no followers", async () => {
    const calls = installMockFetch();

    const result = await createStudentLead({ ...baseData, recommendedCounsellor: counsellorValue });

    expect(result.needsAllocation).toBe(false);
    expect(result.ownerId).toBe(expectedOwnerId);
    expect(result.ownerName).toBe(expectedName);

    const personCreates = callsTo(calls, "/persons", "POST").filter(c => !c.url.includes("followers"));
    expect(personCreates).toHaveLength(1);

    const leadCreates = callsTo(calls, "/leads", "POST");
    expect(leadCreates).toHaveLength(1);
    expect(leadCreates[0].body.owner_id).toBe(expectedOwnerId);
    expect(leadCreates[0].body.person_id).toBe(9001);

    const dealCreates = callsTo(calls, "/deals");
    expect(dealCreates).toHaveLength(0);

    const noteCreates = callsTo(calls, "/notes", "POST");
    expect(noteCreates).toHaveLength(1);
    expect(noteCreates[0].body.lead_id).toBe(result.leadId);
    expect(noteCreates[0].body.deal_id).toBeUndefined();
    expect(noteCreates[0].body.pinned_to_lead_flag).toBe(1);

    // No unallocated-only follower calls when a counsellor was explicitly selected.
    const followerCreates = callsTo(calls, "followers", "POST");
    expect(followerCreates).toHaveLength(0);
  });
});

describe("recommendedCounsellor = '' (unallocated case)", () => {
  it("creates exactly one Person, one Lead owned by Eldah, one Note, and adds both Eldah and Tim as Person followers", async () => {
    const calls = installMockFetch();

    const result = await createStudentLead({ ...baseData, recommendedCounsellor: "" });

    expect(result.needsAllocation).toBe(true);
    expect(result.ownerId).toBe(25633444); // Eldah — the allocation queue owner
    expect(result.ownerName).toBe("Eldah Therone");

    const personCreates = callsTo(calls, "/persons", "POST").filter(c => !c.url.includes("followers"));
    expect(personCreates).toHaveLength(1);

    const leadCreates = callsTo(calls, "/leads", "POST");
    expect(leadCreates).toHaveLength(1);
    expect(leadCreates[0].body.owner_id).toBe(25633444);

    expect(callsTo(calls, "/deals")).toHaveLength(0);

    const noteCreates = callsTo(calls, "/notes", "POST");
    expect(noteCreates).toHaveLength(1);
    expect(noteCreates[0].body.lead_id).toBe(result.leadId);

    const followerCreates = callsTo(calls, "followers", "POST");
    expect(followerCreates).toHaveLength(2);
    const followedUserIds = followerCreates.map(c => c.body.user_id).sort();
    expect(followedUserIds).toEqual([25629968, 25633444].sort()); // Tim + Eldah
  });

  it("never creates a duplicate Lead even when the follower calls are made", async () => {
    const calls = installMockFetch();
    await createStudentLead({ ...baseData, recommendedCounsellor: "" });
    expect(callsTo(calls, "/leads", "POST")).toHaveLength(1);
  });
});

describe("reused Person (repeat submission)", () => {
  it("still creates exactly one Lead, no duplicate Person, no Deal", async () => {
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
      if (url.includes("/deals")) {
        throw new Error("TEST FAILURE: /deals was called");
      }
      if (url.includes("/notes") && method === "POST") {
        return jsonResponse({ success: true, data: { id: 1 } });
      }
      throw new Error(`Unexpected fetch call: ${method} ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await createStudentLead({ ...baseData, recommendedCounsellor: "glenice" });

    expect(result.reusedExistingPerson).toBe(true);
    expect(result.personId).toBe(5555);
    expect(callsTo(calls, "/persons", "POST")).toHaveLength(0);
    expect(callsTo(calls, "/persons/5555", "PUT")).toHaveLength(1);
    expect(callsTo(calls, "/leads", "POST")).toHaveLength(1);
    expect(callsTo(calls, "/deals")).toHaveLength(0);
  });
});
