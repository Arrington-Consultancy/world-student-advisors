import { z } from "zod";
import { notifyStaff, sendApplicantConfirmation } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { createStudentLead } from "./pipedrive";
import { recordFailedSubmission } from "./db";
import { createPortalUser, authenticatePortalUser, setPasswordWithToken, requestPasswordReset, verifyPortalToken } from "./portal-auth";
import { generateQuestions, evaluateAnswers } from "./interviewCoach";

const studentSignupSchema = z.object({
  firstName: z.string().min(1),
  middleName: z.string().optional().default(""),
  lastName: z.string().min(1),
  gender: z.string().min(1),
  dateOfBirth: z.string().min(1),
  passportNumber: z.string().optional().default(""),
  phone: z.string().min(1),
  email: z.string().email(),
  nationality: z.string().min(1),
  country: z.string().min(1),
  highestQualification: z.string().min(1),
  desiredLevel: z.string().min(1),
  areaOfStudy: z.string().min(1),
  preferredMode: z.string().min(1),
  preferredStartMonth: z.string().min(1),
  preferredDestination: z.string().min(1),
  educationFunding: z.string().min(1),
  promoCode: z.string().optional().default(""),
  referredToWSA: z.string().optional().default(""),
  referredByWhom: z.string().optional().default(""),
  recommendedCounsellor: z.string().optional().default(""),
  gdprConsent: z.boolean(),
});
type StudentSignupInput = z.infer<typeof studentSignupSchema>;

/** Safe-for-logs summary — never includes passport number or any secret. */
function safeSubmissionSummary(input: StudentSignupInput): string {
  return `${input.firstName} ${input.lastName} <${input.email}> (${input.desiredLevel})`;
}
export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,

  contact: router({
    submitStudent: publicProcedure
      .input(studentSignupSchema)
      .mutation(async ({ input }) => {
        let result: Awaited<ReturnType<typeof createStudentLead>>;
        try {
          result = await createStudentLead(input);
        } catch (error) {
          // Safe log only — no token, no passport number, no full payload.
          console.error(
            `[Pipedrive] Sign-up failed to save for ${safeSubmissionSummary(input)}:`,
            error instanceof Error ? error.message : String(error)
          );

          // Preserve the full submission durably so it isn't silently lost.
          await recordFailedSubmission({
            formType: "student-signup",
            email: input.email,
            payload: input,
            errorMessage: error instanceof Error ? error.message : String(error),
          });

          // Alert staff that a submission failed to save — separate from the
          // normal success notification, and never awaited-and-swallowed.
          notifyStaff({
            title: `Sign-up FAILED to save: ${input.firstName} ${input.lastName}`,
            content: [
              `A student sign-up could not be saved to Pipedrive and needs manual follow-up.`,
              ``,
              `Name: ${input.firstName} ${input.lastName}`,
              `Email: ${input.email}`,
              `Phone: ${input.phone}`,
              `Desired Level: ${input.desiredLevel}`,
              ``,
              `The full submission has been preserved for retry (see failed_submissions table if the database is connected; otherwise check server logs for the timestamp above).`,
            ].join("\n"),
          }).catch(err => console.error("[Notification] Failed to send failure alert:", err));

          return {
            success: false as const,
            error: "We couldn't save your sign-up just now. Please try again in a few minutes, or contact us directly — your details have not been lost.",
          };
        }

        // Create portal user and generate password-creation token. This is
        // best-effort: the sign-up itself already succeeded in Pipedrive.
        let portalToken: string | null = null;
        try {
          const portalResult = await createPortalUser({
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            pipedrivePersonId: result.personId,
            pipedriveDealId: result.leadId,
          });
          portalToken = portalResult.token;
        } catch (e) {
          console.error("[Portal] Failed to create portal user:", e);
        }

        const portalSetupLink = portalToken
          ? `${ENV.publicSiteUrl}/portal/set-password?token=${portalToken}&email=${encodeURIComponent(input.email)}`
          : null;

        // Notify staff of the new sign-up. Never swallowed silently — a
        // failure here is logged even though it doesn't block the response.
        notifyStaff({
          title: `New Student Enquiry: ${input.firstName} ${input.lastName} - ${input.desiredLevel}`,
          content: [
            `Name: ${input.firstName} ${input.lastName}`,
            `Email: ${input.email}`,
            input.phone ? `Phone: ${input.phone}` : "",
            `Country: ${input.country}`,
            `Nationality: ${input.nationality}`,
            `Desired Level: ${input.desiredLevel}`,
            `Area of Study: ${input.areaOfStudy}`,
            `Destination: ${input.preferredDestination}`,
            `Start: ${input.preferredStartMonth}`,
            result.reusedExistingPerson ? `\n(Matched an existing Pipedrive Person by email/phone — updated rather than duplicated.)` : "",
            ``,
            `Pipedrive Lead ID: ${result.leadId}`,
            portalSetupLink ? `\nPortal Setup Link: ${portalSetupLink}` : "",
          ].filter(Boolean).join("\n"),
        }).catch(err => console.error("[Notification] Failed to send staff notification:", err));

        // Confirm to the applicant — best-effort, logged rather than swallowed.
        sendApplicantConfirmation(input.email, input.firstName).catch(err =>
          console.error("[Notification] Failed to send applicant confirmation:", err)
        );

        return { success: true as const, leadId: result.leadId, portalToken };
      }),
  }),

  portal: router({
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const result = await authenticatePortalUser(input.email, input.password);
        if (!result) {
          return { success: false, error: "Invalid email or password" };
        }
        return { success: true, token: result.token, user: result.user };
      }),

    setPassword: publicProcedure
      .input(z.object({ email: z.string().email(), token: z.string().min(1), password: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const success = await setPasswordWithToken(input.email, input.token, input.password);
        if (!success) {
          return { success: false, error: "Invalid or expired link. Please request a new one." };
        }
        // Auto-login after password set
        const loginResult = await authenticatePortalUser(input.email, input.password);
        return { success: true, token: loginResult?.token, user: loginResult?.user };
      }),

    requestReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const token = await requestPasswordReset(input.email);
        // Always return success to prevent email enumeration
        // In production, send the reset email here
        if (token) {
          console.log(`[Portal] Password reset token for ${input.email}: ${token}`);
          // TODO: Send email with reset link
        }
        return { success: true, message: "If an account exists with that email, a reset link has been sent." };
      }),

    me: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const payload = await verifyPortalToken(input.token);
        if (!payload) return null;
        return {
          id: payload.portalUserId,
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
        };
      }),
  }),

  interviewCoach: router({
    generateQuestions: publicProcedure
      .input(
        z.object({
          token: z.string().optional(),
          interviewType: z.enum(["cas", "ukvi", "university", "course"]),
          courseOrSubject: z.string().max(200).optional(),
          count: z.number().int().min(3).max(8).default(5),
        }),
      )
      .mutation(async ({ input }) => {
        // Open access (28 Jul 2026): the Interview Coach no longer requires a portal session.
        const questions = await generateQuestions(input.interviewType, input.courseOrSubject, input.count);
        return { success: true as const, questions };
      }),

    evaluate: publicProcedure
      .input(
        z.object({
          token: z.string().optional(),
          interviewType: z.enum(["cas", "ukvi", "university", "course"]),
          courseOrSubject: z.string().max(200).optional(),
          qa: z
            .array(z.object({ question: z.string().max(1000), answer: z.string().max(5000) }))
            .min(1)
            .max(10),
        }),
      )
      .mutation(async ({ input }) => {
        // Open access (28 Jul 2026): the Interview Coach no longer requires a portal session.
        const result = await evaluateAnswers(input.interviewType, input.courseOrSubject, input.qa);
        return { success: true as const, result };
      }),
  }),
});

export type AppRouter = typeof appRouter;
