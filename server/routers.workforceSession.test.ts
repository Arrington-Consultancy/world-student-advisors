import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Coverage for the Entra-aware workforce endpoint wiring: both token types
 * reach workforce.listWorkers/route, the resolved principal (never client
 * input) lands in the audit trail, routing audit events omit the staff
 * member's free text, and worker execution controls are unchanged by which
 * path authenticated the session.
 */
vi.mock("./pipedrive", () => ({ createStudentLead: vi.fn() }));
vi.mock("./_core/notification", () => ({
  notifyStaff: vi.fn().mockResolvedValue(true),
  notifyInterviewCoachResult: vi.fn().mockResolvedValue(true),
  sendApplicantConfirmation: vi.fn().mockResolvedValue(true),
  sendPortalSetupEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

const mockDb = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
const mockGetDb = vi.fn(async () => mockDb as any);
vi.mock("./db", () => ({
  recordFailedSubmission: vi.fn().mockResolvedValue(undefined),
  recordInterviewCoachSession: vi.fn().mockResolvedValue(undefined),
  getDb: mockGetDb,
}));

vi.mock("./portal-auth", () => ({
  createPortalUser: vi.fn(),
  authenticatePortalUser: vi.fn(),
  setPasswordWithToken: vi.fn(),
  requestPasswordReset: vi.fn().mockResolvedValue(null),
  verifyPortalToken: vi.fn().mockResolvedValue(null),
  getPortalUserById: vi.fn().mockResolvedValue(null),
}));
vi.mock("./portal-resolver", () => ({ resolvePortalDashboard: vi.fn().mockResolvedValue({ state: "no_record" }) }));
vi.mock("./interviewCoach", () => ({
  getSessionQuestions: vi.fn(),
  assessAnswer: vi.fn(),
  summariseSession: vi.fn(),
  TYPE_LABELS: { cas: "", ukvi: "", university: "", course: "" },
}));
vi.mock("./_core/turnstile", () => ({ requireTurnstile: vi.fn().mockResolvedValue(undefined) }));

const mockEnv: { cookieSecret: string; staffPortalPasswordHash: string } = {
  cookieSecret: "test-jwt-secret",
  staffPortalPasswordHash: "",
};
vi.mock("./_core/env", () => ({ ENV: mockEnv }));

const bcrypt = (await import("bcryptjs")).default;
const { appRouter } = await import("./routers");
const { mintStaffIdentityToken } = await import("./staffIdentityAuth");
const { getAuditLog, clearAuditLog } = await import("./workforce/audit");

const TEST_PASSWORD = "TestPass123!";
const testHash = await bcrypt.hash(TEST_PASSWORD, 12);

const activeStaffUser = {
  id: 11,
  entraObjectId: "oid-11",
  email: "named.staff@worldstudentadvisors.com",
  displayName: "Named Staff",
  isActive: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
};

function makeCaller() {
  return appRouter.createCaller({ req: { ip: "203.0.113.80" } as any, res: {} as any });
}

function mockStaffUserLookup(rows: unknown[]) {
  mockDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => rows }) }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearAuditLog();
  mockEnv.staffPortalPasswordHash = testHash;
  mockGetDb.mockResolvedValue(mockDb as any);
  mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
});

async function getSharedPasswordToken(caller: ReturnType<typeof makeCaller>): Promise<string> {
  const result = await caller.staffPortal.login({ password: TEST_PASSWORD });
  if (!result.success) throw new Error("shared-password login failed in test setup");
  return result.token;
}

describe("workforce endpoints accept both session types", () => {
  it("listWorkers works with a shared-password session and labels it honestly (no display name to show)", async () => {
    const caller = makeCaller();
    const token = await getSharedPasswordToken(caller);
    const result = await caller.workforce.listWorkers({ token });
    expect(result.session).toEqual({ authMethod: "shared_password", displayName: null });
    expect(result.workers.length).toBeGreaterThanOrEqual(15);
  });

  it("listWorkers works with an Entra session and reports the named principal", async () => {
    mockStaffUserLookup([activeStaffUser]);
    const token = await mintStaffIdentityToken(activeStaffUser as any);
    const result = await makeCaller().workforce.listWorkers({ token });
    expect(result.session).toEqual({ authMethod: "entra_sso", displayName: "Named Staff" });
  });

  it("rejects a garbage token on both endpoints", async () => {
    const caller = makeCaller();
    await expect(caller.workforce.listWorkers({ token: "garbage" })).rejects.toThrow();
    await expect(caller.workforce.route({ token: "garbage", request: "visa check" })).rejects.toThrow();
  });

  it("worker execution controls are identical under both session types, so Entra grants nothing extra", async () => {
    const caller = makeCaller();
    const sharedToken = await getSharedPasswordToken(caller);
    mockStaffUserLookup([activeStaffUser]);
    const entraToken = await mintStaffIdentityToken(activeStaffUser as any);

    const viaShared = await caller.workforce.listWorkers({ token: sharedToken });
    const viaEntra = await caller.workforce.listWorkers({ token: entraToken });
    // Parity is the property, not universal denial: whatever the register
    // permits must be identical on both paths, so signing in with Entra
    // can never open a worker the shared password would not.
    const shared = viaShared.workers.map(w => `${w.id}:${w.canOpenForLiveExecution}`);
    const entra = viaEntra.workers.map(w => `${w.id}:${w.canOpenForLiveExecution}`);
    expect(entra).toEqual(shared);
    expect(shared).toContain("sophie:true");
    expect(shared).toContain("priya:false");
  });
});

describe("routing audit events carry the resolved principal", () => {
  it("an Entra-authenticated routing request is audited with the real staffUserId — resolved server-side, not from client input", async () => {
    mockStaffUserLookup([activeStaffUser]);
    const token = await mintStaffIdentityToken(activeStaffUser as any);
    await makeCaller().workforce.route({ token, request: "Can you check this student's UK visa evidence?" });

    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].staffUserId).toBe(11);
    expect(log[0].authMethod).toBe("entra_sso");
    expect(log[0].workerId).toBe("priya");
    expect(log[0].requestedCapability).toBe("receptionist:route");
  });

  it("a shared-password routing request is audited with staffUserId null — never a guessed or defaulted identity", async () => {
    const caller = makeCaller();
    const token = await getSharedPasswordToken(caller);
    await caller.workforce.route({ token, request: "scholarship funding gap" });

    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].staffUserId).toBeNull();
    expect(log[0].authMethod).toBe("shared_password");
  });

  it("the audit event never contains the staff member's free text, which may name a student", async () => {
    const caller = makeCaller();
    const token = await getSharedPasswordToken(caller);
    const sensitiveText = "Please check Chidi Okafor's UK visa refusal urgently";
    await caller.workforce.route({ token, request: sensitiveText });

    const [event] = getAuditLog();
    const serialised = JSON.stringify(event);
    expect(serialised).not.toContain("Chidi Okafor");
    expect(serialised).not.toContain(sensitiveText);
  });

  it("an unmatched routing request is audited against the receptionist itself, not an invented worker", async () => {
    const caller = makeCaller();
    const token = await getSharedPasswordToken(caller);
    await caller.workforce.route({ token, request: "write me a poem about the weather" });

    const [event] = getAuditLog();
    expect(event.workerId).toBe("staff_receptionist");
    expect(event.permissionReason).toMatch(/no worker matched/i);
  });
});

/**
 * staffPortal.me must recognise BOTH session types. It previously called
 * verifyStaffPortalToken (shared-password only), so a genuine Entra session
 * was reported unauthenticated: the client stored the valid token, asked
 * `me` about it, was told "not authenticated", discarded the session and
 * bounced the user back to the sign-in page after a successful Microsoft
 * sign-in. The workforce endpoints were unaffected (they already used
 * resolveStaffSession), which is exactly why the earlier tests missed this —
 * they never asserted a SUCCESSFUL Entra session through `me`.
 */
describe("staffPortal.me recognises both session types", () => {
  it("reports an Entra session as authenticated and names the principal", async () => {
    mockStaffUserLookup([activeStaffUser]);
    const token = await mintStaffIdentityToken(activeStaffUser as any);
    const result = await makeCaller().staffPortal.me({ token });
    expect(result.authenticated).toBe(true);
    expect(result.authMethod).toBe("entra_sso");
    expect(result.displayName).toBe("Named Staff");
  });

  it("reports a shared-password session as authenticated with no individual name", async () => {
    const caller = makeCaller();
    const token = await getSharedPasswordToken(caller);
    const result = await caller.staffPortal.me({ token });
    expect(result.authenticated).toBe(true);
    expect(result.authMethod).toBe("shared_password");
    expect(result.displayName).toBeNull();
  });

  it("reports a deactivated staff member's still-signed token as unauthenticated", async () => {
    mockStaffUserLookup([{ ...activeStaffUser, isActive: 0 }]);
    const token = await mintStaffIdentityToken(activeStaffUser as any);
    const result = await makeCaller().staffPortal.me({ token });
    expect(result.authenticated).toBe(false);
  });

  it("reports a garbage token as unauthenticated rather than throwing", async () => {
    const result = await makeCaller().staffPortal.me({ token: "garbage" });
    expect(result.authenticated).toBe(false);
    expect(result.authMethod).toBeNull();
  });
});
