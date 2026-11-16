import { ENV } from "./env";

const TOKEN_URL = (tenantId: string) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

type CachedToken = { accessToken: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

function isConfigured(): boolean {
  return Boolean(ENV.microsoftTenantId && ENV.microsoftClientId && ENV.microsoftClientSecret);
}

/**
 * Client-credentials (app-only) OAuth2 token for Microsoft Graph, cached in
 * memory until shortly before it expires. Requires the Azure AD app to have
 * been granted the Mail.Send application permission with admin consent.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    client_id: ENV.microsoftClientId,
    client_secret: ENV.microsoftClientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(TOKEN_URL(ENV.microsoftTenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Never include the client secret in thrown/logged error text.
    throw new Error(`Microsoft Graph token request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

export type GraphMailPayload = {
  to: string[];
  subject: string;
  text: string;
};

/**
 * Sends an email via Microsoft Graph, as ENV.microsoftSendAsMailbox, using
 * app-only client-credentials auth (no signed-in user). Requires the Mail.Send
 * application permission granted with admin consent in the WSA Microsoft 365
 * tenant. Returns false (never throws) if Graph isn't configured, so callers
 * can treat it the same way as the previous Gmail-based sender.
 */
export async function sendGraphMail(payload: GraphMailPayload): Promise<boolean> {
  if (!isConfigured()) {
    console.warn(
      "[GraphMail] MICROSOFT_TENANT_ID/MICROSOFT_CLIENT_ID/MICROSOFT_CLIENT_SECRET not set, skipping email:",
      payload.subject
    );
    return false;
  }

  try {
    const accessToken = await getAccessToken();
    const sender = ENV.microsoftSendAsMailbox;

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: payload.subject,
            body: { contentType: "Text", content: payload.text },
            toRecipients: payload.to.map(address => ({ emailAddress: { address } })),
          },
          saveToSentItems: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[GraphMail] sendMail failed (${response.status}): ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[GraphMail] Failed to send email:", error instanceof Error ? error.message : String(error));
    return false;
  }
}
