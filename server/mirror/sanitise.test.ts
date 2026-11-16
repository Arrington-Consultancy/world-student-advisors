import { describe, it, expect } from "vitest";
import { leadRow, dealRow, personRow, ownerNameMap, toCsv, parseCsv, LEAD_COLUMNS, DEAL_COLUMNS, PERSON_COLUMNS, NEVER_MIRRORED } from "./sanitise";
import { CRM_FIELDS } from "../workforce/mi/evidence";

/** A raw person carrying everything Tom excluded. None of it may survive. */
const RAW_PERSON = {
  id: 501, name: "Test Student", first_name: "Test", last_name: "Student", add_time: "2026-01-05 10:00:00",
  email: [{ value: "student@example.com", primary: true }], phone: [{ value: "+447700900123", primary: true }],
  owner_id: { id: 25629968, name: "Tim Hunt", email: "tim.hunt@worldstudentadvisors.com" },
  e356695ee8528b30890e38e5f0875afb6644d61c: "P1234567", birthday: "2001-01-01", notes: "private medical note",
  postal_address: "1 Example Street", im: [{ value: "skypeid" }],
  [CRM_FIELDS.personReferredBy]: "Partner College X", [CRM_FIELDS.personSourceOwner]: "Agent Y",
  [CRM_FIELDS.personCountryOfResidence]: "Nigeria", [CRM_FIELDS.personNationality]: "Nigerian",
};
const RAW_LEAD = { id: "lead-1", title: "Test Student lead", add_time: "2026-02-01 09:00:00", update_time: "2026-02-02 09:00:00", is_archived: false, source_name: "Web forms", owner_id: 25629968, person_id: 501, cc_email: "x@pipedrivemail.com", [CRM_FIELDS.leadUtmSource]: "google" };
const RAW_DEAL = { id: 900, title: "Test Student deal", add_time: "2026-03-01 09:00:00", update_time: "2026-03-05 09:00:00", status: "open", stage_id: 21, pipeline_id: 3, user_id: { id: 25633444, name: "Eldah Therone", email: "eldah@worldstudentadvisors.com" }, person_id: { value: 501, name: "Test Student" }, person_name: "Test Student", org_name: "Some Org", lost_reason: "free text about the student", [CRM_FIELDS.dealApplicationDate1]: "2026-03-10" };
const owners = ownerNameMap([{ id: 25629968, name: "Tim Hunt", email: "tim.hunt@worldstudentadvisors.com" }, { id: 25633444, name: "Eldah Therone", email: "eldah@worldstudentadvisors.com" }]);

const SENSITIVE_VALUES = ["Test Student", "student@example.com", "+447700900123", "P1234567", "2001-01-01", "private medical note", "1 Example Street", "skypeid", "x@pipedrivemail.com", "Some Org", "free text about the student", "tim.hunt@worldstudentadvisors.com", "eldah@worldstudentadvisors.com"];

describe("mirror rows are built from an allowlist", () => {
  it("a person row carries only the approved reporting columns and none of the excluded values", () => {
    const row = personRow(RAW_PERSON, owners);
    expect(Object.keys(row)).toEqual([...PERSON_COLUMNS]);
    const text = JSON.stringify(row);
    for (const v of SENSITIVE_VALUES) expect(text).not.toContain(v);
    expect(row.owner).toBe("Tim Hunt");
    expect(row.referred_by).toBe("Partner College X");
    expect(row.nationality).toBe("Nigerian");
  });
  it("a lead row and a deal row likewise", () => {
    const lead = leadRow(RAW_LEAD, owners);
    const deal = dealRow(RAW_DEAL, owners);
    expect(Object.keys(lead)).toEqual([...LEAD_COLUMNS]);
    expect(Object.keys(deal)).toEqual([...DEAL_COLUMNS]);
    for (const v of SENSITIVE_VALUES) { expect(JSON.stringify(lead)).not.toContain(v); expect(JSON.stringify(deal)).not.toContain(v); }
    expect(lead.status).toBe("open");
    expect(lead.utm_source).toBe("google");
    expect(deal.owner).toBe("Eldah Therone");
    expect(deal.person_id).toBe("501");
    expect(deal.application_date_1).toBe("2026-03-10");
    expect(deal.stage_label).not.toBe("");
  });
  it("no allowlisted column is named after an excluded key", () => {
    for (const c of [...LEAD_COLUMNS, ...DEAL_COLUMNS, ...PERSON_COLUMNS]) expect(NEVER_MIRRORED as readonly string[]).not.toContain(c);
    expect(NEVER_MIRRORED).toContain("e356695ee8528b30890e38e5f0875afb6644d61c");
    for (const k of ["name", "email", "phone", "birthday", "notes"]) expect(NEVER_MIRRORED).toContain(k);
  });
});

describe("CSV", () => {
  it("round-trips quoting and commas and guards spreadsheet formulas", () => {
    const rows = [{ a: 'has "quotes", and, commas', b: "=SUM(A1)" }, { a: "plain", b: "" }];
    const csv = toCsv(["a", "b"], rows);
    expect(csv.split("\n")[0]).toBe("a,b");
    expect(csv).toContain("'=SUM(A1)");
    const back = parseCsv(csv);
    expect(back).toEqual([{ a: 'has "quotes", and, commas', b: "=SUM(A1)" }, { a: "plain", b: "" }]);
  });
});
