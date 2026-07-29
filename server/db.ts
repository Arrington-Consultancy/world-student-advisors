import { drizzle } from "drizzle-orm/mysql2";
import { failedSubmissions } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Best-effort durable record of a submission that failed to reach Pipedrive,
 * so it can be retried manually instead of silently lost. If no database is
 * configured, this only logs a warning — the caller's own safe error log
 * (no token/passport data) is the fallback record in that case.
 */
export async function recordFailedSubmission(data: {
  formType: string;
  email?: string;
  payload: unknown;
  errorMessage: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot persist failed submission for retry: database not available");
    return;
  }

  try {
    await db.insert(failedSubmissions).values({
      formType: data.formType,
      email: data.email,
      payload: JSON.stringify(data.payload),
      errorMessage: data.errorMessage,
    });
  } catch (error) {
    console.error("[Database] Failed to persist failed submission:", error);
  }
}

// TODO: add feature queries here as your schema grows.
