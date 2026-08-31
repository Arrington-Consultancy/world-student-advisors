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
 * WSA Staff Portal Access Control Standard v1.0 (APPROVED) — persistence.
 *
 * The decision logic lives in server/access/accessControl.ts and is pure.
 * These columns and tables exist only to hold the standing authority
 * decisions that logic reads; nothing here decides anything.
 *
 * Every access column is NULLABLE with no permissive default, which is the
 * schema-level expression of §9's "Missing or ambiguous permission means no
 * access until resolved": a staff row created before an authority decision
 * exists carries no level, no scope and no permission, and the resolver
 * treats that as denied rather than as a default.
 *
 * Note the deliberate separation from `isActive`. That column governs
 * whether the person may hold a session at all; `accessStatus` records the
 * separate §9 status of their access assignment. The resolver requires
 * BOTH (see server/access/identity.ts), so deactivating a leaver in one
 * place cannot be silently undone by the other.
 */
export const staffAccessColumns = {
  /** §2 — 1..5. NULL means no authority decision has been recorded: denied. */
  baseAccessLevel: int("baseAccessLevel"),
  /** §5 — NULL means no case visibility at all. */
  caseScope: mysqlEnum("caseScope", ["organisation", "team", "assigned_caseload", "own_applicants"]),
  /** §9 — separate from isActive; both must permit before any access resolves. */
  accessStatus: mysqlEnum("accessStatus", ["active", "suspended", "disabled"]),
  /** §5 — required to make "team-wide" decidable. Carries no authority itself. */
  teamId: varchar("teamId", { length: 60 }),
  /** §10 audit metadata — who recorded this assignment, when, and why. */
  assignedByStaffUserId: int("assignedByStaffUserId"),
  assignedAt: timestamp("assignedAt"),
  assignmentReason: varchar("assignmentReason", { length: 500 }),
};

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
  ...staffAccessColumns,
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
  authMethod: mysqlEnum("authMethod", ["entra_sso", "shared_password", "shared_executive"]).notNull(),
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


/**
 * §4, §6, §7, §5 — the multi-valued half of a staff member's access, and
 * §9's temporary elevations, in ONE table rather than three plus a fourth.
 *
 * A permanent grant and a temporary elevation differ only in whether
 * expiresAt is set, so they are the same row shape. That is not a
 * shortcut: it means the who/what/when/why §9 demands for a temporary
 * elevation is recorded identically for a permanent one, and it removes
 * any code path that can honour a grant without carrying its expiry.
 *
 * grantType + value together name the thing granted. The value is
 * validated against the approved lists in accessControl.ts on the way in
 * AND on the way out — an unrecognised value denies (§9) rather than being
 * passed through to a comparison that might accidentally match.
 *
 * Rows are never deleted. Revocation sets revokedAt, so the history of who
 * held what remains readable after the fact.
 */
export const staffAccessGrants = mysqlTable("staff_access_grants", {
  id: int("id").autoincrement().primaryKey(),
  staffUserId: int("staffUserId").notNull(),
  grantType: mysqlEnum("grantType", [
    "functional_scope",
    "action_permission",
    "sensitive_overlay",
    "case_scope",
  ]).notNull(),
  /** One value from the corresponding approved list in accessControl.ts. */
  value: varchar("value", { length: 60 }).notNull(),
  /** NULL = standing grant. Set = §9 temporary elevation, inert from this instant. */
  expiresAt: timestamp("expiresAt"),
  /** §9 — who, what, when, reason. Required for every grant, not only temporary ones. */
  grantedByStaffUserId: int("grantedByStaffUserId").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  /** Set to revoke. The row stays so the history of who held what survives. */
  revokedAt: timestamp("revokedAt"),
  revokedByStaffUserId: int("revokedByStaffUserId"),
  revocationReason: varchar("revocationReason", { length: 500 }),
});

export type StaffAccessGrant = typeof staffAccessGrants.$inferSelect;
export type InsertStaffAccessGrant = typeof staffAccessGrants.$inferInsert;

/**
 * §9 — "All permission changes, temporary elevations and high-risk actions
 * must be logged with who, what, when and reason."
 *
 * Append-only. staff_access_grants is a current-state table whose rows are
 * updated on revoke; this is the immutable record of the change itself, so
 * an assignment that was granted and revoked leaves two rows here even
 * though the grant row shows only its final state.
 *
 * The subject and the actor are separate columns on purpose: the question
 * an assurance reviewer asks is "who changed whose access", and a single
 * staffUserId cannot answer it.
 */
export const staffAccessChanges = mysqlTable("staff_access_changes", {
  id: int("id").autoincrement().primaryKey(),
  /** Whose access changed. */
  staffUserId: int("staffUserId").notNull(),
  /** Who changed it. NULL only for an automated expiry, which has no human actor. */
  changedByStaffUserId: int("changedByStaffUserId"),
  changeType: mysqlEnum("changeType", [
    "level_assigned",
    "level_changed",
    "case_scope_changed",
    "status_changed",
    "team_changed",
    "grant_added",
    "grant_revoked",
    "grant_expired",
  ]).notNull(),
  /** What it was before and after, in words. Never a secret value. */
  previousValue: varchar("previousValue", { length: 200 }),
  newValue: varchar("newValue", { length: 200 }),
  reason: varchar("reason", { length: 500 }).notNull(),
  /** The controlled authority this change was made under, where one applied. */
  authorityReference: varchar("authorityReference", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StaffAccessChange = typeof staffAccessChanges.$inferSelect;
export type InsertStaffAccessChange = typeof staffAccessChanges.$inferInsert;

/**
 * Clause 3 — enquiry and response history.
 *
 * One row per meaningful enquiry: a staff request that produced a
 * recommendation, a referral or an outcome. Deliberately NOT one row per
 * chat message. The approved operating model asks for a record of
 * interactions and outcomes, not a transcript, and treating every casual
 * token as a permanent case record would turn a governance record into a
 * surveillance log and bury the material decisions in noise.
 *
 * The raw request text is deliberately absent. server/routers.ts's
 * receptionist audit already excludes it, on the reasoning that staff
 * routinely phrase a request around a named student, so storing the
 * verbatim prompt would place identifiable student material into a table
 * whose scope is the enquiry rather than the case. requestSummary carries
 * the controlled, minimised statement of what was asked; that existing
 * decision is preserved here rather than quietly reversed.
 *
 * functionalScope and sensitiveOverlay exist so a row can be filtered by
 * the same access model as any other record (Access Control Standard §4,
 * §7) rather than being readable by anyone who can reach the table.
 *
 * Grants nothing. No column here confers authority, and approvalState
 * records what a human decided rather than substituting for the decision.
 */
export const staffEnquiries = mysqlTable("staff_enquiries", {
  id: int("id").autoincrement().primaryKey(),
  /** Null for a shared-password session, which carries no individual identity — never a guessed staff identity. */
  staffUserId: int("staffUserId"),
  authMethod: mysqlEnum("authMethod", ["entra_sso", "shared_password", "shared_executive"]).notNull(),
  /** Present only where the enquiry genuinely concerns a case; null for general questions. */
  caseId: varchar("caseId", { length: 60 }),
  /** Controlled, minimised statement of what was asked. Never the verbatim prompt. */
  requestSummary: varchar("requestSummary", { length: 500 }).notNull(),
  /** The functional scope the enquiry sat in, so the row can be access-filtered like any other record. */
  functionalScope: varchar("functionalScope", { length: 40 }).notNull(),
  /** Set only where the subject genuinely falls under a sensitive overlay, so restricted material stays in its own scope. */
  sensitiveOverlay: varchar("sensitiveOverlay", { length: 40 }),
  /** Null where a single worker answered — set only for a genuinely collaborative enquiry. */
  leadWorkerId: varchar("leadWorkerId", { length: 40 }),
  outcome: mysqlEnum("outcome", [
    "recommendation",
    "recommendation_with_unresolved_disagreement",
    "human_check_required",
    "invalid",
    "no_recommendation",
  ]).notNull(),
  /** The recommendation or final response as released. Null where none was released. */
  finalResponse: text("finalResponse"),
  /** Tri-state: NULL = no quality check ran, 0 = failed with blocking findings, 1 = passed. */
  qualityCheckPassed: int("qualityCheckPassed"),
  /**
   * Clause 13/14's consequential-action boundary, recorded rather than
   * assumed. "prepared_for_approval" is the resting state of a
   * consequential action: prepared in full, not executed.
   */
  approvalState: mysqlEnum("approvalState", [
    "not_required",
    "prepared_for_approval",
    "approved",
    "rejected",
    "executed",
  ]).notNull(),
  approvedByStaffUserId: int("approvedByStaffUserId"),
  approvedAt: timestamp("approvedAt"),
  /** What was actually done, where anything was. Null while nothing has been. */
  actionTaken: varchar("actionTaken", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
});

export type StaffEnquiry = typeof staffEnquiries.$inferSelect;
export type InsertStaffEnquiry = typeof staffEnquiries.$inferInsert;

/**
 * Clauses 7, 8 and 9 — which workers contributed to an enquiry, what each
 * said, and where they disagreed.
 *
 * Separate from staff_enquiries because an enquiry has many contributions
 * and because a disagreement must remain visible as its own recorded fact
 * rather than being flattened into the final response. confidence and
 * evidenceQuality are stored separately for the same reason they are
 * separate in server/operating/collaboration.ts: a confident position on
 * weak evidence must stay legible as exactly that.
 *
 * Rows are never deleted. A contribution that was later disagreed with or
 * set aside stays readable, so the record shows how a recommendation was
 * reached and not only what it concluded.
 */
export const staffEnquiryContributions = mysqlTable("staff_enquiry_contributions", {
  id: int("id").autoincrement().primaryKey(),
  enquiryId: int("enquiryId").notNull(),
  workerId: varchar("workerId", { length: 40 }).notNull(),
  workerSpecificationVersion: varchar("workerSpecificationVersion", { length: 60 }).notNull(),
  /** 1 for the single lead on a collaborative enquiry, 0 otherwise. Never more than one per enquiry. */
  isLead: int("isLead").notNull(),
  /** The contributor's own functional scope at the time — the basis on which an out-of-lane contribution is rejected. */
  functionalScope: varchar("functionalScope", { length: 40 }).notNull(),
  position: text("position"),
  confidence: mysqlEnum("confidence", ["certain", "likely", "unproven"]).notNull(),
  evidenceQuality: mysqlEnum("evidenceQuality", ["verified", "partial", "insufficient"]).notNull(),
  /** Set where this contributor explicitly disagreed with another named contributor. */
  disagreedWithWorkerId: varchar("disagreedWithWorkerId", { length: 40 }),
  /** 1 where the worker declined to answer rather than guessing. */
  cannotAnswer: int("cannotAnswer").notNull(),
  /** Controlled reference to the evidence relied on — a document name or record id, never its contents. */
  evidenceReference: varchar("evidenceReference", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StaffEnquiryContribution = typeof staffEnquiryContributions.$inferSelect;
export type InsertStaffEnquiryContribution = typeof staffEnquiryContributions.$inferInsert;
