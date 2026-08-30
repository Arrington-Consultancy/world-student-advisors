import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
import { recordFailedSubmission, recordInterviewCoachSession } from "./db";
import {
  createPortalUser,
  authenticatePortalUser,
  setPasswordWithToken,
  requestPasswordReset,
  verifyPortalToken,
  getPortalUserById,
  verifySignupPrefillToken,
} from "./portal-auth";
import { resolvePortalDashboard } from "./portal-resolver";
import { getSessionQuestions, assessAnswer, summariseSession, TYPE_LABELS } from "./interviewCoach";
import { requireTurnstile } from "./_core/turnstile";
import { authenticateStaffPortal, verifyStaffPortalToken, isStaffPortalLoginRateLimited } from "./staffPortalAuth";
import { isMicrosoftSsoConfigured, buildMicrosoftSignInRequest, completeMicrosoftSignInFromCallback } from "./staffIdentityAuth";
import { resolveStaffSession } from "./staffSession";
import { resolveStaffAccessProfile } from "./access/identity";
import { buildCommunicationsView } from "./communications/access";
import { ACCESS_LEVEL_NAMES } from "./access/accessControl";
import { recordAuditEvent } from "./workforce/audit";
import { listWorkers, getWorker } from "./workforce/registry";
import { evaluateStaffPortalExecutionPermission } from "./workforce/permissions";
import { routeStaffRequest } from "./workforce/router";

/** Shared by every Turnstile-protected mutation's input schema. */
const turnstileField = { turnstileToken: z.string().min(1, "Verification required") };

/**
 * The one WSA demo/test portal account, created directly (not via the
 * public application flow) for showing the Student Portal and AI tools to
 * staff, partners, or other visitors without touching real applicant data.
 * Used only by interviewCoach.finishSession to skip the real-student staff
 * notification for this one account — see the comment there. Now compared
 * against the verified portal-token identity rather than a client-supplied
 * field (see requireActivePortalIdentity below), so it can no longer be
 * triggered by anyone who doesn't actually hold that account's login.
 */
const DEMO_PORTAL_EMAIL = "portal-demo@worldstudentadvisors.com";

/**
 * Verifies a portal session token and confirms the account is still active
 * right now (not just valid when the token was minted up to 7 days ago) —
 * reuses getPortalUserById exactly as portal.dashboard already does, so
 * this introduces no new resolver behaviour. Throws (never returns a
 * silent falsy value) so every caller fails closed the same way
 * requireTurnstile already does elsewhere in this file. Identity fields
 * (email, name) come from the verified JWT claims, not from getPortalUserById
 * (which doesn't carry email) and never from anything the client typed.
 */
async function requireActivePortalIdentity(
  token: string,
): Promise<{ portalUserId: number; email: string; firstName: string; lastName: string }> {
  const payload = await verifyPortalToken(token);
  if (!payload) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to your Student Portal account to use this tool." });
  }
  const portalUser = await getPortalUserById(payload.portalUserId);
  if (!portalUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Your Student Portal account could not be verified. Please sign in again." });
  }
  return { portalUserId: payload.portalUserId, email: payload.email, firstName: payload.firstName, lastName: payload.lastName };
}

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
}).superRefine((data, ctx) => {
  // Mirrors Contact.tsx's client-side validation so a request that skips
  // the browser (a direct API call, or client JS that's out of sync) can't
  // submit sponsor/scholarship/mixed funding without the structured
  // status information that's the whole point of asking.
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

        let result: Awaited<ReturnType<typeof createStudentLead>>;
        try {
          result = await createStudentLead(effectiveInput);
        } catch (error) {
          // Safe log only — no token, no passport number, no full payload.
          console.error(
            `[Pipedrive] Sign-up failed to save for ${safeSubmissionSummary(effectiveInput)}:`,
            error instanceof Error ? error.message : String(error)
          );

          // Preserve the full submission durably so it isn't silently lost.
          await recordFailedSubmission({
            formType: "student-signup",
            email: effectiveInput.email,
            payload: effectiveInput,
            errorMessage: error instanceof Error ? error.message : String(error),
          });

          // Alert staff that a submission failed to save — separate from the
          // normal success notification, and never awaited-and-swallowed.
          notifyStaff({
            title: `Sign-up FAILED to save: ${effectiveInput.firstName} ${effectiveInput.lastName}`,
            content: [
              `A student sign-up could not be saved to Pipedrive and needs manual follow-up.`,
              ``,
              `Name: ${effectiveInput.firstName} ${effectiveInput.lastName}`,
              `Email: ${effectiveInput.email}`,
              `Phone: ${effectiveInput.phone}`,
              `Desired Level: ${effectiveInput.desiredLevel}`,
              ``,
              `The full submission has been preserved for retry (see failed_submissions table if the database is connected; otherwise check server logs for the timestamp above).`,
            ].join("\n"),
          }).catch(err => console.error("[Notification] Failed to send failure alert:", err));

          return {
            success: false as const,
            error: "We couldn't save your sign-up just now. Please try again in a few minutes, or contact us directly. Your details have not been lost.",
          };
        }

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
          content: [
            `Name: ${effectiveInput.firstName} ${effectiveInput.lastName}`,
            `Email: ${effectiveInput.email}`,
            effectiveInput.phone ? `Phone: ${effectiveInput.phone}` : "",
            `Gender: ${effectiveInput.gender}`,
            `Date of Birth: ${effectiveInput.dateOfBirth}`,
            effectiveInput.passportNumber ? `Passport Number: ${effectiveInput.passportNumber}` : "",
            `Nationality: ${effectiveInput.nationality}`,
            `Country: ${effectiveInput.country}`,
            `Highest Qualification: ${effectiveInput.highestQualification}`,
            `Desired Level: ${effectiveInput.desiredLevel}`,
            `Area of Study: ${effectiveInput.areaOfStudy}`,
            `Preferred Mode: ${effectiveInput.preferredMode}`,
            `Destination: ${effectiveInput.preferredDestination}`,
            `Start: ${effectiveInput.preferredStartMonth}`,
            `Education Funding: ${effectiveInput.educationFunding}`,
            ...(effectiveInput.educationFunding === "sponsor" ? [
              `Sponsor Name: ${effectiveInput.sponsorName}`,
              `Funding Status: ${effectiveInput.sponsorStatus}`,
            ] : []),
            ...(effectiveInput.educationFunding === "scholarship" ? [
              `Scholarship Name: ${effectiveInput.scholarshipName}`,
              `Scholarship Status: ${effectiveInput.scholarshipStatus}`,
              effectiveInput.scholarshipCoverage ? `Covers: ${effectiveInput.scholarshipCoverage}` : "",
            ] : []),
            ...(effectiveInput.educationFunding === "mixed" ? [
              `Funding Sources: ${effectiveInput.mixedFundingSources}`,
              `Already Confirmed: ${effectiveInput.mixedFundingConfirmedAmount}`,
              `Still Dependent on Approval: ${effectiveInput.mixedFundingRemaining}`,
            ] : []),
            effectiveInput.referredToWSA === "yes"
              ? `Referred to WSA: Yes — ${effectiveInput.referredByWhom || "—"}`
              : effectiveInput.referredToWSA
                ? `Referred to WSA: ${effectiveInput.referredToWSA}`
                : "",
            `Recommended Counsellor: ${result.recommendedCounsellorLabel}`,
            result.reusedExistingPerson ? `\n(Matched an existing Pipedrive Person by email/phone — updated rather than duplicated.)` : "",
            ``,
            `Pipedrive Lead ID: ${result.leadId}`,
          ].filter(Boolean).join("\n"),
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
    // case: a real, authenticated portal account (e.g. Google sign-in)
    // that has no linked Pipedrive record yet — not an outage, so it gets
    // its own status rather than being folded into "unavailable". A
    // Pipedrive read failure after successful auth is different again
    // (progress.state "pipedrive_unavailable") that still returns the
    // student's name, since that comes from the portal database, not
    // Pipedrive. See server/portal-resolver.ts for the resolution logic.
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

    // Recognises BOTH session types via resolveStaffSession: an Entra
    // individual-identity token and the legacy shared-password token.
    // This previously called verifyStaffPortalToken, which only understands
    // the shared-password token — so a genuine, fully-verified Entra
    // session was reported unauthenticated here and the client discarded
    // it, bouncing the user straight back to the sign-in page after a
    // successful Microsoft sign-in. resolveStaffSession throws
    // UNAUTHORIZED for an invalid token; this endpoint reports that as a
    // boolean rather than an error, keeping the client contract unchanged.
    me: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        try {
          const session = await resolveStaffSession(input.token);
          return {
            authenticated: true as const,
            authMethod: session.authMethod,
            displayName: session.authMethod === "entra_sso" ? session.displayName : null,
          };
        } catch {
          return { authenticated: false as const, authMethod: null, displayName: null };
        }
      }),

    // The caller's OWN access assignment, and only their own. There is no
    // parameter for whose access to report: the staff id comes from the
    // verified session, so this cannot be turned into a way to enumerate
    // colleagues' permissions.
    //
    // Read-only and side-effect free. It exists so the Access Control
    // Standard's §11 gate testing ("one account per level, allowed and
    // forbidden actions") can be carried out against what the server
    // actually resolved, rather than against what a UI happens to render —
    // and so a staff member can be told plainly that they hold no
    // assignment yet, instead of meeting unexplained refusals.
    //
    // Returns a description, never a capability: nothing downstream reads
    // this response back as authority. Every real decision re-resolves the
    // profile server-side.
    myAccess: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const session = await resolveStaffSession(input.token);
        const staffUserId = session.authMethod === "entra_sso" ? session.staffUserId : null;
        const resolution = await resolveStaffAccessProfile(staffUserId);

        if (!resolution.resolved) {
          return {
            assigned: false as const,
            reason: resolution.reason,
            detail: resolution.detail,
          };
        }

        const profile = resolution.profile;
        return {
          assigned: true as const,
          baseAccessLevel: profile.baseAccessLevel,
          accessLevelName: ACCESS_LEVEL_NAMES[profile.baseAccessLevel],
          functionalScopes: [...profile.functionalScopes],
          caseScope: profile.caseScope,
          actionPermissions: [...profile.actionPermissions],
          sensitiveOverlays: [...profile.sensitiveOverlays],
          status: profile.status,
          teamId: profile.teamId,
          // Live elevations, described without restating anything secret.
          temporaryGrants: profile.temporaryGrants.map(g => ({
            reason: g.reason,
            grantedAt: g.grantedAt,
            expiresAt: g.expiresAt,
          })),
          // Surfaced rather than swallowed: a stored value that is not on
          // the approved list was dropped, and somebody needs to know.
          droppedGrantValues: [...resolution.droppedGrantValues],
        };
      }),

    // Stage 3: individual staff identity via Microsoft Entra ID, alongside
    // (not yet replacing) the shared-password login above — see
    // server/staffIdentityAuth.ts. microsoftSsoStatus lets the client show
    // an honest "not yet configured" state rather than a broken button
    // when STAFF_SSO_* env vars aren't set.
    microsoftSsoStatus: publicProcedure.query(() => ({ configured: isMicrosoftSsoConfigured() })),

    microsoftLoginUrl: publicProcedure.mutation(async () => {
      return buildMicrosoftSignInRequest();
    }),

    microsoftCallback: publicProcedure
      .input(z.object({ code: z.string().min(1), state: z.string().min(1) }))
      .mutation(async ({ input }) => {
        try {
          const token = await completeMicrosoftSignInFromCallback(input.code, input.state);
          return { success: true as const, token };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Microsoft sign-in failed.";
          return { success: false as const, error: message };
        }
      }),
  }),

  // The WSA AI Workforce platform: read-only visibility of the controlled
  // worker estate and the deterministic receptionist/router. Every
  // procedure resolves a staff session server-side (resolveStaffSession —
  // Entra individual identity or the legacy shared-password path, always
  // structurally distinguished) before doing anything. Nothing here can
  // change a worker's status, permissions or scope — the registry is a
  // server-only constant (server/workforce/registry.ts), sourced from
  // controlled WSA SharePoint evidence, not from anything a staff member
  // or the client can submit.
  workforce: router({
    listWorkers: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const session = await resolveStaffSession(input.token);
        return {
          session: {
            authMethod: session.authMethod,
            displayName: session.authMethod === "entra_sso" ? session.displayName : null,
          },
          workers: listWorkers().map(w => ({
            id: w.id,
            canonicalName: w.canonicalName,
            roleTitle: w.roleTitle,
            specificationVersion: w.specificationVersion,
            specificationStatus: w.specificationStatus,
            staffPortalExecutionStatus: w.staffPortalExecutionStatus,
            currentNextControl: w.currentNextControl,
            materialBlockers: w.materialBlockers,
            personality: w.personality,
            connectorIntent: w.connectorIntent,
            canOpenForLiveExecution: evaluateStaffPortalExecutionPermission(w.id).allowed,
          })),
        };
      }),

    route: publicProcedure
      .input(z.object({ token: z.string(), request: z.string().min(1).max(500) }))
      .query(async ({ input }) => {
        const session = await resolveStaffSession(input.token);
        const result = routeStaffRequest(input.request);
        // Routing is a meaningful action, so it is audited with the
        // resolved principal — but deliberately WITHOUT the request's free
        // text, which staff may phrase around a named student. Only the
        // routing outcome is recorded (data minimisation per the QA
        // Records Access & Data Minimisation Standard).
        const auditedWorkerId = result.responsibleWorkerId ?? "staff_receptionist";
        recordAuditEvent({
          staffUserId: session.staffUserId,
          authMethod: session.authMethod,
          workerId: auditedWorkerId,
          workerSpecificationVersion: getWorker(auditedWorkerId).specificationVersion,
          requestedCapability: "receptionist:route",
          permissionDecision: "allowed",
          permissionReason: result.matched
            ? `Routed to ${result.responsibleWorkerName} (${result.availability}).`
            : "No worker matched; escalated to the authorised human process.",
          success: true,
          errorCategory: "none",
        });
        return result;
      }),

    /**
     * The WSA Communications area: where WSA is publicly present, and what
     * this particular staff member may do with each channel.
     *
     * Every channel is a verified WSA-owned account transcribed from
     * primary evidence (server/communications/channels.ts) — nothing is
     * inferred from a platform's existence or a plausible handle.
     *
     * Read-only and side-effect free. It returns a description of
     * capability, never a capability: nothing downstream reads this
     * response back as authority, and every real action would re-resolve
     * the profile server-side. The permission decision is made here rather
     * than in the client, so a hidden button is not what stops anyone.
     */
    communications: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const session = await resolveStaffSession(input.token);
        const staffUserId = session.authMethod === "entra_sso" ? session.staffUserId : null;
        const resolution = await resolveStaffAccessProfile(staffUserId);
        const view = buildCommunicationsView(resolution.resolved ? resolution.profile : null);
        return {
          ...view,
          // Stated plainly so a staff member understands why they are
          // seeing a reduced view, rather than meeting silent refusals.
          identityResolved: resolution.resolved,
          identityNote: resolution.resolved
            ? null
            : "You are signed in without an individual identity, so only WSA's public channels are shown and no action can be authorised. Sign in with your Microsoft account for the full view.",
        };
      }),
  }),

  interviewCoach: router({
    // Applicant tool, since 27 Aug 2026: requires a valid, currently-active
    // Student Portal session token (requireActivePortalIdentity above) —
    // any active account qualifies, linked to a Pipedrive record or not,
    // and no particular pipeline stage is required. No separate
    // registration path exists for this: the only way to get a portal
    // account is still the genuine /contact application (application =
    // registration, unchanged).
    startSession: publicProcedure
      .input(
        z.object({
          token: z.string(),
          interviewType: z.enum(["cas", "ukvi", "university", "course"]),
          courseOrSubject: z.string().max(200).optional(),
          count: z.number().int().min(3).max(8).default(5),
          ...turnstileField,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await requireActivePortalIdentity(input.token);
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
          token: z.string(),
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
        await requireActivePortalIdentity(input.token);
        await requireTurnstile(input.turnstileToken, ctx.req.ip);
        const assessment = await assessAnswer(input);
        return { success: true as const, assessment };
      }),

    // Pure aggregation, no LLM call — averages the final score from every
    // substantive answer in the session and applies the 85% threshold that
    // gates progression to a live mock interview with a WSA Student Counsellor.
    //
    // Identity comes only from the verified portal token — no client-typed
    // email is accepted at all, closing the "arbitrary email decides whose
    // session this is" gap flagged in the data-flow audit.
    //
    // Persistence is the deliberately minimal model from the design report:
    // one row (portalUserId, mode, score, pass/fail, completion date) in
    // interview_coach_sessions — never the answer transcript, and never a
    // Pipedrive write of any kind. This never creates or touches a
    // Pipedrive Person/Lead/Deal, so repeated practice can never produce
    // duplicate admissions activity.
    //
    // Emails the results to a fixed, smaller list (Tim, Eldah, Tom — see
    // interviewCoachNotifyEmails in env.ts) on every completed session, not
    // just passes — except the one WSA demo/test portal account
    // (DEMO_PORTAL_EMAIL above), which never reaches a real applicant so
    // the notification would be noise, not signal. Deliberately a single
    // hardcoded literal, not a "contains demo/test" or name-based check: a
    // genuine applicant can no longer suppress their own notification by
    // choosing what they type — there is nothing left to type, identity is
    // the verified account they signed in with.
    finishSession: publicProcedure
      .input(
        z.object({
          token: z.string(),
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
        const identity = await requireActivePortalIdentity(input.token);
        await requireTurnstile(input.turnstileToken, ctx.req.ip);
        const scores = input.results.map(r => r.score);
        const summary = summariseSession(scores);

        recordInterviewCoachSession({
          portalUserId: identity.portalUserId,
          interviewType: input.interviewType,
          averageScore: summary.averageScore,
          passed: summary.passed,
        }).catch(err => console.error("[Database] Failed to persist Interview Coach session:", err));

        if (identity.email.toLowerCase() !== DEMO_PORTAL_EMAIL) {
          notifyInterviewCoachResult({
            title: `Interview Coach completed: ${identity.email} - ${TYPE_LABELS[input.interviewType]}`,
            content: [
              `Email: ${identity.email}`,
              `Interview Type: ${TYPE_LABELS[input.interviewType]}`,
              input.courseOrSubject ? `Course/Subject: ${input.courseOrSubject}` : "",
              `Average Score: ${summary.averageScore}%`,
              `Result: ${summary.passed ? "PASSED — ready for live mock interview" : "Below pass mark (85%)"}`,
              ``,
              `Per-question scores:`,
              ...input.results.map((r, i) => `${i + 1}. [${r.score}%] ${r.question}`),
            ].filter(Boolean).join("\n"),
          }).catch(err => console.error("[Notification] Failed to send Interview Coach result email:", err));
        }

        return { success: true as const, summary };
      }),
  }),
});

export type AppRouter = typeof appRouter;
