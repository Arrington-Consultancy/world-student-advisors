/**
 * Canonical option lists for the funding-status follow-up questions on the
 * sign-up form (client/src/pages/Contact.tsx). Shared with
 * server/routers.ts's server-side validation so client and server enforce
 * the exact same set of values.
 */
export const SPONSOR_STATUS_OPTIONS = ["Confirmed", "Applied or requested", "Not yet agreed"] as const;
export const SCHOLARSHIP_STATUS_OPTIONS = ["Awarded", "Applied", "Not yet applied"] as const;
