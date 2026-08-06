import { z } from "zod";
import { notifyStaff, notifyInterviewCoachResult, sendApplicantConfirmation } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { createStudentLead, PipedriveApiError } from "./pipedrive";
import { recordFailedSubmission } from "./db";
import { createPortalUser, authenticatePortalUser, setPasswordWithToken, requestPasswordReset, verifyPortalToken } from "./portal-auth";
import { getSessionQuestions, assessAnswer, summariseSession, TYPE_LABELS } from "./interviewCoach";
import { requireTurnstile } from "./_core/turnstile";

/** Shared by every Turnstile-protected mutation's input schema. */
const turnstileField = { turnstileToken: z.string().min(1, "Verification required") };

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
  /** Honeypot — real users never see or fill this field; bots often do. */
  website: z.string().optional().default(""),
  ...turnstileField,
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
      .mutation(async ({ input, ctx }) => {
        // Honeypot tripped — pretend success without doing any real work,
        // so bots get no signal that they were caught. Cheaper than a
        // network round-trip to Cloudflare, and this path never touches
        // Pipedrive/email either way, so skipping Turnstile here doesn't
        // weaken anything Turnstile is protecting.
        if (input.website) {
          return { success: true as const, leadId: "", portalToken: null };
        }

        await requireTurnstile(input.turnstileToken, ctx.req.ip);

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
          // Includes the safe (credential-free) Pipedrive API error detail
          // when available, so staff can diagnose the actual cause
          // immediately instead of just knowing "it failed".
          notifyStaff({
            title: `Sign-up FAILED to save: ${input.firstName} ${input.lastName}`,
            content: [
              `A student sign-up could not be saved to Pipedrive and needs manual follow-up.`,
              ``,
              `Name: ${input.firstName} ${input.lastName}`,
              `Email: ${input.email}`,
              `Phone: ${input.phone}`,
              `Desired Level: ${input.desiredLevel}`,
              error instanceof PipedriveApiError
                ? `\nPipedrive API error: ${error.status} on ${error.endpoint}\n${error.safeDetail}`
                : "",
              ``,
              `The full submission has been preserved for retry (see failed_submissions table if the database is connected; otherwise check server logs for the timestamp above).`,
            ].filter(Boolean).join("\n"),
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
            pipedriveObjectType: "lead" as const,
            pipedriveObjectId: result.leadId,
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
        // When no counsellor was selected, the title/content explicitly
        // flags that allocation is required — the Lead's owner is Eldah as
        // the allocation queue, but this makes the "needs a decision" state
        // visible in the email itself too, not just implicit in who owns it.
        notifyStaff({
          title: result.needsAllocation
            ? `New Student Enquiry (Needs Allocation): ${input.firstName} ${input.lastName} - ${input.desiredLevel}`
            : `New Student Enquiry: ${input.firstName} ${input.lastName} - ${input.desiredLevel}`,
          content: [
            result.needsAllocation
              ? `No counsellor was selected — this enquiry needs allocating. Assigned to Eldah in Pipedrive for now; Tim and Eldah have both been added as followers on the Person record.\n`
              : "",
            `Name: ${input.firstName} ${input.lastName}`,
            `Email: ${input.email}`,
            input.phone ? `Phone: ${input.phone}` : "",
            `Gender: ${input.gender}`,
            `Date of Birth: ${input.dateOfBirth}`,
            input.passportNumber ? `Passport Number: ${input.passportNumber}` : "",
            `Nationality: ${input.nationality}`,
            `Country: ${input.country}`,
            `Highest Qualification: ${input.highestQualification}`,
            `Desired Level: ${input.desiredLevel}`,
            `Area of Study: ${input.areaOfStudy}`,
            `Preferred Mode: ${input.preferredMode}`,
            `Destination: ${input.preferredDestination}`,
            `Start: ${input.preferredStartMonth}`,
            `Education Funding: ${input.educationFunding}`,
            input.promoCode ? `Promotional Code: ${input.promoCode}` : "",
            input.referredToWSA === "yes"
              ? `Referred to WSA: Yes — ${input.referredByWhom || "—"}`
              : input.referredToWSA
                ? `Referred to WSA: ${input.referredToWSA}`
                : "",
            `Recommended Counsellor: ${input.recommendedCounsellor || "Help me choose"}`,
            result.reusedExistingPerson ? `\n(Matched an existing Pipedrive Person by email/phone — updated rather than duplicated.)` : "",
            ``,
            `Pipedrive Lead ID: ${result.leadId}`,
            `Assigned to: ${result.ownerName}`,
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
      .input(z.object({ email: z.string().email(), ...turnstileField }))
      .mutation(async ({ input, ctx }) => {
        await requireTurnstile(input.turnstileToken, ctx.req.ip);
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
    // Open access (since 28 Jul 2026, preserved deliberately): the Interview
    // Coach does not require a portal session and has no rate limiting.
    startSession: publicProcedure
      .input(
        z.object({
          interviewType: z.enum(["cas", "ukvi", "university", "course"]),
          courseOrSubject: z.string().max(200).optional(),
          count: z.number().int().min(3).max(8).default(5),
          ...turnstileField,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await requireTurnstile(input.turnstileToken, ctx.req.ip);
        const questions = await getSessionQuestions(input.interviewType, input.courseOrSubject, input.count);
        return { success: true as const, questions };
      }),

    // Assesses one answer at a time. On a student's first attempt at a
    // question, a weak answer gets one intelligent follow-up question
    // instead of a score (needsFollowUp: true). Pass the same call again
    // with `followUp` set to the question just asked and the student's
    // second answer to get the final score — a second follow-up is never
    // triggered, capped in server/interviewCoach.ts regardless of model output.
    submitAnswer: publicProcedure
      .input(
        z.object({
          interviewType: z.enum(["cas", "ukvi", "university", "course"]),
          courseOrSubject: z.string().max(200).optional(),
          question: z.string().max(1000),
          answer: z.string().max(5000),
          followUp: z
            .object({ question: z.string().max(1000), answer: z.string().max(5000) })
            .optional(),
          ...turnstileField,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await requireTurnstile(input.turnstileToken, ctx.req.ip);
        const assessment = await assessAnswer(input);
        return { success: true as const, assessment };
      }),

    // Pure aggregation, no LLM call — averages the final score from every
    // substantive answer in the session and applies the 85% threshold that
    // gates progression to a live mock interview with a WSA Student Counsellor.
    // Also emails the results to a fixed, smaller list (Tim, Eldah, Tom —
    // see interviewCoachNotifyEmails in env.ts) on every completed session,
    // not just passes.
    finishSession: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          interviewType: z.enum(["cas", "ukvi", "university", "course"]),
          courseOrSubject: z.string().max(200).optional(),
          results: z
            .array(
              z.object({
                question: z.string().max(1000),
                score: z.number().min(0).max(100),
              }),
            )
            .min(1),
          ...turnstileField,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await requireTurnstile(input.turnstileToken, ctx.req.ip);
        const scores = input.results.map(r => r.score);
        const summary = summariseSession(scores);

        notifyInterviewCoachResult({
          title: `Interview Coach completed: ${input.email} - ${TYPE_LABELS[input.interviewType]}`,
          content: [
            `Email: ${input.email}`,
            `Interview Type: ${TYPE_LABELS[input.interviewType]}`,
            input.courseOrSubject ? `Course/Subject: ${input.courseOrSubject}` : "",
            `Average Score: ${summary.averageScore}%`,
            `Result: ${summary.passed ? "PASSED — ready for live mock interview" : "Below pass mark (85%)"}`,
            ``,
            `Per-question scores:`,
            ...input.results.map((r, i) => `${i + 1}. [${r.score}%] ${r.question}`),
          ].filter(Boolean).join("\n"),
        }).catch(err => console.error("[Notification] Failed to send Interview Coach result email:", err));

        return { success: true as const, summary };
      }),
  }),
});

export type AppRouter = typeof appRouter;
