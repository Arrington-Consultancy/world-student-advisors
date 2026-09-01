import { trpc } from "@/lib/trpc";
import { Inbox, ShieldAlert, CalendarRange, Building2, MessageSquareText } from "lucide-react";

/**
 * The three staff resource areas requested on 1 September 2026.
 *
 * All three are empty, and this component is written so that empty reads as
 * a deliberate, explained state rather than a broken page. Each area names
 * who is supplying the content and what is still open.
 *
 * Nothing here invents a university, an intake, a partner, a link or a
 * template. On a screen, an invented record is indistinguishable from a
 * real one, and a counsellor would repeat it to a student.
 */
function Awaiting({ suppliedBy, awaiting, openQuestions }: {
  suppliedBy: string | null;
  awaiting: string;
  openQuestions: readonly string[];
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
        <Inbox className="h-4 w-4 shrink-0" aria-hidden />
        Nothing to show yet {suppliedBy ? `, to be supplied by ${suppliedBy}` : ", supplier not yet named"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-amber-900">{awaiting}</p>
      {openQuestions.length > 0 && (
        <>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-amber-800">Still open</p>
          <ul className="mt-1 space-y-1">
            {openQuestions.map((q, i) => (
              <li key={i} className="text-sm leading-relaxed text-amber-900">• {q}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Area({ icon, title, blurb, children }: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-wsa-navy/10 bg-white p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-wsa-navy">
        {icon}
        {title}
      </h3>
      <p className="mb-4 mt-1 text-sm leading-relaxed text-gray-600">{blurb}</p>
      {children}
    </section>
  );
}

export function ResourcesPanel({ token }: { token: string }) {
  const query = trpc.workforce.resources.useQuery({ token }, { enabled: !!token });

  if (query.isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!query.data) return <p className="text-sm text-gray-500">Resources could not be loaded.</p>;

  if (!query.data.permitted) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {query.data.reason}
      </div>
    );
  }

  const { mayIntake, partners, templates, deferred } = query.data;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Area
        icon={<CalendarRange className="h-5 w-5 text-wsa-red" aria-hidden />}
        title="May intake universities"
        blurb="UK universities and courses with a May intake, each with its official source and the date it was last checked. Intakes move between years, so a record without its source and date is not usable."
      >
        {mayIntake.records.length === 0
          ? <Awaiting {...mayIntake.provenance} />
          : null /* Records render here once supplied. */}
      </Area>

      <Area
        icon={<Building2 className="h-5 w-5 text-wsa-red" aria-hidden />}
        title="Partner institutions"
        blurb="WSA partner institutions with their official website, agent portal, undergraduate and postgraduate course links, and January and May course information."
      >
        {partners.institutions.length === 0
          ? <Awaiting {...partners.provenance} />
          : null}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-wsa-navy/10 bg-wsa-stone/40 px-3 py-2.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-wsa-navy" aria-hidden />
          <p className="text-xs leading-relaxed text-gray-700">
            Links only. This area must never hold {partners.mustNotHold.join(", ")}. There is no field
            for any of them, so they cannot be added here later.
          </p>
        </div>
      </Area>

      <Area
        icon={<MessageSquareText className="h-5 w-5 text-wsa-red" aria-hidden />}
        title="Templates and training"
        blurb="Email templates, WhatsApp message templates and training resources. Template wording is text sent to a student under WSA's name, so each one names the controlled record that approved it."
      >
        {templates.messageTemplates.length === 0 && templates.trainingResources.length === 0
          ? <Awaiting {...templates.provenance} />
          : null}
      </Area>

      <section className="rounded-xl border border-wsa-navy/10 bg-wsa-stone/40 p-5">
        <h3 className="text-sm font-semibold text-wsa-navy">Requested and deliberately not built yet</h3>
        <p className="mb-3 mt-1 text-xs leading-relaxed text-gray-600">
          Recorded here so these read as decisions rather than omissions.
        </p>
        <ul className="space-y-1.5">
          {deferred.map((item: string, i: number) => (
            <li key={i} className="text-sm leading-relaxed text-gray-700">• {item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
