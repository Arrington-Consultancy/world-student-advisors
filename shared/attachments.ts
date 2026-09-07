/**
 * Rules for a file attached to a worker question, shared so the browser and
 * the server enforce exactly the same ones.
 *
 * WHY THIS IS ITS OWN MODULE. An attachment is a new way for material to
 * reach a worker's context window, and it is the only one that does not come
 * from a scoped source. Everything else a worker sees has been through
 * checkAccessForStaffUser, the worker's own authorisation and the context
 * assembler, which is what makes "unauthorised material never enters the
 * context window" true. A file from somebody's desktop has been through none
 * of that, so the limits on it are written down in one place rather than
 * spread between a form control and a validator that can drift apart.
 *
 * Tom Arrington decided on 7 September 2026 that staff should be able to
 * attach a file for a worker to examine, and that a disclaimer shown at the
 * point of attaching is the control for what staff choose to upload. This
 * module carries that disclaimer and the limits that do not depend on
 * anybody reading it.
 *
 * WHAT THE CODE GUARANTEES WITHOUT RELYING ON THE DISCLAIMER:
 *
 *   The file is request-scoped. It goes to the model for one turn and is
 *   never written to disk, never written to the database, and never added
 *   to conversation memory. Nothing is kept, so nothing can leak later or
 *   come back in a thread the student never saw.
 *
 *   The audit trail records that a file was attached, with its name, type
 *   and size, and never its content.
 *
 *   Type and size are checked on the server as well as in the browser,
 *   because a browser check is a convenience and not a control.
 */

/**
 * 4 MB of original file. Base64 inflates by roughly a third, so this stays
 * well inside the 50 MB body limit while being enough for a screenshot or a
 * short PDF.
 */
export const ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;

/** Images the model can look at. */
export const ATTACHMENT_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

/** Documents the model can read. */
export const ATTACHMENT_DOCUMENT_TYPES = ["application/pdf"] as const;

export const ATTACHMENT_ALLOWED_TYPES: readonly string[] = [
  ...ATTACHMENT_IMAGE_TYPES,
  ...ATTACHMENT_DOCUMENT_TYPES,
];

/** For the file picker's accept attribute. */
export const ATTACHMENT_ACCEPT = ATTACHMENT_ALLOWED_TYPES.join(",");

/**
 * Shown every time a staff member attaches something, before they send it.
 *
 * It says what actually happens to the file and names the categories that
 * must not be attached. Naming them is the point: "be careful with personal
 * data" tells somebody nothing they can act on, and the categories listed
 * are the ones the SharePoint ring fence already keeps away from workers,
 * which a screenshot would otherwise walk straight past.
 */
export const ATTACHMENT_DISCLAIMER =
  "This file is sent to the AI model to answer this one question. It is not saved to the " +
  "student record and is not kept once you have your answer. Do not attach passports, " +
  "identity documents, bank statements, payment details, or anything from the HUB password " +
  "file. If a student's personal documents are what you need looked at, speak to Tom first.";

export interface AttachmentCheck {
  ok: boolean;
  /** Present whenever ok is false, and written to be shown to a staff member. */
  reason?: string;
}

export interface AttachmentInput {
  filename: string;
  mediaType: string;
  /** Size of the original file in bytes, before base64. */
  byteSize: number;
}

/** Whether this file may be attached. Deny by default: an unrecognised type is refused. */
export function checkAttachment(file: AttachmentInput): AttachmentCheck {
  if (!ATTACHMENT_ALLOWED_TYPES.includes(file.mediaType)) {
    return {
      ok: false,
      reason:
        `"${file.mediaType || "unknown"}" cannot be attached. ` +
        "You can attach a PNG, JPEG, GIF or WebP image, or a PDF.",
    };
  }
  if (file.byteSize <= 0) {
    return { ok: false, reason: "That file is empty." };
  }
  if (file.byteSize > ATTACHMENT_MAX_BYTES) {
    const mb = (ATTACHMENT_MAX_BYTES / (1024 * 1024)).toFixed(0);
    return { ok: false, reason: `That file is larger than ${mb} MB. Try a smaller one.` };
  }
  return { ok: true };
}

export function isImageAttachment(mediaType: string): boolean {
  return (ATTACHMENT_IMAGE_TYPES as readonly string[]).includes(mediaType);
}

export function isDocumentAttachment(mediaType: string): boolean {
  return (ATTACHMENT_DOCUMENT_TYPES as readonly string[]).includes(mediaType);
}
