import { describe, expect, it } from "vitest";
import {
  ALLOWED_VARIABLE_NAMES,
  AUTOMATION_IDENTITY,
  AUTOMATION_SECRET_PREFIX,
  AutomationAuthorityError,
  MANAGED_SSO_APP_DISPLAY_NAME,
  PRODUCTION_REDIRECT_URI,
  RAILWAY_TARGET,
  assertAuthorisedRailwayTarget,
  assertAuthorisedVariableNames,
  automationSecretDisplayName,
  buildApplicationCreatePayload,
  buildAuditEvent,
  buildGraphTokenRequest,
  buildRailwayVariablesMutation,
  buildRedirectPatchIfNeeded,
  evaluateDeploymentAfterWrite,
  selectManagedApplication,
  selectPasswordsToPrune,
  type GraphApplication,
} from "./automation";

const managedApp = (overrides: Partial<GraphApplication> = {}): GraphApplication => ({
  id: "obj-1",
  appId: "app-1",
  displayName: MANAGED_SSO_APP_DISPLAY_NAME,
  signInAudience: "AzureADMyOrg",
  web: { redirectUris: [PRODUCTION_REDIRECT_URI] },
  passwordCredentials: [],
  ...overrides,
});

describe("Railway authority boundaries", () => {
  it("accepts only the exact authorised project/environment/service triple", () => {
    expect(() => assertAuthorisedRailwayTarget({ ...RAILWAY_TARGET })).not.toThrow();
    for (const field of ["projectId", "environmentId", "serviceId"] as const) {
      expect(() =>
        assertAuthorisedRailwayTarget({ ...RAILWAY_TARGET, [field]: "spoofed-id" }),
      ).toThrow(AutomationAuthorityError);
    }
  });

  it("permits only the four STAFF_SSO_* variable names and rejects everything else", () => {
    expect(() => assertAuthorisedVariableNames(ALLOWED_VARIABLE_NAMES)).not.toThrow();
    expect(() => assertAuthorisedVariableNames([])).toThrow(AutomationAuthorityError);
    for (const forbidden of [
      "DATABASE_URL",
      "STAFF_PORTAL_PASSWORD_HASH",
      "ANTHROPIC_API_KEY",
      "STAFF_SSO_EXTRA",
      "MICROSOFT_CLIENT_SECRET",
    ]) {
      expect(() => assertAuthorisedVariableNames([...ALLOWED_VARIABLE_NAMES, forbidden])).toThrow(
        AutomationAuthorityError,
      );
    }
  });

  it("builds the variable mutation against the pinned target and never with replace semantics", () => {
    const mutation = buildRailwayVariablesMutation({
      STAFF_SSO_TENANT_ID: "tenant",
      STAFF_SSO_CLIENT_ID: "client",
      STAFF_SSO_CLIENT_SECRET: "secret-value",
      STAFF_SSO_REDIRECT_URI: PRODUCTION_REDIRECT_URI,
    });
    expect(mutation.variables.input).toMatchObject(RAILWAY_TARGET);
    // replace: true would delete every unrelated production variable — it must never appear.
    expect(JSON.stringify(mutation)).not.toContain('"replace"');
    expect(() => buildRailwayVariablesMutation({ NOT_ALLOWED: "x" })).toThrow(
      AutomationAuthorityError,
    );
  });
});

describe("Entra application idempotency", () => {
  it("creates when the owned app is absent, manages when exactly one exists", () => {
    expect(selectManagedApplication([])).toEqual({ decision: "create" });
    const app = managedApp();
    expect(selectManagedApplication([app])).toEqual({ decision: "manage", application: app });
  });

  it("ignores other owned apps and never manages one with a different name", () => {
    const other = managedApp({ displayName: "Some Other App" });
    expect(selectManagedApplication([other])).toEqual({ decision: "create" });
  });

  it("stops on ambiguity instead of guessing between duplicates", () => {
    expect(() => selectManagedApplication([managedApp(), managedApp({ id: "obj-2" })])).toThrow(
      /Ambiguous/,
    );
  });

  it("declares a single-tenant app with only the three OIDC sign-in scopes", () => {
    const payload = buildApplicationCreatePayload() as {
      displayName: string;
      signInAudience: string;
      web: { redirectUris: string[] };
      requiredResourceAccess: Array<{ resourceAccess: Array<{ type: string }> }>;
    };
    expect(payload.displayName).toBe(MANAGED_SSO_APP_DISPLAY_NAME);
    expect(payload.signInAudience).toBe("AzureADMyOrg");
    expect(payload.web.redirectUris).toEqual([PRODUCTION_REDIRECT_URI]);
    expect(payload.requiredResourceAccess).toHaveLength(1);
    const access = payload.requiredResourceAccess[0].resourceAccess;
    expect(access).toHaveLength(3);
    // Delegated scopes only — an application-permission ("Role") entry here would be an escalation.
    expect(access.every(entry => entry.type === "Scope")).toBe(true);
  });

  it("adds the production redirect without removing an admin's existing entries", () => {
    expect(buildRedirectPatchIfNeeded(managedApp())).toBeNull();
    const patched = buildRedirectPatchIfNeeded(
      managedApp({ web: { redirectUris: ["https://other.example/callback"] } }),
    );
    expect(patched).toEqual({
      web: { redirectUris: ["https://other.example/callback", PRODUCTION_REDIRECT_URI] },
    });
  });
});

describe("secret rotation hygiene", () => {
  it("prunes only automation-named credentials and never the one just created", () => {
    const keep = "kid-new";
    const prune = selectPasswordsToPrune(
      [
        { keyId: keep, displayName: `${AUTOMATION_SECRET_PREFIX}2026-08-29` },
        { keyId: "kid-old-auto", displayName: `${AUTOMATION_SECRET_PREFIX}2026-05-01` },
        { keyId: "kid-human", displayName: "created-by-admin" },
        { keyId: "kid-unnamed" },
      ],
      keep,
    );
    expect(prune).toEqual(["kid-old-auto"]);
  });

  it("names rotated secrets with the automation prefix and date", () => {
    expect(automationSecretDisplayName(new Date("2026-08-29T19:00:00Z"))).toBe(
      `${AUTOMATION_SECRET_PREFIX}2026-08-29`,
    );
  });
});

describe("federated Graph token request", () => {
  it("uses the client-assertion flow with no client_secret parameter anywhere", () => {
    const request = buildGraphTokenRequest({
      tenantId: "tenant-id",
      clientId: "client-id",
      githubOidcToken: "github-jwt",
    });
    expect(request.url).toBe("https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token");
    expect(request.body.get("grant_type")).toBe("client_credentials");
    expect(request.body.get("client_assertion_type")).toBe(
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    );
    expect(request.body.get("scope")).toBe("https://graph.microsoft.com/.default");
    expect(request.body.has("client_secret")).toBe(false);
  });
});

describe("deployment evaluation after a variable write", () => {
  const writeAt = new Date("2026-08-29T20:00:00Z");
  it("never mistakes the pre-write deployment's SUCCESS for the new one", () => {
    expect(
      evaluateDeploymentAfterWrite(
        [{ id: "old", status: "SUCCESS", createdAt: "2026-08-29T18:33:07Z" }],
        writeAt,
      ),
    ).toEqual({ state: "pending" });
  });

  it("reports success/failure only from a deployment created after the write", () => {
    expect(
      evaluateDeploymentAfterWrite(
        [
          { id: "new", status: "SUCCESS", createdAt: "2026-08-29T20:00:30Z" },
          { id: "old", status: "SUCCESS", createdAt: "2026-08-29T18:33:07Z" },
        ],
        writeAt,
      ),
    ).toEqual({ state: "success", deploymentId: "new" });
    expect(
      evaluateDeploymentAfterWrite(
        [{ id: "new", status: "CRASHED", createdAt: "2026-08-29T20:00:30Z" }],
        writeAt,
      ),
    ).toEqual({ state: "failed", deploymentId: "new", status: "CRASHED" });
    expect(
      evaluateDeploymentAfterWrite(
        [{ id: "new", status: "BUILDING", createdAt: "2026-08-29T20:00:30Z" }],
        writeAt,
      ),
    ).toEqual({ state: "pending" });
  });
});

describe("durable audit gate", () => {
  const base = {
    action: "railway_variables_write",
    phase: "result" as const,
    targetSystem: "railway" as const,
    targetResource: "world-student-advisors: STAFF_SSO_TENANT_ID, STAFF_SSO_CLIENT_ID",
    permissionDecision: "allowed" as const,
    permissionReason: "Within the approved STAFF_SSO_* allowlist for the authorised service.",
    success: 1,
    errorCategory: "none",
    runReference: "https://github.com/Arrington-Consultancy/world-student-advisors/actions/runs/1",
  };

  it("stamps the automation identity on every event", () => {
    expect(buildAuditEvent(base).automationIdentity).toBe(AUTOMATION_IDENTITY);
  });

  it("refuses secret-shaped content in any text field, including Azure-style secrets and full UUIDs", () => {
    const azureStyleSecret = "Q~8xVbn2_pLm4TgRs7Yw1Ee9KjHdC3aZxWqPo6Nt";
    expect(() => buildAuditEvent({ ...base, targetResource: `value ${azureStyleSecret}` })).toThrow(
      AutomationAuthorityError,
    );
    expect(() =>
      buildAuditEvent({ ...base, permissionReason: `bearer eyJhbGciOiJSUzI1NiJ9.payload` }),
    ).toThrow(AutomationAuthorityError);
    expect(() =>
      buildAuditEvent({ ...base, targetResource: "app 3cd481de-9208-4b57-afb6-60dae1215de5" }),
    ).toThrow(AutomationAuthorityError);
    expect(() => buildAuditEvent({ ...base, targetResource: "app prefix 3cd481de…" })).not.toThrow();
  });
});
