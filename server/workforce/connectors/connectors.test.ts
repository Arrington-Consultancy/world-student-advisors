import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getSharePointStatus, searchSharePoint, readSharePointRecord, writeSharePointHandoff } from "./sharepoint";
import { getGoogleDriveStatus, searchGoogleDrive, readGoogleDriveFile, isDriveFolderAuthorised } from "./googleDrive";
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

  it("still refuses to call it operational even with SharePoint-specific env vars present, pending an actual tested permission grant", () => {
    process.env.SHAREPOINT_GRAPH_CLIENT_ID = "x";
    process.env.SHAREPOINT_GRAPH_CLIENT_SECRET = "x";
    process.env.SHAREPOINT_GRAPH_TENANT_ID = "x";
    process.env.SHAREPOINT_GRAPH_SITE_ID = "x";
    expect(getSharePointStatus()).toBe("permission_missing");
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

describe("Google Drive connector — honest current state and folder isolation", () => {
  it("reports unconfigured when no service-account credentials or allowed folders are set", () => {
    delete process.env.WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON;
    delete process.env.WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS;
    expect(getGoogleDriveStatus()).toBe("unconfigured");
  });

  it("denies every folder when no allowlist is configured — fails closed, not open", () => {
    delete process.env.WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS;
    expect(isDriveFolderAuthorised("any-folder-id")).toBe(false);
    expect(isDriveFolderAuthorised("arrington-consultancy-folder")).toBe(false);
    expect(isDriveFolderAuthorised("scott-project-folder")).toBe(false);
  });

  it("only authorises folder IDs actually present in the configured allowlist", () => {
    process.env.WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS = "wsa-marketing-legacy,wsa-seo-evidence";
    expect(isDriveFolderAuthorised("wsa-marketing-legacy")).toBe(true);
    expect(isDriveFolderAuthorised("wsa-seo-evidence")).toBe(true);
    expect(isDriveFolderAuthorised("arrington-consultancy-folder")).toBe(false);
    expect(isDriveFolderAuthorised("scott-project-folder")).toBe(false);
    expect(isDriveFolderAuthorised("some-personal-folder")).toBe(false);
  });

  it("search/read fail honestly for any worker today", async () => {
    const base = { workerId: "ethan" as const, resourceScope: "wsa-seo-evidence/search-console.csv", staffUserId: 1, authMethod: "entra_sso" };
    const searchResult = await searchGoogleDrive(base);
    const readResult = await readGoogleDriveFile(base);
    expect(searchResult.success).toBe(false);
    expect(readResult.success).toBe(false);
  });
});
