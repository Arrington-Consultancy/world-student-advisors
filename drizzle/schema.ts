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

/**
 * Minimal completion record for an Interview Readiness Coach practice
 * session — the deliberately narrow persistence model from the Interview
 * Coach repositioning design report (27 Aug 2026). Written once, on
 * finishSession, for an authenticated portal user only. No answer
 * transcripts, no free-text of any kind — full answers remain exactly as
 * before: processed only in-memory / by the AI provider for that one
 * request, never stored. portalUserId is not a hard foreign key
 * (consistent with this schema's existing style — see portalUsers above,
 * which itself has none either) but always refers to portal_users.id.
 */
export const interviewCoachSessions = mysqlTable("interview_coach_sessions", {
  id: int("id").autoincrement().primaryKey(),
  portalUserId: int("portalUserId").notNull(),
  interviewType: mysqlEnum("interviewType", ["cas", "ukvi", "university", "course"]).notNull(),
  averageScore: int("averageScore").notNull(),
  passed: int("passed").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type InterviewCoachSession = typeof interviewCoachSessions.$inferSelect;
export type InsertInterviewCoachSession = typeof interviewCoachSessions.$inferInsert;

/**
 * Individual Staff Portal identity — Stage 3 of the WSA AI Workforce
 * platform. Distinct from portalUsers (students) and from the pre-existing
 * shared Staff Portal password (staffPortalAuth.ts), which this table
 * exists to retire: WSA's own Digital Workspace Programme master plan
 * ("Use Microsoft security rather than separate passwords") is the
 * controlled evidence for using Microsoft Entra ID rather than a second
 * username/password system. entraObjectId is Entra's stable per-user
 * identifier (`oid` claim) — never the mutable email/UPN — so a later
 * email/name change in Microsoft 365 doesn't orphan the record.
 */
export const staffUsers = mysqlTable("staff_users", {
  id: int("id").autoincrement().primaryKey(),
  entraObjectId: varchar("entraObjectId", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  displayName: varchar("displayName", { length: 200 }).notNull(),
  /** Deactivating here (not deleting) revokes access while preserving audit history's staffUserId references. */
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
});

export type StaffUser = typeof staffUsers.$inferSelect;
export type InsertStaffUser = typeof staffUsers.$inferInsert;

/**
 * Durable audit record for the WSA AI Workforce platform — the persisted
 * counterpart to server/workforce/audit.ts's in-process log, which does
 * not survive a server restart or Railway redeploy. staffUserId is
 * nullable because a legacy shared-password session (see
 * staffPortalAuth.ts) carries no individual identity to attribute the
 * event to; authMethod records which kind of session produced the event
 * so that distinction is never lost or assumed away when reading the log
 * back. No table here stores a password, token, API key or secret value,
 * and workforce/audit.ts's redaction runs before any free-text field
 * reaches this table.
 */
export const workforceAuditEvents = mysqlTable("workforce_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  /** Null for a shared-password session — never a guessed or default staff identity. */
  staffUserId: int("staffUserId"),
  authMethod: mysqlEnum("authMethod", ["entra_sso", "shared_password"]).notNull(),
  workerId: varchar("workerId", { length: 40 }).notNull(),
  workerSpecificationVersion: varchar("workerSpecificationVersion", { length: 60 }).notNull(),
  caseId: varchar("caseId", { length: 60 }),
  requestedCapability: varchar("requestedCapability", { length: 80 }).notNull(),
  permissionDecision: mysqlEnum("permissionDecision", ["allowed", "denied"]).notNull(),
  permissionReason: text("permissionReason").notNull(),
  connector: varchar("connector", { length: 20 }),
  connectorOperation: varchar("connectorOperation", { length: 20 }),
  /** Tri-state: NULL = no attempt was made (e.g. denied before reaching a connector), 0 = attempted and failed, 1 = succeeded. */
  success: int("success"),
  targetResourceId: varchar("targetResourceId", { length: 255 }),
  handoffToWorkerId: varchar("handoffToWorkerId", { length: 40 }),
  errorCategory: varchar("errorCategory", { length: 30 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkforceAuditEvent = typeof workforceAuditEvents.$inferSelect;
export type InsertWorkforceAuditEvent = typeof workforceAuditEvents.$inferInsert;

/**
 * Durable audit record for WSA Infrastructure Automation, the controlled
 * plumbing identity that provisions Entra applications it owns and writes
 * authorised Railway variables (see server/infrastructure/automation.ts
 * and WSA-Infrastructure-Automation-Bootstrap.md). Deliberately separate
 * from workforce_audit_events: infrastructure actions are not worker
 * actions and must never be able to masquerade as one. Two-phase rows
 * (intent then result) let a reader detect a run that started a material
 * write and never durably recorded its outcome. No secret value is ever
 * stored here; targetResource carries names and identifiers only, and
 * the writer validates that before insert.
 */
export const infrastructureAuditEvents = mysqlTable("infrastructure_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  automationIdentity: varchar("automationIdentity", { length: 60 }).notNull(),
  /** GitHub Actions run URL (or equivalent) so every row is traceable to one execution. */
  runReference: varchar("runReference", { length: 200 }).notNull(),
  action: varchar("action", { length: 60 }).notNull(),
  /** intent = recorded before the action is attempted; result = recorded after. */
  phase: mysqlEnum("phase", ["intent", "result"]).notNull(),
  targetSystem: mysqlEnum("targetSystem", ["microsoft_entra", "railway", "staff_portal"]).notNull(),
  /** Names and identifier prefixes only — never a secret value. */
  targetResource: varchar("targetResource", { length: 255 }).notNull(),
  permissionDecision: mysqlEnum("permissionDecision", ["allowed", "denied"]).notNull(),
  permissionReason: text("permissionReason").notNull(),
  /** Tri-state: NULL = not attempted (intent rows, or denied before attempt), 0 = failed, 1 = succeeded. */
  success: int("success"),
  errorCategory: varchar("errorCategory", { length: 40 }).notNull(),
  deploymentId: varchar("deploymentId", { length: 64 }),
  /** The controlled human approval this run acted under (chat/bootstrap reference), where one applied. */
  humanApprovalReference: varchar("humanApprovalReference", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InfrastructureAuditEvent = typeof infrastructureAuditEvents.$inferSelect;
export type InsertInfrastructureAuditEvent = typeof infrastructureAuditEvents.$inferInsert;
