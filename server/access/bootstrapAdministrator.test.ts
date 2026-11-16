import { describe, expect, it } from "vitest";
import { isBootstrapAdministrator } from "./bootstrapAdministrator";
import type { StaffSession } from "../staffSession";

const TOM: StaffSession = {
  authMethod: "entra_sso",
  staffUserId: 1,
  email: "Tom@WorldStudentAdvisors.com",
  displayName: "Tom Arrington",
};

describe("who counts as the bootstrap access administrator", () => {
  it("an Entra session whose email is the ACCESS_BOOTSTRAP_EMAIL setting, compared case-insensitively", () => {
    expect(isBootstrapAdministrator(TOM, "tom@worldstudentadvisors.com")).toBe(true);
    expect(isBootstrapAdministrator(TOM, " TOM@worldstudentadvisors.com ")).toBe(true);
  });

  it("any other Entra identity does not", () => {
    expect(isBootstrapAdministrator({ ...TOM, email: "tim@worldstudentadvisors.com" }, "tom@worldstudentadvisors.com")).toBe(false);
  });

  it("an unset setting means nobody qualifies", () => {
    expect(isBootstrapAdministrator(TOM, "")).toBe(false);
    expect(isBootstrapAdministrator(TOM, "   ")).toBe(false);
  });

  it("the shared executive session never qualifies, whatever email it carries", () => {
    const executive: StaffSession = {
      authMethod: "shared_executive",
      staffUserId: 1,
      email: "tom@worldstudentadvisors.com",
      displayName: "Executive",
    };
    expect(isBootstrapAdministrator(executive, "tom@worldstudentadvisors.com")).toBe(false);
  });

  it("a shared-password session never qualifies", () => {
    expect(isBootstrapAdministrator({ authMethod: "shared_password", staffUserId: null }, "tom@worldstudentadvisors.com")).toBe(false);
  });
});
