/**
 * Resolution first.
 *
 * Tom Arrington, 11 September 2026: the Staff Portal must not behave like
 * an AI that looks for a reason not to answer. It behaves like a capable
 * member of staff who tries to work the problem out. For an information
 * question that no specialist owns, that means: check the authorised WSA
 * sources before saying anything is unavailable; answer what the evidence
 * proves; say plainly where coverage starts and stops; name the real data
 * gap when the structure prevents an answer; record the gap as the right
 * kind of gap and pass it to the named human owner; and never dump
 * governance on the person who asked.
 *
 * WHAT IT NEVER DOES. It never reads with a credential the signed-in staff
 * member's own permissions would not justify: the request is evaluated
 * against their access profile first, and a company-wide figure needs
 * organisation case scope. It never uses the website contact form's
 * Pipedrive token. It never invents a number, a date or a source. It never
 * creates a worker or widens a remit; if this log fills with these
 * questions, that is evidence for Tom's separate decision on a dedicated
 * Management Information specialist.
 */
import { evaluateAccess, type FunctionalScope, type StaffAccessProfile } from "../../access/accessControl";
import { getDb } from "../../db";
import { informationResolutions } from "../../../drizzle/schema";
import { recordAuditEvent, type AuditAuthMethod } from "../audit";
import { ROUTING_MODEL_VERSION } from "../provenance";
import {
  assessChannelCoverage,
  countByChannel,
  countIn,
  gatherEvidence,
  selectRecords,
  type EvidenceRecord,
  type MiReader,
} from "./evidence";
import { parseInformationQuestion, type InformationQuestion, type Subject } from "./question";

/** The people a management-information gap is routed to for review. Named in the 5 September 2026 handover. */
export const MI_HUMAN_OWNER = "Tim Hunt or Tom Arrington";

export type GapType =
  | "none"
  | "router_defect"
  | "workforce_remit_gap"
  | "connector_gap"
  | "data_quality_gap"
  | "reporting_gap"
  | "permission_gap"
  | "out_of_scope";

export type ResolutionOutcome =
  | "answered"
  | "partial"
  | "unavailable"
  | "permission_denied"
  | "connector_unavailable"
  | "not_information";

export interface InformationResolution {
  outcome: ResolutionOutcome;
  gapType: GapType;
  /** The staff-facing answer. Reads like a colleague who looked into it. */
  answer: string;
  coverage: { from: string; to: string; reliableFrom: string | null } | null;
  sourcesChecked: string[];
  /** True when the authorised sources were actually queried before any "unavailable". */
  evidenceAttempted: boolean;
  humanOwner: string | null;
  recorded: boolean;
  question: InformationQuestion | null;
}

export interface ResolveDeps {
  reader?: MiReader;
  isReaderConfigured?: () => boolean;
  now?: Date;
  /** Injected in tests; defaults to the information_resolutions table. */
  record?: (row: ResolutionRecord) => Promise<boolean>;
}

export interface ResolutionRecord {
  requestText: string;
  staffUserId: number | null;
  authMethod: AuditAuthMethod;
  measure: string | null;
  subject: string | null;
  outcome: ResolutionOutcome;
  gapType: GapType;
  coverageFrom: Date | null;
  coverageTo: Date | null;
  reliableFrom: Date | null;
  sourcesChecked: string;
  humanOwner: string | null;
  answerText: string;
  routerVersion: string;
}

export interface ResolveInput {
  requestText: string;
  staffUserId: number | null;
  authMethod: AuditAuthMethod;
  /** Null when the session has no individual identity. Fails closed. */
  profile: StaffAccessProfile | null;
}

/** Which staff functional scope a subject sits in. Fail closed on anything unmapped. */
export function scopeForSubject(subject: Subject): FunctionalScope {
  switch (subject) {
    case "leads":
    case "enquiries":
    case "referrals":
      return "enquiry_triage";
    case "students":
      return "discovery";
    case "applications":
      return "admissions";
  }
}

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtMonth = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

function subjectNoun(q: InformationQuestion, n: number): string {
  const channel = q.channel === "website" ? "website " : q.channel === "referral" ? "referred " : q.channel === "partner" ? "partner-referred " : "";
  const cold = q.status === "cold" ? "that went cold " : "";
  const base = q.subject === "referrals" ? "referral" : q.subject.replace(/s$/, "");
  const noun = n === 1 ? base : q.subject === "referrals" ? "referrals" : q.subject;
  const country = q.country ? ` from ${q.country}` : "";
  return `${channel}${noun}${country} ${cold}`.trim();
}

async function defaultRecord(row: ResolutionRecord): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    await db.insert(informationResolutions).values(row);
    return true;
  } catch (error) {
    console.warn("[Information resolutions] Write failed; the question was still answered:", error);
    return false;
  }
}

function defaultReaderConfigured(): boolean {
  // Without an injected reader there is nothing to read with; the route
  // endpoint always injects the live OAuth-backed reader and its own check.
  return false;
}

export async function resolveInformationQuestion(input: ResolveInput, deps: ResolveDeps = {}): Promise<InformationResolution> {
  const now = deps.now ?? new Date();
  const record = deps.record ?? defaultRecord;
  const q = parseInformationQuestion(input.requestText, now);
  if (!q) {
    return { outcome: "not_information", gapType: "none", answer: "", coverage: null, sourcesChecked: [], evidenceAttempted: false, humanOwner: null, recorded: false, question: null };
  }

  const finish = async (partial: Omit<InformationResolution, "question" | "recorded">): Promise<InformationResolution> => {
    const recorded = await record({
      requestText: input.requestText,
      staffUserId: input.staffUserId,
      authMethod: input.authMethod,
      measure: q.measure,
      subject: q.subject,
      outcome: partial.outcome,
      gapType: partial.gapType,
      coverageFrom: partial.coverage ? new Date(partial.coverage.from) : null,
      coverageTo: partial.coverage ? new Date(partial.coverage.to) : null,
      reliableFrom: partial.coverage?.reliableFrom ? new Date(partial.coverage.reliableFrom) : null,
      sourcesChecked: partial.sourcesChecked.join(","),
      humanOwner: partial.humanOwner,
      answerText: partial.answer,
      routerVersion: ROUTING_MODEL_VERSION,
    });
    recordAuditEvent({
      staffUserId: input.staffUserId ?? undefined,
      authMethod: input.authMethod,
      workerId: "staff_receptionist",
      workerSpecificationVersion: ROUTING_MODEL_VERSION,
      requestedCapability: "reception:information",
      permissionDecision: partial.outcome === "permission_denied" ? "denied" : "allowed",
      permissionReason: `Management information: ${partial.outcome}; gap ${partial.gapType}; sources ${partial.sourcesChecked.join(", ") || "none"}.`,
      success: partial.outcome === "answered" || partial.outcome === "partial",
      errorCategory: partial.outcome === "connector_unavailable" ? "connector_error" : "none",
    } as never);
    return { ...partial, recorded, question: q };
  };

  // 1. The staff member's own authorisation. A company-wide figure is
  //    organisation-scope business information in the subject's area.
  if (!input.profile) {
    return finish({
      outcome: "permission_denied", gapType: "permission_gap",
      answer: "I can only pull company figures for a signed-in member of staff. Sign in with your WSA Microsoft account and ask again.",
      coverage: null, sourcesChecked: [], evidenceAttempted: false, humanOwner: null,
    });
  }
  const scope = scopeForSubject(q.subject);
  const access = evaluateAccess(input.profile, { action: "read", functionalScope: scope }, now);
  if (!access.allowed || input.profile.caseScope !== "organisation") {
    return finish({
      outcome: "permission_denied", gapType: "permission_gap",
      answer: `That is a company-wide figure and your access is scoped more narrowly, so I cannot pull it for you. I have passed the question to ${MI_HUMAN_OWNER}.`,
      coverage: null, sourcesChecked: [], evidenceAttempted: false, humanOwner: MI_HUMAN_OWNER,
    });
  }

  // 2. Is the read path there at all?
  const configured = (deps.isReaderConfigured ?? defaultReaderConfigured)();
  if (!configured || !deps.reader) {
    return finish({
      outcome: "connector_unavailable", gapType: "connector_gap",
      answer: `I tried to check the CRM but the WSA Pipedrive connection for the workforce is not authorised yet, so I cannot pull the figure. I have recorded it for ${MI_HUMAN_OWNER}; once the connection is live, ask me again and I will run it.`,
      coverage: null, sourcesChecked: [], evidenceAttempted: false, humanOwner: MI_HUMAN_OWNER,
    });
  }

  // 3. Look, then speak.
  const evidence = await gatherEvidence(deps.reader);
  const pool = selectRecords(evidence.records, q);
  const base = {
    sourcesChecked: evidence.sourcesChecked,
    evidenceAttempted: true,
  };
  const assumed = q.period.assumed ? ` I have taken that as ${q.period.label}, ${fmt(q.period.from)} to ${fmt(q.period.to)}.` : "";
  const notes = evidence.notes.length ? ` ${evidence.notes.join(" ")}` : "";

  if (q.measure === "ranking") {
    const by = countByChannel(pool, q);
    const known = by.website + by.referral + by.partner;
    const total = known + by.unknown;
    if (total === 0) {
      return finish({ ...base, outcome: "unavailable", gapType: "reporting_gap", coverage: cov(q, null), humanOwner: MI_HUMAN_OWNER,
        answer: `I checked Pipedrive. There are no ${q.subject} recorded in ${q.period.label}, so there is nothing to rank.${assumed} If that seems wrong, the records may be somewhere I cannot see; I have noted it for ${MI_HUMAN_OWNER}.` });
    }
    const ranked = (["website", "referral", "partner"] as const).map(c => [c, by[c]] as const).sort((a, b) => b[1] - a[1]);
    const lead = ranked[0];
    const unknownShare = Math.round((by.unknown / total) * 100);
    const gap: GapType = unknownShare > 20 ? "data_quality_gap" : "none";
    const outcome = gap === "none" ? "answered" : "partial";
    return finish({ ...base, outcome, gapType: gap, coverage: cov(q, null), humanOwner: gap === "none" ? null : MI_HUMAN_OWNER,
      answer:
        `I checked Pipedrive for ${q.period.label}.${assumed} Of ${total} ${q.subject}, the biggest recorded source is ${lead[0]} with ${lead[1]}` +
        (ranked[1][1] > 0 ? `, then ${ranked[1][0]} with ${ranked[1][1]}` : "") +
        (ranked[2][1] > 0 ? ` and ${ranked[2][0]} with ${ranked[2][1]}` : "") +
        `.` +
        (by.unknown > 0 ? ` ${by.unknown} (${unknownShare}%) have no source recorded, so the ranking is only as good as that allows.` : "") +
        (gap !== "none" ? ` I have recorded the missing source data as a reporting gap for ${MI_HUMAN_OWNER}.` : "") + notes });
  }

  if (q.measure === "trend") {
    const span = q.period.to.getTime() - q.period.from.getTime();
    const windowMs = q.trendAnchor === "since_new_site" ? 90 * 24 * 3600 * 1000 : Math.floor(span / 2);
    const recentFrom = new Date(q.period.to.getTime() - windowMs);
    const priorFrom = new Date(recentFrom.getTime() - windowMs);
    const recent = countIn(pool, q, recentFrom, q.period.to);
    const prior = countIn(pool, q, priorFrom, recentFrom);
    const coverage = q.channel ? assessChannelCoverage(pool, q, priorFrom, q.period.to) : null;
    const anchorNote = q.trendAnchor === "since_new_site"
      ? ` I do not hold a recorded go-live date for the new site, so I have compared the last 90 days with the 90 days before them; give me the date and I will re-run it exactly.`
      : "";
    const direction = recent > prior ? "up" : recent < prior ? "down" : "level";
    const gap: GapType = coverage && coverage.unknownBeforeReliable > 0 ? "data_quality_gap" : "none";
    return finish({ ...base, outcome: gap === "none" ? "answered" : "partial", gapType: gap, coverage: cov(q, coverage?.reliableFrom ?? null), humanOwner: gap === "none" ? null : MI_HUMAN_OWNER,
      answer:
        `I checked Pipedrive. ${cap(subjectNoun(q, 2))}: ${recent} between ${fmt(recentFrom)} and ${fmt(q.period.to)}, against ${prior} in the ${Math.round(windowMs / 86400000)} days before that, so ${direction}.${anchorNote}` +
        (gap !== "none" ? ` A caution: the source of an enquiry is only reliably recorded from ${coverage!.reliableFrom ? fmtMonth(coverage!.reliableFrom) : "part way through"}, so the earlier figure understates ${q.channel} enquiries. I have recorded that as a reporting gap for ${MI_HUMAN_OWNER}.` : "") + notes });
  }

  // Count.
  if (!q.channel) {
    const n = countIn(pool, q, q.period.from, q.period.to);
    return finish({ ...base, outcome: "answered", gapType: "none", coverage: cov(q, null), humanOwner: null,
      answer: `We had ${n} ${subjectNoun(q, n)} between ${fmt(q.period.from)} and ${fmt(q.period.to)}.${assumed} Source: Pipedrive, checked just now.${notes}` });
  }

  const coverage = assessChannelCoverage(pool, q);
  if (coverage.totalInPeriod === 0) {
    return finish({ ...base, outcome: "unavailable", gapType: "reporting_gap", coverage: cov(q, null), humanOwner: MI_HUMAN_OWNER,
      answer: `I checked Pipedrive. There are no ${q.subject} recorded at all for ${q.period.label}, so I cannot give you a ${q.channel} figure.${assumed} If they should be there, they are being recorded somewhere I cannot see; I have noted it for ${MI_HUMAN_OWNER}.` });
  }
  if (!coverage.reliableFrom) {
    return finish({ ...base, outcome: "unavailable", gapType: "reporting_gap", coverage: cov(q, null), humanOwner: MI_HUMAN_OWNER,
      answer:
        `I checked Pipedrive. It does not currently preserve where an enquiry came from in a way that answers this: ${coverage.unknownInPeriod} of the ${coverage.totalInPeriod} ${q.subject} in ${q.period.label} have no source recorded, so I cannot give you a defensible ${q.channel} figure.${assumed} ` +
        `I have recorded the missing source data as a reporting gap for ${MI_HUMAN_OWNER}.${notes}` });
  }
  const fullCoverage = coverage.unknownBeforeReliable === 0;
  if (fullCoverage) {
    const n = countIn(pool, q, q.period.from, q.period.to);
    return finish({ ...base, outcome: "answered", gapType: "none", coverage: cov(q, coverage.reliableFrom), humanOwner: null,
      answer: `We had ${n} ${subjectNoun(q, n)} between ${fmt(q.period.from)} and ${fmt(q.period.to)}.${assumed} Source: Pipedrive, checked just now.${notes}` });
  }
  const n = countIn(pool, q, coverage.reliableFrom, q.period.to);
  return finish({ ...base, outcome: "partial", gapType: "data_quality_gap", coverage: cov(q, coverage.reliableFrom), humanOwner: MI_HUMAN_OWNER,
    answer:
      `I checked the CRM. I can reliably identify ${subjectNoun(q, 2)} from ${fmtMonth(coverage.reliableFrom)}; before that, most records do not distinguish where an enquiry came from, so I cannot give you a defensible figure for the whole of ${q.period.label}.${assumed} ` +
      `From ${fmt(coverage.reliableFrom)} to ${fmt(q.period.to)} we had ${n}. ` +
      `I have recorded the missing historical source data as a reporting gap for ${MI_HUMAN_OWNER}.${notes}` });
}

function cov(q: InformationQuestion, reliableFrom: Date | null) {
  return { from: q.period.from.toISOString(), to: q.period.to.toISOString(), reliableFrom: reliableFrom ? reliableFrom.toISOString() : null };
}
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

/** Exposed for tests: a reader over fixed records. */
export function readerOver(records: { leads?: Array<Record<string, unknown>>; deals?: Array<Record<string, unknown>>; persons?: Array<Record<string, unknown>> }): MiReader {
  return {
    listLeads: async () => records.leads ?? [],
    listDeals: async () => records.deals ?? [],
    listPersons: async () => records.persons ?? [],
  };
}
export type { EvidenceRecord };
