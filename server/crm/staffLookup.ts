/**
 * The staff-facing student lookup: search Pipedrive by phone, email or name
 * and return the minimum a staff member needs.
 *
 * Tom Arrington scoped this on 8 September 2026 and signed it off on 9
 * September with a per-record ownership filter. On 17 September 2026 he
 * decided otherwise: "open every record to every staff member." Every
 * record the search returns is now projected for any staff member who holds
 * the functional scope. The paragraphs below that describe the ownership
 * filter (steps 4 and "FAIL CLOSED ON OWNERSHIP") record the design that
 * stood from 9 to 17 September and no longer describe the code; they are
 * kept so the change is legible in place. What still stands: an individual
 * sign-in with an active access assignment, the functional scope checked
 * before Pipedrive is called, the seven-field projection, and the audit row
 * against the named staff identity.
 *
 * WHY THIS IS NOT A WORKER. No AI worker is involved, and none gains
 * Pipedrive access here. The Access Matrix has no CRM column and
 * crmScope.ts stays null for all sixteen workers. This is the platform
 * calling Pipedrive under a named staff member's OWN authority, exactly as
 * the public contact form already does. Worker CRM access remains a separate
 * governance decision.
 *
 * THE GAP THIS CLOSES. The permission model isolates students by case
 * scope, and case scope works off a CaseContext of assigned staff ids. A
 * Pipedrive record carries none of those; it carries a Pipedrive owner,
 * which is a different identity space. Built naively, evaluateCaseAccess
 * would have had nothing to bite on and every staff member would have seen
 * every student. So the owner's email is resolved to a staff_users id, and
 * THAT is the CaseContext. The existing permission logic then runs
 * unmodified.
 *
 * THE OWNER MATCH DOES NOT REPLACE THE PERMISSION MODEL. It feeds only the
 * last of the six checks in evaluateAccess. It cannot grant enquiry_triage
 * to somebody who lacks it, cannot raise a level, cannot bypass an overlay.
 * A record whose owner matches the staff member is still refused if any
 * earlier check fails.
 *
 * THE ORDER IS THE SECURITY PROPERTY.
 *   1. Resolve the staff member's profile. No profile, nothing happens.
 *   2. Coarse check: read + enquiry_triage. Refused here means Pipedrive
 *      is never called. A user without the scope makes zero CRM requests.
 *   3. Search. Candidates only.
 *   4. Per candidate: resolve owner -> CaseContext -> evaluateAccess.
 *      Drop what is out of scope WHILE IT IS STILL A RAW RECORD.
 *   5. Project the survivors to seven fields. An out-of-scope record never
 *      becomes a CrmLookupResult in any form.
 *   6. Audit against the named staff identity, allowed or denied.
 *
 * FAIL CLOSED ON OWNERSHIP. An owner that is unset, or whose email matches
 * no staff account, yields an empty assignedStaffUserIds. Anyone below
 * organisation scope is then denied that record. Tom chose exact email
 * matching over a manual owner map, and asked that it fail closed rather
 * than guess.
 *
 * Dependencies are injected so every one of these properties is provable
 * in a test without a database or a live Pipedrive.
 */
import { evaluateAccess, type FunctionalScope } from "../access/accessControl";
import type { ProfileResolution } from "../access/identity";
import type { AuditEvent, AuditAuthMethod } from "../workforce/audit";

export type LookupBy = "phone" | "email" | "name";

/** The functional scope that gates this lookup. Tom's decision of 9 September 2026. */
export const LOOKUP_SCOPE: FunctionalScope = "enquiry_triage";

/**
 * What leaves the server. Exactly these seven fields, approved by Tom on
 * 9 September 2026. Nothing about notes, money, documents, activity, custom
 * fields, address, date of birth, nationality, passport or visa, and never
 * the owner's id or email, only their display name. None of the excluded
 * fields appears, so this needs no sensitive overlay.
 */
export interface CrmLookupResult {
  personId: number;
  name: string;
  email: string | null;
  phone: string | null;
  counsellor: string | null;
  stageLabel: string;
  lastUpdated: string;
}

export interface CrmLookupResponse {
  refused: false;
  results: CrmLookupResult[];
  /**
   * Always 0 since 17 September 2026, when Tom Arrington opened every
   * student record to every staff member. Kept so callers need not change.
   */
  withheldCount: number;
  searchedBy: LookupBy;
}

export interface CrmLookupRefusal {
  refused: true;
  reason: string;
}

/** A raw Pipedrive record before filtering. Never returned to a browser. */
export interface CrmCandidate {
  personId: number;
  name: string;
  email: string | null;
  phone: string | null;
  /** Pipedrive owner's email, for resolution to a staff account. Not projected. */
  ownerEmail: string | null;
  ownerName: string | null;
  stageLabel: string;
  updateTime: string;
}

export interface LookupDeps {
  resolveProfile: (staffUserId: number | null) => Promise<ProfileResolution>;
  /** Candidates only. Called ONLY after the coarse permission check passes. */
  search: (term: string, by: LookupBy) => Promise<CrmCandidate[]>;
  /**
   * Pipedrive owner email -> staff_users.id. Not consulted by the lookup
   * since 17 September 2026; accepted so existing dependency bundles keep working.
   */
  resolveOwner?: (ownerEmail: string | null) => Promise<number | null>;
  audit: (event: Omit<AuditEvent, "timestamp">) => void;
  now?: Date;
}

export interface LookupRequest {
  staffUserId: number | null;
  authMethod: AuditAuthMethod;
  term: string;
  by: LookupBy;
  /**
   * The functional scope the staff member must hold for this lookup.
   * Defaults to LOOKUP_SCOPE (Find a student, Tom's decision of 9 September
   * 2026). A worker conversation passes that worker's own functional scope
   * instead: the member has already been checked for it to open the worker,
   * and the student they name is identified under that same authority. Case
   * scope is applied identically either way.
   */
  scope?: FunctionalScope;
}

/** The platform acting for a signed-in staff member. No worker is involved. */
export const LOOKUP_ACTOR = "staff_portal" as const;
export const LOOKUP_VERSION = "crm_lookup_v1";

function project(c: CrmCandidate): CrmLookupResult {
  return {
    personId: c.personId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    counsellor: c.ownerName,
    stageLabel: c.stageLabel,
    lastUpdated: c.updateTime,
  };
}

export async function lookupStudents(
  request: LookupRequest,
  deps: LookupDeps,
): Promise<CrmLookupResponse | CrmLookupRefusal> {
  const now = deps.now ?? new Date();
  const term = request.term.trim();

  const baseAudit = {
    staffUserId: request.staffUserId,
    authMethod: request.authMethod,
    workerId: LOOKUP_ACTOR,
    workerSpecificationVersion: LOOKUP_VERSION,
    requestedCapability: "crm:lookup",
    connector: "pipedrive" as const,
    connectorOperation: "search" as const,
  };

  const refuse = (reason: string): CrmLookupRefusal => {
    deps.audit({
      ...baseAudit,
      permissionDecision: "denied",
      permissionReason: `searchedBy=${request.by}. ${reason}`,
      success: false,
      errorCategory: "permission_denied",
    });
    return { refused: true, reason };
  };

  if (term === "") return refuse("Nothing to search for.");

  // 1. Who is asking. A shared-password session has no individual identity
  //    and so no case scope; it resolves to no profile and stops here.
  const resolution = await deps.resolveProfile(request.staffUserId);
  if (!resolution.resolved) {
    return refuse("This lookup needs an individual staff sign-in with an active access assignment.");
  }
  const profile = resolution.profile;

  // 2. Coarse gate, before any CRM call. Refused here means Pipedrive is
  //    never contacted for this request.
  const scope = request.scope ?? LOOKUP_SCOPE;
  const coarse = evaluateAccess(profile, { action: "read", functionalScope: scope }, now);
  if (!coarse.allowed) return refuse(coarse.reason);

  // 3. The search. Every record it returns is projected. Tom Arrington,
  //    17 September 2026: "open every record to every staff member." The
  //    per-record ownership filter that stood from 9 to 17 September (the
  //    Pipedrive owner resolved to a staff account and used as the case
  //    context, failing closed on an unset or unknown owner) no longer
  //    runs. The individual sign-in and the functional scope above still do.
  const candidates = await deps.search(term, request.by);

  // 4. Projection to the seven approved fields, and nothing else.
  const results = candidates.map(project);
  const withheldCount = 0;

  // 5. The fact of the lookup, against the named staff identity. The search
  //    term is a phone number, an address or a name and is deliberately not
  //    logged; the matched ids and the count are what an incident review needs.
  deps.audit({
    ...baseAudit,
    permissionDecision: "allowed",
    permissionReason: `searchedBy=${request.by}; scope=${scope}. ${results.length} returned; all records open to staff (17 September 2026).`,
    success: true,
    errorCategory: "none",
    targetResourceId: results.map(r => `person:${r.personId}`).join(",") || undefined,
  });

  return { refused: false, results, withheldCount, searchedBy: request.by };
}
