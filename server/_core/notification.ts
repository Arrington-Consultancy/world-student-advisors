import { ENV } from "./env";
import { sendGraphMail } from "./graphMail";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Emails the WSA staff list (server/_core/env.ts staffNotifyEmails) about a
 * lead/enquiry event, via Microsoft Graph as ENV.microsoftSendAsMailbox.
 * Returns `true` if sent, `false` if not configured or the send failed —
 * callers must not treat `false` as silent, a failed staff notification
 * should itself be logged/alerted by the caller.
 */
export async function notifyStaff(payload: NotificationPayload): Promise<boolean> {
  if (!isNonEmptyString(payload.title) || !isNonEmptyString(payload.content)) {
    console.warn("[Notification] Missing title or content — skipping.");
    return false;
  }

  if (ENV.staffNotifyEmails.length === 0) {
    console.warn("[Notification] STAFF_NOTIFY_EMAILS is empty — skipping staff notification:", payload.title);
    return false;
  }

  const title = payload.title.trim().slice(0, TITLE_MAX_LENGTH);
  const content = payload.content.trim().slice(0, CONTENT_MAX_LENGTH);

  return sendGraphMail({ to: ENV.staffNotifyEmails, subject: title, text: content });
}

/**
 * Emails a fixed, smaller recipient list (server/_core/env.ts
 * interviewCoachNotifyEmails — separate from the general staff list) the
 * results of a completed AI Interview Coach session. Same delivery
 * constraints as notifyStaff.
 */
export async function notifyInterviewCoachResult(payload: NotificationPayload): Promise<boolean> {
  if (!isNonEmptyString(payload.title) || !isNonEmptyString(payload.content)) {
    console.warn("[Notification] Missing title or content — skipping.");
    return false;
  }

  if (ENV.interviewCoachNotifyEmails.length === 0) {
    console.warn("[Notification] INTERVIEW_COACH_NOTIFY_EMAILS is empty — skipping:", payload.title);
    return false;
  }

  const title = payload.title.trim().slice(0, TITLE_MAX_LENGTH);
  const content = payload.content.trim().slice(0, CONTENT_MAX_LENGTH);

  return sendGraphMail({ to: ENV.interviewCoachNotifyEmails, subject: title, text: content });
}

/**
 * Emails the applicant a plain confirmation that their sign-up was received,
 * via Microsoft Graph as ENV.microsoftSendAsMailbox. Same delivery
 * constraints as notifyStaff: returns false (never throws) if mail isn't
 * configured or the send fails, so it never blocks the response to the
 * applicant's own form submission.
 */
export async function sendApplicantConfirmation(to: string, firstName: string): Promise<boolean> {
  if (!isNonEmptyString(to)) {
    console.warn("[Notification] Cannot send applicant confirmation — missing address.");
    return false;
  }

  return sendGraphMail({
    to: [to],
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
}

/**
 * Emails the applicant their one-time Student Portal setup link, via
 * Microsoft Graph as ENV.microsoftSendAsMailbox. `setupLink` must already
 * contain the raw token as a query param — this function only formats and
 * sends, it never logs the link or token itself. Same delivery constraints
 * as notifyStaff: returns false (never throws) if mail isn't configured or
 * the send fails, so a failure here can never block the sign-up response.
 */
export async function sendPortalSetupEmail(to: string, firstName: string, setupLink: string): Promise<boolean> {
  if (!isNonEmptyString(to)) {
    console.warn("[Notification] Cannot send portal setup email — missing address.");
    return false;
  }

  return sendGraphMail({
    to: [to],
    subject: "Set up your WorldStudentAdvisors Student Portal account",
    text: [
      `Hi ${firstName || "there"},`,
      ``,
      `Your WorldStudentAdvisors Student Portal account is ready. Set your password to get started:`,
      ``,
      setupLink,
      ``,
      `This link expires in 24 hours.`,
      ``,
      `If you didn't request this, you can safely ignore this email.`,
      ``,
      `WorldStudentAdvisors`,
    ].join("\n"),
  });
}

/**
 * Emails the applicant a password reset link, via Microsoft Graph as
 * ENV.microsoftSendAsMailbox. `resetLink` must already contain the raw
 * token as a query param — this function only formats and sends, it never
 * logs the link or token itself. Same delivery constraints as notifyStaff:
 * returns false (never throws) if mail isn't configured or the send fails.
 * Callers must not let a false return change the response given to the
 * requester — this is only ever called after account existence has already
 * been checked internally, and the requester-facing response must stay
 * identical whether or not an account exists or this send succeeded.
 */
export async function sendPasswordResetEmail(to: string, firstName: string, resetLink: string): Promise<boolean> {
  if (!isNonEmptyString(to)) {
    console.warn("[Notification] Cannot send password reset email — missing address.");
    return false;
  }

  return sendGraphMail({
    to: [to],
    subject: "Reset your WorldStudentAdvisors Student Portal password",
    text: [
      `Hi ${firstName || "there"},`,
      ``,
      `We received a request to reset your Student Portal password. Choose a new password here:`,
      ``,
      resetLink,
      ``,
      `This link expires in 24 hours.`,
      ``,
      `If you didn't request this, you can safely ignore this email — your password won't change.`,
      ``,
      `WorldStudentAdvisors`,
    ].join("\n"),
  });
}
