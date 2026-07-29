import nodemailer from "nodemailer";
import { ENV } from "./env";

// ------------------------------------------------------------
// Rewritten 29/07/2026 to send owner (Tim) lead notifications via plain
// Gmail SMTP instead of Manus's hosted Notification Service (which this
// deployment has no access to once run outside Manus). Same pattern as
// Arrington Consultancy's own lead-notification emails. Requires
// GMAIL_APP_PASSWORD (an app password on the OWNER_NOTIFY_EMAIL account)
// and OWNER_NOTIFY_EMAIL. If either is unset, notifyOwner no-ops with a
// console warning rather than breaking the caller — the actual lead is
// still recorded in Pipedrive/the portal DB either way.
// ------------------------------------------------------------

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const transporter =
  ENV.gmailAppPassword && ENV.ownerNotifyEmail
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: ENV.ownerNotifyEmail, pass: ENV.gmailAppPassword },
      })
    : null;

/**
 * Emails a lead/enquiry notification to the site owner. Returns `true` if
 * the email was sent (or accepted by Gmail), `false` if notifications
 * aren't configured or the send failed — callers already treat a `false`
 * return as non-fatal (the lead itself is recorded elsewhere regardless).
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  if (!isNonEmptyString(payload.title) || !isNonEmptyString(payload.content)) {
    console.warn("[Notification] Missing title or content — skipping.");
    return false;
  }

  const title = payload.title.trim().slice(0, TITLE_MAX_LENGTH);
  const content = payload.content.trim().slice(0, CONTENT_MAX_LENGTH);

  if (!transporter) {
    console.warn(
      "[Notification] GMAIL_APP_PASSWORD/OWNER_NOTIFY_EMAIL not set — skipping owner notification:",
      title
    );
    return false;
  }

  try {
    await transporter.sendMail({
      from: ENV.ownerNotifyEmail,
      to: ENV.ownerNotifyEmail,
      subject: title,
      text: content,
    });
    return true;
  } catch (error) {
    console.warn("[Notification] Failed to send owner notification email:", error);
    return false;
  }
}
