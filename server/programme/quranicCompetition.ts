import { z } from "zod";
import {
  NIGERIAN_STATES,
  QURANIC_FAILED_SUBMISSION_TYPE,
  QURANIC_FIELD_LIMITS,
  SCHOOL_TYPES,
  type QuranicSchoolRegistration,
} from "../../shared/quranicCompetition";
import { notifyQuranicCompetitionCommittee, notifyStaff } from "../_core/notification";
import { recordFailedSubmission } from "../db";

/**
 * A school's registration for His Royal Highness's Annual Quranic
 * Memorisation Competition, from the Sarkin Fulani Future Leaders Programme
 * page.
 *
 * NOT A WSA ENQUIRY. The competition belongs to the Sarkin Fulani of Lagos
 * and is run by its Competition Committee in Nigeria (Farooq Gajo, 29
 * September 2026). So this creates no Pipedrive Lead, no portal account
 * and no Student Counsellor notification. It validates what the school
 * typed, emails it to the Committee's address, and tells the school
 * honestly whether that worked.
 *
 * The router (server/routers.ts) owns the honeypot and the Turnstile check;
 * this module owns everything after them, so the email it builds can be
 * tested without a network.
 */

const L = QURANIC_FIELD_LIMITS;
const trimmed = (max: number) => z.string().trim().max(max);
const required = (max: number, message: string) => trimmed(max).min(1, message);

export const quranicSchoolRegistrationSchema = z.object({
  schoolName: required(L.schoolName, "The school's name is required"),
  schoolType: z.enum(SCHOOL_TYPES),
  town: required(L.town, "The town or city is required"),
  state: z.enum(NIGERIAN_STATES),
  contactName: required(L.contactName, "A contact name is required"),
  contactRole: required(L.contactRole, "The contact's role is required"),
  phone: required(L.phone, "A phone or WhatsApp number is required").refine(
    v => v.replace(/[^0-9]/g, "").length >= 7,
    "Please enter a valid phone or WhatsApp number",
  ),
  email: z.union([z.literal(""), z.string().trim().max(L.email).email("Please enter a valid email address")]).default(""),
  expectedEntrants: required(L.expectedEntrants, "Tell the Committee roughly how many students you expect to enter"),
  ageGroups: trimmed(L.ageGroups).default(""),
  takenPartBefore: z.enum(["yes", "no", "not-sure"]),
  message: trimmed(L.message).default(""),
});

export type QuranicSchoolRegistrationInput = z.infer<typeof quranicSchoolRegistrationSchema>;

const TAKEN_PART_TEXT: Record<QuranicSchoolRegistration["takenPartBefore"], string> = {
  yes: "Yes",
  no: "No, this would be the school's first year",
  "not-sure": "Not sure",
};

/**
 * The email the Committee receives: every answer the school gave, in the
 * order the form asked, with nothing inferred. Plain text, because it is
 * read on a phone in Nigeria as often as on a desk.
 */
export function buildCommitteeEmail(reg: QuranicSchoolRegistration, receivedAt: Date = new Date()): { title: string; content: string } {
  const when = receivedAt.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const title = `Quranic Memorisation Competition: school registration from ${reg.schoolName}`;
  const content = [
    `A school has registered its interest in His Royal Highness's Annual Quranic Memorisation Competition`,
    `through the Sarkin Fulani Future Leaders Programme page on the World Student Advisors website.`,
    ``,
    `School: ${reg.schoolName}`,
    `Type of school: ${reg.schoolType}`,
    `Town or city: ${reg.town}`,
    `State: ${reg.state}`,
    ``,
    `Contact: ${reg.contactName}`,
    `Role: ${reg.contactRole}`,
    `Phone or WhatsApp: ${reg.phone}`,
    `Email: ${reg.email || "Not given"}`,
    ``,
    `Students the school expects to enter: ${reg.expectedEntrants}`,
    `Age groups: ${reg.ageGroups || "Not given"}`,
    `Taken part before: ${TAKEN_PART_TEXT[reg.takenPartBefore]}`,
    ``,
    `Message from the school:`,
    reg.message || "(none)",
    ``,
    `Received: ${when}`,
    `Source: WSA Website, Sarkin Fulani Future Leaders Programme page, school registration form.`,
    `This registration has been sent to the Competition Committee's address only. It is not a WSA student enquiry and has not been added to Pipedrive.`,
  ].join("\n");
  return { title, content };
}

export type RegistrationOutcome =
  | { success: true }
  | { success: false; error: string };

/**
 * Sends the registration to the Committee. If the email cannot be sent the
 * school is told so plainly, the registration is preserved for a manual
 * resend, and WSA staff are alerted: a school that believes it has
 * registered when nothing arrived would be the worst outcome here.
 */
export async function submitQuranicSchoolRegistration(
  reg: QuranicSchoolRegistrationInput,
  deps: {
    notifyCommittee?: typeof notifyQuranicCompetitionCommittee;
    alertStaff?: typeof notifyStaff;
    preserve?: typeof recordFailedSubmission;
  } = {},
): Promise<RegistrationOutcome> {
  const notifyCommittee = deps.notifyCommittee ?? notifyQuranicCompetitionCommittee;
  const alertStaff = deps.alertStaff ?? notifyStaff;
  const preserve = deps.preserve ?? recordFailedSubmission;

  const email = buildCommitteeEmail(reg);
  let sent = false;
  let failure = "";
  try {
    sent = await notifyCommittee(email);
    if (!sent) failure = "The Committee email could not be sent (mail not configured or the send failed).";
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }

  if (sent) return { success: true };

  console.error(`[Quranic Competition] Registration from ${reg.schoolName} (${reg.town}, ${reg.state}) was not delivered: ${failure}`);
  await preserve({
    formType: QURANIC_FAILED_SUBMISSION_TYPE,
    email: reg.email || undefined,
    payload: reg,
    errorMessage: failure,
  });
  alertStaff({
    title: `Quranic Competition registration FAILED to send: ${reg.schoolName}`,
    content: [
      `A school's registration for the Quranic Memorisation Competition could not be emailed to the Competition Committee and needs a manual resend.`,
      ``,
      `School: ${reg.schoolName} (${reg.town}, ${reg.state})`,
      `Contact: ${reg.contactName}, ${reg.contactRole}`,
      `Phone or WhatsApp: ${reg.phone}`,
      ``,
      `The full registration has been preserved for retry (failed_submissions, form type ${QURANIC_FAILED_SUBMISSION_TYPE}) if the database is connected; otherwise see the server log.`,
    ].join("\n"),
  }).catch(err => console.error("[Notification] Failed to send Quranic Competition failure alert:", err));

  return {
    success: false,
    error:
      "We could not send your registration to the Competition Committee just now. Please try again in a few minutes. Your details have not been lost.",
  };
}
