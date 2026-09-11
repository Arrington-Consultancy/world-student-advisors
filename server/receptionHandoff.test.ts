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
