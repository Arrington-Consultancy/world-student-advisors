import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { evaluateWsaScope } from "./wsaScope";

const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("WORKFORCE_") || k.startsWith("SHAREPOINT_")) delete process.env[k];
  }
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("the WSA boundary fails closed when nothing is configured", () => {
  it("denies every connector when no allowlist exists", () => {
    for (const c of ["sharepoint", "google_drive", "linkedin", "facebook", "youtube", "whatsapp"] as const) {
      expect(evaluateWsaScope(c, "anything").withinWsaScope).toBe(false);
    }
  });

  it("denies an empty or missing resource outright", () => {
    expect(evaluateWsaScope("sharepoint", "").withinWsaScope).toBe(false);
    expect(evaluateWsaScope("pipedrive", "   ").withinWsaScope).toBe(false);
  });
});

describe("SharePoint is bounded to the one configured WSA site", () => {
  it("allows the configured site and paths within it", () => {
    process.env.SHAREPOINT_GRAPH_SITE_ID = "wsa-site";
    expect(evaluateWsaScope("sharepoint", "wsa-site").withinWsaScope).toBe(true);
    expect(evaluateWsaScope("sharepoint", "wsa-site/01_ADMIN/file.docx").withinWsaScope).toBe(true);
  });

  it("denies any other tenant site — Arrington Consultancy content is never in scope", () => {
    process.env.SHAREPOINT_GRAPH_SITE_ID = "wsa-site";
    const decision = evaluateWsaScope("sharepoint", "arrington-site/Clients/confidential.docx");
    expect(decision.withinWsaScope).toBe(false);
    expect(decision.reason).toContain("Arrington");
  });

  it("is not fooled by a site id that merely starts with the WSA one", () => {
    process.env.SHAREPOINT_GRAPH_SITE_ID = "wsa-site";
    expect(evaluateWsaScope("sharepoint", "wsa-site-archive/secret").withinWsaScope).toBe(false);
  });
});

describe("Google Drive is bounded to an explicit folder allowlist", () => {
  it("allows only allowlisted folders", () => {
    process.env.WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS = "wsa-marketing,wsa-seo";
    expect(evaluateWsaScope("google_drive", "wsa-marketing/report.pdf").withinWsaScope).toBe(true);
    expect(evaluateWsaScope("google_drive", "wsa-seo").withinWsaScope).toBe(true);
  });

  it("denies personal, Arrington and Scott-project folders", () => {
    process.env.WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS = "wsa-marketing";
    for (const folder of ["personal-folder", "arrington-clients", "scott-project"]) {
      expect(evaluateWsaScope("google_drive", `${folder}/file`).withinWsaScope).toBe(false);
    }
  });
});

describe("Pipedrive is bounded to student-journey entities", () => {
  it("allows the entities a student journey actually involves", () => {
    for (const entity of ["person", "lead", "deal", "note", "activity"]) {
      expect(evaluateWsaScope("pipedrive", `${entity}/8371`).withinWsaScope).toBe(true);
    }
  });

  it("denies account administration surfaces — users, settings and billing", () => {
    for (const entity of ["users", "settings", "billing", "webhooks"]) {
      const decision = evaluateWsaScope("pipedrive", `${entity}/1`);
      expect(decision.withinWsaScope).toBe(false);
      expect(decision.reason).toContain("not a student-journey entity");
    }
  });
});

describe("social and messaging channels are bounded to allowlisted WSA accounts", () => {
  it("allows only an allowlisted account", () => {
    process.env.WORKFORCE_LINKEDIN_ALLOWED_ACCOUNTS = "world-student-advisors";
    expect(evaluateWsaScope("linkedin", "world-student-advisors/posts").withinWsaScope).toBe(true);
    expect(evaluateWsaScope("linkedin", "some-other-company/posts").withinWsaScope).toBe(false);
  });

  it("a credential that reaches an account is not authority over it", () => {
    // The allowlist is absent, so even a working token grants nothing.
    process.env.WORKFORCE_FACEBOOK_ACCESS_TOKEN = "a-working-token";
    expect(evaluateWsaScope("facebook", "WorldStudentAdvisorsStudentSupportCentre").withinWsaScope).toBe(false);
  });

  it("each channel has its own allowlist — one does not open another", () => {
    process.env.WORKFORCE_LINKEDIN_ALLOWED_ACCOUNTS = "world-student-advisors";
    expect(evaluateWsaScope("youtube", "world-student-advisors").withinWsaScope).toBe(false);
    expect(evaluateWsaScope("whatsapp", "world-student-advisors").withinWsaScope).toBe(false);
  });
});

describe("credential material is ring-fenced from every worker", () => {
  beforeEach(() => {
    // Deliberately the WIDEST possible configuration. The ring-fence must
    // hold even when every allowlist would otherwise permit the read.
    process.env.SHAREPOINT_GRAPH_SITE_ID = "wsa-site";
    process.env.WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS = "wsa-marketing,Password";
    process.env.WORKFORCE_LINKEDIN_ALLOWED_ACCOUNTS = "world-student-advisors";
  });

  it("denies the real password files found in the WSA SharePoint library", () => {
    // Exact paths observed in the controlled library, 30 August 2026.
    const real = [
      "wsa-site/01_ADMIN_&_GOVERNANCE/07_Templates_&_Standards/Password/Passwords January 2026.xlsx",
      "wsa-site/07_MARKETING_IMAGES/Desktop/Backup/Photos/Password/Passwords January 2026.xlsx",
      "wsa-site/07_MARKETING_IMAGES/Desktop/Backup/Photos/Password/Passwords June 2023.xlsx",
      "wsa-site/07_MARKETING_IMAGES/00_Archive/Password/Passwords June 2023.xlsx",
    ];
    for (const path of real) {
      const d = evaluateWsaScope("sharepoint", path);
      expect(d.withinWsaScope).toBe(false);
      expect(d.reason).toContain("Ring-fenced");
    }
  });

  it("is caught by the folder as well as the filename", () => {
    expect(evaluateWsaScope("sharepoint", "wsa-site/Password/anything.docx").withinWsaScope).toBe(false);
    expect(evaluateWsaScope("sharepoint", "wsa-site/notes/Passwords.xlsx").withinWsaScope).toBe(false);
  });

  it("beats an allowlist that would otherwise permit it", () => {
    // "Password" is explicitly in the Drive allowlist above, and it still fails.
    expect(evaluateWsaScope("google_drive", "Password/list.xlsx").withinWsaScope).toBe(false);
  });

  it("covers credential material beyond the word password", () => {
    for (const path of [
      "wsa-site/admin/API keys.xlsx",
      "wsa-site/admin/client secrets.docx",
      "wsa-site/IT/recovery codes.txt",
      "wsa-site/IT/two-factor backup.docx",
      "wsa-site/IT/2FA seeds.txt",
      "wsa-site/ops/logins.xlsx",
      "wsa-site/ops/access tokens.json",
    ]) {
      expect(evaluateWsaScope("sharepoint", path).withinWsaScope).toBe(false);
    }
  });

  it("applies to every connector, not only SharePoint", () => {
    for (const c of ["sharepoint", "google_drive", "pipedrive", "linkedin", "facebook", "youtube", "whatsapp"] as const) {
      expect(evaluateWsaScope(c, "person/passwords").withinWsaScope).toBe(false);
    }
  });

  it("still allows ordinary WSA records — the fence is not so broad it blocks the job", () => {
    expect(evaluateWsaScope("sharepoint", "wsa-site/01_ADMIN_&_GOVERNANCE/WSA_Change_Log_v0.71.docx").withinWsaScope).toBe(true);
    expect(evaluateWsaScope("sharepoint", "wsa-site/07_MARKETING_IMAGES/logo.png").withinWsaScope).toBe(true);
    expect(evaluateWsaScope("google_drive", "wsa-marketing/campaign.pdf").withinWsaScope).toBe(true);
  });
});
