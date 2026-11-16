import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Reception routed the request and then dropped it.
 *
 * Tom typed a request into Reception on 11 September 2026. Reception
 * identified the right specialist, mounted that worker's chat, and handed
 * over nothing, so he had to type the same thing again into an empty box.
 * One Ask became two.
 *
 * The cause was a single line: WorkerChat was mounted with token, workerId
 * and workerName, and held its own empty text state. Reception had the
 * request the whole time and never passed it.
 *
 * These tests read the source rather than rendering, because what has to
 * hold is structural: the verbatim text is handed over, nothing else is,
 * and the server keeps deciding access. A render test would prove the
 * happy path and none of those three.
 */

const HERE = import.meta.dirname;
const reception = readFileSync(
  path.resolve(HERE, "../client/src/components/workforce/Receptionist.tsx"), "utf8");
const chat = readFileSync(
  path.resolve(HERE, "../client/src/components/workforce/WorkerChat.tsx"), "utf8");
const routers = readFileSync(path.resolve(HERE, "routers.ts"), "utf8");

describe("the original request reaches the destination worker", () => {
  it("Reception passes what the person typed into WorkerChat", () => {
    expect(reception).toMatch(/initialRequest=\{submitted\}/);
  });

  it("passes the VERBATIM text, not a tidied or summarised version", () => {
    // `submitted` is the exact string the person typed and the exact string
    // the router was given. If this ever became a transform, the audit
    // record would hold something nobody actually said.
    expect(reception).toMatch(/const \[submitted, setSubmitted\] = useState\(""\)/);
    expect(reception).not.toMatch(/initialRequest=\{[^}]*(summar|paraphras|slice|substring|toLowerCase)/i);
  });

  it("WorkerChat accepts the request and sends it without rewriting it", () => {
    expect(chat).toMatch(/initialRequest\?: string/);
    expect(chat).toMatch(/send\(initialRequest\)/);
  });

  it("sends it once, not once per render", () => {
    // Without the guard, React's double-invoked effects in development and
    // any re-render mid-flight would ask the worker the same question twice
    // and bill two model calls for one Ask.
    expect(chat).toMatch(/sentRef/);
    expect(chat).toMatch(/if \(sentRef\.current === initialRequest\) return;/);
  });

  it("shows the person what was asked, verbatim, above the answer", () => {
    expect(reception).toMatch(/You asked:/);
    expect(reception).toMatch(/\{submitted\}/);
  });
});

describe("the handoff carries nothing it should not", () => {
  it("carries the request text and no case or student context", () => {
    // The routing result holds worker id, name, availability and status.
    // None of it is student data, and none of it is passed here. If a case
    // id is ever added to this handoff it must be gated separately, which
    // is a decision rather than a prop.
    const mount = reception.slice(reception.indexOf("<WorkerChat"), reception.indexOf("/>", reception.indexOf("<WorkerChat")));
    for (const forbidden of ["caseId", "case_id", "studentId", "student_id", "personId", "email", "phone"]) {
      expect(mount).not.toContain(forbidden);
    }
  });

  it("WorkerChat still refuses to post a browser-supplied transcript", () => {
    // The pre-existing control, re-asserted because this change touched the
    // component that holds it. Only the conversation id goes up; the server
    // rebuilds the real transcript from turns it wrote itself.
    expect(chat).toMatch(/conversationId/);
    expect(chat).not.toMatch(/turns:\s*turns/);
  });
});

describe("the destination worker still re-checks access on the server", () => {
  it("workforce.ask resolves the session itself rather than trusting the client", () => {
    const ask = routers.slice(routers.indexOf("    ask: publicProcedure"), routers.indexOf("    ask: publicProcedure") + 2500);
    expect(ask).toMatch(/resolveStaffSession\(input\.token\)/);
  });

  it("the client sends no permission claim of its own", () => {
    // The input schema is the control surface. If the browser could state a
    // scope, an access level or a worker authorisation, routing would become
    // a way to hand a worker something the signed-in person cannot reach.
    const schema = routers.slice(routers.indexOf("    ask: publicProcedure"), routers.indexOf("      .mutation", routers.indexOf("    ask: publicProcedure")));
    for (const forbidden of ["accessLevel", "functionalScope", "actionPermission", "caseScope", "staffUserId", "permitted"]) {
      expect(schema).not.toContain(forbidden);
    }
  });

  it("routing through Reception reaches the same endpoint as asking directly", () => {
    // So there is no second, laxer path. One endpoint, one set of checks.
    expect(chat).toMatch(/trpc\.workforce\.ask\.useMutation/);
    expect(reception).toMatch(/<WorkerChat/);
  });
});

/**
 * The second half of "one Ask is one Ask".
 *
 * Handing the request over was not enough on its own. While the worker is
 * thinking, the only thing on screen was an empty compose box reading
 * "Describe the enquiry for Nia", and a staff member reads that as an
 * instruction, because that is what it is. Tom, 11 September 2026: the
 * routing is working but the text should not have to be retyped.
 *
 * So the request has to be visible from the moment it is sent, and it has
 * to come back to the person if it is refused or the call fails. An empty
 * box is only ever offered for a question that has not been asked yet.
 */
describe("a request that has been sent is visible without being retyped", () => {
  it("holds the in-flight request separately from the stored conversation", () => {
    // Separate because it is not a turn: a refused or failed request never
    // becomes part of what the server stored, and showing it as one would
    // promise the worker remembers it.
    expect(chat).toMatch(/const \[inFlight, setInFlight\] = useState<string \| null>\(null\)/);
    expect(chat).toMatch(/setInFlight\(trimmed\)/);
  });

  it("renders the in-flight request text and says the worker is working", () => {
    const block = chat.slice(chat.indexOf("{inFlight && ("), chat.indexOf("<form onSubmit={submit}>"));
    expect(block).toContain("{inFlight}");
    expect(block).toContain("is working on this");
    // Announced, because a staff member using a screen reader gets no
    // benefit from a spinner they cannot see.
    expect(block).toMatch(/aria-live="polite"/);
  });

  it("clears the in-flight request on an answer, a refusal and an error", () => {
    // Three exits. If any one of them is missed the spinner runs forever
    // on a request that is already finished.
    expect((chat.match(/setInFlight\(null\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(chat).toMatch(/onError: \(\) => \{\s*setInFlight\(null\);/);
  });

  it("puts a refused or failed request back in the box rather than losing it", () => {
    // The person typed it once, or Reception sent it on their behalf and
    // they never typed it at all. Either way, retyping it is not their job.
    const success = chat.slice(chat.indexOf("onSuccess: result =>"), chat.indexOf("onError:"));
    expect(success).toMatch(/setText\(trimmed\)/);
    const error = chat.slice(chat.indexOf("onError:"));
    expect(error).toMatch(/setText\(trimmed\)/);
  });

  it("never offers an empty box for a question already asked", () => {
    // The label and the placeholder follow the thread, and the thread
    // begins when a request is sent rather than when one is answered.
    expect(chat).toMatch(/const hasThread = turns\.length > 0 \|\| inFlight !== null;/);
    expect(chat).toMatch(/\{hasThread \? `Reply to \$\{workerName\}` : `Ask \$\{workerName\}`\}/);
    expect(chat).toMatch(/hasThread\s*\n\s*\? `Reply to/);
    // The old condition asked whether an answer had arrived, which is a
    // different question and the one that produced the defect.
    expect(chat).not.toMatch(/turns\.length === 0\s*$/m);
  });
});
