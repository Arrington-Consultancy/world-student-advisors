import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getSharePointStatus, searchSharePoint, readSharePointRecord, writeSharePointHandoff } from "./sharepoint";
import { getGoogleDriveStatus, searchGoogleDrive, readGoogleDriveFile } from "./googleDrive";
import { decideDriveLocation, allDesignatedDriveRoots, DRIVE_NOT_DESIGNATED, parseDriveScope } from "../driveLocations";
import { readFileSync } from "node:fs";
import { clearAuditLog } from "../audit";

beforeEach(() => {
  clearAuditLog();
});

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("SharePoint connector — honest current state", () => {
  it("reports unconfigured when no dedicated file-access credentials are set", () => {
    delete process.env.SHAREPOINT_GRAPH_CLIENT_ID;
    delete process.env.SHAREPOINT_GRAPH_CLIENT_SECRET;
    delete process.env.SHAREPOINT_GRAPH_TENANT_ID;
    delete process.env.SHAREPOINT_GRAPH_SITE_ID;
    expect(getSharePointStatus()).toBe("unconfigured");
  });

  it("does not treat the existing mail-sending Graph credentials as proof of file access", () => {
    process.env.MICROSOFT_TENANT_ID = "tenant";
    process.env.MICROSOFT_CLIENT_ID = "client";
    process.env.MICROSOFT_CLIENT_SECRET = "secret";
    delete process.env.SHAREPOINT_GRAPH_CLIENT_ID;
    expect(getSharePointStatus()).toBe("unconfigured");
  });

  it("reports operational with the four SharePoint-specific variables present; consent is proven or refused on the call itself", () => {
    process.env.SHAREPOINT_GRAPH_CLIENT_ID = "x";
    process.env.SHAREPOINT_GRAPH_CLIENT_SECRET = "x";
    process.env.SHAREPOINT_GRAPH_TENANT_ID = "x";
    process.env.SHAREPOINT_GRAPH_SITE_ID = "x";
    expect(getSharePointStatus()).toBe("operational");
  });

  it("search/read/write all fail honestly for any worker today, without ever claiming success", async () => {
    const base = { workerId: "james" as const, resourceScope: "application/case-1", staffUserId: 1, authMethod: "entra_sso" };
    const searchResult = await searchSharePoint(base);
    const readResult = await readSharePointRecord(base);
    const writeResult = await writeSharePointHandoff(base);
    expect(searchResult.success).toBe(false);
    expect(readResult.success).toBe(false);
    expect(writeResult.success).toBe(false);
  });
});

describe("Google Drive connector — selected folders by ID, read only, nothing else discoverable", () => {
  it("reports unconfigured until the dedicated workforce service account is present", () => {
    delete process.env.WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON;
    expect(getGoogleDriveStatus()).toBe("unconfigured");
    process.env.WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON = "not json";
    expect(getGoogleDriveStatus()).toBe("unconfigured");
    process.env.WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: "wsa-workforce@example.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n" });
    expect(getGoogleDriveStatus()).toBe("operational");
  });

  it("the folder gate refuses everything that is not a designated root named by ID, for the right reason", () => {
    // Ethan may reach WSA Website Operating System. He may not reach the
    // WSA Editable Docs folder (holds Arrington documents), the parent
    // World Student Advisors folder, an archive, or a name in place of an ID.
    expect(decideDriveLocation("ethan", "root/1NfrRjUKTDsG1YiHzLpR8sHPmuuK18Zux").permitted).toBe(true);
    expect(decideDriveLocation("ethan", "root/1NfrRjUKTDsG1YiHzLpR8sHPmuuK18Zux/search/sitemap").permitted).toBe(true);
    expect(decideDriveLocation("ethan", "root/16gt8iUovwFbZR6nGwRaUwgQVeWXFKycm").reason).toContain("never designated");
    expect(decideDriveLocation("ethan", "root/1ciKTYlcEHbsmJWJKaUkLpyb2v9HZsJbJ").reason).toContain("never designated");
    expect(decideDriveLocation("ethan", "root/1JPSP1iP6DFMX6fHzYm6jd5mTpzUg1wdT").reason).toContain("never designated");
    expect(decideDriveLocation("ethan", "root/1Dq2LmA30-aCbbNvQcwenugPZCjTd7PWQ").reason).toContain("not designated for this worker");
    expect(decideDriveLocation("ethan", "WSA Website Operating System/file").reason).toContain("by ID");
    // Sophie has no Drive folder at all.
    expect(decideDriveLocation("sophie", "root/1NfrRjUKTDsG1YiHzLpR8sHPmuuK18Zux").reason).toContain("No Google Drive folder is designated");
    // The one withheld file is refused even inside Maya's designated root.
    expect(decideDriveLocation("maya", "root/1Dq2LmA30-aCbbNvQcwenugPZCjTd7PWQ/file/1gbRBDkB8zezqHqzT5KcTALCPc8VE-PPI").permitted).toBe(false);
    expect(decideDriveLocation("maya", "root/1Dq2LmA30-aCbbNvQcwenugPZCjTd7PWQ/file/other").permitted).toBe(true);
  });

  it("never designates a folder that holds Arrington Consultancy material, and never the Drive root", () => {
    const designated = new Set(allDesignatedDriveRoots().map(r => r.id));
    for (const f of DRIVE_NOT_DESIGNATED) expect(designated.has(f.id)).toBe(false);
    expect(designated.has("root")).toBe(false);
    expect(parseDriveScope("root")).toBeNull();
    expect(parseDriveScope("")).toBeNull();
  });

  it("every Drive listing or search in the connector is constrained to a parent folder: no root search exists in the code", () => {
    // Block comments and comment-only lines stripped; URLs in strings kept.
    const code = readFileSync(new URL("./googleDrive.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    // Every query builder (q:) carries a parent constraint; nothing lists the Drive, "shared with me" or the root.
    const builders = code.match(/\bq: `/g) ?? [];
    const parentConstraints = code.match(/' in parents/g) ?? [];
    expect(builders.length).toBeGreaterThan(0);
    expect(parentConstraints.length).toBe(builders.length);
    expect(code).not.toMatch(/sharedWithMe|'root' in parents/);
    expect(code).toContain("auth/drive.readonly");
    expect(code).not.toMatch(/auth\/drive"|auth\/drive\.file|auth\/drive\.metadata/);
    // The only non-GET is the token exchange itself; every Drive API call is a GET.
    const nonGet = code.split("\n").filter(l => /method:\s*["'](POST|PUT|PATCH|DELETE)["']/.test(l));
    expect(nonGet).toHaveLength(1);
    expect(nonGet[0]).toContain("TOKEN_URL");
    expect(code).not.toMatch(/WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS/);
  });

  it("search and read fail honestly for a worker with a designated folder while the credential is absent, and are refused at the gate for everyone else", async () => {
    delete process.env.WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON;
    const ethan = { workerId: "ethan" as const, resourceScope: "root/1NfrRjUKTDsG1YiHzLpR8sHPmuuK18Zux/search/sitemap", staffUserId: 1, authMethod: "entra_sso" as const };
    const searchResult = await searchGoogleDrive(ethan);
    expect(searchResult.success).toBe(false);
    const sophie = { workerId: "sophie" as const, resourceScope: "root/1NfrRjUKTDsG1YiHzLpR8sHPmuuK18Zux", staffUserId: 1, authMethod: "entra_sso" as const };
    const readResult = await readGoogleDriveFile(sophie);
    expect(readResult.success).toBe(false);
  });
});
