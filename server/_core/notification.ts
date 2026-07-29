import nodemailer from "nodemailer";
import { ENV } from "./env";

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
 * Emails the WSA staff list (server/_core/env.ts staffNotifyEmails) about a
 * lead/enquiry event. Returns `true` if sent, `false` if notifications aren't
 * configured or the send failed. Callers must not treat `false` as silent —
 * a failed staff notification should itself be logged/alerted by the caller.
 */
export async function notifyStaff(payload: NotificationPayload): Promise<boolean> {
  if (!isNonEmptyString(payload.title) || !isNonEmptyString(payload.content)) {
    console.warn("[Notification] Missing title or content — skipping.");
    return false;
  }

  const title = payload.title.trim().slice(0, TITLE_MAX_LENGTH);
  const content = payload.content.trim().slice(0, CONTENT_MAX_LENGTH);

  if (!transporter || ENV.staffNotifyEmails.length === 0) {
    console.warn(
      "[Notification] GMAIL_APP_PASSWORD/OWNER_NOTIFY_EMAIL/STAFF_NOTIFY_EMAILS not set — skipping staff notification:",
      title
    );
    return false;
  }

  try {
    await transporter.sendMail({
      from: ENV.ownerNotifyEmail,
      to: ENV.staffNotifyEmails.join(", "),
      subject: title,
      text: content,
    });
    return true;
  } catch (error) {
    console.warn("[Notification] Failed to send staff notification email:", error);
    return false;
  }
}

/**
 * Emails the applicant a plain confirmation that their sign-up was received.
 * Same delivery constraints as notifyStaff: returns false (never throws) if
 * mail isn't configured or the send fails, so it never blocks the response
 * to the applicant's own form submission.
 */
export async function sendApplicantConfirmation(to: string, firstName: string): Promise<boolean> {
  if (!isNonEmptyString(to) || !transporter) {
    console.warn("[Notification] Cannot send applicant confirmation — mail not configured or missing address.");
    return false;
  }

  try {
    await transporter.sendMail({
      from: ENV.ownerNotifyEmail,
      to,
      subject: "We've received your WorldStudentAdvisors sign-up",
      text: [
        `Hi ${firstName || "there"},`,
        ``,
        `Thanks for signing up with WorldStudentAdvisors. A Student Counsellor will be in touch within 48 hours to understand your goals in more detail.`,
        ``,
        `If you have any questions in the meantime, just reply to this email.`,
        ``,
        `WorldStudentAdvisors`,
      ].join("\n"),
    });
    return true;
  } catch (error) {
    console.warn("[Notification] Failed to send applicant confirmation email:", error);
    return false;
  }
}
