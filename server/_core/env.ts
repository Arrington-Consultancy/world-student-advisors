export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",

  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  ownerNotifyEmail: process.env.OWNER_NOTIFY_EMAIL ?? "",
  pipedriveApiToken: process.env.PIPEDRIVE_API_TOKEN ?? "",
};
