import { describe, it, expect } from "vitest";
import {
  checkAttachment,
  isImageAttachment,
  isDocumentAttachment,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_ALLOWED_TYPES,
  ATTACHMENT_DISCLAIMER,
} from "../shared/attachments";

/**
 * The limits on an attached file.
 *
 * An attachment is the one route into a worker's context window that does
 * not come from a scoped source, so these are the only checks standing
 * between a file on somebody's desktop and the model. The browser runs the
 * same function, but the server's call is the control and these tests are
 * about that call.
 */

const ok = { filename: "screenshot.png", mediaType: "image/png", byteSize: 1024 };

describe("allowed types", () => {
  it("accepts the image types the model can look at", () => {
    for (const mediaType of ["image/png", "image/jpeg", "image/gif", "image/webp"]) {
      expect(checkAttachment({ ...ok, mediaType }).ok).toBe(true);
    }
  });

  it("accepts PDF", () => {
    expect(checkAttachment({ ...ok, filename: "fees.pdf", mediaType: "application/pdf" }).ok).toBe(true);
  });

  it("REFUSES a type that is not on the list", () => {
    const decision = checkAttachment({ ...ok, filename: "notes.docx", mediaType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    expect(decision.ok).toBe(false);
    expect(decision.reason).toBeTruthy();
  });

  it("REFUSES an executable outright", () => {
    expect(checkAttachment({ ...ok, filename: "x.exe", mediaType: "application/x-msdownload" }).ok).toBe(false);
  });

  it("REFUSES a missing type rather than guessing from the filename", () => {
    expect(checkAttachment({ ...ok, mediaType: "" }).ok).toBe(false);
  });

  it("denies by default: nothing outside the allow list passes", () => {
    const outside = ["text/html", "application/zip", "image/svg+xml", "video/mp4"];
    for (const mediaType of outside) {
      expect(ATTACHMENT_ALLOWED_TYPES.includes(mediaType)).toBe(false);
      expect(checkAttachment({ ...ok, mediaType }).ok).toBe(false);
    }
  });
});

describe("size", () => {
  it("accepts a file exactly on the limit", () => {
    expect(checkAttachment({ ...ok, byteSize: ATTACHMENT_MAX_BYTES }).ok).toBe(true);
  });

  it("REFUSES one byte over the limit", () => {
    const decision = checkAttachment({ ...ok, byteSize: ATTACHMENT_MAX_BYTES + 1 });
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("larger than");
  });

  it("REFUSES an empty file", () => {
    expect(checkAttachment({ ...ok, byteSize: 0 }).ok).toBe(false);
  });

  it("REFUSES a negative size", () => {
    expect(checkAttachment({ ...ok, byteSize: -1 }).ok).toBe(false);
  });
});

describe("type routing", () => {
  it("sends images as images and PDFs as documents", () => {
    expect(isImageAttachment("image/png")).toBe(true);
    expect(isDocumentAttachment("image/png")).toBe(false);
    expect(isDocumentAttachment("application/pdf")).toBe(true);
    expect(isImageAttachment("application/pdf")).toBe(false);
  });
});

describe("the disclaimer", () => {
  it("names the categories that must not be attached, not just a vague caution", () => {
    for (const term of ["passport", "bank statement", "payment details", "HUB password"]) {
      expect(ATTACHMENT_DISCLAIMER.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  it("says the file is not kept, which is the fact staff need", () => {
    expect(ATTACHMENT_DISCLAIMER).toContain("not kept");
    expect(ATTACHMENT_DISCLAIMER).toContain("not saved to the");
  });

  it("tells staff what to do instead rather than only refusing", () => {
    expect(ATTACHMENT_DISCLAIMER).toContain("speak to Tom");
  });
});
