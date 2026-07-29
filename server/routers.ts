import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createStudentLead, createGeneralEnquiry } from "./pipedrive";
import { createPortalUser, authenticatePortalUser, setPasswordWithToken, requestPasswordReset, verifyPortalToken } from "./portal-auth";
import { generateQuestions, evaluateAnswers } from "./interviewCoach";
export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  contact: router({
    submitStudent: publicProcedure
      .input(
        z.object({
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
        })
      )
      .mutation(async ({ input }) => {
        const result = await createStudentLead(input);

        // Create portal user and generate password-creation token
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

        // Notify Tim of new student application
        await notifyOwner({
          title: `New Student Application: ${input.firstName} ${input.lastName}`,
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
            ``,
            `Pipedrive Lead ID: ${result.leadId}`,
            portalToken ? `\nPortal Setup Link: ${process.env.NODE_ENV === 'production' ? 'https://worldadvisors-3pfnplvb.manus.space' : 'http://localhost:3000'}/portal/set-password?token=${portalToken}&email=${encodeURIComponent(input.email)}` : "",
          ].filter(Boolean).join("\n"),
        }).catch(() => {}); // Don't fail the submission if notification fails

        return { success: true, leadId: result.leadId, portalToken };
      }),

    submitGeneral: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          organisation: z.string().optional(),
          email: z.string().email(),
          role: z.string().min(1),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const result = await createGeneralEnquiry(input);

        // Notify Tim of new general enquiry
        await notifyOwner({
          title: `New General Enquiry: ${input.name}`,
          content: [
            `Name: ${input.name}`,
            input.organisation ? `Organisation: ${input.organisation}` : "",
            `Email: ${input.email}`,
            `Role: ${input.role}`,
            `Message: ${input.message}`,
            ``,
            `Pipedrive Lead ID: ${result.leadId}`,
          ].filter(Boolean).join("\n"),
        }).catch(() => {}); // Don't fail the submission if notification fails

        return { success: true, leadId: result.leadId };
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
