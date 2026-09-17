/**
 * A list of students is given in full, or it is not an answer.
 *
 * Tom Arrington, 17 September 2026: "are there any Toms on Pipedrive"
 * found seventeen students recorded as Tom, Thomas, Tommy or Tomas. Handed
 * the list and told to name every one, the model named all fifteen it was
 * given on one run, none on the next and four on the third. A staff member
 * who asked for the Toms and was told "there are seventeen, which one?" has
 * been given a count in place of the thing they asked for.
 *
 * So the reply is checked against the list the evidence layer built, not
 * against the model's own account of it. A reply that leaves students out
 * is put back to the model once, with the missing names, for a rewrite. If
 * the rewrite still leaves anybody out, the list is appended in plain
 * text, one student per line with stage and counsellor exactly as the
 * CRM records them, so what reaches the staff member is complete whatever
 * the model chose to do. Nothing is invented: every line comes from a
 * record the staff member's own lookup returned.
 */
import type { GatheredEvidence, StudentList } from "./evidence";
import type { ListedStudent } from "./studentContext";

/** Students in the list whose first and last recorded names do not both appear in the text. */
export function namesMissing(text: string, list: StudentList): ListedStudent[] {
  const lower = text.toLowerCase();
  return list.students.filter(s => {
    const parts = s.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return false;
    const first = parts[0].toLowerCase();
    const last = parts[parts.length - 1].toLowerCase();
    return !(lower.includes(first) && lower.includes(last));
  });
}

/** The list as plain text: one student per line, stage and counsellor as recorded. */
export function renderStudentList(list: StudentList): string {
  const lines = list.students.map(
    s => `- ${s.name}: ${s.stageLabel}${s.counsellor ? `, counsellor ${s.counsellor}` : ", no counsellor recorded"}`,
  );
  return `Every student recorded as "${list.typed}" or a form of that name (${list.students.length}):\n${lines.join("\n")}\nSay which of these you mean and I will use that record.`;
}

export interface CompletedReply {
  text: string;
  /** What was done to the reply, for the release reason. Null when nothing was. */
  summary: string | null;
}

/**
 * Check the reply against every student list in the evidence. One rewrite
 * is requested through `askAgain`; a rewrite that still omits anybody, or
 * no rewrite at all, leads to the list being appended.
 */
export async function completeStudentLists(
  modelText: string,
  evidence: GatheredEvidence | undefined,
  askAgain: (correction: string) => Promise<string | null>,
): Promise<CompletedReply> {
  const lists = (evidence?.studentLists ?? []).filter(l => l.students.length > 0);
  if (lists.length === 0) return { text: modelText, summary: null };

  const missingIn = (text: string) => lists.map(l => ({ list: l, missing: namesMissing(text, l) })).filter(x => x.missing.length > 0);
  const firstPass = missingIn(modelText);
  if (firstPass.length === 0) return { text: modelText, summary: null };

  const correction =
    firstPass
      .map(x => `Your reply left out ${x.missing.length} of the ${x.list.students.length} students recorded as "${x.list.typed}": ${x.missing.map(s => s.name).join("; ")}.`)
      .join(" ") +
    " Rewrite your whole reply so that it names every one of these students, one per line, each with the stage and counsellor the evidence gives, in plain text, and then ask which one is meant. Leave nobody out.";

  let rewritten: string | null = null;
  try {
    rewritten = await askAgain(correction);
  } catch {
    rewritten = null;
  }
  if (rewritten && rewritten.trim() !== "") {
    if (missingIn(rewritten).length === 0) {
      return { text: rewritten, summary: "The reply was rewritten once so that it names every listed student." };
    }
  }

  // The model did not complete the list. The staff member still gets it.
  const total = (text: string) => missingIn(text).reduce((n, x) => n + x.missing.length, 0);
  const base = rewritten && rewritten.trim() !== "" && total(rewritten) < total(modelText) ? rewritten : modelText;
  const appended = missingIn(base).map(x => renderStudentList(x.list));
  const count = lists.reduce((n, l) => n + l.students.length, 0);
  return {
    text: `${base.trim()}\n\n${appended.join("\n\n")}`,
    summary: `The full list of ${count} matching students was added in plain text because the reply named only some of them.`,
  };
}
