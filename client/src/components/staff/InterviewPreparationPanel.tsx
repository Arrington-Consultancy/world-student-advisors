import { useState, type FormEvent } from "react";
import { FileText, Upload, Copy, Download, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Interview preparation from the student's own documents.
 *
 * Tim Hunt, 18 September 2026: the student should receive specific feedback
 * before the mock interview, from a proper cross-check of their CV,
 * Personal Statement and completed RIQ, and the interviewer should have a
 * structure built on those documents rather than a generic question list.
 *
 * This panel holds no authority. The server decides whether the signed-in
 * staff member may reach the owning worker (James for a university's own
 * interviews, Priya for UKVI), reads the three documents in memory, and
 * returns the two documents or the reason it would not. Nothing uploaded
 * here is stored anywhere.
 */
type Kind = "university_course_credibility" | "university_cas" | "ukvi_credibility";
type Role = "cv" | "personal_statement" | "riq";

const KINDS: { id: Kind; label: string; owner: string }[] = [
  { id: "university_course_credibility", label: "University Course Credibility Interview", owner: "James" },
  { id: "university_cas", label: "University CAS Interview", owner: "James" },
  { id: "ukvi_credibility", label: "UKVI Credibility Interview", owner: "Priya" },
];

const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: "cv", label: "CV", hint: "As submitted with the application." },
  { id: "personal_statement", label: "Personal Statement", hint: "As submitted with the application." },
  { id: "riq", label: "RIQ", hint: "The student's completed Responses to Interview Questions." },
];

interface Supplied {
  filename?: string;
  contentBase64?: string;
  text?: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(s: string): string {
  return s.trim().replace(/[^A-Za-z0-9 _-]/g, "").replace(/\s+/g, " ").trim() || "Student";
}

export function InterviewPreparationPanel({ token }: { token: string }) {
  const [kind, setKind] = useState<Kind>("university_course_credibility");
  const [studentName, setStudentName] = useState("");
  const [supplied, setSupplied] = useState<Record<Role, Supplied>>({ cv: {}, personal_statement: {}, riq: {} });
  const [pasteOpen, setPasteOpen] = useState<Record<Role, boolean>>({ cv: false, personal_statement: false, riq: false });
  const [reading, setReading] = useState(false);
  const [copied, setCopied] = useState<"student" | "interviewer" | null>(null);

  const mutation = trpc.staffPortal.interviewPreparation.useMutation();
  const result = mutation.data;
  const owner = KINDS.find(k => k.id === kind)?.owner ?? "";

  const onFile = async (role: Role, file: File | null) => {
    if (!file) return;
    setReading(true);
    try {
      const contentBase64 = await readFileAsBase64(file);
      setSupplied(s => ({ ...s, [role]: { filename: file.name, contentBase64 } }));
    } finally {
      setReading(false);
    }
  };

  const ready =
    studentName.trim().length >= 2 &&
    ROLES.every(r => (supplied[r.id].contentBase64 && supplied[r.id].filename) || (supplied[r.id].text ?? "").trim().length >= 80);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    mutation.mutate({
      token,
      kind,
      studentName: studentName.trim(),
      documents: ROLES.map(r => ({ role: r.id, ...supplied[r.id] })),
    });
  };

  const copy = async (which: "student" | "interviewer", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* the download button remains */
    }
  };

  return (
    <section className="rounded-lg border border-wsa-navy/10 bg-white p-5">
      <h2 className="text-base font-semibold text-wsa-navy">Interview preparation</h2>
      <p className="mt-1 text-base text-gray-600">
        Choose the interview, name the student, and add their CV, Personal Statement and RIQ. {owner} cross-checks
        all three and produces two documents: feedback to send the student before the mock interview, and the
        structure for whoever conducts it. The documents you add are read once and not stored.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-wsa-navy">Interview</span>
            <select
              value={kind}
              onChange={e => setKind(e.target.value as Kind)}
              className="mt-1 w-full rounded-lg border border-wsa-navy/20 px-3 py-2 text-base focus:border-wsa-red focus:outline-none"
            >
              {KINDS.map(k => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-wsa-navy">Student's name</span>
            <input
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="As it appears on the application"
              className="mt-1 w-full rounded-lg border border-wsa-navy/20 px-3 py-2 text-base focus:border-wsa-red focus:outline-none"
            />
          </label>
        </div>

        <ul className="grid gap-3 md:grid-cols-3">
          {ROLES.map(r => {
            const s = supplied[r.id];
            const have = s.filename ?? ((s.text ?? "").trim().length >= 80 ? "Pasted text" : null);
            return (
              <li key={r.id} className="rounded-lg border border-wsa-navy/10 p-3">
                <p className="text-sm font-semibold text-wsa-navy">{r.label}</p>
                <p className="text-xs text-gray-500">{r.hint}</p>
                <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-wsa-navy/30 px-3 py-2 text-sm text-wsa-navy hover:border-wsa-red">
                  <Upload className="h-4 w-4" aria-hidden />
                  <span className="truncate">{have ?? "PDF, Word or text file"}</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="sr-only"
                    onChange={e => onFile(r.id, e.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPasteOpen(p => ({ ...p, [r.id]: !p[r.id] }))}
                  className="mt-2 text-xs font-medium text-wsa-red"
                >
                  {pasteOpen[r.id] ? "Hide pasted text" : "Or paste the text"}
                </button>
                {pasteOpen[r.id] && (
                  <textarea
                    value={s.text ?? ""}
                    onChange={e => setSupplied(x => ({ ...x, [r.id]: { text: e.target.value } }))}
                    rows={6}
                    className="mt-2 w-full rounded-lg border border-wsa-navy/20 px-3 py-2 text-sm focus:border-wsa-red focus:outline-none"
                    placeholder={`Paste the ${r.label} here`}
                  />
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="submit"
          disabled={!ready || reading || mutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-wsa-red px-4 py-2 text-base font-semibold text-white disabled:opacity-50"
        >
          <FileText className="h-4 w-4" aria-hidden />
          {mutation.isPending ? "Preparing, this takes about a minute" : "Prepare both documents"}
        </button>
      </form>

      {mutation.error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{mutation.error.message}</p>
      )}

      {result && result.outcome !== "prepared" && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden /> Not prepared</p>
          <p className="mt-1">{result.reason}</p>
        </div>
      )}

      {result && result.outcome === "prepared" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-wsa-navy/10 bg-wsa-warm-white p-4 text-sm text-gray-700">
            <p>
              <span className="font-semibold text-wsa-navy">{result.ownerName}</span> prepared both documents for {studentName.trim()}
              {" "}({result.kindLabel}). Readiness: <span className="font-semibold uppercase">{result.status}</span>.
              {result.counts && (
                <> {result.counts.contradictions} contradiction(s), {result.counts.weakAreas} weak area(s), {result.counts.missingInformation} item(s) of missing information.</>
              )}
            </p>
            <p className="mt-1 text-xs text-gray-500">{result.statusMeaning}</p>
            <p className="mt-1 text-xs text-gray-500">
              Read: {result.documents.map(d => `${d.role === "cv" ? "CV" : d.role === "personal_statement" ? "Personal Statement" : "RIQ"} (${d.source}, ${d.characters.toLocaleString()} characters)`).join("; ")}.
            </p>
          </div>

          {[
            { which: "student" as const, title: "Student Preparation Feedback", note: "Send this to the student before the mock interview.", text: result.studentPreparationFeedback ?? "", file: `${safeName(studentName)} - Student Preparation Feedback.txt` },
            { which: "interviewer" as const, title: "WSA Mock Interview Structure", note: "Confidential. For the person conducting the mock interview only.", text: result.mockInterviewStructure ?? "", file: `${safeName(studentName)} - WSA Mock Interview Structure.txt` },
          ].map(doc => (
            <article key={doc.which} className="rounded-lg border border-wsa-navy/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-wsa-navy">{doc.title}</h3>
                  <p className="text-xs text-gray-500">{doc.note}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => copy(doc.which, doc.text)} className="inline-flex items-center gap-1 rounded-lg border border-wsa-navy/20 px-3 py-1.5 text-sm text-wsa-navy hover:border-wsa-red">
                    <Copy className="h-4 w-4" aria-hidden /> {copied === doc.which ? "Copied" : "Copy"}
                  </button>
                  <button type="button" onClick={() => download(doc.file, doc.text)} className="inline-flex items-center gap-1 rounded-lg border border-wsa-navy/20 px-3 py-1.5 text-sm text-wsa-navy hover:border-wsa-red">
                    <Download className="h-4 w-4" aria-hidden /> Download
                  </button>
                </div>
              </div>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-base leading-relaxed text-gray-800">{doc.text}</pre>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
