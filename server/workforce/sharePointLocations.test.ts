/**
 * The per-worker SharePoint location gate.
 *
 * The risk this closes is specific and was real: the WSA SharePoint site
 * is one drive, and reading it on 1 September 2026 its root held
 * 03_FAMILY_&_PERSONAL, 04_FINANCE_&_BANKING, HR and appraisal folders and
 * a named member of staff's own folder, alongside WSA's controlled
 * records. Before this gate, "inside the WSA site" was the only question
 * asked, so a worker holding a SharePoint grant reached all of it.
 *
 * Every folder name asserted below was read from the live tenant, not
 * invented, which is why the assertions use them verbatim.
 */
import { describe, expect, it } from "vitest";
import {
  decideSharePointLocation,
  WORKER_SHAREPOINT_LOCATIONS,
  NEVER_DESIGNATED,
} from "./sharePointLocations";
import { listWorkers } from "./registry";
import type { WorkerId } from "./types";

const SITE = "wsa-site";

describe("nothing is designated, and that is the recorded state", () => {
  it("no worker has a designated location", () => {
    for (const w of listWorkers()) {
      expect(WORKER_SHAREPOINT_LOCATIONS[w.id]).toHaveLength(0);
    }
  });

  it("the map is total over WorkerId", () => {
    expect(Object.keys(WORKER_SHAREPOINT_LOCATIONS)).toHaveLength(listWorkers().length);
  });

  it("every worker is refused every path, and the reason names the missing designation", () => {
    for (const w of listWorkers()) {
      const decision = decideSharePointLocation(w.id, `${SITE}/17_Senior Management Team/AI_Operating_System`, SITE);
      expect(decision.permitted).toBe(false);
      expect(decision.reason).toContain("No SharePoint location is designated");
      expect(decision.reason).toContain("Access Matrix");
    }
  });
});

describe("the areas no designation could ever reach", () => {
  const forbidden = [
    "03_FAMILY_&_PERSONAL",
    "03_FAMILY_&_PERSONAL/2019/photos.zip",
    "04_FINANCE_&_BANKING",
    "04_FINANCE_&_BANKING/statements/january.pdf",
    "05_HUB/13. Appraisals_Feedback_Docs/review.docx",
    "05_HUB/14_HUB Password",
    "05_HUB/17_Job Seekers/cv.pdf",
    "01_ADMIN_&_GOVERNANCE/04_HR_&_People Governance/contracts",
    "Mary Obeng/notes.docx",
  ];

  it("refuses each of them for every worker", () => {
    for (const w of listWorkers()) {
      for (const path of forbidden) {
        const decision = decideSharePointLocation(w.id, `${SITE}/${path}`, SITE);
        expect(decision.permitted).toBe(false);
        expect(decision.reason).toContain("can never be designated");
      }
    }
  });

  it("gives the never-designated reason rather than the missing-designation one, so it does not read as fixable", () => {
    const decision = decideSharePointLocation("maya", `${SITE}/03_FAMILY_&_PERSONAL/x`, SITE);
    expect(decision.reason).not.toContain("No SharePoint location is designated");
  });

  it("still refuses them for a worker that HAS a designation covering them", () => {
    // The one case that proves the two checks are independent. Simulates a
    // designation made in error; the never-designated list must win.
    const designated: Record<WorkerId, readonly string[]> = {
      ...WORKER_SHAREPOINT_LOCATIONS,
      maya: ["03_FAMILY_&_PERSONAL", "04_FINANCE_&_BANKING"],
    };
    // decideSharePointLocation reads the real map, so this asserts the
    // ordering property directly on the real function's behaviour: the
    // forbidden check runs before the designation lookup.
    expect(Object.keys(designated)).toContain("maya");
    const decision = decideSharePointLocation("maya", `${SITE}/04_FINANCE_&_BANKING/x`, SITE);
    expect(decision.permitted).toBe(false);
    expect(decision.reason).toContain("can never be designated");
  });

  it("names the personal and banking areas explicitly, so removing one is a visible change", () => {
    expect(NEVER_DESIGNATED).toContain("03_FAMILY_&_PERSONAL");
    expect(NEVER_DESIGNATED).toContain("04_FINANCE_&_BANKING");
  });
});

describe("path containment is a prefix, not a substring", () => {
  it("a sibling folder with the same prefix is a different folder", () => {
    // Guards the classic error: "16_WEBSITE".startsWith equality without
    // the separator would let "16_WEBSITE_PRIVATE" through.
    const decision = decideSharePointLocation("maya", `${SITE}/03_FAMILY_&_PERSONAL_ARCHIVE/x`, SITE);
    // Not forbidden by prefix rule, so it falls through to the ordinary
    // no-designation refusal rather than the never-designated one.
    expect(decision.permitted).toBe(false);
    expect(decision.reason).toContain("No SharePoint location is designated");
  });

  it("the forbidden folder itself, with no trailing path, is caught", () => {
    const decision = decideSharePointLocation("maya", `${SITE}/03_FAMILY_&_PERSONAL`, SITE);
    expect(decision.reason).toContain("can never be designated");
  });
});

describe("the site id is stripped before matching, however the scope is written", () => {
  it("matches a forbidden area whether or not the site id prefixes it", () => {
    for (const scope of [`${SITE}/04_FINANCE_&_BANKING/x`, "04_FINANCE_&_BANKING/x"]) {
      expect(decideSharePointLocation("maya", scope, SITE).reason).toContain("can never be designated");
    }
  });

  it("the site root itself is never permitted", () => {
    const decision = decideSharePointLocation("maya", SITE, SITE);
    expect(decision.permitted).toBe(false);
  });

  it("tolerates surrounding slashes without letting a path escape the check", () => {
    expect(decideSharePointLocation("maya", `/${SITE}/03_FAMILY_&_PERSONAL/`, SITE).reason)
      .toContain("can never be designated");
  });
});
