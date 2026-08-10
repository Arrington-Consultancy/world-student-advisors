import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Student Portal users - separate from Manus OAuth users.
 * Students register via the website form, get a Pipedrive record,
 * then create a password to access the Student Portal.
 */
export const portalUsers = mysqlTable("portal_users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  /**
   * The durable anchor for live portal resolution — every Pipedrive read
   * (Person, current Lead/Deal, live stage/owner) is keyed off this alone.
   * Never null once a portal account exists.
   */
  pipedrivePersonId: int("pipedrivePersonId"),
  /**
   * Which kind of Pipedrive object was created at registration time —
   * "lead" for everything going forward, "deal" only for accounts created
   * during the brief 2026-08-05/06 period when the sign-up flow incorrectly
   * created Deals instead of Leads. Write-once audit trail only: records
   * what was created at sign-up so staff can trace a portal account back to
   * its origin. The portal never reads this to resolve current status —
   * that's always a live lookup by pipedrivePersonId (see
   * server/portal-resolver.ts) precisely because a Lead can later convert
   * to a different Deal, which would make a stored ID stale.
   */
  pipedriveObjectType: varchar("pipedriveObjectType", { length: 10 }),
  /**
   * The Pipedrive Lead UUID (or, for historical Deal-period rows, the Deal's
   * integer ID) created at registration, stored as text either way since a
   * Lead ID is a UUID string and can't fit an int column — the bug this
   * column replaces. Audit trail only, per pipedriveObjectType above.
   */
  pipedriveObjectId: varchar("pipedriveObjectId", { length: 64 }),
  /** Token for password creation/reset (hashed) */
  resetToken: varchar("resetToken", { length: 255 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  /** Google OAuth subject identifier — set when user signs in with Google. */
  googleSub: varchar("googleSub", { length: 255 }).unique(),
  /** Portal access status */
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLogin: timestamp("lastLogin"),
});

export type PortalUser = typeof portalUsers.$inferSelect;
export type InsertPortalUser = typeof portalUsers.$inferInsert;

/**
 * Student Resource Centre - resources organized by category and type
 */
export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  /** Category: explore-options, prepare-application, receive-offer, student-visa, before-travel, while-studying, graduation-beyond */
  category: varchar("category", { length: 50 }).notNull(),
  /** Type: podcast, guide, video, download */
  resourceType: varchar("resourceType", { length: 20 }).notNull(),
  summary: text("summary"),
  content: text("content"),
  /** YouTube embed URL for videos, audio URL for podcasts, file URL for downloads */
  mediaUrl: text("mediaUrl"),
  /** Whether this resource requires portal login */
  requiresAuth: int("requiresAuth").default(1).notNull(),
  /** Display order within category */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

/**
 * A Sign-up Form submission that failed to reach Pipedrive. Holds the full
 * submitted payload (JSON) so staff can retry it manually rather than the
 * enquiry being silently lost. Not written to application logs.
 */
export const failedSubmissions = mysqlTable("failed_submissions", {
  id: int("id").autoincrement().primaryKey(),
  formType: varchar("formType", { length: 30 }).notNull(),
  email: varchar("email", { length: 320 }),
  /** Full submitted form data, JSON-encoded, for manual retry. */
  payload: text("payload").notNull(),
  errorMessage: text("errorMessage"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FailedSubmission = typeof failedSubmissions.$inferSelect;
export type InsertFailedSubmission = typeof failedSubmissions.$inferInsert;
