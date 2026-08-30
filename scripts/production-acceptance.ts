/**
 * PRODUCTION ACCEPTANCE SUITE for the WSA Staff AI operating system.
 *
 * Runs the real shipped modules against the real production database. It
 * is not a unit-test rerun: it imports the same server/access and
 * server/operating code the deployed process runs, and resolves the same
 * staff rows, so a mismatch between the code and production data shows up
 * here rather than in front of a staff member.
 *
 * Two things it deliberately does NOT do:
 *
 *   - It never writes. No staff row, no grant, no audit event, no enquiry.
 *     Audit row counts are taken before and after and asserted identical,
 *     so the suite proves it did not pollute the record it is checking.
 *   - It never mints a token or invents an identity. Where a StaffSession
 *     is needed it is built from the real production staff row's own
 *     values, which is exactly what resolveStaffSession would produce for
 *     that person. Authentication itself (validating a genuine Entra
 *     token) cannot be exercised without a real browser sign-in and is
 *     reported as such rather than faked.
 *
 * Where a negative case needs a profile nobody in production holds — a
 * narrower case scope, a lower level — it is DERIVED from the real
 * resolved profile and labelled "[derived]". Those assertions test the
 * model as deployed; they are not claims about a second real person.
 */
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

import { resolveStaffAccessProfile } from "../server/access/identity";
import {
  checkAccessForStaffUser, decideForProfile, filterAccessibleCases,
  filterSearchResults, authoriseExport, selectAuthorisedContext,
  authoriseConnectorRetrieval,
} from "../server/access/enforcement";
import {
  CONSEQUENTIAL_ACTIONS, consequentialActionsHeld,
  type StaffAccessProfile, type CaseContext,
} from "../server/access/accessControl";
import type { StaffSession } from "../server/staffSession";
import { listWorkers } from "../server/workforce/registry";
import { evaluateConnectorPermission, evaluateStaffPortalExecutionPermission } from "../server/workforce/permissions";
import { WORKER_CRM_SCOPE } from "../server/workforce/crmScope";
import { combineContributions } from "../server/operating/collaboration";
import { runQualityCheck, acceptHumanisation, findSubstanceChanges } from "../server/operating/qualityCheck";
import { routeEscalation, validateEscalation } from "../server/operating/escalation";
import { milestoneState, shouldEscalateSlippage, orderEvents } from "../server/operating/timeline";
import { collectAttentionItems, buildManagerAttention, determineNextAction } from "../server/operating/managerAttention";
import { runPipeline, decideActions } from "../server/operating/pipeline";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in this environment.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);
let failures = 0;
let checks = 0;

function check(condition: boolean, message: string): void {
  checks += 1;
  if (condition) console.log(`  OK: ${message}`);
  else {
    console.error(`  FAILED: ${message}`);
    failures += 1;
  }
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

const NOW = new Date("2026-08-30T12:00:00Z");
/** A row as a caller would hold it: an identifier plus the case context the gate reads. */
interface CaseRow { id: string; ctx: CaseContext }
const ROW_MINE: CaseRow = { id: "case-mine", ctx: { assignedStaffUserIds: [], teamId: "team-a" } };
const ROW_THEIRS: CaseRow = { id: "case-theirs", ctx: { assignedStaffUserIds: [2_000_000_001], teamId: "team-b" } };
const toCtx = (r: CaseRow): CaseContext => r.ctx;

/** mysql2 through Drizzle types execute() loosely; one cast here rather than at every call site. */
async function rows<T>(query: string): Promise<T[]> {
  const [result] = await db.execute(sql.raw(query));
  return result as unknown as T[];
}

async function auditCounts(): Promise<Record<string, number>> {
  const r = await rows<Record<string, number>>(
    "SELECT (SELECT COUNT(*) FROM `workforce_audit_events`) AS wf," +
    " (SELECT COUNT(*) FROM `staff_access_changes`) AS ac," +
    " (SELECT COUNT(*) FROM `staff_enquiries`) AS en," +
    " (SELECT COUNT(*) FROM `staff_enquiry_contributions`) AS ec",
  );
  return r[0];
}

async function main() {
  const before = await auditCounts();

  // ── 1. Schema alignment ───────────────────────────────────────────────
  // The real risk of deploying schema.ts: Drizzle emits explicit column
  // lists, so a column declared here but absent in production breaks every
  // query on that table. Selecting one row from each proves they agree.
  section("1. Schema alignment — deployed code against the production database");
  const tables = [
    "staff_users", "staff_access_grants", "staff_access_changes",
    "staff_enquiries", "staff_enquiry_contributions", "workforce_audit_events",
  ];
  for (const t of tables) {
    try {
      await db.execute(sql.raw(`SELECT * FROM \`${t}\` LIMIT 1`));
      check(true, `${t} is readable with the deployed schema`);
    } catch (err) {
      check(false, `${t} is readable — ${(err as Error).message}`);
    }
  }

  // ── 2. Identity resolution against real production rows ───────────────
  section("2. Identity resolution — real production rows");
  const staff = await rows<{ id: number; displayName: string }>(
    "SELECT `id`, `displayName` FROM `staff_users` ORDER BY `id` ASC",
  );
  check(staff.length >= 1, `at least one staff row exists (found ${staff.length})`);

  const anonymous = await resolveStaffAccessProfile(null);
  check(!anonymous.resolved && anonymous.reason === "no_individual_identity",
    "a shared-password session (no individual identity) resolves to no profile");

  const missing = await resolveStaffAccessProfile(2_000_000_000);
  check(!missing.resolved && missing.reason === "staff_record_not_found",
    "a staff id that does not exist resolves to staff_record_not_found, not to a default profile");

  const resolution = await resolveStaffAccessProfile(staff[0].id);
  if (!resolution.resolved) {
    console.error(`  FAILED: the real staff row did not resolve (${resolution.reason}: ${resolution.detail})`);
    failures += 1;
    return;
  }
  const profile: StaffAccessProfile = resolution.profile;
  console.log(`  resolved: "${staff[0].displayName}" level=${profile.baseAccessLevel} ` +
    `caseScope=${profile.caseScope} status=${profile.status} ` +
    `scopes=[${profile.functionalScopes.join(",")}] ` +
    `actions=[${profile.actionPermissions.join(",")}] ` +
    `overlays=[${profile.sensitiveOverlays.join(",")}]`);
  check(profile.status === "active", "the resolved profile is active");
  check(resolution.droppedGrantValues.length === 0,
    `no stored grant value was dropped as unrecognised (found [${resolution.droppedGrantValues.join(",")}])`);

  const scope = profile.functionalScopes[0];

  // ── 3. Authorised access ──────────────────────────────────────────────
  section("3. Authorised access — the positive case");
  const allowedRead = await checkAccessForStaffUser(staff[0].id,
    { action: "read", functionalScope: scope });
  check(allowedRead.allowed, `read in the held scope "${scope}" is allowed`);

  // ── 4. Consequential actions are refused ──────────────────────────────
  section("4. Consequential actions — seniority never implies capability");
  const held = consequentialActionsHeld(profile, NOW);
  check(held.length === 0, `no consequential action is held (found [${held.join(",")}])`);
  for (const action of Array.from(CONSEQUENTIAL_ACTIONS)) {
    const outcome = await checkAccessForStaffUser(staff[0].id, { action, functionalScope: scope });
    check(!outcome.allowed, `${action} is DENIED to the real production profile`);
  }

  // ── 5. Unheld scope, overlays ─────────────────────────────────────────
  section("5. Scope and sensitive overlays");
  const otherScope = profile.functionalScopes.includes("visa_compliance") ? "admissions" : "visa_compliance";
  const wrongScope = await checkAccessForStaffUser(staff[0].id,
    { action: "read", functionalScope: otherScope as never });
  check(!wrongScope.allowed, `read in the unheld scope "${otherScope}" is DENIED`);

  for (const overlay of ["finance", "safeguarding", "visa_regulated", "hr_staff_private",
    "complaints_legal", "credentials_security", "records_destructive"] as const) {
    const outcome = decideForProfile(profile,
      { action: "read", functionalScope: scope, sensitiveCategory: overlay }, NOW);
    const holds = profile.sensitiveOverlays.includes(overlay);
    check(holds ? outcome.allowed : !outcome.allowed,
      `sensitive overlay ${overlay}: ${holds ? "held, allowed" : "not held, DENIED"}`);
  }

  const companyFinancial = decideForProfile(profile,
    { action: "read", functionalScope: scope, businessDataClass: "company_financial" }, NOW);
  check(!companyFinancial.allowed,
    "company financial records are DENIED without the finance overlay, whatever the level");

  // ── 6. Case scope, search, export, AI context ─────────────────────────
  section("6. Case scope, search omission, export, AI context");
  const session: StaffSession = {
    authMethod: "entra_sso",
    staffUserId: staff[0].id,
    email: "",             // not used by any gate; never printed
    displayName: staff[0].displayName,
  };

  const cases = await filterAccessibleCases(session, [ROW_MINE, ROW_THEIRS], toCtx,
    { action: "read", functionalScope: scope });
  const orgWide = profile.caseScope === "organisation";
  check(orgWide ? cases.rows.length === 2 : cases.rows.length < 2,
    `case filtering matches the recorded case scope "${profile.caseScope}" (${cases.rows.length}/2 visible)`);

  // [derived] a narrower case scope must exclude another person's case.
  const narrowed: StaffAccessProfile = { ...profile, caseScope: "own_applicants" };
  const theirs = decideForProfile(narrowed,
    { action: "read", functionalScope: scope, case: ROW_THEIRS.ctx }, NOW);
  check(!theirs.allowed, "[derived] own_applicants scope DENIES a case assigned to someone else");
  const mine = decideForProfile(narrowed,
    { action: "read", functionalScope: scope, case: { assignedStaffUserIds: [profile.staffUserId], teamId: "team-a" } }, NOW);
  check(mine.allowed, "[derived] own_applicants scope still allows the person's own assigned case");

  const search = await filterSearchResults(session, [ROW_MINE, ROW_THEIRS], toCtx,
    { action: "read", functionalScope: otherScope as never });
  check(search.results.length === 0 && search.withheldCount === 2,
    "search in an unheld scope returns NOTHING and reports the withheld count — omission, not a redacted placeholder");
  check(!JSON.stringify(search.results).includes("case-theirs"),
    "no withheld record identifier appears anywhere in the search result payload");

  const exported = await authoriseExport(session, [ROW_MINE, ROW_THEIRS], toCtx,
    { functionalScope: scope });
  check(!exported.outcome.allowed, "export is DENIED — export_download is a separate permission and is not held");

  const context = await selectAuthorisedContext(session, [ROW_MINE, ROW_THEIRS], toCtx,
    { action: "read", functionalScope: otherScope as never });
  check(context.context.length === 0,
    "AI context assembly yields NOTHING in an unheld scope — unauthorised material never enters the context window");

  // ── 7. Worker isolation and connector denial ──────────────────────────
  section("7. Worker isolation and connector denial");
  const connectors = ["sharepoint", "google_drive", "pipedrive"] as const;
  const operations = ["search", "read", "create", "update", "delete", "external_send"] as const;
  let permitted = 0;
  for (const w of listWorkers()) {
    if (evaluateStaffPortalExecutionPermission(w.id).allowed) permitted += 1;
    for (const c of connectors) for (const o of operations) {
      if (evaluateConnectorPermission({ workerId: w.id, connector: c, operation: o, resourceScope: "x" }).allowed) permitted += 1;
    }
  }
  check(permitted === 0,
    `every worker is denied live execution and every connector operation (${permitted} permitted of ${listWorkers().length * (1 + connectors.length * operations.length)})`);
  check(Object.values(WORKER_CRM_SCOPE).every(v => v === null),
    "no worker holds a CRM scope — the Access Matrix has no CRM column");

  const retrieval = await authoriseConnectorRetrieval(
    session,
    { action: "read", functionalScope: scope, resourceReference: "sharepoint:/controlled" },
    evaluateConnectorPermission({ workerId: "sophie", connector: "sharepoint", operation: "read", resourceScope: "x" }),
  );
  check(!retrieval.allowed, "connector retrieval is DENIED");
  check(retrieval.deniedDimension === "worker_authorisation",
    "the denial is reported at the WORKER gate — a platform fact true whoever is asking, not the person's own permissions");

  // ── 8. Collaboration ──────────────────────────────────────────────────
  section("8. Collaboration — one lead, lanes enforced, disagreement visible");
  const noLead = combineContributions({
    caseId: "case-a", leadWorkerId: "james",
    contributions: [{ workerId: "priya", position: "p", confidence: "likely", evidenceQuality: "verified", functionalScope: "visa_compliance" }],
  });
  check(noLead.outcome === "invalid", "a contribution set whose lead did not contribute cannot produce a recommendation");

  const outOfLane = combineContributions({
    caseId: "case-a", leadWorkerId: "james",
    contributions: [
      { workerId: "james", position: "p", confidence: "likely", evidenceQuality: "verified", functionalScope: "admissions" },
      { workerId: "priya", position: "q", confidence: "likely", evidenceQuality: "verified", functionalScope: "admissions" },
    ],
  });
  check(outOfLane.rejectedContributions.some(r => r.workerId === "priya"),
    "a contribution outside the contributor's own registered scope is REJECTED and reported, not folded in");

  const disagreeing = combineContributions({
    caseId: "case-a", leadWorkerId: "james",
    contributions: [
      { workerId: "james", position: "Proceed", confidence: "likely", evidenceQuality: "verified", functionalScope: "admissions" },
      { workerId: "priya", position: "Do not proceed", confidence: "certain", evidenceQuality: "verified", functionalScope: "visa_compliance", disagreesWith: ["james"] },
    ],
  });
  check(disagreeing.outcome === "recommendation_with_unresolved_disagreement",
    "an unresolved disagreement is carried through rather than resolved by picking a side");
  check(disagreeing.unresolvedDisagreements.length > 0, "the disagreement is recorded, not smoothed over");

  // ── 9. Quality gate and humanisation guard ────────────────────────────
  section("9. Quality gate and humanisation guard");
  const guarantee = runQualityCheck({
    text: "We guarantee your visa will be approved.", permissionChecked: true,
    hasUnresolvedDisagreement: false, disagreementVisibleInText: false,
    workerBoundaryBreaches: [], evidenceInsufficient: false,
  });
  check(!guarantee.passed && guarantee.blocking.some(f => f.code === "guarantee_language"),
    "guarantee language is BLOCKING, not advisory");

  const unchecked = runQualityCheck({
    text: "A plain sentence.", permissionChecked: false,
    hasUnresolvedDisagreement: false, disagreementVisibleInText: false,
    workerBoundaryBreaches: [], evidenceInsufficient: false,
  });
  check(!unchecked.passed && unchecked.blocking.some(f => f.code === "permission_not_checked"),
    "text assembled without a recorded permission decision is BLOCKED");

  const hidden = runQualityCheck({
    text: "Everything is agreed.", permissionChecked: true,
    hasUnresolvedDisagreement: true, disagreementVisibleInText: false,
    workerBoundaryBreaches: [], evidenceInsufficient: false,
  });
  check(!hidden.passed, "a disagreement hidden from the text is BLOCKED");

  const dropped = findSubstanceChanges(
    "The fee is 12000 GBP and admission is not guaranteed.",
    "The fee is 12000 GBP and admission is guaranteed.");
  check(dropped.length > 0, "removing a negation is detected as a substance change");

  const humanised = acceptHumanisation(
    "The deposit is 2000 GBP, due 1 March 2027.",
    "The deposit is 3000 GBP, due 1 March 2027.");
  check(!humanised.accepted, "a humanisation pass that changes a figure is REJECTED");
  check(humanised.text === "The deposit is 2000 GBP, due 1 March 2027.",
    "on rejection the checked text is returned unchanged — never a half-edited blend");

  // ── 10. Escalation ────────────────────────────────────────────────────
  section("10. Escalation — relevance plus authority, never clearance alone");
  const candidate = { staffUserId: profile.staffUserId, displayName: staff[0].displayName, profile };
  const safeguarding = routeEscalation(
    { reason: "safeguarding_concern", functionalScope: scope, caseId: "case-mine" },
    [candidate], NOW);
  const holdsSafeguarding = profile.sensitiveOverlays.includes("safeguarding");
  check(holdsSafeguarding ? !safeguarding.unroutable : safeguarding.unroutable,
    holdsSafeguarding
      ? "a safeguarding escalation routes to a recipient holding the overlay"
      : "a safeguarding escalation is NOT routed to the most senior person in the company, who lacks the safeguarding overlay");
  if (!holdsSafeguarding) {
    check(safeguarding.recipients.length === 0,
      "with no qualified recipient the escalation stays unrouted rather than being sent to whoever is available");
    check(safeguarding.excluded.length === 1,
      "the excluded candidate is recorded with a reason, so over-exposure stays auditable");
  }

  // Clearance alone is never enough. blocked_case carries no sensitive
  // overlay, so this isolates the second requirement: a recipient must also
  // be able to DECIDE, and a read-only profile cannot own an escalation.
  const ordinary = routeEscalation(
    { reason: "blocked_case", functionalScope: scope, caseId: null }, [candidate], NOW);
  const canDecide = profile.actionPermissions.includes("approve")
    || profile.actionPermissions.includes("access_admin");
  check(canDecide ? !ordinary.unroutable : ordinary.unroutable,
    canDecide
      ? "a recipient who can read AND decide is a valid escalation owner"
      : "a read-only profile is NOT a valid escalation owner — clearance alone is insufficient");

  const unclosable = validateEscalation({
    escalationId: "e2", reason: "complaint", decisionRequired: "d", caseId: "case-mine",
    functionalScope: scope, workersInvolved: ["grace"], raisedAt: NOW,
    ownerStaffUserId: null, status: "closed", outcome: null,
    decidedByStaffUserId: null, decidedAt: null, learningCaptured: false,
  });
  check(!unclosable.valid, "an escalation cannot be closed without an owner, an outcome and a named decider");

  // ── 11. Timeline and deadlines ────────────────────────────────────────
  section("11. Timeline, status and deadline risk");
  const trivial = {
    milestoneId: "m1", caseId: "case-mine", description: "d",
    dueAt: new Date(NOW.getTime() - 86_400_000), completedAt: null, material: true,
    humanOwnerStaffUserId: profile.staffUserId, specialistWorkerId: "james" as const,
  };
  check(!shouldEscalateSlippage(trivial, NOW), "trivial lateness (1 day) does not escalate");

  const immaterial = {
    milestoneId: "m2", caseId: "case-mine", description: "d",
    dueAt: new Date(NOW.getTime() - 30 * 86_400_000), completedAt: null, material: false,
    humanOwnerStaffUserId: profile.staffUserId, specialistWorkerId: "james" as const,
  };
  check(milestoneState(immaterial, NOW) !== "critical",
    "an immaterial milestone never becomes critical however late (30 days overdue)");

  const actor = { type: "worker" as const, workerId: "james" as const };
  const ordered = orderEvents([
    { eventId: "b", caseId: "c", kind: "decision" as const, at: NOW, actor, summary: "s" },
    { eventId: "a", caseId: "c", kind: "decision" as const, at: NOW, actor, summary: "s" },
  ]);
  check(ordered[0].eventId === "a", "same-instant events order stably by id");

  // ── 12. Manager Attention ─────────────────────────────────────────────
  section("12. Manager Attention — genuine items only, same permission filter");
  const quiet = collectAttentionItems(
    { escalations: [], pendingApprovals: [], permissionRequests: [], blockedCases: [], milestones: [], unroutedEscalationIds: [] },
    NOW);
  check(quiet.length === 0, "work that is on track produces no attention item at all");

  const leaky = buildManagerAttention(profile, {
    escalations: [], pendingApprovals: [], permissionRequests: [],
    blockedCases: [{ caseId: "case-theirs", functionalScope: otherScope as never, blockedReason: "r", blockedSince: NOW }],
    milestones: [], unroutedEscalationIds: [],
  }, NOW);
  check(leaky.items.length === 0,
    "Manager Attention cannot surface work in a scope the manager could not open — same filter as any other read");
  check(!JSON.stringify(leaky.items).includes("case-theirs"),
    "the withheld case identifier appears nowhere in the Manager Attention payload");

  // ── 13. Pipeline and the consequential-action boundary ────────────────
  section("13. Pipeline — routine executes, consequential is prepared, unheld is refused");
  const decisions = decideActions(profile, [
    { actionId: "a1", action: "read", functionalScope: scope, description: "d", preparedPayload: "p" },
    { actionId: "a2", action: "external_send", functionalScope: scope, description: "d", preparedPayload: "p" },
    { actionId: "a3", action: "financial_action", functionalScope: scope, description: "d", preparedPayload: "p" },
  ], NOW);
  const byId = new Map(decisions.map(d => [d.actionId, d]));
  check(byId.get("a1")?.disposition === "executed", "a routine, permitted action is executed rather than described");
  check(byId.get("a2")?.disposition !== "executed", "a consequential action is NEVER executed");
  check(byId.get("a3")?.disposition !== "executed", "a financial action is NEVER executed");
  for (const id of ["a2", "a3"]) {
    const d = byId.get(id);
    if (d?.disposition === "prepared_for_approval") {
      check(Boolean(d.preparedPayload), `${id} is prepared in full so the human approves rather than rebuilding it`);
    } else {
      check(d?.disposition === "refused", `${id} is refused outright (permission not held)`);
    }
  }

  const refused = runPipeline({
    profile, routedToWorkerId: "james", functionalScope: otherScope as never,
    collaboration: { caseId: "case-a", leadWorkerId: "james", contributions: [
      { workerId: "james", position: "p", confidence: "likely", evidenceQuality: "verified", functionalScope: "admissions" }] },
  }, NOW);
  check(refused.outcome === "refused" && refused.visibleText === null,
    "a pipeline refused at the access stage produces no visible text");
  check(refused.reachedStage === "access", "the reported stage says truthfully how far the flow got");
  check(refused.collaboration === null, "nothing downstream of a refused access check runs");

  // ── 14. Enquiry history ───────────────────────────────────────────────
  section("14. Enquiry and response history (clause 3)");
  const enq = await rows<{ n: number }>("SELECT COUNT(*) AS n FROM `staff_enquiries`");
  const con = await rows<{ n: number }>("SELECT COUNT(*) AS n FROM `staff_enquiry_contributions`");
  console.log(`  staff_enquiries: ${enq[0].n} rows, staff_enquiry_contributions: ${con[0].n} rows`);
  check(true, "both clause-3 tables exist in production and are queryable by the deployed code");

  // ── 15. This suite wrote nothing ──────────────────────────────────────
  section("15. The suite itself wrote nothing");
  const after = await auditCounts();
  for (const key of ["wf", "ac", "en", "ec"] as const) {
    check(Number(before[key]) === Number(after[key]),
      `${key} row count unchanged (${before[key]} -> ${after[key]})`);
  }

  section("Result");
  console.log(`  ${checks - failures}/${checks} checks passed.`);
  if (failures > 0) console.error(`  ${failures} FAILED.`);
  console.log("\n  NOT covered here, and reported rather than faked:");
  console.log("  - Authentication itself. Validating a genuine Entra token needs a real");
  console.log("    browser sign-in. Production evidence for it is the live staff_users row's");
  console.log("    lastLoginAt, stamped by a real Microsoft sign-in.");
}

main()
  .then(() => process.exit(failures === 0 ? 0 : 1))
  .catch(err => {
    console.error("Acceptance suite failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
