import { z } from "zod";
import { SPONSOR_STATUS_OPTIONS, SCHOLARSHIP_STATUS_OPTIONS } from "../shared/fundingStatus";
import {
  notifyStaff,
  notifyInterviewCoachResult,
  sendApplicantConfirmation,
  sendPortalSetupEmail,
  sendPasswordResetEmail,
} from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { createStudentLead } from "./pipedrive";
import { recordFailedSubmission } from "./db";
import {
  createPortalUser,
  authenticatePortalUser,
  setPasswordWithToken,
  requestPasswordReset,
  verifyPortalToken,
  getPortalUserById,
  verifySignupPrefillToken,
  linkPortalUserToPipedrive,
} from "./portal-auth";
import { resolvePortalDashboard } from "./portal-resolver";
import { getSessionQuestions, assessAnswer, summariseSession, TYPE_LABELS } from "./interviewCoach";
import { requireTurnstile } from "./_core/turnstile";
import { authenticateStaffPortal, verifyStaffPortalToken, isStaffPortalLoginRateLimited } from "./staffPortalAuth";

/** Shared by every Turnstile-protected mutation's input schema. */
const turnstileField = { turnstileToken: z.string().min(1, "Verification required") };

/**
 * The application itself — everything except identity (name/email) and
 * turnstile, so it can be shared between the public /contact form
 * (studentSignupSchema, identity supplied raw or via Google prefill) and an
 * already-authenticated portal member completing their application
 * in-portal (portalApplicationSchema, identity comes from their verified
 * session token, never re-asked).
 */
const applicationFieldsShape = {
  middleName: z.string().optional().default(""),
  gender: z.string().min(1),
  dateOfBirth: z.string().min(1),
  passportNumber: z.string().optional().default(""),
  phone: z.string().min(1),
  nationality: z.string().min(1),
  country: z.string().min(1),
  highestQualification: z.string().min(1),
  desiredLevel: z.string().min(1),
  areaOfStudy: z.string().min(1),
  preferredMode: z.string().min(1),
  preferredStartMonth: z.string().min(1),
  preferredDestination: z.string().min(1),
  educationFunding: z.string().min(1),
  // Required (enforced below, in .superRefine) when educationFunding is
  // sponsor, scholarship, or mixed respectively — otherwise left blank.
  sponsorName: z.string().optional().default(""),
  sponsorStatus: z.string().optional().default(""),
  scholarshipName: z.string().optional().default(""),
  scholarshipStatus: z.string().optional().default(""),
  /** Always optional, even for a scholarship enquiry: "if known". */
  scholarshipCoverage: z.string().optional().default(""),
  mixedFundingSources: z.string().optional().default(""),
  mixedFundingConfirmedAmount: z.string().optional().default(""),
  mixedFundingRemaining: z.string().optional().default(""),
  referredToWSA: z.string().optional().default(""),
  referredByWhom: z.string().optional().default(""),
  recommendedCounsellor: z.string().optional().default(""),
  gdprConsent: z.boolean(),
};

/**
 * Mirrors Contact.tsx's client-side validation so a request that skips the
 * browser (a direct API call, or client JS that's out of sync) can't submit
 * sponsor/scholarship/mixed funding without the structured status
 * information that's the whole point of asking. Shared by both schemas
 * below via .superRefine(validateFundingFields) — the fields it checks are
 * identical either way.
 */
function validateFundingFields(
  data: { educationFunding: string; sponsorName: string; sponsorStatus: string; scholarshipName: string; scholarshipStatus: string; mixedFundingSources: string; mixedFundingConfirmedAmount: string; mixedFundingRemaining: string },
  ctx: z.RefinementCtx
) {
  if (data.educationFunding === "sponsor") {
    if (!data.sponsorName.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sponsorName"], message: "Sponsor name is required" });
    }
    if (!SPONSOR_STATUS_OPTIONS.includes(data.sponsorStatus as (typeof SPONSOR_STATUS_OPTIONS)[number])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sponsorStatus"], message: "A valid funding status is required" });
    }
  }
  if (data.educationFunding === "scholarship") {
    if (!data.scholarshipName.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scholarshipName"], message: "Scholarship name is required" });
    }
    if (!SCHOLARSHIP_STATUS_OPTIONS.includes(data.scholarshipStatus as (typeof SCHOLARSHIP_STATUS_OPTIONS)[number])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scholarshipStatus"], message: "A valid funding status is required" });
    }
  }
  if (data.educationFunding === "mixed") {
    if (!data.mixedFundingSources.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mixedFundingSources"], message: "Funding sources are required" });
    }
    if (!data.mixedFundingConfirmedAmount.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mixedFundingConfirmedAmount"], message: "The amount or proportion already confirmed is required" });
    }
    if (!data.mixedFundingRemaining.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mixedFundingRemaining"], message: "What remains dependent on approval is required" });
    }
  }
}

const studentSignupSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  ...applicationFieldsShape,
  /** Honeypot — real users never see or fill this field; bots often do. */
  website: z.string().optional().default(""),
  /**
   * Short-lived JWT minted by the Google OAuth callback when flow=signup.
   * When present the server verifies it and uses the locked sub/email/name
   * values from Google rather than the raw form fields, and links the
   * resulting portal account to that Google subject.
   */
  googlePrefillToken: z.string().optional().default(""),
  /** Google Ads click identifiers, captured client-side from the landing URL. */
  gclid: z.string().optional().default(""),
  gbraid: z.string().optional().default(""),
  wbraid: z.string().optional().default(""),
  utm_source: z.string().optional().default(""),
  utm_medium: z.string().optional().default(""),
  utm_campaign: z.string().optional().default(""),
  utm_term: z.string().optional().default(""),
  utm_content: z.string().optional().default(""),
  ...turnstileField,
}).superRefine(validateFundingFields);
type StudentSignupInput = z.infer<typeof studentSignupSchema>;

/**
 * The in-portal "complete your application" submission. No name/email/
 * honeypot/Google-prefill/ad-click fields — identity comes from the
 * verified portal session (`token`) alone, never re-collected.
 */
const portalApplicationSchema = z.object({
  token: z.string().min(1),
  ...applicationFieldsShape,
  ...turnstileField,
}).superRefine(validateFundingFields);

/** Safe-for-logs summary — never includes passport number or any secret. */
function safeSubmissionSummary(input: { firstName: string; lastName: string; email: string; desiredLevel: string }): string {
  return `${input.firstName} ${input.lastName} <${input.email}> (${input.desiredLevel})`;
}

/**
 * Builds the staff notification body for a new enquiry/application, shared
 * by contact.submitStudent (public /contact) and portal.submitApplication
 * (in-portal, already-authenticated) so the two surfaces can't drift.
 */
function buildEnquiryNotificationLines(
  input: Parameters<typeof createStudentLead>[0],
  result: { recommendedCounsellorLabel: string; leadId: string; reusedExistingPerson: boolean }
): string[] {
  return [
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
    ...(input.educationFunding === "sponsor" ? [
      `Sponsor Name: ${input.sponsorName}`,
      `Funding Status: ${input.sponsorStatus}`,
    ] : []),
    ...(input.educationFunding === "scholarship" ? [
      `Scholarship Name: ${input.scholarshipName}`,
      `Funding Status: ${input.scholarshipStatus}`,
      input.scholarshipCoverage ? `Covers: ${input.scholarshipCoverage}` : "",
    ] : []),
    ...(input.educationFunding === "mixed" ? [
      `Funding Sources: ${input.mixedFundingSources}`,
      `Already Confirmed: ${input.mixedFundingConfirmedAmount}`,
      `Still Dependent on Approval: ${input.mixedFundingRemaining}`,
    ] : []),
    input.referredToWSA === "yes"
      ? `Referred to WSA: Yes — ${input.referredByWhom || "—"}`
      : input.referredToWSA
        ? `Referred to WSA: ${input.referredToWSA}`
        : "",
    `Recommended Counsellor: ${result.recommendedCounsellorLabel}`,
    result.reusedExistingPerson ? `\n(Matched an existing Pipedrive Person by email/phone — updated rather than duplicated.)` : "",
    ``,
    `Pipedrive Lead ID: ${result.leadId}`,
  ];
}

/**
 * Calls createStudentLead with the shared failure handling both
 * contact.submitStudent and portal.submitApplication need: log safely,
 * durably preserve the full submission for retry, alert staff, and return a
 * friendly error rather than letting the mutation throw.
 */
async function attemptCreateStudentLead(
  data: Parameters<typeof createStudentLead>[0]
): Promise<{ ok: true; result: Awaited<ReturnType<typeof createStudentLead>> } | { ok: false; error: string }> {
  try {
    const result = await createStudentLead(data);
    return { ok: true, result };
  } catch (error) {
    console.error(
      `[Pipedrive] Sign-up failed to save for ${safeSubmissionSummary(data)}:`,
      error instanceof Error ? error.message : String(error)
    );

    await recordFailedSubmission({
      formType: "student-signup",
      email: data.email,
      payload: data,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    notifyStaff({
      title: `Sign-up FAILED to save: ${data.firstName} ${data.lastName}`,
      content: [
        `A student sign-up could not be saved to Pipedrive and needs manual follow-up.`,
        ``,
        `Name: ${data.firstName} ${data.lastName}`,
        `Email: ${data.email}`,
        `Phone: ${data.phone}`,
        `Desired Level: ${data.desiredLevel}`,
        ``,
        `The full submission has been preserved for retry (see failed_submissions table if the database is connected; otherwise check server logs for the timestamp above).`,
      ].join("\n"),
    }).catch(err => console.error("[Notification] Failed to send failure alert:", err));

    return {
      ok: false,
      error: "We couldn't save your sign-up just now. Please try again in a few minutes, or contact us directly. Your details have not been lost.",
    };
  }
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
          return { success: true as const, leadId: "" };
        }

        await requireTurnstile(input.turnstileToken, ctx.req.ip);

        // ── Verify Google prefill token if the student used "Continue with Google" ──
        // The token was minted server-side in the OAuth callback (flow=signup),
        // so its claims are authoritative. We override the raw form fields with
        // the verified values to prevent tampering, and record the Google sub
        // so the portal account can be linked for immediate Google portal login.
        let googleSub: string | undefined;
        // effectiveInput allows us to override locked fields from the verified
        // Google token while keeping the rest of the submitted form data intact.
        let effectiveInput = input;
        if (input.googlePrefillToken) {
          const verified = await verifySignupPrefillToken(input.googlePrefillToken);
          if (!verified) {
            return {
              success: false as const,
              error: "Your Google sign-in session has expired. Please click 'Continue with Google' again.",
            };
          }
          // Lock the identity fields to the verified Google values
          effectiveInput = {
            ...input,
            firstName: verified.firstName || input.firstName,
            lastName: verified.lastName || input.lastName,
            email: verified.email,
          };
          googleSub = verified.sub;
        }

        const attempt = await attemptCreateStudentLead(effectiveInput);
        if (!attempt.ok) {
          return { success: false as const, error: attempt.error };
        }
        const result = attempt.result;

        // Create the portal account and email the applicant their one-time
        // setup link directly. Best-effort: the sign-up itself already
        // succeeded in Pipedrive, so neither step here can fail the
        // enquiry — but a failure must not look like a silent success
        // either, so staff get an explicit alert rather than this state
        // passing unseen. The raw token is never logged or returned to the
        // client — it only ever exists inside the emailed link.
        try {
          const portalResult = await createPortalUser({
            email: effectiveInput.email,
            firstName: effectiveInput.firstName,
            lastName: effectiveInput.lastName,
            pipedrivePersonId: result.personId,
            pipedriveObjectType: "lead" as const,
            pipedriveObjectId: result.leadId,
            ...(googleSub ? { googleSub } : {}),
          });

          const setupLink = `${ENV.publicSiteUrl}/portal/set-password?token=${portalResult.token}&email=${encodeURIComponent(effectiveInput.email)}`;
          const emailSent = await sendPortalSetupEmail(effectiveInput.email, effectiveInput.firstName, setupLink);

          if (!emailSent) {
            console.error(`[Portal] Setup email failed to send for ${safeSubmissionSummary(effectiveInput)}`);
            notifyStaff({
              title: `Portal setup email FAILED to send: ${effectiveInput.firstName} ${effectiveInput.lastName}`,
              content: [
                `The portal account was created but the setup email could not be delivered.`,
                `Name: ${effectiveInput.firstName} ${effectiveInput.lastName}`,
                `Email: ${effectiveInput.email}`,
                `They will need the setup link resent manually.`,
              ].join("\n"),
            }).catch(err => console.error("[Notification] Failed to send portal-email-failure alert:", err));
          }
        } catch (e) {
          console.error(
            `[Portal] Failed to create portal account for ${safeSubmissionSummary(effectiveInput)}:`,
            e instanceof Error ? e.message : String(e)
          );
          notifyStaff({
            title: `Portal account creation FAILED: ${effectiveInput.firstName} ${effectiveInput.lastName}`,
            content: [
              `The student's enquiry was saved successfully, but their Student Portal account could not be created.`,
              `Name: ${effectiveInput.firstName} ${effectiveInput.lastName}`,
              `Email: ${effectiveInput.email}`,
              `They will need a portal account created manually.`,
            ].join("\n"),
          }).catch(err => console.error("[Notification] Failed to send portal-failure alert:", err));
        }

        // Notify staff of the new sign-up. Never swallowed silently — a
        // failure here is logged even though it doesn't block the response.
        // Recommended Counsellor is in the subject line too, so it's
        // readable from an inbox list view without opening the email —
        // this is the student's stated preference at signup, not a claim
        // about who Pipedrive has actually assigned as the Lead's owner.
        notifyStaff({
          title: `New Student Enquiry (Rec: ${result.recommendedCounsellorLabel}): ${effectiveInput.firstName} ${effectiveInput.lastName} - ${effectiveInput.desiredLevel}`,
          content: buildEnquiryNotificationLines(effectiveInput, result).filter(Boolean).join("\n"),
        }).catch(err => console.error("[Notification] Failed to send staff notification:", err));

        // Confirm to the applicant — best-effort, logged rather than swallowed.
        sendApplicantConfirmation(effectiveInput.email, effectiveInput.firstName).catch(err =>
          console.error("[Notification] Failed to send applicant confirmation:", err)
        );

        // The portal setup token is never returned here — it only ever
        // exists inside the email sent directly to the applicant above.
        return { success: true as const, leadId: result.leadId };
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

        // requestPasswordReset returns null for both "no database" and "no
        // such account" — the response below is identical either way, and
        // the raw token (when one exists) never leaves this block except
        // inside the emailed link. Never logged.
        const result = await requestPasswordReset(input.email);
        if (result) {
          const resetLink = `${ENV.publicSiteUrl}/portal/set-password?token=${result.token}&email=${encodeURIComponent(input.email)}`;
          const emailSent = await sendPasswordResetEmail(input.email, result.firstName, resetLink);

          if (!emailSent) {
            console.error(`[Portal] Reset email failed to send for ${input.email}`);
            notifyStaff({
              title: `Portal reset email FAILED to send`,
              content: [
                `A password reset was requested and a token was generated, but the reset email could not be delivered.`,
                `Email: ${input.email}`,
                `They will need a reset link resent manually.`,
              ].join("\n"),
            }).catch(err => console.error("[Notification] Failed to send reset-email-failure alert:", err));
          }
        }

        // Always the same response, whether or not an account exists or
        // the email actually sent — this endpoint must never reveal
        // account existence via response content.
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

    // The V1 dashboard. Deliberately returns only the locked allowlist —
    // name, live stage/next-action/progress, counsellor (only when the
    // native Pipedrive Owner resolves to a known WSA staff account) — never
    // a raw Pipedrive object. "unavailable" covers the database being down
    // or the account not resolving at all, which must never fall back to
    // any ungated portal content. "no_application" is a distinct, narrower
    // case: a real, authenticated portal account (light email signup or
    // Google sign-in — see portal.signup/findOrCreateGoogleUser) that has
    // no linked Pipedrive record yet — not an outage, so it gets its own
    // status, with an in-portal path to complete it (portal.submitApplication
    // below), rather than being folded into "unavailable". A Pipedrive read
    // failure after successful auth is different again (progress.state
    // "pipedrive_unavailable") that still returns the student's name, since
    // that comes from the portal database, not Pipedrive. See
    // server/portal-resolver.ts for the resolution logic.
    dashboard: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const payload = await verifyPortalToken(input.token);
        if (!payload) return { status: "unauthenticated" as const };

        const portalUser = await getPortalUserById(payload.portalUserId);
        if (!portalUser) {
          return { status: "unavailable" as const };
        }
        if (!portalUser.pipedrivePersonId) {
          return { status: "no_application" as const, name: portalUser.firstName };
        }

        const progress = await resolvePortalDashboard(portalUser.pipedrivePersonId);

        return {
          status: "ok" as const,
          name: portalUser.firstName,
          progress,
        };
      }),

    // Light entry point: name + email only, no application fields. Creates
    // a portal account with no Pipedrive link yet (exactly the same shape
    // findOrCreateGoogleUser already produces for Google sign-in) and emails
    // a one-time link to set a password — reusing sendPortalSetupEmail's
    // copy, which already reads correctly whether this is truly their first
    // account or a re-request. Deliberately does not reveal whether the
    // email already had an account (same anti-enumeration posture as
    // requestPasswordReset): the response is identical either way, and an
    // already-linked account is never touched (createPortalUser's own
    // guard — see server/portal-auth.ts).
    signup: publicProcedure
      .input(z.object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), ...turnstileField }))
      .mutation(async ({ input, ctx }) => {
        await requireTurnstile(input.turnstileToken, ctx.req.ip);

        try {
          const result = await createPortalUser({ email: input.email, firstName: input.firstName, lastName: input.lastName });
          const setupLink = `${ENV.publicSiteUrl}/portal/set-password?token=${result.token}&email=${encodeURIComponent(input.email)}`;
          const emailSent = await sendPortalSetupEmail(input.email, input.firstName, setupLink);

          if (!emailSent) {
            console.error(`[Portal] Light-signup setup email failed to send for ${input.email}`);
            notifyStaff({
              title: `Portal signup email FAILED to send: ${input.firstName} ${input.lastName}`,
              content: [
                `A light portal signup was created but the setup email could not be delivered.`,
                `Name: ${input.firstName} ${input.lastName}`,
                `Email: ${input.email}`,
                `They will need the setup link resent manually.`,
              ].join("\n"),
            }).catch(err => console.error("[Notification] Failed to send portal-signup-email-failure alert:", err));
          }
        } catch (e) {
          console.error(`[Portal] Light signup failed for ${input.email}:`, e instanceof Error ? e.message : String(e));
          return { success: false as const, error: "We couldn't create your account just now. Please try again in a few minutes." };
        }

        return { success: true as const };
      }),

    // In-portal "complete your application" — the counterpart to
    // contact.submitStudent for a student who already has a light portal
    // account. Identity (name/email) comes from the verified session token
    // alone, never re-collected; no honeypot or Google-prefill handling,
    // since an authenticated request needs neither. Refuses outright if the
    // account is already linked, so this can only ever create one Lead per
    // account — the guard against a duplicate Pipedrive application via
    // this path. On success the account is linked directly by id
    // (linkPortalUserToPipedrive), not by an email match, and no further
    // setup email or activation step is sent: the student is already
    // signed in and portal.dashboard now resolves them normally.
    submitApplication: publicProcedure
      .input(portalApplicationSchema)
      .mutation(async ({ input, ctx }) => {
        const payload = await verifyPortalToken(input.token);
        if (!payload) {
          return { success: false as const, error: "Your session has expired. Please sign in again." };
        }

        const portalUser = await getPortalUserById(payload.portalUserId);
        if (!portalUser) {
          return { success: false as const, error: "We couldn't find your account. Please sign in again." };
        }
        if (portalUser.pipedrivePersonId) {
          return { success: false as const, error: "You already have an application on file." };
        }

        await requireTurnstile(input.turnstileToken, ctx.req.ip);

        const applicationData = { ...input, firstName: payload.firstName, lastName: payload.lastName, email: payload.email };

        const attempt = await attemptCreateStudentLead(applicationData);
        if (!attempt.ok) {
          return { success: false as const, error: attempt.error };
        }
        const result = attempt.result;

        try {
          await linkPortalUserToPipedrive(payload.portalUserId, {
            pipedrivePersonId: result.personId,
            pipedriveObjectType: "lead",
            pipedriveObjectId: result.leadId,
          });
        } catch (e) {
          console.error(
            `[Portal] Application saved to Pipedrive but failed to link portal account for ${safeSubmissionSummary(applicationData)}:`,
            e instanceof Error ? e.message : String(e)
          );
          notifyStaff({
            title: `Portal application-linking FAILED: ${applicationData.firstName} ${applicationData.lastName}`,
            content: [
              `The student's application was saved successfully to Pipedrive, but their portal account could not be linked to it.`,
              `Name: ${applicationData.firstName} ${applicationData.lastName}`,
              `Email: ${applicationData.email}`,
              `Pipedrive Lead ID: ${result.leadId}`,
              `They will need their portal account linked manually.`,
            ].join("\n"),
          }).catch(err => console.error("[Notification] Failed to send application-link-failure alert:", err));
        }

        notifyStaff({
          title: `New Student Enquiry (Rec: ${result.recommendedCounsellorLabel}): ${applicationData.firstName} ${applicationData.lastName} - ${applicationData.desiredLevel}`,
          content: buildEnquiryNotificationLines(applicationData, result).filter(Boolean).join("\n"),
        }).catch(err => console.error("[Notification] Failed to send staff notification:", err));

        sendApplicantConfirmation(applicationData.email, applicationData.firstName).catch(err =>
          console.error("[Notification] Failed to send applicant confirmation:", err)
        );

        return { success: true as const };
      }),
  }),

  staffPortal: router({
    login: publicProcedure
      .input(z.object({ password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        if (isStaffPortalLoginRateLimited(ctx.req.ip ?? "unknown")) {
          return { success: false as const, error: "Too many attempts. Please try again in a minute." };
        }
        const token = await authenticateStaffPortal(input.password);
        if (!token) {
          return { success: false as const, error: "Incorrect password" };
        }
        return { success: true as const, token };
      }),

    me: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const authenticated = await verifyStaffPortalToken(input.token);
        return { authenticated };
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
