import bcrypt from "bcryptjs";

// Proves the hash now live in production is the hash of the intended
// password, end to end, without printing either.
//
// A shape check is not enough. "Starts with $2 and is 60 characters" is
// true of the hash of any password at all, including a truncated one, a
// stale one from an earlier attempt, or one mangled by shell expansion on
// the way through the pipeline. The only question worth answering is
// whether the credential Tom chose actually opens the door and other
// credentials do not, so that is what this asks.
//
// It reads the deployed value back from Railway rather than trusting the
// value that was just sent, which is what makes it a verification rather
// than an echo.

const password = process.env.EXECUTIVE_PASSWORD ?? "";
const deployed = process.env.DEPLOYED_HASH ?? "";

let failures = 0;
const fail = message => {
  console.error(`  FAIL ${message}`);
  failures += 1;
};
const pass = message => console.log(`  ok   ${message}`);

if (password === "" || deployed === "") {
  console.error("Both the password and the deployed hash must be present to verify. Neither is printed.");
  process.exit(1);
}

console.log("=== Shape of the deployed value ===");
// Reported as a description, never as the value itself.
if (/^\$2[aby]\$/.test(deployed)) pass("it is a bcrypt hash");
else fail("the deployed value is not in bcrypt format at all");

const cost = Number(deployed.split("$")[2]);
if (Number.isFinite(cost) && cost >= 12) pass(`cost factor is ${cost}`);
else fail(`cost factor is ${deployed.split("$")[2]}, which is below the required 12`);

if (deployed.length === 60) pass("it is 60 characters, so nothing was truncated in transit");
else fail(`it is ${deployed.length} characters, so it was truncated or corrupted in transit`);

// Shell expansion is the specific hazard here: a bcrypt hash is full of $
// signs, and one wrong quoting decision anywhere in the pipeline would
// swallow "$2a" or "$12" and leave a value that still looks plausible.
if (!deployed.includes("$$") && deployed.split("$").length === 4) pass("its four $-separated fields are intact");
else fail("its $-separated structure is wrong, which is what shell expansion damage looks like");

console.log("\n=== What it actually accepts ===");
if (await bcrypt.compare(password, deployed)) pass("the intended password verifies against the deployed hash");
else fail("the intended password does NOT verify against the deployed hash");

// The complement matters as much. A hash that accepted everything would
// pass the check above and be catastrophic.
if (!(await bcrypt.compare(`${password}x`, deployed))) pass("a near-miss password is rejected");
else fail("a near-miss password is ACCEPTED, so the deployed hash is not discriminating");

if (!(await bcrypt.compare("", deployed))) pass("an empty password is rejected");
else fail("an empty password is ACCEPTED");

if (!(await bcrypt.compare("password", deployed))) pass("an unrelated password is rejected");
else fail("an unrelated password is ACCEPTED");

console.log(`\n${failures === 0 ? "VERIFICATION PASSED" : `VERIFICATION FAILED: ${failures} problem(s)`}`);
process.exit(failures === 0 ? 0 : 1);
