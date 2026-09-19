/**
 * Who a Speak to Juliet enquiry notifies, read from production's own
 * configuration.
 *
 * Runs inside the production environment variables so it reports what the
 * live service will actually do, not what the source says it should. It
 * sends nothing, creates nothing and reads no student data: it resolves the
 * recipient lists and prints them.
 *
 * Tom Arrington, 19 September 2026: a Speak to Juliet enquiry must notify
 * exactly Juliet, Tim, Glenice and Eldah, and must not notify Manet, Tom or
 * Claudia, while an ordinary enquiry keeps the general list unchanged.
 */
import { ENV } from "../server/_core/env";
import {
  CAMPAIGN_LABELS,
  CAMPAIGN_SLUGS,
  campaignReplacesGeneralNotification,
  isCampaignSlug,
} from "../shared/campaignEnquiry";

const AUTHORISED = [
  "juliet@worldstudentadvisors.com",
  "tim.hunt@worldstudentadvisors.com",
  "glenice@worldstudentadvisors.com",
  "eldah@worldstudentadvisors.com",
];
const MUST_NOT_RECEIVE: Record<string, string> = {
  Manet: "manet@worldstudentadvisors.com",
  Tom: "tom@arringtonconsultancy.com",
  Claudia: "claudia",
};

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures += 1;
};
const norm = (list: string[]) => [...list].map(s => s.toLowerCase().trim()).sort();

console.log("\n=== 1. The general staff list, for an ordinary enquiry ===");
const general = ENV.staffNotifyEmails;
console.log(`  note recipients: ${general.join(", ")}`);
for (const address of [
  "tim.hunt@worldstudentadvisors.com",
  "eldah@worldstudentadvisors.com",
  "sarafina@worldstudentadvisors.com",
  "glenice@worldstudentadvisors.com",
  "manet@worldstudentadvisors.com",
  "tom@arringtonconsultancy.com",
  "pipedrive@worldstudentadvisors.com",
]) {
  check(norm(general).includes(address), `still includes ${address}`);
}

console.log("\n=== 2. Speak to Juliet ===");
const juliet = ENV.campaignNotifyEmails["speak-to-juliet"] ?? [];
console.log(`  note recipients: ${juliet.join(", ")}`);
check(juliet.length === 4, "exactly four recipients", `got ${juliet.length}`);
check(
  JSON.stringify(norm(juliet)) === JSON.stringify(norm(AUTHORISED)),
  "exactly Juliet, Tim, Glenice and Eldah",
);
for (const [person, address] of Object.entries(MUST_NOT_RECEIVE)) {
  check(!juliet.join(" ").toLowerCase().includes(address), `${person} is not notified`);
}
check(
  campaignReplacesGeneralNotification("speak-to-juliet"),
  "replaces the general notification, so no duplicate is sent",
);

console.log("\n=== 3. Nothing else is configured by accident ===");
for (const slug of CAMPAIGN_SLUGS) {
  console.log(`  note ${slug}: ${CAMPAIGN_LABELS[slug]}`);
}
const configured = Object.keys(ENV.campaignNotifyEmails);
check(
  configured.every(isCampaignSlug),
  "every configured campaign is on the closed list",
  configured.join(", "),
);
for (const crafted of ["", "unknown-campaign", "../admin", "SPEAK-TO-JULIET"]) {
  const resolved = ENV.campaignNotifyEmails[crafted] ?? [];
  check(resolved.length === 0, `"${crafted}" resolves no recipients`);
}

console.log("\n=== 4. Mail delivery is configured ===");
check(Boolean(ENV.microsoftSendAsMailbox), "a send-as mailbox is set", ENV.microsoftSendAsMailbox);
check(Boolean(ENV.microsoftTenantId && ENV.microsoftClientId && ENV.microsoftClientSecret), "Graph mail credentials are present");

console.log(`\nRESULT: ${failures === 0 ? "every check passed." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
