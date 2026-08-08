import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { VALID_CLIENT_ROUTES } from "../shared/routes";

// shared/routes.ts is a hand-maintained snapshot of client/src/App.tsx's
// route table (server code can't import App.tsx directly — it pulls in
// React component modules that don't belong in the server bundle). This
// test is the drift guard: it fails the moment the two lists disagree,
// in either direction, so a route added to one and forgotten in the other
// doesn't silently ship as a wrongly-404'd real page or a wrongly-200'd
// dead one.
describe("shared/routes.ts stays in sync with client/src/App.tsx", () => {
  it("contains exactly the same set of paths as every <Route path={...}> in App.tsx", () => {
    const appTsxPath = path.resolve(import.meta.dirname, "../client/src/App.tsx");
    const source = fs.readFileSync(appTsxPath, "utf-8");
    const matches = [...source.matchAll(/<Route path=\{"([^"]+)"\}/g)].map(m => m[1]);

    expect(matches.length).toBeGreaterThan(0);
    expect(new Set(matches)).toEqual(new Set(VALID_CLIENT_ROUTES));
    // Duplicates in either list would pass a naive Set comparison but are
    // still a real bug worth catching.
    expect(matches.length).toBe(new Set(matches).size);
    expect(VALID_CLIENT_ROUTES.length).toBe(new Set(VALID_CLIENT_ROUTES).size);
  });
});
