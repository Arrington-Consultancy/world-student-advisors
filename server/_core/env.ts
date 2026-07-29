const DEFAULT_STAFF_NOTIFY_EMAILS = [
  "tim.hunt@worldstudentadvisors.com",
  "eldah@worldstudentadvisors.com",
  "sarafina@worldstudentadvisors.com",
  "glenice@worldstudentadvisors.com",
  "manet@worldstudentadvisors.com",
  "tom@arringtonconsultancy.com",
];

const staffNotifyEmails = (process.env.STAFF_NOTIFY_EMAILS ?? DEFAULT_STAFF_NOTIFY_EMAILS.join(","))
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
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  ownerNotifyEmail: process.env.OWNER_NOTIFY_EMAIL ?? "",
  pipedriveApiToken: process.env.PIPEDRIVE_API_TOKEN ?? "",
  staffNotifyEmails,
  publicSiteUrl,
};
