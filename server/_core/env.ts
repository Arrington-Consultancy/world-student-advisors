const DEFAULT_STAFF_NOTIFY_EMAILS = [
  "tim.hunt@worldstudentadvisors.com",
  "eldah@worldstudentadvisors.com",
  "sarafina@worldstudentadvisors.com",
  "glenice@worldstudentadvisors.com",
  "manet@worldstudentadvisors.com",
  "tom@arringtonconsultancy.com",
  "pipedrive@worldstudentadvisors.com",
];

const staffNotifyEmails = (process.env.STAFF_NOTIFY_EMAILS ?? DEFAULT_STAFF_NOTIFY_EMAILS.join(","))
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const DEFAULT_INTERVIEW_COACH_NOTIFY_EMAILS = [
  "tim.hunt@worldstudentadvisors.com",
  "eldah@worldstudentadvisors.com",
  "tom@arringtonconsultancy.com",
];

const interviewCoachNotifyEmails = (process.env.INTERVIEW_COACH_NOTIFY_EMAILS ?? DEFAULT_INTERVIEW_COACH_NOTIFY_EMAILS.join(","))
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const publicSiteUrl =
  process.env.PUBLIC_SITE_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000");

export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  pipedriveApiToken: process.env.PIPEDRIVE_API_TOKEN ?? "",
  staffNotifyEmails,
  interviewCoachNotifyEmails,
  publicSiteUrl,
  microsoftTenantId: process.env.MICROSOFT_TENANT_ID ?? "",
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID ?? "",
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
  microsoftSendAsMailbox: process.env.MICROSOFT_SEND_AS_MAILBOX ?? "tim.hunt@worldstudentadvisors.com",
  /** Safe to expose to the client — served via system.turnstileSiteKey. */
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? "",
  /** Server-only. Never send this to the client, log it, or include it in any response. */
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
  /** Google OAuth Client ID — safe to include in redirect URLs but keep it server-controlled. */
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  /** Server-only. Never send this to the client, log it, or include it in any response. */
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  /** Bcrypt hash of the Staff Portal shared password. Server-only — never send
   * this to the client, log it, or include it in any response. Never falls
   * back to a default: unset means the Staff Portal stays inaccessible. */
  staffPortalPasswordHash: process.env.STAFF_PORTAL_PASSWORD_HASH ?? "",
};
