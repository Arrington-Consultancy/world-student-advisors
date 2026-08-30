/**
 * Which functional scope (Access Control Standard §4) each AI worker acts
 * within.
 *
 * This is a transcription, not a judgement: every entry is the worker's own
 * roleTitle from the controlled Worker Register (server/workforce/registry.ts,
 * sourced from WSA SharePoint) matched to the scope of the same name in the
 * standard's §4 list. The two lists were plainly written from each other, so
 * each mapping below quotes the roleTitle it comes from and no worker
 * required an interpretive decision.
 *
 * Its purpose is a single question: when a worker retrieves something on a
 * staff member's behalf, which of that staff member's functional scopes must
 * they hold? A worker cannot answer that for itself — it would be asserting
 * its own authority — so the answer lives here, outside the registry the
 * workers describe and outside anything a request can influence.
 *
 * The map is total over WorkerId, enforced by the type. A worker added
 * without a scope will not compile, rather than silently defaulting to one.
 */
import type { WorkerId } from "../workforce/types";
import type { FunctionalScope } from "./accessControl";

export const WORKER_FUNCTIONAL_SCOPE: Readonly<Record<WorkerId, FunctionalScope>> = Object.freeze({
  /** "AI operating-system governance" */
  wsa_core_brain: "governance",
  /** "Student Enquiry & Triage" */
  sophie: "enquiry_triage",
  /** "Student Discovery" */
  daniel: "discovery",
  /** "Education Research" */
  amelia: "education_research",
  /** "Education Suitability" */
  oliver: "suitability",
  /** "Admissions & Application" */
  james: "admissions",
  /** "Visa & Compliance" */
  priya: "visa_compliance",
  /** "Scholarships & Funding" */
  harper: "scholarships_funding",
  /** "Pre-arrival & Student Success" */
  olivia: "pre_arrival_student_success",
  /** "Quality Assurance & Case Audit" */
  grace: "quality_assurance",
  /** "SEO & Organic Growth" */
  ethan: "marketing_seo",
  /** "SharePoint & Records Control" */
  maya: "records_control",
  /** "Paid Media & Google Ads" */
  alex: "paid_media",
  /** "AI-system governance assurance" */
  wsa_governance_assurance: "governance",
  /** "Front-door routing" — the receptionist routes rather than holding case material. */
  staff_receptionist: "operations",
});

/**
 * §6 — a connector operation is not just "use of a connector"; it is a
 * specific action the staff member must separately hold. Mapping it here
 * rather than at the call site means a new connector operation cannot be
 * introduced without deciding which action permission it consumes.
 */
import type { ConnectorOperation } from "../workforce/types";
import type { ActionPermission } from "./accessControl";

export const CONNECTOR_OPERATION_ACTION: Readonly<Record<ConnectorOperation, ActionPermission>> = Object.freeze({
  search: "read",
  read: "read",
  create: "create",
  update: "update",
  delete: "delete_destructive",
  external_send: "external_send",
});
