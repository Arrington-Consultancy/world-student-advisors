/**
 * The WSA channel register: every external channel WSA genuinely owns,
 * and nothing else.
 *
 * Every entry here is transcribed from primary evidence in this
 * repository — the live public website's own canonical link table
 * (client/src/lib/socialLinks.ts, user-confirmed July 2026), the office
 * contact table on the live Contact page, and the Railway custom-domain
 * configuration. Nothing was inferred from a platform's existence or from
 * a plausible-looking handle.
 *
 * Platforms deliberately ABSENT because no WSA-owned account was found in
 * any controlled record or on the live site: TikTok, X/Twitter, Threads,
 * Pinterest, Snapchat, Google Business Profile, and any newsletter or
 * mailing platform. If WSA owns one of those, it must be verified and
 * added here before the Staff Portal will show it. An unverified handle
 * shown as a WSA channel would be worse than showing nothing: staff would
 * act on it.
 *
 * Nothing in this file grants access to anything. It records where WSA is
 * publicly present. What a staff member may DO with a channel is decided
 * entirely by the access model (server/access) and, where a connector is
 * involved, by the worker gate as well.
 */
import type { FunctionalScope, SensitiveOverlay } from "../access/accessControl";

export type ChannelId =
  | "website"
  | "wsa_email"
  | "linkedin"
  | "facebook_main"
  | "facebook_friendship_society"
  | "instagram"
  | "youtube"
  | "whatsapp"
  | "events_webinars"
  | "student_support_library"
  | "sharepoint"
  | "pipedrive";

export type ChannelKind = "website" | "email" | "social" | "messaging" | "media" | "events" | "system";

/**
 * How the Staff Portal groups a channel.
 *
 * Separate from ChannelKind because the two answer different questions.
 * Kind is what the channel IS; group is where a member of staff would go
 * looking for it. YouTube is a media channel by kind, but somebody after
 * "our social accounts" expects to find it beside Facebook and LinkedIn,
 * so that is where it sits.
 */
export type ChannelGroup =
  /** Public-facing accounts WSA posts to. */
  | "social"
  /** Systems staff log into to do the work. */
  | "system"
  /** WSA's own web surfaces. */
  | "web";

/**
 * How WSA reaches this channel from the Staff Portal today.
 *
 * "external_only" is the honest default and currently the value for every
 * channel: the channel is verified and staff can reach it, but no
 * controlled integration exists. It must never be presented as connected.
 */
export type IntegrationState =
  /** Verified WSA channel, no API integration. Staff open it directly. */
  | "external_only"
  /** An authorised connector exists and is configured and tested. */
  | "connected"
  /** A connector exists in code but its credentials are absent or untested. */
  | "connector_unconfigured"
  /** Integration is technically possible but needs a separate controlled authorisation. */
  | "authorisation_required";

export interface ChannelAction {
  /** The action permission a staff member must hold, from the access model. */
  permission:
    | "read" | "create" | "update" | "delete_destructive"
    | "external_send" | "submit" | "approve" | "access_admin";
  /** Staff-facing label for what this action is, on this channel. */
  label: string;
  /**
   * Whether the platform side of this action is available at all today.
   * False means: even a staff member holding the permission cannot do it
   * here, because no integration exists. Kept separate from the permission
   * so the portal never implies a capability WSA does not have.
   */
  availableToday: boolean;
}

export interface WsaChannel {
  id: ChannelId;
  name: string;
  kind: ChannelKind;
  group: ChannelGroup;
  /** Emoji used as the recognisable icon. Deliberately not a remote asset. */
  icon: string;
  /** The account or destination identity, exactly as WSA holds it. */
  accountIdentity: string;
  /** Where the channel actually lives. Verified, never guessed. */
  externalUrl: string | null;
  integration: IntegrationState;
  /** Which functional scope governs work on this channel. */
  functionalScope: FunctionalScope;
  /**
   * Whether the channel's CONTENT is already public to the whole internet.
   *
   * This decides visibility, and it is deliberately separate from
   * functionalScope, which decides what may be DONE. A WSA LinkedIn page
   * is public: gating the mere knowledge that WSA has one behind the
   * marketing scope would be theatre, and would make the whole area
   * useless to the colleagues it is meant to orient — the requirement is
   * that staff can see where WSA is publicly present without remembering
   * URLs.
   *
   * False means the channel's content is NOT public — a mailbox, a message
   * thread — and its visibility is scope-gated like any other record.
   */
  contentIsPublic: boolean;
  /** Set where the channel's content routinely carries sensitive material. */
  sensitiveOverlay: SensitiveOverlay | null;
  /** The evidence this entry was transcribed from. */
  evidence: string;
  actions: readonly ChannelAction[];
}

/** Every action is unavailable today: no channel has an authorised integration. */
function externalOnlyActions(): ChannelAction[] {
  return [
    { permission: "read", label: "View the channel", availableToday: true },
    { permission: "create", label: "Draft content", availableToday: false },
    { permission: "external_send", label: "Publish or send", availableToday: false },
    { permission: "delete_destructive", label: "Delete content", availableToday: false },
    { permission: "access_admin", label: "Administer the account", availableToday: false },
    { permission: "read", label: "View analytics", availableToday: false },
  ];
}

export const WSA_CHANNELS: readonly WsaChannel[] = Object.freeze([
  {
    id: "website",
    name: "WSA Website",
    kind: "website",
    group: "web",
    icon: "🌐",
    accountIdentity: "worldstudentadvisors.com and 13 further WSA-owned domains",
    externalUrl: "https://www.worldstudentadvisors.com",
    integration: "external_only",
    functionalScope: "marketing_seo",
    contentIsPublic: true,
    sensitiveOverlay: null,
    evidence: "Railway production service custom-domain configuration.",
    actions: externalOnlyActions(),
  },
  {
    id: "wsa_email",
    name: "WSA Email",
    kind: "email",
    group: "system",
    icon: "✉️",
    accountIdentity: "Microsoft 365 tenant: UK head office, Kenya, Nigeria, Ghana and Cameroon office mailboxes",
    externalUrl: null,
    integration: "connector_unconfigured",
    functionalScope: "operations",
    contentIsPublic: false,
    sensitiveOverlay: null,
    evidence: "Office contact table on the live Contact page; MICROSOFT_SEND_AS_MAILBOX configured in the production environment.",
    actions: [
      { permission: "read", label: "View correspondence in permitted scope", availableToday: false },
      { permission: "create", label: "Draft a reply", availableToday: false },
      { permission: "update", label: "Link correspondence to a case", availableToday: false },
      { permission: "external_send", label: "Send externally", availableToday: false },
      { permission: "delete_destructive", label: "Delete a message", availableToday: false },
      { permission: "access_admin", label: "Administer the mailbox", availableToday: false },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    kind: "social",
    group: "social",
    icon: "💼",
    accountIdentity: "World Student Advisors company page",
    externalUrl: "https://www.linkedin.com/company/world-student-advisors/",
    integration: "external_only",
    functionalScope: "marketing_seo",
    contentIsPublic: true,
    sensitiveOverlay: null,
    evidence: "client/src/lib/socialLinks.ts, canonical WSA social links, user-confirmed July 2026.",
    actions: externalOnlyActions(),
  },
  {
    id: "facebook_main",
    name: "Facebook",
    kind: "social",
    group: "social",
    icon: "📘",
    accountIdentity: "World Student Advisors Student Support Centre",
    externalUrl: "https://www.facebook.com/WorldStudentAdvisorsStudentSupportCentre",
    integration: "external_only",
    functionalScope: "marketing_seo",
    contentIsPublic: true,
    sensitiveOverlay: null,
    evidence: "client/src/lib/socialLinks.ts. The share link share/19GkxG3W7U resolves to this page.",
    actions: externalOnlyActions(),
  },
  {
    id: "facebook_friendship_society",
    name: "International Friendship Society",
    kind: "social",
    group: "social",
    icon: "🤝",
    accountIdentity: "International Friendship Society, the WSA alumni network page on Facebook",
    externalUrl: "https://www.facebook.com/share/19KTePKnay/",
    integration: "external_only",
    functionalScope: "pre_arrival_student_success",
    contentIsPublic: true,
    sensitiveOverlay: null,
    evidence: "client/src/lib/socialLinks.ts, recorded there as the alumni network page.",
    actions: externalOnlyActions(),
  },
  {
    id: "instagram",
    name: "Instagram",
    kind: "social",
    group: "social",
    icon: "📸",
    accountIdentity: "@worldstudentadv",
    externalUrl: "https://www.instagram.com/worldstudentadv/",
    integration: "external_only",
    functionalScope: "marketing_seo",
    contentIsPublic: true,
    sensitiveOverlay: null,
    evidence: "client/src/lib/socialLinks.ts.",
    actions: externalOnlyActions(),
  },
  {
    id: "youtube",
    name: "YouTube",
    kind: "media",
    group: "social",
    icon: "▶️",
    accountIdentity: "@WorldStudentAdvisors",
    externalUrl: "https://www.youtube.com/@WorldStudentAdvisors",
    integration: "external_only",
    functionalScope: "marketing_seo",
    contentIsPublic: true,
    sensitiveOverlay: null,
    evidence: "client/src/lib/socialLinks.ts; also the video source for the Events page and the Student Support Library.",
    actions: externalOnlyActions(),
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    kind: "messaging",
    group: "system",
    icon: "💬",
    accountIdentity: "Public WSA contact number, plus per-office numbers on the Contact page",
    externalUrl: "https://wa.me/447914797830",
    integration: "authorisation_required",
    functionalScope: "enquiry_triage",
    contentIsPublic: false,
    sensitiveOverlay: null,
    evidence:
      "client/src/lib/socialLinks.ts and the office contact table. These are consumer wa.me links. " +
      "Whether WSA holds an authorised WhatsApp Business or API route is NOT established, so no messaging integration is assumed.",
    actions: [
      { permission: "read", label: "Open the contact route", availableToday: true },
      { permission: "read", label: "View conversations", availableToday: false },
      { permission: "create", label: "Draft a reply", availableToday: false },
      { permission: "external_send", label: "Send a message", availableToday: false },
    ],
  },
  {
    id: "events_webinars",
    name: "Events and Webinars",
    kind: "events",
    group: "web",
    icon: "🎟️",
    accountIdentity: "WSA website /events, with sessions published through YouTube and WhatsApp",
    externalUrl: "https://www.worldstudentadvisors.com/events",
    integration: "external_only",
    functionalScope: "marketing_seo",
    contentIsPublic: true,
    sensitiveOverlay: null,
    evidence: "client/src/pages/Events.tsx. No third-party webinar platform is referenced anywhere in the site.",
    actions: externalOnlyActions(),
  },
  {
    id: "student_support_library",
    name: "Student Support Library",
    kind: "media",
    group: "web",
    icon: "📚",
    accountIdentity: "WSA website /student-support-library",
    externalUrl: "https://www.worldstudentadvisors.com/student-support-library",
    integration: "external_only",
    functionalScope: "marketing_seo",
    contentIsPublic: true,
    sensitiveOverlay: null,
    evidence: "client/src/pages/StudentSupportLibrary.tsx, the WSA media and resource library.",
    actions: externalOnlyActions(),
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    kind: "system",
    group: "system",
    contentIsPublic: false,
    icon: "🗂️",
    accountIdentity: "WSA SharePoint site: the controlled records library",
    externalUrl: "https://worldstudentadvisors123.sharepoint.com/sites/WSASharePoint",
    integration: "connector_unconfigured",
    functionalScope: "records_control",
    sensitiveOverlay: null,
    evidence:
      "The WSA governance library, verified in use: the Core Operating System, Worker Register, " +
      "Access Matrix and Change Log all live here.",
    actions: [
      { permission: "read", label: "Open SharePoint", availableToday: true },
      { permission: "read", label: "Worker search across records", availableToday: false },
      { permission: "update", label: "Worker record updates", availableToday: false },
      { permission: "delete_destructive", label: "Delete a record", availableToday: false },
    ],
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    kind: "system",
    group: "system",
    contentIsPublic: false,
    icon: "📇",
    accountIdentity: "WSA CRM: student enquiries, leads and counsellor allocation",
    externalUrl: "https://app.pipedrive.com",
    integration: "authorisation_required",
    functionalScope: "enquiry_triage",
    sensitiveOverlay: null,
    evidence:
      "The public sign-up form writes a Person, a Lead and a pinned Note here for every enquiry. " +
      "The Access Matrix has no CRM column, so no worker holds a Pipedrive scope.",
    actions: [
      { permission: "read", label: "Open Pipedrive", availableToday: true },
      { permission: "read", label: "Worker read of student records", availableToday: false },
      { permission: "update", label: "Worker updates to a record", availableToday: false },
    ],
  },
]);

/**
 * Platforms explicitly checked for and NOT found as WSA-owned. Recorded so
 * that "Instagram is missing" is answerable with "no, it is there, and
 * these are the ones that genuinely are not", and so a future reviewer can
 * see the search was done rather than assumed.
 */
export const CHANNELS_CHECKED_AND_NOT_FOUND: readonly string[] = Object.freeze([
  "TikTok", "X (Twitter)", "Threads", "Pinterest", "Snapchat",
  "Google Business Profile", "Newsletter or mailing platform",
  "Third-party webinar platform",
]);

export function getChannel(id: ChannelId): WsaChannel {
  const channel = WSA_CHANNELS.find(c => c.id === id);
  if (!channel) throw new Error(`Unknown WSA channel "${id}".`);
  return channel;
}
