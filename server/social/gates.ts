/**
 * NIA-G03 and NIA-G06, reassessed against the two-layer connection model.
 *
 * The correction that matters is in G06. It was being treated as one
 * blocked gate: nothing could proceed until every human administrator of
 * every account had been identified by hand. That conflated two different
 * questions, and holding the technical work hostage to the organisational
 * one was wrong in both directions.
 *
 * Whether a connection may be made is answerable today, per attempt, by
 * two authorities that already exist: WSA's own permission model, and the
 * platform's authorisation flow. Neither needs a list.
 *
 * Whether WSA controls its own presence is a separate question, it is
 * genuinely unresolved, and it does not become resolved by connecting
 * anything. An account can be perfectly connectable and still vanish when
 * one person leaves.
 */

export type GateState = "open" | "partly_resolved" | "blocked";

export interface GateAssessment {
  id: string;
  question: string;
  state: GateState;
  /** What is settled, and on what evidence. */
  resolved: readonly string[];
  /** What is not, and why. */
  outstanding: readonly string[];
  /** What this gate does and does not hold up. */
  blocks: readonly string[];
  doesNotBlock: readonly string[];
}

export const NIA_G03: GateAssessment = Object.freeze({
  id: "NIA-G03",
  question: "Approved analytics and data-access scope and retention for social-platform exports and community insight records.",
  state: "partly_resolved",
  resolved: Object.freeze([
    "The data-access and minimisation half is answerable from evidence WSA has already approved. WSA_QA_Records_Access_Data_Minimisation_Audit_History_Standard_v1.0_APPROVED sets purpose-limited least-privilege access, prohibits shadow copies, and requires aggregation where identification is not needed. Nia's Control Pack §8 already implements the same discipline for community insight.",
    "The connection route is now defined: WSA internal permission plus the platform's own authorisation flow, in server/social/connection.ts.",
  ]),
  outstanding: Object.freeze([
    "No authorised platform connection exists, so no export route exists and no historical range can be established. Available range, fields, retention limits, account-type restrictions and API limits are all properties of a specific authorised connection.",
    "Retention periods remain unset organisation-wide. §9 of the approved QA standard leaves retention, legal hold and disposal as GOV-QA4 Part B, pending UK data-protection, safeguarding and contractual alignment.",
  ]),
  blocks: Object.freeze([
    "Importing any historical social data.",
    "Any claim about what WSA can recall from past social activity.",
  ]),
  doesNotBlock: Object.freeze([
    "Building the connection architecture and its permission checks.",
    "Recording new social activity going forward, once a connection exists.",
  ]),
});

export const NIA_G06: GateAssessment = Object.freeze({
  id: "NIA-G06",
  question: "Definitive platform and account ownership map, including future platform expansion.",
  state: "partly_resolved",
  resolved: Object.freeze([
    "The platform list is evidenced: six WSA accounts identified from primary evidence, with the platforms checked and not found recorded by name.",
    "Technical connection authority no longer depends on a manual administrator list. It is established per attempt by the WSA permission gate plus the platform's own authorisation, which is the authority on who may grant which asset.",
  ]),
  outstanding: Object.freeze([
    "Organisational ownership and continuity: whether each account is business-managed or held on an individual's personal profile, and who can grant or revoke access later.",
    "Recovery and admin dependencies, where they can be recorded without exposing a secret.",
  ]),
  blocks: Object.freeze([
    "Any claim that WSA's organisational continuity risk is understood or resolved.",
    "Relying on WSA retaining access to an account if the person holding it leaves.",
  ]),
  doesNotBlock: Object.freeze([
    "A technical connection by an authenticated staff member who passes the WSA gate and whom the platform confirms is authorised, subject to the existing connector and production approval gates.",
    "Building and testing the connection architecture.",
  ]),
});

export const GATES: readonly GateAssessment[] = Object.freeze([NIA_G03, NIA_G06]);

/**
 * The distinction the reassessment turns on, kept as data so a later
 * change that collapses the two back together has to say so explicitly.
 */
export const AUTHORITY_LAYERS = Object.freeze({
  technicalConnectionAuthority:
    "WSA internal permission, then the external platform's own authorisation. Established per connection attempt, by systems that can answer authoritatively.",
  organisationalContinuityKnowledge:
    "The Social Account Ownership and Administration Map. Established by evidence a person has to gather, and unresolved until they do.",
  neverSubstituted:
    "Neither stands in for the other. Platform administration confers no WSA permission, and WSA permission confers no platform authority.",
});
