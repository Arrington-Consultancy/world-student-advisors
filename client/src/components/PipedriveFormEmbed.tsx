import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { FORM_FALLBACK, PIPEDRIVE_LOADER_SRC } from "@/lib/advisorLandingPage";

/**
 * A Pipedrive web form, embedded exactly as supplied, through Pipedrive's
 * own loader. A submission goes from the visitor's browser to Pipedrive and
 * never touches this server.
 *
 * The loader runs once the placeholder is in the document, and again on
 * every visit, so the script is appended after mount and removed when the
 * component unmounts. The link underneath stays until the form arrives, so
 * a blocked or slow loader never leaves an empty box. The same pattern as
 * the landing pages' forms.
 */
export default function PipedriveFormEmbed({
  embedUrl,
  privacyLine,
  className = "",
}: {
  embedUrl: string;
  privacyLine?: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const script = document.createElement("script");
    script.src = PIPEDRIVE_LOADER_SRC;
    script.async = true;
    document.body.appendChild(script);
    const observer =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            if (el.querySelector("iframe")) setEmbedded(true);
          });
    observer?.observe(el, { childList: true, subtree: true });
    return () => {
      observer?.disconnect();
      script.remove();
    };
  }, []);

  return (
    <div className={`min-w-0 max-w-full ${className}`}>
      <div ref={host} className="pipedriveWebForms min-w-0 max-w-full" data-pd-webforms={embedUrl} />
      {!embedded && (
        <p className="pt-3 text-sm text-gray-600">
          {FORM_FALLBACK.line}{" "}
          <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:text-wsa-navy">
            {FORM_FALLBACK.cta}
          </a>
        </p>
      )}
      {privacyLine && (
        <p className="pt-3 text-xs leading-relaxed text-gray-500">
          {privacyLine} See our{" "}
          <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-wsa-navy">privacy policy</Link>.
        </p>
      )}
    </div>
  );
}
