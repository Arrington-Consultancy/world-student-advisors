/**
 * Evidence for a management-information question, from the records WSA
 * actually holds.
 *
 * Reads only. Uses the workforce read-only Pipedrive credential, never the
 * website contact form's token, through the same GET-only reader the
 * worker connector uses. Nothing here is invented: every number is a count
 * over records that were retrieved, and every record's channel is taken
 * from a field that was actually populated, with the evidence named.
 *
 * Coverage is part of the answer. A count is only defensible over the
 * period for which the field it depends on was reliably recorded. This
 * module computes that period rather than assuming the whole history is
 * clean, because Tom's own example was exactly the case where it is not.
 */
import type { Channel, InformationQuestion } from "./question";

/** Pipedrive custom-field keys, from the schema inventoried in production on 11 September 2026. */
export const CRM_FIELDS = Object.freeze({
  leadUtmSource: "13bf265fcef8764f0651e20dff1f9e396f1b6499",
  personReferredBy: "a08cf6343f3d302fdf15306c24d01e004ab47724",
  personSourceOwner: "53cb3275d869ebba9f3c350bcc2c03cebe4b5977",
  personCountryOfResidence: "ebad876a224a8854ced5b40ea3fd41852e864a3a",
  personNationality: "266a5abd49db981b98afac3ee06c92f499622602",
  dealApplicationDate1: "b0339770af83990456128c2e2cff8776ac7a4ee0",
});

/** What the resolver needs from Pipedrive. Injected, so tests use records not a network. */
export interface MiReader {
  listLeads(): Promise<Array<Record<string, unknown>>>;
  listDeals(): Promise<Array<Record<string, unknown>>>;
  listPersons(): Promise<Array<Record<string, unknown>>>;
}

export type ChannelEvidence = "web_form_source" | "utm_source" | "api_created" | "referred_by" | "source_owner" | "none";

export interface EvidenceRecord {
  kind: "lead" | "deal";
  id: string;
  createdAt: Date;
  channel: Channel | "unknown";
  channelEvidence: ChannelEvidence;
  country: string | null;
  cold: boolean;
  stageId: number | null;
  hasApplicationDate: boolean;
  applicationDate: Date | null;
}

function toDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v.replace(" ", "T") + (v.endsWith("Z") || v.includes("T") ? "" : "Z"));
  return Number.isNaN(d.getTime()) ? null : d;
}
function personIdOf(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "value" in v && typeof (v as { value: unknown }).value === "number") return (v as { value: number }).value;
  return null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * Which channel a record came through, and on what evidence.
 *
 * Website: the lead came from a Pipedrive web form, carries a UTM source, or
 * was created through the API, which in WSA's estate is the website sign-up
 * integration (server/pipedrive.ts). The API reading is an inference about
 * the estate and is labelled as such in the coverage note.
 * Referral: the person's "Referred By" field is populated.
 * Partner: the person's "Source Owner" names a partner or agent.
 */
export function classifyChannel(
  lead: Record<string, unknown> | null,
  person: Record<string, unknown> | null,
): { channel: Channel | "unknown"; evidence: ChannelEvidence } {
  const sourceName = str(lead?.source_name)?.toLowerCase() ?? null;
  if (sourceName && /web ?form/.test(sourceName)) return { channel: "website", evidence: "web_form_source" };
  if (str(lead?.[CRM_FIELDS.leadUtmSource])) return { channel: "website", evidence: "utm_source" };
  const owner = str(person?.[CRM_FIELDS.personSourceOwner])?.toLowerCase() ?? "";
  if (/partner|agent|agency/.test(owner)) return { channel: "partner", evidence: "source_owner" };
  if (str(person?.[CRM_FIELDS.personReferredBy])) return { channel: "referral", evidence: "referred_by" };
  if (sourceName === "api") return { channel: "website", evidence: "api_created" };
  return { channel: "unknown", evidence: "none" };
}

export interface GatheredEvidence {
  records: EvidenceRecord[];
  sourcesChecked: string[];
  /** Assumptions the answer must state. */
  notes: string[];
}

export async function gatherEvidence(reader: MiReader): Promise<GatheredEvidence> {
  const [leads, deals, persons] = await Promise.all([reader.listLeads(), reader.listDeals(), reader.listPersons()]);
  const personById = new Map<number, Record<string, unknown>>();
  for (const p of persons) if (typeof p.id === "number") personById.set(p.id, p);

  const records: EvidenceRecord[] = [];
  const notes: string[] = [];
  let apiInferred = 0;

  for (const lead of leads) {
    const createdAt = toDate(lead.add_time);
    if (!createdAt) continue;
    const person = personById.get(personIdOf(lead.person_id) ?? -1) ?? null;
    const c = classifyChannel(lead, person);
    if (c.evidence === "api_created") apiInferred += 1;
    records.push({
      kind: "lead",
      id: String(lead.id),
      createdAt,
      channel: c.channel,
      channelEvidence: c.evidence,
      country: str(person?.[CRM_FIELDS.personCountryOfResidence]) ?? str(person?.[CRM_FIELDS.personNationality]),
      cold: lead.is_archived === true,
      stageId: null,
      hasApplicationDate: false,
      applicationDate: null,
    });
  }
  for (const deal of deals) {
    const createdAt = toDate(deal.add_time);
    if (!createdAt) continue;
    const person = personById.get(personIdOf(deal.person_id) ?? -1) ?? null;
    const c = classifyChannel(null, person);
    const appDate = toDate(deal[CRM_FIELDS.dealApplicationDate1]);
    records.push({
      kind: "deal",
      id: String(deal.id),
      createdAt,
      channel: c.channel,
      channelEvidence: c.evidence,
      country: str(person?.[CRM_FIELDS.personCountryOfResidence]) ?? str(person?.[CRM_FIELDS.personNationality]),
      cold: deal.status === "lost",
      stageId: typeof deal.stage_id === "number" ? deal.stage_id : null,
      hasApplicationDate: appDate !== null,
      applicationDate: appDate,
    });
  }
  if (apiInferred > 0) {
    notes.push(`${apiInferred} lead(s) are counted as website because they were created through the API, which is how the website sign-up form writes to the CRM.`);
  }
  return {
    records,
    sourcesChecked: ["Pipedrive leads", "Pipedrive deals", "Pipedrive persons"],
    notes,
  };
}

/** The records a question is about, before period and coverage. */
export function selectRecords(records: readonly EvidenceRecord[], q: InformationQuestion): EvidenceRecord[] {
  let pool: EvidenceRecord[];
  switch (q.subject) {
    case "leads":
    case "enquiries":
    case "referrals":
      pool = records.filter(r => r.kind === "lead");
      break;
    case "students":
      pool = records.filter(r => r.kind === "deal");
      break;
    case "applications":
      pool = records.filter(r => r.kind === "deal" && r.hasApplicationDate);
      break;
  }
  if (q.country) {
    const c = q.country.toLowerCase();
    pool = pool.filter(r => (r.country ?? "").toLowerCase().includes(c));
  }
  if (q.status === "cold") pool = pool.filter(r => r.cold);
  return pool;
}

function dateOf(r: EvidenceRecord, q: InformationQuestion): Date {
  return q.subject === "applications" && r.applicationDate ? r.applicationDate : r.createdAt;
}
function inPeriod(d: Date, from: Date, to: Date): boolean {
  return d.getTime() >= from.getTime() && d.getTime() < to.getTime();
}
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface Coverage {
  /** Earliest month from which the channel field is reliably populated, or null when never. */
  reliableFrom: Date | null;
  /** Records in the period whose channel is unknown. */
  unknownInPeriod: number;
  totalInPeriod: number;
  /**
   * Unknown-channel records dated before reliableFrom. Zero means the
   * reliable run covers every record there is, so a count over the whole
   * period is defensible even if the earliest month with records is later
   * than the period start: months with no records are not a data gap.
   */
  unknownBeforeReliable: number;
}

/**
 * From which month can a channel-filtered count be defended?
 *
 * A month is reliable when at least 80% of its records carry a known
 * channel. reliableFrom is the earliest month after which every later month
 * with records is reliable. Months with no records do not break the run.
 */
export function assessChannelCoverage(pool: readonly EvidenceRecord[], q: InformationQuestion, from: Date = q.period.from, to: Date = q.period.to): Coverage {
  const inRange = pool.filter(r => inPeriod(dateOf(r, q), from, to));
  const byMonth = new Map<string, { total: number; known: number; first: Date }>();
  for (const r of inRange) {
    const d = dateOf(r, q);
    const k = monthKey(d);
    const m = byMonth.get(k) ?? { total: 0, known: 0, first: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) };
    m.total += 1;
    if (r.channel !== "unknown") m.known += 1;
    byMonth.set(k, m);
  }
  const months = Array.from(byMonth.values()).sort((a, b) => a.first.getTime() - b.first.getTime());
  let reliableFrom: Date | null = null;
  for (let i = months.length - 1; i >= 0; i--) {
    const m = months[i];
    if (m.known / m.total >= 0.8) reliableFrom = m.first;
    else break;
  }
  return {
    reliableFrom,
    unknownInPeriod: inRange.filter(r => r.channel === "unknown").length,
    totalInPeriod: inRange.length,
    unknownBeforeReliable: reliableFrom
      ? inRange.filter(r => r.channel === "unknown" && dateOf(r, q).getTime() < reliableFrom!.getTime()).length
      : inRange.filter(r => r.channel === "unknown").length,
  };
}

export function countIn(pool: readonly EvidenceRecord[], q: InformationQuestion, from: Date, to: Date): number {
  return pool.filter(r => inPeriod(dateOf(r, q), from, to) && (q.channel === null || r.channel === q.channel)).length;
}

export function countByChannel(pool: readonly EvidenceRecord[], q: InformationQuestion): Record<Channel | "unknown", number> {
  const out: Record<Channel | "unknown", number> = { website: 0, referral: 0, partner: 0, unknown: 0 };
  for (const r of pool) if (inPeriod(dateOf(r, q), q.period.from, q.period.to)) out[r.channel] += 1;
  return out;
}
