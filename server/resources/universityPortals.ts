/**
 * University application portals, in one place.
 *
 * Tim Hunt asked for this on 11 September 2026: every university's student
 * application portal in one place, with the instructions for using it
 * alongside. Tom's framing was "we will create the place and where the links
 * for the instructions will be", so this is the place and the slot, and the
 * links themselves are supplied rather than found.
 *
 * WHY IT IS ITS OWN RECORD RATHER THAN A FIELD ON PARTNER INSTITUTIONS.
 * They answer different questions. A partner record answers "do we have a
 * relationship with this institution", which is commercial. This answers
 * "where do I go to submit and track an application, and how do I use it",
 * which is operational and is what a counsellor needs open on a second
 * screen all day. A university can appear here without being a partner, and
 * a partner can have no portal at all, so folding one into the other would
 * force a false statement in one direction or the other.
 *
 * WHY THIS STARTS EMPTY, AND WHY THAT IS THE CORRECT STATE.
 * A portal URL is the single most dangerous thing on this screen to guess.
 * A counsellor will click it while a student waits, and a plausible but
 * wrong address either dead-ends or, worse, reaches something that is not
 * the university's portal at all. A guessed link is indistinguishable from
 * a supplied one once it is rendered. So no university is listed, no URL is
 * constructed, and the screen says who is supplying the list.
 *
 * NOTHING CREDENTIAL-SHAPED BELONGS HERE, and there is no field that could
 * hold one. Staff asked for links. A link is safe on a screen many people
 * can open; a shared portal login is not. See PORTAL_AREA_MUST_NOT_HOLD,
 * which exists so the prohibition is testable rather than only written down.
 */

import type { ResourceProvenance } from "./controlledResources";

/**
 * One university and the two links a counsellor actually needs.
 *
 * Both links are optional and default to absent, because "we have not been
 * given this yet" is a real state and a guessed URL is not. Absent renders
 * as "not supplied yet", never as a dead link.
 */
export interface UniversityPortal {
  /** The institution's name as WSA refers to it. */
  university: string;
  /**
   * Where a counsellor submits or tracks a student application. The
   * institution's own portal, never a search result, a login wall
   * screenshot, or a shortened link whose destination cannot be read.
   */
  applicationPortal?: string;
  /**
   * WSA's own instructions for using that portal. This is the slot Tom
   * asked for. It points at the controlled document or Drive location that
   * explains the steps, so the portal link and the how-to never drift into
   * separate places that disagree.
   */
  instructions?: string;
  /** ISO date the links above were last confirmed to work. */
  lastChecked?: string;
  /** Anything a counsellor needs to know before clicking, e.g. a regional variant. */
  note?: string;
}

/**
 * Empty until Tim supplies the list.
 *
 * Deliberately frozen and deliberately empty. See the header: a guessed
 * portal URL is the one thing here that causes immediate harm in front of a
 * student.
 */
export const UNIVERSITY_PORTALS: readonly UniversityPortal[] = Object.freeze([]);

export const UNIVERSITY_PORTAL_PROVENANCE: ResourceProvenance = Object.freeze({
  suppliedBy: "Tim Hunt",
  awaiting:
    "The list of universities, their student application portal links, and the WSA instructions for each. " +
    "Nothing is shown because no list has been supplied, and no university name or portal URL has been " +
    "added from any other source.",
  openQuestions: Object.freeze([
    "Whether the instructions link points at a SharePoint document, a Drive folder or a page in this portal.",
    "Who re-checks the portal links, since university portals move and rebrand.",
    "Whether universities WSA has no partnership with still belong on this list.",
  ]),
});

/**
 * Named so the prohibition is testable rather than only written in a
 * comment. A test asserts no field on UniversityPortal could hold any of
 * these, so the question cannot arise later by accident.
 */
export const PORTAL_AREA_MUST_NOT_HOLD: readonly string[] = Object.freeze([
  "password",
  "passcode",
  "PIN",
  "MFA or two-factor method",
  "recovery code",
  "security question or answer",
  "shared login",
  "username",
  "API key or token",
]);

/**
 * How a supplied record must look before it goes on the screen.
 *
 * Pure, so the rule can be tested without rendering anything. A record with
 * a name and nothing else is legitimate and renders as "not supplied yet".
 * A record with a link that is not a plain https address is not: that is
 * either a mistake or something pretending to be a link, and both should
 * stop here rather than reach a counsellor.
 */
export type PortalRefusalCode =
  | "university_missing"
  | "link_not_https"
  | "link_not_absolute";

export interface PortalCheck {
  usable: boolean;
  code?: PortalRefusalCode;
  reason?: string;
}

function checkLink(value: string | undefined, field: string): PortalCheck | null {
  if (value === undefined) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      usable: false,
      code: "link_not_absolute",
      reason: `${field} is not a full web address. A counsellor clicks this while a student waits.`,
    };
  }
  // http, javascript:, data: and mailto: all parse. Only https reaches staff.
  if (parsed.protocol !== "https:") {
    return {
      usable: false,
      code: "link_not_https",
      reason: `${field} must be an https address. Found "${parsed.protocol}".`,
    };
  }
  return null;
}

export function checkUniversityPortal(record: UniversityPortal): PortalCheck {
  if (record.university.trim() === "") {
    return {
      usable: false,
      code: "university_missing",
      reason: "A portal record with no university name is a link with nothing to attach it to.",
    };
  }
  return (
    checkLink(record.applicationPortal, "The application portal link") ??
    checkLink(record.instructions, "The instructions link") ?? { usable: true }
  );
}

/** Only records that pass the check are ever rendered. */
export function usablePortals(records: readonly UniversityPortal[]): readonly UniversityPortal[] {
  return records.filter(r => checkUniversityPortal(r).usable);
}
