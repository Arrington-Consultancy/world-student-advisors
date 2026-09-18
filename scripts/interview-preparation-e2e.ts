/**
 * Interview preparation, end to end, with a FICTIONAL student.
 *
 * Runs prepareInterview exactly as the Staff Portal procedure does, acting
 * as the deployment's bootstrap staff account, with three synthetic
 * documents for a student who does not exist. Because the student is
 * fictional, the two produced documents are printed in full so their
 * quality can be read before staff use the screen. Nothing here touches
 * the CRM, and no real student's documents are ever used by this script.
 */
import { getDb } from "../server/db";
import { staffUsers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { prepareInterview, guardInterviewOutput, type InterviewKind } from "../server/documents/interviewPreparation";

let failures = 0;
function check(ok: boolean, label: string, detail = ""): void {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
}

const kind = ((process.env.E2E_KIND || "").trim() || "university_course_credibility") as InterviewKind;
const staffEmail = ((process.env.E2E_STAFF_EMAIL || "").trim() || (process.env.ACCESS_BOOTSTRAP_EMAIL || "").trim()).toLowerCase();
if (!staffEmail) { console.log("E2E_STAFF_EMAIL (or ACCESS_BOOTSTRAP_EMAIL) is required."); process.exit(2); }

const CV = `CURRICULUM VITAE
Ada Okonkwo-Test (fictional)
Education: BSc Human Physiology, University of Lagos, September 2018 to July 2022, Second Class Upper.
Employment: Healthcare Assistant, Lagos General Hospital, January 2023 to present. Monitoring vital signs, supporting nurses during procedures, patient hygiene and mobility, recording observations.
Volunteering: Community health outreach, Ikeja, March to August 2022.
Skills: patient observation, infection control, record keeping.`;

const PS = `PERSONAL STATEMENT
I am applying for the MA Nursing (Adult) at the University of Salford. My degree in Human Physiology gave me a strong understanding of how the body works, and my work as a Healthcare Assistant has shown me that I want the responsibility of a Registered Adult Nurse. I chose Salford because of its healthcare partnerships, placement opportunities and reputation for producing skilled nursing professionals. I also considered the University of Portsmouth and the University of Lincoln. After qualifying I intend to gain experience in an acute hospital setting and later specialise in older adult care.`;

const RIQ = `RESPONSES TO INTERVIEW QUESTIONS (RIQ)
Q1 Why did you choose this course? A: Because I want to be a nurse and it is a two year course for graduates.
Q2 Which modules interest you? A: Adult Nursing Practice, Clinical Skills and Practice, Evidence-Based Nursing Practice, Professional Practice and Nursing Standards, Health Promotion and Public Health.
Q3 Why this university? A: AskUS student support, the simulation facilities and the Frederick Road health campus.
Q4 Which other universities did you consider? A: I can't disclose the other universities.
Q5 What is the ranking of your university? A: Salford ranks very high, 5th in England for mobility support.
Q6 What is your career plan? A: To return to Nigeria as a Registered Adult Nurse and eventually open a care home to support adults with disabilities and older people.
Q7 How will you fund your studies? A: My family will pay the tuition fees and living costs from savings.`;

console.log("\n=== 1. Staff identity ===");
const db = await getDb();
if (!db) { console.log("No database."); process.exit(1); }
const [staff] = await db.select().from(staffUsers).where(eq(staffUsers.email, staffEmail)).limit(1);
check(Boolean(staff && staff.isActive === 1), "staff account resolved and active", staff ? `staff_users.id ${staff.id}` : "not found");
if (!staff) process.exit(1);

console.log(`\n=== 2. Prepare: ${kind}, fictional student, three pasted documents ===`);
const started = Date.now();
const result = await prepareInterview({
  staffUserId: staff.id,
  authMethod: "entra_sso",
  kind,
  studentName: "Ada Okonkwo-Test",
  documents: [
    { role: "cv", text: CV },
    { role: "personal_statement", text: PS },
    { role: "riq", text: RIQ },
  ],
});
console.log(`  elapsed: ${Math.round((Date.now() - started) / 1000)}s`);
check(result.outcome === "prepared", "both documents prepared", `${result.outcome}: ${result.reason.slice(0, 160)}`);
check(result.owner === (kind === "ukvi_credibility" ? "priya" : "james"), "owned by the right worker", result.ownerName);
check(result.status !== null, "readiness status derived", result.status ?? "none");
console.log(`  counts: ${JSON.stringify(result.counts)}`);

const student = result.studentPreparationFeedback ?? "";
const interviewer = result.mockInterviewStructure ?? "";
check(student.length > 800, "student feedback has substance", `${student.length} characters`);
check(/before your mock interview you must be able to explain without notes/i.test(student), "student feedback closes with the required checklist heading");
check(/portsmouth|lincoln/i.test(student), "student feedback names the universities the student's own documents name");
check(/disclose/i.test(student) || /other universities/i.test(student), "student feedback raises the comparison contradiction");
check(!/\b(5th|fifth)\b[^.]*\bin england\b/i.test(student) || /verify|check|source|table/i.test(student), "the student's unsourced ranking claim is challenged, not repeated as fact");
check(!/\*\*|^#{1,6}\s/m.test(student), "student feedback carries no Markdown markers");
check(interviewer.length > 1200, "interviewer structure has substance", `${interviewer.length} characters`);
for (const heading of ["QUESTION", "WHAT I AM TESTING", "EXPECTED CONTENT", "FOLLOW UP", "RED FLAGS", "DOCUMENT CROSS CHECK"]) {
  check(interviewer.toUpperCase().includes(heading), `interviewer structure carries ${heading}`);
}
check(/\b85\b/.test(interviewer), "interviewer structure states the 85 threshold");
check(!/\b\d{1,3}\s*(\/|out of)\s*100\b(?![^.]*(after|only|threshold))/i.test(interviewer), "no readiness score is given before the live mock");
const g1 = guardInterviewOutput(student, kind);
const g2 = guardInterviewOutput(interviewer, kind);
check(g1.ok && g2.ok, "both documents pass the guards as released", [...g1.failed, ...g2.failed].join("; "));

console.log("\n=== 3. The two documents (fictional student, printed for quality review) ===");
console.log("\n----- STUDENT PREPARATION FEEDBACK -----\n" + student);
console.log("\n----- WSA MOCK INTERVIEW STRUCTURE -----\n" + interviewer);

console.log(`\nRESULT: ${failures === 0 ? "the two documents were produced under the owning worker and passed every check" : `${failures} check(s) failed`}.`);
process.exit(failures === 0 ? 0 : 1);
