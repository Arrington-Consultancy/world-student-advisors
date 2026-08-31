import bcrypt from "bcryptjs";

// Turns the chosen executive password into the bcrypt hash the platform
// stores, and prints ONLY that hash to stdout so the caller can capture it
// into a shell variable without it ever reaching a log line.
//
// The password reaches this script through the environment, from a GitHub
// repository secret. It is never a workflow input: workflow_dispatch inputs
// are displayed in plain text on the run page to anyone who can read the
// repository's Actions, which for a permanent unrestricted credential would
// defeat the point entirely.
//
// Nothing here is written to a file, echoed, or returned as a step output.

const password = process.env.EXECUTIVE_PASSWORD ?? "";

// A permanent, unrestricted, MFA-free credential is the only thing between
// whoever learns it and full Level 1 access to every student record. Tom
// accepted that trade knowingly, which makes the strength of the password
// the entire remaining control, so a weak one is refused here rather than
// quietly accepted.
const problems = [];
if (password.length < 16) problems.push(`it is ${password.length} characters; at least 16 are required`);
if (!/[a-z]/.test(password)) problems.push("it contains no lowercase letter");
if (!/[A-Z]/.test(password)) problems.push("it contains no uppercase letter");
if (!/[0-9]/.test(password)) problems.push("it contains no digit");
if (/^\s|\s$/.test(password)) problems.push("it starts or ends with whitespace, which is lost in transit and impossible to type reliably");
if (/^(?:.)\1+$/.test(password)) problems.push("it is a single repeated character");
// Deliberately NOT anchored on word boundaries. "MyPassword12345678" is
// exactly as guessable as "password" and a \b anchor lets it straight
// through, because the boundary never fires on an embedded word. Substring
// is the behaviour this check was always meant to have.
const BANNED = ["password", "passw0rd", "worldstudent", "arrington", "letmein", "admin", "changeme", "welcome", "qwerty", "123456"];
const lowered = password.toLowerCase();
if (BANNED.some(word => lowered.includes(word)) || /\bwsa\b/i.test(password)) {
  problems.push("it contains a guessable word connected to WSA or a common default");
}

if (problems.length > 0) {
  // The problems describe the password without quoting it. Anyone reading
  // this failure learns what to fix and not what was tried.
  console.error("The executive password was rejected:");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("\nUpdate the EXECUTIVE_PASSWORD repository secret and dispatch again. Nothing was changed.");
  process.exit(1);
}

// Cost 12. Sign-in happens rarely and by a human, so roughly a quarter of a
// second per attempt is unnoticeable to them and expensive to an attacker
// working through a stolen hash.
process.stdout.write(await bcrypt.hash(password, 12));
