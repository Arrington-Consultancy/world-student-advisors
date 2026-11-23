/**
 * The record of every conversion upload decision, one row per source per
 * conversion action. A source is a Pipedrive Deal (the Qualified Lead
 * conversion) or a Pipedrive Lead (the Enquiry conversion, migration 0021).
 * This is what makes a repeat run send nothing twice, and what the
 * acceptance report reads. It carries ids, flags, statuses and reasons
 * only: no email, phone, name or click identifier.
 */
import { and, eq, isNull, lt, desc } from "drizzle-orm";
import { getDb } from "../db";
import { googleAdsConversionUploads } from "../../drizzle/schema";

export type UploadStatus = "uploaded" | "skipped" | "failed";
export type SourceType = "deal" | "lead";

export interface UploadRow {
  id: number;
  sourceType: SourceType;
  /** The Deal id as text, or the Lead's UUID. */
  sourceId: string;
  /** Deal rows only. */
  dealId: number | null;
  personId: number | null;
  conversionActionId: string;
  transactionId: string;
  eventTimestamp: Date | null;
  status: UploadStatus;
  identifiers: string;
  requestId: string | null;
  googleStatus: string | null;
  googleDetail: string | null;
  reason: string | null;
  attempts: number;
  /** Times Google answered PROCESSING or REQUEST_STATUS_UNKNOWN for this upload. */
  statusChecks: number;
  createdAt: Date;
  updatedAt: Date;
}

export type NewUploadRow = Omit<UploadRow, "id" | "createdAt" | "updatedAt">;

export interface UploadStore {
  find(sourceType: SourceType, sourceId: string, conversionActionId: string): Promise<UploadRow | null>;
  record(row: NewUploadRow): Promise<UploadRow>;
  update(id: number, patch: Partial<Pick<UploadRow, "status" | "requestId" | "googleStatus" | "googleDetail" | "reason" | "attempts" | "statusChecks">>): Promise<void>;
  /** Uploaded rows for one conversion action whose Google-side status has not been settled yet, newest first. */
  awaitingStatus(conversionActionId: string, uploadedBefore: Date, limit: number): Promise<UploadRow[]>;
  /** For the report: how many rows carry each status, for one conversion action or for all. */
  counts(conversionActionId?: string): Promise<Record<UploadStatus, number>>;
}

/** The production store. Returns null when there is no database, and the caller stands down. */
export async function databaseUploadStore(): Promise<UploadStore | null> {
  const db = await getDb();
  if (!db) return null;
  const t = googleAdsConversionUploads;
  const key = (sourceType: SourceType, sourceId: string, conversionActionId: string) =>
    and(eq(t.sourceType, sourceType), eq(t.sourceId, sourceId), eq(t.conversionActionId, conversionActionId));
  return {
    async find(sourceType, sourceId, conversionActionId) {
      const [row] = await db.select().from(t).where(key(sourceType, sourceId, conversionActionId)).limit(1);
      return row ? (row as UploadRow) : null;
    },
    async record(row) {
      await db.insert(t).values(row);
      const [saved] = await db.select().from(t).where(key(row.sourceType, row.sourceId, row.conversionActionId)).limit(1);
      return saved as UploadRow;
    },
    async update(id, patch) {
      await db.update(t).set({ ...patch, updatedAt: new Date() }).where(eq(t.id, id));
    },
    async awaitingStatus(conversionActionId, uploadedBefore, limit) {
      const rows = await db.select().from(t)
        .where(and(eq(t.conversionActionId, conversionActionId), eq(t.status, "uploaded"), isNull(t.googleStatus), lt(t.createdAt, uploadedBefore)))
        .orderBy(desc(t.id)).limit(limit);
      return rows as UploadRow[];
    },
    async counts(conversionActionId) {
      const rows = await db.select({ status: t.status }).from(t).where(conversionActionId ? eq(t.conversionActionId, conversionActionId) : undefined);
      const out: Record<UploadStatus, number> = { uploaded: 0, skipped: 0, failed: 0 };
      for (const r of rows) out[r.status as UploadStatus] += 1;
      return out;
    },
  };
}

/** An in-memory store, for tests. */
export function memoryUploadStore(): UploadStore & { rows: UploadRow[] } {
  const rows: UploadRow[] = [];
  let nextId = 1;
  return {
    rows,
    async find(sourceType, sourceId, conversionActionId) {
      return rows.find(r => r.sourceType === sourceType && r.sourceId === sourceId && r.conversionActionId === conversionActionId) ?? null;
    },
    async record(row) {
      if (rows.some(r => r.sourceType === row.sourceType && r.sourceId === row.sourceId && r.conversionActionId === row.conversionActionId)) {
        throw new Error("Duplicate entry for key google_ads_conversion_uploads_source_action");
      }
      const saved: UploadRow = { ...row, id: nextId++, createdAt: new Date(), updatedAt: new Date() };
      rows.push(saved);
      return saved;
    },
    async update(id, patch) {
      const r = rows.find(x => x.id === id);
      if (r) Object.assign(r, patch, { updatedAt: new Date() });
    },
    async awaitingStatus(conversionActionId, uploadedBefore, limit) {
      return rows
        .filter(r => r.conversionActionId === conversionActionId && r.status === "uploaded" && r.googleStatus === null && r.createdAt < uploadedBefore)
        .sort((a, b) => b.id - a.id)
        .slice(0, limit);
    },
    async counts(conversionActionId) {
      const out: Record<UploadStatus, number> = { uploaded: 0, skipped: 0, failed: 0 };
      for (const r of rows) if (!conversionActionId || r.conversionActionId === conversionActionId) out[r.status] += 1;
      return out;
    },
  };
}
