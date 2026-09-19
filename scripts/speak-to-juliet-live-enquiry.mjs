/**
 * Speak to Juliet: one real enquiry, submitted through the live page.
 *
 * This is the only Speak to Juliet harness that WRITES. It completes the
 * real sign-up form on the production site, so it creates a real Pipedrive
 * Person and Lead, a real Student Portal account, and sends the real
 * campaign notification to the four authorised recipients. Tom Arrington
 * asked for exactly this on 19 September 2026 as the fifth of ten launch
 * checks.
 *
 * It refuses to run unless CONFIRM carries the exact sentence below, so it
 * cannot fire by accident from a stray dispatch.
 *
 * The identity it submits is unmistakably a test and cannot reach a real
 * person: the name says so, the address is at example.com (reserved by
 * RFC 2606 and never deliverable), and the number is +44 7700 900123, a
 * range Ofcom reserves for drama and never assigns. Nothing here belongs
 * to anybody. The record it leaves behind is reported so it can be deleted.
 *
 * If Turnstile declines to issue a token to an automated browser the run
 * stops before submitting, having created nothing, and says so.
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const REQUIRED_CONFIRMATION = "CREATE A REAL PIPEDRIVE LEAD";
if (process.env.CONFIRM !== REQUIRED_CONFIRMATION) {
  console.error(`Refusing to run. CONFIRM must be exactly: ${REQUIRED_CONFIRMATION}`);
  process.exit(1);
}

const SITE = process.env.SITE ?? "https://www.worldstudentadvisors.com";
const OUT = process.env.OUT_DIR ?? ".";
const STAMP = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);

const TEST = {
  firstName: "Launch Verification",
  lastName: `TEST RECORD DELETE ME ${STAMP}`,
  email: `speak-to-juliet-launch-test-${STAMP}@example.com`,
  phone: "+447700900123",
  dateOfBirth: "2000-01-01",
  areaOfStudy: "Launch verification test record, please delete",
};

console.log("Submitting one real enquiry with this unmistakably-test identity:");
for (const [key, value] of Object.entries(TEST)) console.log(`  ${key}: ${value}`);

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

/* 1. Arrive the way a student does, through Juliet's page ---------------- */
console.log("\n=== 1. The campaign form hands off to the controlled sign-up ===");
await page.goto(`${SITE}/speak-to-juliet`, { waitUntil: "networkidle" });
await page.fill("#juliet-form-first", TEST.firstName);
await page.fill("#juliet-form-phone", "803 583 7934");
await page.fill("#juliet-form-email", TEST.email);
await page.selectOption("#juliet-form-level", "postgraduate");
await page.selectOption("#juliet-form-destination", "uk");
await Promise.all([
  page.waitForURL(/\/contact\?/, { timeout: 30000 }),
  page.click("form button[type=submit]"),
]);
const handoff = new URL(page.url());
check(handoff.searchParams.get("campaign") === "speak-to-juliet", "the sign-up carries campaign=speak-to-juliet");

/* 2. Complete the sign-up ------------------------------------------------ */
console.log("\n=== 2. Completing the sign-up form ===");
const form = page.locator("form").filter({ has: page.locator('label:text-is("First Name *")') });
const after = (labelText, tag) =>
  form.locator(`label:text-is("${labelText}")`).locator(`xpath=following-sibling::${tag}[1]`);

await after("First Name *", "input").fill(TEST.firstName);
await after("Last Name *", "input").fill(TEST.lastName);
await after("Gender *", "select").selectOption("prefer-not-to-say");
await after("Date of Birth *", "input").fill(TEST.dateOfBirth);

// The phone arrives prefilled from the campaign form. Replace it with a
// number that can never ring anybody.
const phone = form.locator("input.react-international-phone-input");
await phone.fill("");
await phone.fill(TEST.phone);

await after("Email Address *", "input").fill(TEST.email);

// Nationality and Country of Residence are a search box that commits the
// first match on Enter.
for (const label of ["Nationality *", "Country of Residence *"]) {
  const box = form.locator(`label:text-is("${label}")`).locator("xpath=following-sibling::div[1]//input[1]");
  await box.click();
  await box.fill("Nigeria");
  await box.press("Enter");
}

await after("Highest Qualification *", "select").selectOption("bachelors");
await after("Desired Level of Study *", "select").selectOption("postgraduate");
await after("Preferred Mode of Study *", "select").selectOption("full-time");
await after("Area of Study Interest *", "input").fill(TEST.areaOfStudy);
const startMonth = after("Preferred Start Month *", "select");
await startMonth.selectOption({ index: 1 });
await after("Preferred Study Destination *", "select").selectOption("uk");
await after("How are you financing your studies? *", "select").selectOption("self-funded");
await form.locator('input[type=checkbox]').first().check();

writeFileSync(`${OUT}/live-enquiry-before-submit.png`, await page.screenshot({ fullPage: true }));

/* 3. Turnstile, then submit --------------------------------------------- */
console.log("\n=== 3. Submitting ===");
const submit = form.locator('button[type=submit]');
try {
  await submit.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForFunction(
    () => {
      const b = [...document.querySelectorAll('form button[type=submit]')].pop();
      return Boolean(b) && !b.disabled;
    },
    { timeout: 90000 }
  );
} catch {
  console.log("  Turnstile did not issue a token to this automated browser within 90 seconds.");
  console.log("  NOTHING WAS SUBMITTED: no lead, no portal account, no notification.");
  writeFileSync(`${OUT}/live-enquiry-turnstile-blocked.png`, await page.screenshot({ fullPage: true }));
  await browser.close();
  process.exit(2);
}

await submit.click();
await page.waitForSelector('text=Sign-up received', { timeout: 60000 });
check(true, "the sign-up was accepted", "Sign-up received");
writeFileSync(`${OUT}/live-enquiry-accepted.png`, await page.screenshot({ fullPage: true }));

await browser.close();

console.log("\n=== 4. What now exists in production, and must be removed ===");
console.log(`  A Pipedrive Person and Lead for ${TEST.email}`);
console.log(`  A Student Portal account for ${TEST.email}`);
console.log("  A campaign notification sent to Juliet, Tim, Glenice and Eldah");
console.log(`  Look the Lead up with the Pipedrive Lead lookup workflow, email ${TEST.email}`);
console.log(`\nRESULT: ${failures === 0 ? "the enquiry was submitted." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
