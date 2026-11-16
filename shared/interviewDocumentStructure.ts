/**
 * The structure of the two interview preparation documents, read back out of
 * the plain text the owning worker produced.
 *
 * The worker writes plain text on purpose: the guards in
 * server/documents/interviewPreparation.ts read sentences, and Markdown
 * markers are refused outright. But a staff member sending the Student
 * Preparation Feedback to a student, or printing the WSA Mock Interview
 * Structure to hold during a mock interview, needs a Word document with real
 * headings, not a wall of text in Notepad.
 *
 * So the shape is recovered here, from the shape the worker was told to write
 * in, and nothing else. This module invents no content, drops no line and
 * reorders nothing: every line of the source text appears exactly once in the
 * blocks, and a line whose role cannot be established is an ordinary
 * paragraph. It is pure, so the client can call it and the test suite can hold
 * it to the documents production actually produced.
 *
 * 18 September 2026.
 */

/** The checklist heading the Student Preparation Feedback must close with. */
export const PREPARATION_CHECKLIST_HEADING =
  "Before your mock interview you must be able to explain without notes";

export type InterviewBlock =
  /** The document's own first line, e.g. "PREPARATION FOR YOUR WSA MOCK INTERVIEW". */
  | { type: "title"; text: string }
  /** A section heading, e.g. "AREA 1: CAREER PLAN CONSISTENCY" or "3. Course knowledge". */
  | { type: "heading"; text: string; level: 1 | 2 }
  /** A labelled paragraph, e.g. "QUESTION: ..." or "Student: Ada Okonkwo-Test". */
  | { type: "labelled"; label: string; text: string }
  /** A bullet from a "- " line. */
  | { type: "bullet"; text: string }
  /** Anything else. */
  | { type: "paragraph"; text: string };

/** Letters present, and every cased letter upper case. "AREA 1: WHY" yes, "Dear Ada," no. */
function isUpperCase(line: string): boolean {
  return /[A-Z]/.test(line) && line === line.toUpperCase();
}

/**
 * An upper-case label introducing a paragraph: QUESTION, WHAT I AM TESTING,
 * FOLLOW UP / PROBE QUESTIONS, RED FLAGS, DOCUMENT CROSS CHECK. The text after
 * the colon may be empty, as it is for the follow-up list's own introduction.
 */
const UPPER_LABEL = /^([A-Z][A-Z0-9 /]{2,40}):[ \t]*(.*)$/;

/**
 * A sentence-case label on the interviewer document's front matter: Student,
 * Course, Purpose, Interviewer note. Kept deliberately tight, so an ordinary
 * sentence carrying a colon stays an ordinary paragraph.
 */
const SENTENCE_LABEL = /^([A-Z][A-Za-z]{2,14}(?: [a-z]{2,12})?):[ \t]+(\S.*)$/;

/** A numbered section heading: short, no closing full stop. */
const NUMBERED = /^(\d{1,2})\.[ \t]+(\S.*)$/;
const NUMBERED_HEADING_MAX = 110;

/**
 * The interviewer document's own section headings. The worker is told to
 * give each area as "AREA, QUESTION, WHAT I AM TESTING, ...", and it writes
 * the heading as "AREA 1: ...". It capitalises the title on some runs
 * ("AREA 1: CAREER PLAN CONSISTENCY") and not on others ("AREA 1: Career
 * plan and its logic"), so the heading is recognised by its opening rather
 * than by its case, or half the interviewer's headings would come out as
 * ordinary labelled lines and Word's navigation pane would be missing them.
 */
const AREA_HEADING = /^AREA(?:[ \t]+\d{1,2})?[ \t]*:/;

/** A bullet. The worker writes "- "; an en or em dash is accepted too. */
const BULLET = /^[-\u2013\u2014][ \t]+(\S.*)$/;

/**
 * Read the document's shape. Blank lines separate blocks and carry no meaning
 * of their own, so they are dropped; every other line becomes exactly one
 * block, in the order it was written.
 */
export function parseInterviewDocument(text: string): InterviewBlock[] {
  const blocks: InterviewBlock[] = [];
  let first = true;

  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (line === "") continue;

    // The document's own heading: the first line, and only the first line.
    if (first) {
      first = false;
      if (isUpperCase(line) && line.length <= 90) {
        blocks.push({ type: "title", text: line });
        continue;
      }
    }

    // Before the upper-case rules, so a bullet written in capitals stays a
    // bullet.
    const bullet = BULLET.exec(line);
    if (bullet) {
      blocks.push({ type: "bullet", text: bullet[1] });
      continue;
    }

    // An upper-case line introducing a list, e.g. "FOLLOW UP / PROBE
    // QUESTIONS:". A label with nothing after it, not a section heading.
    if (isUpperCase(line) && line.endsWith(":") && line.length <= 90) {
      blocks.push({ type: "labelled", label: line.slice(0, -1).trim(), text: "" });
      continue;
    }

    // A whole line in capitals is a section heading, e.g. "AREA 1: CAREER
    // PLAN CONSISTENCY" or "PRINCIPAL CREDIBILITY RISKS, IN ORDER". The
    // colon inside the first is part of the heading, not a label.
    if (isUpperCase(line) && line.length <= 90) {
      blocks.push({ type: "heading", text: line, level: 1 });
      continue;
    }

    // A section heading of the interviewer document, whatever the case of
    // its title. Before the label rule, which would otherwise read the
    // title as the text of a label called "AREA 1".
    if (AREA_HEADING.test(line) && line.length <= 90) {
      blocks.push({ type: "heading", text: line, level: 1 });
      continue;
    }

    // An upper-case label followed by prose: "QUESTION: You've told us ...",
    // "RED FLAGS: Hesitation or a visibly different answer ...".
    const upper = UPPER_LABEL.exec(line);
    if (upper && upper[2] !== "") {
      blocks.push({ type: "labelled", label: upper[1].trim(), text: upper[2] });
      continue;
    }

    const numbered = NUMBERED.exec(line);
    if (numbered && line.length <= NUMBERED_HEADING_MAX && !/[.!?]$/.test(line)) {
      blocks.push({ type: "heading", text: line, level: 2 });
      continue;
    }

    if (line.toLowerCase() === PREPARATION_CHECKLIST_HEADING.toLowerCase()) {
      blocks.push({ type: "heading", text: line, level: 1 });
      continue;
    }

    const sentence = SENTENCE_LABEL.exec(line);
    if (sentence) {
      blocks.push({ type: "labelled", label: sentence[1], text: sentence[2] });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  return blocks;
}

/** The text of a block, for a check that nothing was dropped. */
export function blockText(block: InterviewBlock): string {
  return block.type === "labelled"
    ? block.text === ""
      ? `${block.label}:`
      : `${block.label}: ${block.text}`
    : block.text;
}
