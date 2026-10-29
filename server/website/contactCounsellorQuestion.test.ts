import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

/**
 * Tim Hunt, 28 October 2026: "Please remove this from the main website form"
 * (the "Recommended Student Counsellor?" question), and "We will remove the
 * student counsellor selection and retain the referral question". Enquiries
 * from /contact go to Claudia, who qualifies them.
 */
const contact = readFileSync("client/src/pages/Contact.tsx", "utf8");
const code = contact.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the contact form's counsellor question", () => {
  it("is gone: no question, no list of counsellors, nothing sent for it", () => {
    expect(code).not.toContain("Recommended Student Counsellor");
    expect(code).not.toContain("recommendedCounsellor");
    for (const name of ["Eldah Therone", "Glenice Owino", "Manet Khamayo", "Claudia Ingado", "Help me choose"]) {
      expect(code).not.toContain(`>${name}</option>`);
    }
  });

  it("keeps the referral question and who referred them", () => {
    expect(code).toContain("Were you referred to WSA?");
    expect(code).toContain("Referred by whom?");
    expect(code).toContain("referredByWhom");
  });
});
