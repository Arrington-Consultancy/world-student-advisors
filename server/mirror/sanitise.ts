/**
 * What the reporting mirror may contain, decided here and nowhere else.
 *
 * Tom Arrington, 11 September 2026: record id, created date, lead or
 * enquiry source, status or stage, country and nationality where
 * appropriate, owner or counsellor, referral or partner source, and the
 * approved reporting custom fields. Exclude names, email addresses, phone
 * numbers, passport data and notes unless separately approved.
 *
 * Rows are BUILT from an allowlist, never filtered from the raw record, so
 * a new Pipedrive field can never leak in by default. A test feeds a raw
 * person carrying a passport number, birthday, email, phone and notes
 * through these builders and asserts none of it survives.
 */
import { CRM_FIELDS } from "../workforce/mi/evidence";
import { resolveStageDisplay } from "../portal-stages";

/** Raw keys that must never appear in any mirror column, whatever else changes. */
export const NEVER_MIRRORED = Object.freeze([
  "name", "first_name", "last_name", "email", "phone", "im", "birthday", "notes", "address", "postal_address",
  "e356695ee8528b30890e38e5f0875afb6644d61c", // Passport number
  "title", "lost_reason", "picture_id", "cc_email", "org_name", "person_name", "owner_name",
] as const);

export const LEAD_COLUMNS = Object.freeze(["id", "created_at", "updated_at", "status", "source_name", "utm_source", "owner", "person_id"] as const);
export const DEAL_COLUMNS = Object.freeze(["id", "created_at", "updated_at", "status", "stage_id", "stage_label", "stage_position", "pipeline_id", "owner", "person_id", "application_date_1", "won_time", "lost_time"] as const);
export const PERSON_COLUMNS = Object.freeze(["id", "created_at", "owner", "referred_by", "source_owner", "country_of_residence", "nationality"] as const);

export type Row = Record<string, string>;

const str = (v: unknown): string => (v === null || v === undefined ? "" : typeof v === "object" ? "" : String(v));
const idOf = (v: unknown): string => {
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object") {
    const o = v as { id?: unknown; value?: unknown };
    if (typeof o.id === "number") return String(o.id);
    if (typeof o.value === "number") return String(o.value);
  }
  return "";
};

export function ownerNameMap(users: Array<Record<string, unknown>>): Map<string, string> {
  const m = new Map<string, string>();
  for (const u of users) if (typeof u.id === "number" && typeof u.name === "string") m.set(String(u.id), u.name);
  return m;
}
const owner = (v: unknown, owners: Map<string, string>): string => owners.get(idOf(v)) ?? (idOf(v) ? `user ${idOf(v)}` : "");

export function leadRow(lead: Record<string, unknown>, owners: Map<string, string>): Row {
  return {
    id: str(lead.id),
    created_at: str(lead.add_time),
    updated_at: str(lead.update_time),
    status: lead.is_archived === true ? "archived" : "open",
    source_name: str(lead.source_name),
    utm_source: str(lead[CRM_FIELDS.leadUtmSource]),
    owner: owner(lead.owner_id, owners),
    person_id: idOf(lead.person_id),
  };
}

export function dealRow(deal: Record<string, unknown>, owners: Map<string, string>): Row {
  const stageId = typeof deal.stage_id === "number" ? deal.stage_id : null;
  const stage = stageId === null ? null : resolveStageDisplay(stageId);
  return {
    id: str(deal.id),
    created_at: str(deal.add_time),
    updated_at: str(deal.update_time),
    status: str(deal.status),
    stage_id: stageId === null ? "" : String(stageId),
    stage_label: stage?.label ?? "",
    stage_position: stage?.position === undefined || stage.position === null ? "" : String(stage.position),
    pipeline_id: str(deal.pipeline_id),
    owner: owner(deal.user_id, owners),
    person_id: idOf(deal.person_id),
    application_date_1: str(deal[CRM_FIELDS.dealApplicationDate1]),
    won_time: str(deal.won_time),
    lost_time: str(deal.lost_time),
  };
}

export function personRow(person: Record<string, unknown>, owners: Map<string, string>): Row {
  return {
    id: str(person.id),
    created_at: str(person.add_time),
    owner: owner(person.owner_id, owners),
    referred_by: str(person[CRM_FIELDS.personReferredBy]),
    source_owner: str(person[CRM_FIELDS.personSourceOwner]),
    country_of_residence: str(person[CRM_FIELDS.personCountryOfResidence]),
    nationality: str(person[CRM_FIELDS.personNationality]),
  };
}

// ── CSV ─────────────────────────────────────────────────────────────────
function cell(v: string): string {
  // Formula-injection safe for anyone opening the file in a spreadsheet.
  const guarded = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}
export function toCsv(columns: readonly string[], rows: Row[]): string {
  const lines = [columns.join(",")];
  for (const r of rows) lines.push(columns.map(c => cell(r[c] ?? "")).join(","));
  return lines.join("\n") + "\n";
}
export function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i += 1; } else quoted = false; }
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  if (!header) return [];
  return body.filter(r => r.some(v => v !== "")).map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").replace(/^'(?=[=+\-@])/, "")])));
}
