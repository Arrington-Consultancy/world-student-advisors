/**
 * Staff Portal resource areas: the structure, without the content.
 *
 * Staff asked on 1 September 2026 for three areas — May intake universities,
 * WSA partner institutions, and templates and training. The content for all
 * three is still to be supplied, and this file is deliberately the shape
 * with nothing in it.
 *
 * WHY EMPTY IS THE CORRECT STATE RATHER THAN A GAP.
 * A resource area about universities, intakes and partner links is only
 * useful if a staff member can act on what it says. An invented university,
 * a guessed course, a plausible-looking intake date or a constructed URL
 * would be indistinguishable from a real one on the screen, and a
 * counsellor would repeat it to a student. Filling these to make the page
 * look finished would make the page actively dangerous, so the registries
 * are empty and the screen says who is supplying each one and that it is
 * not yet available.
 *
 * The shape is real, so the moment content arrives it lands in a record
 * that already carries its own provenance: where it came from and when it
 * was last checked. Core Operating System section 8 requires that of
 * anything that changes regularly, and university intakes change every year.
 */

/** Who supplies a resource area, so an empty area is explained rather than blank. */
export interface ResourceProvenance {
  /** Named supplier, or null where WSA has not yet decided who owns it. */
  suppliedBy: string | null;
  /** What is actually missing, in plain words a staff member can act on. */
  awaiting: string;
  /** Recorded so nobody re-raises a decision that is already open. */
  openQuestions: readonly string[];
}

/* ── May intake universities ─────────────────────────────────────────── */

/**
 * One controlled May-intake record.
 *
 * Every field except the optional note is required, because a partial
 * record is the failure this area exists to prevent: a university name with
 * no intake, or an intake with no source, is a rumour with a logo on it.
 */
export interface MayIntakeRecord {
  university: string;
  /** A named course, or a course group where the intake applies across several. */
  courseOrCourseGroup: string;
  /** The intake itself, e.g. "May". Named rather than assumed. */
  intake: string;
  /** e.g. "2026/27". Intakes move between years, so the year is part of the fact. */
  academicYear: string;
  /** The institution's own published page. Never a search result or a summary. */
  officialSource: string;
  /** ISO date this was last verified against officialSource. */
  lastChecked: string;
  note?: string;
}

export const MAY_INTAKE_RECORDS: readonly MayIntakeRecord[] = Object.freeze([]);

export const MAY_INTAKE_PROVENANCE: ResourceProvenance = Object.freeze({
  suppliedBy: "Eldah",
  awaiting:
    "The list of UK universities and courses with May intakes. Not yet available, so nothing is shown. " +
    "No university, course, intake or date has been added from any other source.",
  openQuestions: Object.freeze([
    "Which academic year the first list covers.",
    "Whether a course group is acceptable where an intake applies across several courses.",
  ]),
});

/* ── WSA partner institutions ────────────────────────────────────────── */

/**
 * One partner institution and the links staff actually use.
 *
 * Every link is optional and defaults to absent, because a partner with no
 * agent portal is a real state and a guessed URL is not. Absent renders as
 * "not supplied", never as a dead link.
 *
 * NOTHING CREDENTIAL-SHAPED BELONGS HERE. No password, no MFA method, no
 * recovery code, no security answer, no shared login. Staff asked for links,
 * and a link is safe to put on a screen that many people can open. A
 * credential is not, and this area has no field that could hold one, so the
 * question cannot arise later by accident.
 */
export interface PartnerInstitution {
  name: string;
  officialWebsite?: string;
  agentPortal?: string;
  undergraduateCourses?: string;
  postgraduateCourses?: string;
  januaryCourses?: string;
  mayCourses?: string;
  /** ISO date the links above were last confirmed to work. */
  lastChecked?: string;
}

export const PARTNER_INSTITUTIONS: readonly PartnerInstitution[] = Object.freeze([]);

export const PARTNER_PROVENANCE: ResourceProvenance = Object.freeze({
  suppliedBy: null,
  awaiting:
    "The list of WSA partner institutions and their links, to be supplied separately. Which institutions " +
    "are partners is a commercial fact WSA holds and this build programme does not, so none is listed and " +
    "no URL has been constructed.",
  openQuestions: Object.freeze([
    "Who confirms an institution is a current WSA partner.",
    "How often the links are re-checked, since agent portals move.",
  ]),
});

/** Named so the prohibition is testable rather than only written in a comment. */
export const PARTNER_AREA_MUST_NOT_HOLD: readonly string[] = Object.freeze([
  "password",
  "passcode",
  "MFA or two-factor method",
  "recovery code",
  "security question or answer",
  "shared login",
  "API key or token",
]);

/* ── Templates and training ──────────────────────────────────────────── */

export type TemplateChannel = "email" | "whatsapp";

export interface MessageTemplate {
  id: string;
  channel: TemplateChannel;
  title: string;
  /** When to reach for this one. */
  useWhen: string;
  body: string;
  /** The controlled record that approved this wording. Never blank. */
  approvedIn: string;
  approvedOn: string;
}

export interface TrainingResource {
  id: string;
  title: string;
  description: string;
  /** Where the resource actually is. Absent means it has not been supplied. */
  link?: string;
  approvedIn: string;
}

/**
 * Empty because no template wording has been approved in a controlled
 * record. A message template is text a staff member sends to a student
 * under WSA's name, so inventing one here would be putting words into the
 * organisation's mouth and calling them approved.
 */
export const MESSAGE_TEMPLATES: readonly MessageTemplate[] = Object.freeze([]);
export const TRAINING_RESOURCES: readonly TrainingResource[] = Object.freeze([]);

export const TEMPLATES_PROVENANCE: ResourceProvenance = Object.freeze({
  suppliedBy: null,
  awaiting:
    "Approved wording for email and WhatsApp templates, and the training resources themselves. Nothing is " +
    "shown because no template text has been approved in a controlled record, and text sent to a student " +
    "under WSA's name cannot be drafted here and called approved.",
  openQuestions: Object.freeze([
    "The Phone call item is undefined: whether it means a script, a checklist or call handling guidance.",
    "The WECCPA training resource has not been supplied, so no link exists to add.",
  ]),
});

/* ── What was deliberately not built ─────────────────────────────────── */

/**
 * Recorded in code, not only in the Change Log, so that anybody reading
 * this file later can see these were decisions rather than omissions.
 */
export const DEFERRED_BY_STAFF_REQUEST: readonly string[] = Object.freeze([
  "Removing Student Loan from the funding question: open pending staff clarification.",
  "Removing Mixed funding from the funding question: open pending staff clarification.",
  "May intake university and course content: awaiting Eldah.",
  "Partner institution list and links: awaiting supply.",
  "The Phone call item: undefined, so not implemented.",
  "WECCPA training podcast or resource: not supplied, so no link invented.",
]);

/** True where an area has nothing to show, so the UI states why rather than rendering an empty table. */
export function isAwaitingContent(records: readonly unknown[]): boolean {
  return records.length === 0;
}
