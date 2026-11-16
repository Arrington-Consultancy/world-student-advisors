/**
 * The two interview preparation documents as Word files.
 *
 * Staff send the Student Preparation Feedback to a student and carry the WSA
 * Mock Interview Structure into the mock interview. A .txt file is neither
 * sendable nor printable without work, so the plain text the worker produced
 * is laid out here with real Word headings, bullets and bold labels.
 *
 * The content is the worker's, unchanged: the structure comes from
 * shared/interviewDocumentStructure.ts, which only recognises the shape the
 * worker was told to write in and never rewrites a line. Nothing is added but
 * the footer, which names the document and the date it was produced.
 *
 * `docx` is imported dynamically so it is fetched only when a staff member
 * asks for a download, and stays out of the Staff Portal's main bundle.
 *
 * 18 September 2026.
 */
import { parseInterviewDocument } from "@shared/interviewDocumentStructure";

const NAVY = "0B1C2C";
const FONT = "Calibri";

export type InterviewDocxRequest = {
  /** The worker's text, exactly as it was released. */
  text: string;
  /** "Student Preparation Feedback" or "WSA Mock Interview Structure". */
  documentName: string;
  /** The student's name, for the footer. */
  studentName: string;
  /** Shown under the title, e.g. "University CAS Interview". */
  interviewName: string;
  /** True for the interviewer's copy, which is marked confidential. */
  confidential: boolean;
};

export async function interviewDocxBlob(request: InterviewDocxRequest): Promise<Blob> {
  const {
    AlignmentType,
    Document,
    Footer,
    HeadingLevel,
    LevelFormat,
    Packer,
    Paragraph,
    TextRun,
  } = await import("docx");

  const blocks = parseInterviewDocument(request.text);
  // The panel asks for a name, but the file must still be openable and
  // identifiable if one never arrives.
  const studentName = request.studentName.trim() || "Student";
  const body: InstanceType<typeof Paragraph>[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "title":
        body.push(
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 120 },
            children: [new TextRun({ text: block.text, bold: true, size: 32, color: NAVY, font: FONT })],
          }),
        );
        body.push(
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: request.confidential
                  ? `${request.interviewName}. Confidential, for the interviewer only.`
                  : request.interviewName,
                italics: true,
                size: 20,
                color: "555555",
                font: FONT,
              }),
            ],
          }),
        );
        break;

      case "heading":
        body.push(
          new Paragraph({
            heading: block.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
            spacing: { before: 320, after: 120 },
            keepNext: true,
            children: [
              new TextRun({
                text: block.text,
                bold: true,
                size: block.level === 1 ? 26 : 24,
                color: NAVY,
                font: FONT,
              }),
            ],
          }),
        );
        break;

      case "labelled":
        body.push(
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({ text: block.text === "" ? `${block.label}:` : `${block.label}: `, bold: true, size: 22, color: NAVY, font: FONT }),
              ...(block.text === "" ? [] : [new TextRun({ text: block.text, size: 22, font: FONT })]),
            ],
          }),
        );
        break;

      case "bullet":
        body.push(
          new Paragraph({
            numbering: { reference: "wsa-bullets", level: 0 },
            spacing: { after: 120 },
            children: [new TextRun({ text: block.text, size: 22, font: FONT })],
          }),
        );
        break;

      default:
        body.push(
          new Paragraph({
            spacing: { after: 160 },
            children: [new TextRun({ text: block.text, size: 22, font: FONT })],
          }),
        );
    }
  }

  const produced = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const document = new Document({
    creator: "World Student Advisors",
    title: `${request.documentName} for ${studentName}`,
    description: `${request.documentName} for ${studentName}, ${request.interviewName}.`,
    numbering: {
      config: [
        {
          reference: "wsa-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 420, hanging: 220 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${request.documentName} for ${studentName}. Produced by World Student Advisors, ${produced}.`,
                    size: 16,
                    color: "777777",
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });

  return Packer.toBlob(document);
}
