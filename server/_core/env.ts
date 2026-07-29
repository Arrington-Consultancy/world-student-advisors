export const ENV = {
  // Manus-platform fields below are no longer used by any real feature in
  // this app (the OAuth "app owner" login it backs isn't routed to
  // anywhere — see server/_core/oauth.ts) but are left in place, always
  // unset in this deployment, so that dead code referencing them still
  // compiles rather than being ripped out file-by-file. They degrade
  // gracefully to a logged warning, not a crash, when unset.
  appId: process.env.VITE_APP_ID ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  ownerNotifyEmail: process.env.OWNER_NOTIFY_EMAIL ?? "",
  pipedriveApiToken: process.env.PIPEDRIVE_API_TOKEN ?? "",
};
