import { useState, type FormEvent } from "react";
import { Search, MapPin, UserRound, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Find a student in Pipedrive by phone, email or name.
 *
 * This component holds no authority and applies no filter of its own. The
 * server decides what the signed-in staff member may see, drops anything
 * outside their case scope before it is ever shaped for the browser, and
 * tells us how many it withheld. Showing that count is deliberate: it lets
 * you know a person exists in the CRM and belongs to a colleague, so you ask
 * them rather than create a duplicate.
 *
 * Seven fields per student and nothing else. Notes, money, documents and
 * activity stay in Pipedrive, where the full record lives.
 */
type By = "phone" | "email" | "name";

export function StudentLookup({ token }: { token: string }) {
  const [term, setTerm] = useState("");
  const [by, setBy] = useState<By>("email");
  const [submitted, setSubmitted] = useState<{ term: string; by: By } | null>(null);

  const query = trpc.staffPortal.crmLookup.useQuery(
    { token, term: submitted?.term ?? "", by: submitted?.by ?? "email" },
    { enabled: submitted !== null && submitted.term.length >= 2 },
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = term.trim();
    if (t.length >= 2) setSubmitted({ term: t, by });
  };

  const data = query.data;

  return (
    <section className="rounded-lg border border-wsa-navy/10 bg-white p-5">
      <h2 className="text-base font-semibold text-wsa-navy">Find a student</h2>
      <p className="mt-1 text-sm text-gray-600">
        Searches Pipedrive and shows only the students your access reaches. The full record stays in Pipedrive.
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          value={by}
          onChange={e => setBy(e.target.value as By)}
          className="rounded-lg border border-wsa-navy/20 px-3 py-2 text-sm focus:border-wsa-red focus:outline-none"
          aria-label="Search by"
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="name">Name</option>
        </select>
        <input
          type="text"
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder={by === "phone" ? "+44 7..." : by === "email" ? "student@example.com" : "Student name"}
          className="flex-1 rounded-lg border border-wsa-navy/20 px-3 py-2 text-sm focus:border-wsa-red focus:outline-none"
        />
        <button
          type="submit"
          disabled={term.trim().length < 2 || query.isFetching}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-wsa-red px-4 py-2 text-sm font-medium text-white transition hover:bg-wsa-red/90 disabled:opacity-40"
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          {query.isFetching ? "Searching…" : "Search"}
        </button>
      </form>

      {query.error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          The lookup could not be completed. Try again in a moment.
        </p>
      )}

      {data && data.refused && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <p className="font-medium">You cannot look students up.</p>
          <p className="mt-1">{data.reason}</p>
        </div>
      )}

      {data && !data.refused && (
        <div className="mt-4">
          {data.results.length === 0 && data.withheldCount === 0 && (
            <p className="text-sm text-gray-500">No student in Pipedrive matches that {data.searchedBy}.</p>
          )}
          {data.results.length === 0 && data.withheldCount > 0 && (
            <p className="text-sm text-gray-700">
              {data.withheldCount === 1 ? "One matching student exists" : `${data.withheldCount} matching students exist`} in Pipedrive but
              {data.withheldCount === 1 ? " is" : " are"} outside your case scope. Ask the owning counsellor rather than creating a new record.
            </p>
          )}

          <ul className="divide-y divide-wsa-navy/10">
            {data.results.map(s => (
              <li key={s.personId} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-wsa-navy">{s.name}</p>
                  <p className="text-xs text-gray-500">Pipedrive person {s.personId}</p>
                </div>
                <dl className="mt-1.5 grid gap-x-6 gap-y-1 text-sm text-gray-700 sm:grid-cols-2">
                  <div className="flex gap-1.5"><dt className="text-gray-500">Email</dt><dd>{s.email ?? "none held"}</dd></div>
                  <div className="flex gap-1.5"><dt className="text-gray-500">Phone</dt><dd>{s.phone ?? "none held"}</dd></div>
                  <div className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-gray-400" aria-hidden /><dt className="sr-only">Counsellor</dt><dd>{s.counsellor ?? "no counsellor recorded"}</dd></div>
                  <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gray-400" aria-hidden /><dt className="sr-only">Stage</dt><dd>{s.stageLabel}</dd></div>
                  <div className="flex items-center gap-1.5 sm:col-span-2"><Clock className="h-3.5 w-3.5 text-gray-400" aria-hidden /><dt className="sr-only">Last updated</dt><dd>Updated {s.lastUpdated ? new Date(s.lastUpdated).toLocaleDateString("en-GB") : "unknown"}</dd></div>
                </dl>
              </li>
            ))}
          </ul>

          {data.results.length > 0 && data.withheldCount > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              {data.withheldCount} further {data.withheldCount === 1 ? "match is" : "matches are"} outside your case scope and not shown.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
