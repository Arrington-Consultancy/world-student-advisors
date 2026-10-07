import { useState } from "react";
import { Check, ExternalLink, Link2, Search, X } from "lucide-react";
import { SITE_ORIGIN } from "@shared/seo";
import {
  LIBRARY_RESOURCES,
  LIBRARY_SECTIONS,
  resourcePath,
  resourcesInSection,
  type LibraryResource,
} from "@/lib/studentSupportLibrary";

/**
 * Student Support Library links for the HUB team: the master list of every
 * permanent WSA resource link, for sending to a lead or student.
 *
 * Asked for by Tim Hunt on 7 October 2026. His principle: the Staff Portal
 * holds ALL Student Support Library links and replaces the circulated Word
 * lists (which would drift into different versions); Pipedrive holds
 * ready-to-send templates for the 10 to 15 most used; the WSA website is
 * where the student watches, reads or downloads and discovers more. The
 * objective is to stop sending students straight to YouTube: send the WSA
 * resource page instead, so they stay on the site.
 *
 * Nothing is typed in here. The list is rendered from the same record as
 * the public library (shared/studentSupportLibrary.ts), in the same four
 * sections and the same order, so it cannot fall out of step with the
 * website: a resource added, moved or renamed there appears here the same
 * way on the next deploy. Each row shows WSA number, title and the full
 * permanent link, with Copy link, as Tim asked. Titles open the public
 * page in a new tab so staff can check what the student will see.
 *
 * Only the WSA page link is shown. The YouTube recording is deliberately
 * not here, because the point of the list is to send the WSA page.
 */

/** The absolute permanent link, exactly as a student should receive it. */
export function libraryLinkFor(resource: LibraryResource): string {
  return `${SITE_ORIGIN}${resourcePath(resource.slug)}`;
}

function matches(resource: LibraryResource, needle: string): boolean {
  if (!needle) return true;
  const hay = `${resource.code} ${resource.title}`.toLowerCase();
  return needle.split(/\s+/).every(term => hay.includes(term));
}

function CopyLinkButton({ url, title }: { url: string; title: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      // No clipboard (older browser, or an insecure context): the link is
      // printed in full beside the button, so it can still be selected.
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy link for ${title}`}
      className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors ${
        state === "copied"
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : state === "failed"
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-wsa-navy/20 text-wsa-navy hover:border-wsa-red hover:text-wsa-red"
      }`}
    >
      {state === "copied" ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
      {state === "copied" ? "Copied" : state === "failed" ? "Select the link" : "Copy link"}
    </button>
  );
}

function ResourceRow({ resource }: { resource: LibraryResource }) {
  const url = libraryLinkFor(resource);
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-20 shrink-0 font-mono text-sm font-semibold text-wsa-navy">{resource.code}</span>
      <span className="min-w-0 flex-1">
        <a
          href={url}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-base font-medium text-wsa-navy hover:text-wsa-red"
        >
          {resource.title}
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
        </a>
        <span className="block break-all text-sm text-gray-500 select-all">{url}</span>
      </span>
      <CopyLinkButton url={url} title={`${resource.code} ${resource.title}`} />
    </li>
  );
}

export function LibraryLinksPanel() {
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const shown = LIBRARY_RESOURCES.filter(r => matches(r, needle)).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-xl border border-wsa-navy/10 bg-white p-5">
        <p className="text-base leading-relaxed text-gray-700">
          This is the master list. Every Student Support Library resource is here with its permanent WSA link,
          in the same four sections and the same order as the public library. Send the student the WSA link,
          not the YouTube one: they watch, read and download on our site and can find the other resources from there.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          The list is generated from the website itself, so it is always current. The Word lists of links are withdrawn.
        </p>
        <label className="relative mt-4 block">
          <span className="sr-only">Find a resource by WSA number or title</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Find by WSA number or title, for example 024 or visa"
            className="h-11 w-full rounded-lg border border-wsa-navy/20 bg-white pl-9 pr-10 text-base text-wsa-navy placeholder:text-gray-400 focus:border-wsa-red focus:outline-none focus:ring-2 focus:ring-wsa-red/20"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter("")}
              aria-label="Clear"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-wsa-navy"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </label>
        {needle && (
          <p className="mt-2 text-sm text-gray-500" aria-live="polite">
            {shown === 0 ? "No resource matches." : `${shown} of ${LIBRARY_RESOURCES.length} resources shown.`}
          </p>
        )}
      </div>

      {LIBRARY_SECTIONS.map(section => {
        const rows = resourcesInSection(section.id).filter(r => matches(r, needle));
        if (rows.length === 0) return null;
        return (
          <section key={section.id} aria-labelledby={`library-section-${section.number}`}>
            <h2
              id={`library-section-${section.number}`}
              className="mb-2 flex items-baseline gap-2 text-lg font-semibold text-wsa-navy"
            >
              <span className="text-wsa-red">{section.number}.</span>
              {section.title}
              <span className="text-sm font-normal text-gray-400">({rows.length})</span>
            </h2>
            <ul className="divide-y divide-wsa-navy/10 rounded-xl border border-wsa-navy/10 bg-white">
              {rows.map(resource => (
                <ResourceRow key={resource.code} resource={resource} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
