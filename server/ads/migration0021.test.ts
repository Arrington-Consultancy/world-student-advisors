import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

/**
 * Migration 0021: the upload record names its source (Deal or Lead), so an
 * Enquiry upload keyed on a Lead's UUID can sit beside the Qualified Lead
 * rows. The brief's one hard rule for the table: do not lose the existing
 * Qualified Lead rows. These hold the SQL to that, and to the shape the
 * pre-check (scripts/precheck-0021.mjs) will accept.
 */

const SQL = readFileSync("drizzle/0021_google_ads_upload_sources.sql", "utf8");
const statements = SQL.replace(/^--.*$/gm, "").split(";").map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
const T = "`google_ads_conversion_uploads`";

describe("migration 0021", () => {
  it("is exactly the seven reviewed statements, with a breakpoint between each", () => {
    expect(statements).toEqual([
      `ALTER TABLE ${T} ADD \`sourceType\` enum('deal','lead') NOT NULL DEFAULT 'deal'`,
      `ALTER TABLE ${T} ADD \`sourceId\` varchar(64)`,
      `ALTER TABLE ${T} ADD \`statusChecks\` int NOT NULL DEFAULT 0`,
      `UPDATE ${T} SET \`sourceId\` = CAST(\`dealId\` AS CHAR) WHERE \`sourceId\` IS NULL`,
      `ALTER TABLE ${T} MODIFY \`sourceId\` varchar(64) NOT NULL`,
      `ALTER TABLE ${T} MODIFY \`dealId\` int`,
      `CREATE UNIQUE INDEX \`google_ads_conversion_uploads_source_action\` ON ${T} (\`sourceType\`,\`sourceId\`,\`conversionActionId\`)`,
    ]);
    expect((SQL.match(/^--> statement-breakpoint$/gm) ?? []).length).toBe(statements.length - 1);
  });

  it("drops, deletes and renames nothing, and backfills every row before sourceId becomes NOT NULL", () => {
    expect(SQL.replace(/^--.*$/gm, "")).not.toMatch(/\b(DROP|DELETE|TRUNCATE|RENAME|INSERT)\b/i);
    const backfill = statements.findIndex(s => s.startsWith("UPDATE"));
    const notNull = statements.findIndex(s => s.includes("MODIFY `sourceId` varchar(64) NOT NULL"));
    expect(backfill).toBeGreaterThan(-1);
    expect(backfill).toBeLessThan(notNull);
    // The old key stays: nothing here touches google_ads_conversion_uploads_deal_action.
    expect(SQL).not.toMatch(/deal_action/);
  });

  it("is the pre-check's reviewed list, statement for statement", () => {
    const precheck = readFileSync("scripts/precheck-0021.mjs", "utf8");
    expect(precheck).toContain('const TAG = "0021_google_ads_upload_sources";');
    // The pre-check writes each statement as a template literal: the table
    // as ${T}, every other backtick escaped.
    for (const s of statements) {
      const asTemplate = s.replaceAll(T, "\u0000").replaceAll("`", "\\`").replaceAll("\u0000", "${T}");
      expect(precheck, s).toContain(`  \`${asTemplate}\`,`);
    }
  });

  it("matches the Drizzle schema the code reads", () => {
    const schema = readFileSync("drizzle/schema.ts", "utf8");
    const table = schema.slice(schema.indexOf('mysqlTable("google_ads_conversion_uploads"'), schema.indexOf("export type GoogleAdsConversionUpload"));
    expect(table).toContain('sourceType: mysqlEnum("sourceType", ["deal", "lead"]).notNull().default("deal")');
    expect(table).toContain('sourceId: varchar("sourceId", { length: 64 }).notNull()');
    expect(table).toContain('dealId: int("dealId"),');
    expect(table).toContain('statusChecks: int("statusChecks").notNull().default(0)');
    expect(table).toContain('uniqueIndex("google_ads_conversion_uploads_source_action").on(table.sourceType, table.sourceId, table.conversionActionId)');
    expect(table).toContain('uniqueIndex("google_ads_conversion_uploads_deal_action").on(table.dealId, table.conversionActionId)');
  });

  it("has its apply workflow, pre-check and verification, as 0020 did", () => {
    const wf = readFileSync(".github/workflows/apply-migration-0021.yml", "utf8");
    expect(wf).toContain("node scripts/precheck-0021.mjs");
    expect(wf).toContain("node scripts/verify-0021.mjs");
    expect(wf).toContain("workflow_dispatch");
    expect(wf).not.toMatch(/precheck-0020|verify-0020/);
    const verify = readFileSync("scripts/verify-0021.mjs", "utf8");
    expect(verify).toContain("expected 22 applied migrations");
    expect(verify).toContain("CAST(sourceId AS UNSIGNED) = dealId");
  });
});
