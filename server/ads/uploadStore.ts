/**
 * The record of every qualified-lead conversion decision, one row per Deal
 * per conversion action. This is what makes a repeat run send nothing
 * twice, and what the acceptance report reads. It carries ids, flags,
 * statuses and reasons only: no email, phone, name or click identifier.
 */
import { and, eq, isNull, lt, desc } from "drizzle-orm";
import { getDb } from "../db";
import { googleAdsConversionUploads } from "../../drizzle/schema";

export type UploadStatus = "uploaded" | "skipped" | "failed";

export interface UploadRow {
  id: number;
  dealId: number;
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
  createdAt: Date;
  updatedAt: Date;
}

export type NewUploadRow = Omit<UploadRow, "id" | "createdAt" | "updatedAt">;

export interface UploadStore {
  find(dealId: number, conversionActionId: string): Promise<UploadRow | null>;
  record(row: NewUploadRow): Promise<UploadRow>;
  update(id: number, patch: Partial<Pick<UploadRow, "status" | "requestId" | "googleStatus" | "googleDetail" | "reason" | "attempts">>): Promise<void>;
  /** Uploaded rows whose Google-side status has not been read yet, oldest first. */
  awaitingStatus(uploadedBefore: Date, limit: number): Promise<UploadRow[]>;
  /** For the report: how many rows carry each status. */
  counts(): Promise<Record<UploadStatus, number>>;
}

/** The production store. Returns null when there is no database, and the caller stands down. */
export async function databaseUploadStore(): Promise<UploadStore | null> {
  const db = await getDb();
  if (!db) return null;
  const t = googleAdsConversionUploads;
  return {
    async find(dealId, conversionActionId) {
      const [row] = await db.select().from(t).where(and(eq(t.dealId, dealId), eq(t.conversionActionId, conversionActionId))).limit(1);
      return row ? (row as UploadRow) : null;
    },
    async record(row) {
      await db.insert(t).values(row);
      const [saved] = await db.select().from(t).where(and(eq(t.dealId, row.dealId), eq(t.conversionActionId, row.conversionActionId))).limit(1);
      return saved as UploadRow;
    },
    async update(id, patch) {
      await db.update(t).set({ ...patch, updatedAt: new Date() }).where(eq(t.id, id));
    },
    async awaitingStatus(uploadedBefore, limit) {
      const rows = await db.select().from(t).where(and(eq(t.status, "uploaded"), isNull(t.googleStatus), lt(t.createdAt, uploadedBefore))).orderBy(desc(t.id)).limit(limit);
      return rows as UploadRow[];
    },
    async counts() {
      const rows = await db.select({ status: t.status }).from(t);
      const out: Record<UploadStatus, number> = { uploaded: 0, skipped: 0, failed: 0 };
      for (const r of rows) out[r.status as UploadStatus] += 1;
      return out;
    },
  };
}

/** An in-memory store, for tests and for the acceptance harness's dry run. */
export function memoryUploadStore(): UploadStore & { rows: UploadRow[] } {
  const rows: UploadRow[] = [];
  let nextId = 1;
  return {
    rows,
    async find(dealId, conversionActionId) {
      return rows.find(r => r.dealId === dealId && r.conversionActionId === conversionActionId) ?? null;
    },
    async record(row) {
      const saved: UploadRow = { ...row, id: nextId++, createdAt: new Date(), updatedAt: new Date() };
      rows.push(saved);
      return saved;
    },
    async update(id, patch) {
      const r = rows.find(x => x.id === id);
      if (r) Object.assign(r, patch, { updatedAt: new Date() });
    },
    async awaitingStatus(uploadedBefore, limit) {
      return rows.filter(r => r.status === "uploaded" && r.googleStatus === null && r.createdAt < uploadedBefore).slice(0, limit);
    },
    async counts() {
      const out: Record<UploadStatus, number> = { uploaded: 0, skipped: 0, failed: 0 };
      for (const r of rows) out[r.status] += 1;
      return out;
    },
  };
}
