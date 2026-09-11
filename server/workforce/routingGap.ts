/**
 * The Routing Gap Log writer and reader.
 *
 * Tom, 11 September 2026: whenever Reception cannot confidently route a
 * genuine staff request, or routes it only to discover that no approved
 * worker owns the requested outcome, record the gap. Do not silently
 * discard failed requests.
 *
 * WHAT GETS WRITTEN AND WHY. The exact original wording, because a
 * paraphrase would record something nobody said. The signed-in identity,
 * because a gap that only one person hits and a gap the whole team hits
 * are different problems. The interpreted intent and the candidates
 * considered, because "the router thought this was X and considered Y and
 * Z" is what a reviewer needs to decide whether the router or the remit
 * was wrong. The failure type, because the seven types have seven
 * different fixes. And the router version, so that a row written before a
 * correction and a row written after it can be told apart.
 *
 * WHAT THIS MODULE REFUSES TO DO. It never reads rows back into routing.
 * A correction from a staff member is recorded as evidence of a possible
 * router defect; it does not teach the router a new remit, because a remit
 * is a governance decision and the person typing "Wrong specialist?" is
 * not making one. Repeated gaps are reviewed by a person.
 *
 * DATA MINIMISATION. caseReference is validated to identifier shape before
 * it is written. Nothing else about a case is accepted.
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { routingGapLog } from "../../drizzle/schema";
import type { RoutingResult } from "./router";
import { getWorker } from "./registry";
import type { WorkerId } from "./types";
import type { RoutingFailureType } from "./remitRouter";
import type { AuditAuthMethod } from "./audit";

/** Why the gap is being written: the router failed, or a person corrected it. */
export type GapTrigger =
  | { kind: "route_failed" }
  | { kind: "staff_corrected"; correctedWorkerId: WorkerId }
  | { kind: "staff_says_owned"; correctedWorkerId: WorkerId | null };

export interface GapContext {
  staffUserId: number | null;
  authMethod: AuditAuthMethod;
  caseReference?: string | null;
}

const CASE_REFERENCE = /^[A-Za-z0-9._:-]{1,60}$/;

/**
 * A reference is an identifier. Anything that does not look like one is
 * dropped rather than stored, because the alternative is a free-text field
 * that quietly becomes a second copy of the case.
 */
export function acceptableCaseReference(value: string | null | undefined): string | null {
  if (!value) return null;
  return CASE_REFERENCE.test(value) ? value : null;
}

/** Should this routing result be logged as a gap at all? */
export function isGap(result: RoutingResult): boolean {
  if (!result.matched) return true;
  if (result.availability !== "available") return true;
  // A low-confidence match is not a failure, but it is worth a row: it is
  // the router saying "keyword overlap only", which is exactly the case a
  // reviewer would want to see if a staff member later corrects it.
  return result.confidence === "low";
}

/**
 * Record a gap. Best-effort, never throws, never blocks the caller.
 * Returns the new row id where the write succeeded, for the client to
 * attach a later correction to.
 */
export async function recordRoutingGap(
  requestText: string,
  result: RoutingResult,
  context: GapContext,
  trigger: GapTrigger = { kind: "route_failed" },
): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const failureType: RoutingFailureType =
      trigger.kind === "route_failed"
        ? (result.failure ?? (result.availability !== "available" ? "remit_but_worker_inactive" : "no_recognised_intent"))
        : "router_misclassification_corrected";

    const failureReason =
      trigger.kind === "route_failed"
        ? result.status
        : trigger.kind === "staff_corrected"
          ? `Staff member said the specialist should have been ${getWorker(trigger.correctedWorkerId).canonicalName}. ` +
            `Router had said: ${result.status}`
          : `Staff member said a worker does own this. Router had said: ${result.status}`;

    const [inserted] = await db.insert(routingGapLog).values({
      requestText,
      staffUserId: context.staffUserId,
      authMethod: context.authMethod,
      caseReference: acceptableCaseReference(context.caseReference),
      interpretedIntent: result.outcome,
      candidateWorkerIds: result.candidates.join(","),
      confidence: result.confidence,
      failureType,
      failureReason,
      originalWorkerId: result.responsibleWorkerId ?? null,
      correctedWorkerId: trigger.kind === "route_failed" ? null : trigger.correctedWorkerId,
      staffNextAction: trigger.kind === "route_failed" ? null : trigger.kind,
      routerVersion: result.modelVersion,
    }).$returningId();
    return inserted?.id ?? null;
  } catch (error) {
    console.warn("[Routing gap log] Write failed; the request was still answered:", error);
    return null;
  }
}

/** Where a staff member went after a gap, when the portal could see it. */
export async function recordStaffNextAction(gapId: number, action: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(routingGapLog).set({ staffNextAction: action.slice(0, 40) }).where(eq(routingGapLog.id, gapId));
  } catch {
    // Observational only.
  }
}

export type ReviewOutcome = "router_defect" | "worker_or_access_defect" | "out_of_scope" | "governance_proposal";

export async function recordReview(gapId: number, outcome: ReviewOutcome): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    await db.update(routingGapLog).set({ reviewOutcome: outcome, reviewedAt: new Date() }).where(eq(routingGapLog.id, gapId));
    return true;
  } catch {
    return false;
  }
}

export interface GapGroup {
  interpretedIntent: string | null;
  failureType: RoutingFailureType;
  count: number;
  /** Distinct router versions the gap has been seen under. Same gap after a fix is the point of this. */
  routerVersions: string[];
  latestAt: Date;
  unreviewed: number;
  examples: { id: number; requestText: string; originalWorkerId: string | null; correctedWorkerId: string | null; routerVersion: string; createdAt: Date }[];
}

/**
 * Recurring gaps grouped by what people were trying to get and why it
 * failed. Patterns, not individual logs.
 */
export async function reviewGaps(limitPerGroup = 5): Promise<GapGroup[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select().from(routingGapLog).orderBy(desc(routingGapLog.createdAt)).limit(2000);
  const groups = new Map<string, GapGroup>();

  for (const row of rows) {
    const key = `${row.interpretedIntent ?? "(none)"}|${row.failureType}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        interpretedIntent: row.interpretedIntent,
        failureType: row.failureType as RoutingFailureType,
        count: 0,
        routerVersions: [],
        latestAt: row.createdAt,
        unreviewed: 0,
        examples: [],
      };
      groups.set(key, group);
    }
    group.count += 1;
    if (!group.routerVersions.includes(row.routerVersion)) group.routerVersions.push(row.routerVersion);
    if (row.createdAt > group.latestAt) group.latestAt = row.createdAt;
    if (!row.reviewOutcome) group.unreviewed += 1;
    if (group.examples.length < limitPerGroup) {
      group.examples.push({
        id: row.id,
        requestText: row.requestText,
        originalWorkerId: row.originalWorkerId,
        correctedWorkerId: row.correctedWorkerId,
        routerVersion: row.routerVersion,
        createdAt: row.createdAt,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

/** Kept so a test can prove the log has no path back into routing. */
export const READS_BACK_INTO_ROUTING = false;
export { and, isNull, sql };
