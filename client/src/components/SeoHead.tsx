import { useEffect } from "react";
import { useLocation } from "wouter";
import { getCanonicalUrl, getLanguageAlternates, getLanguageForPath, getSeoForPath, shouldNoindex } from "@/lib/seo";

// Updates document.title and the meta description / OG / Twitter tags on every
// route change. This is a client-side fix (the app has no SSR/prerendering),
// so it won't help a crawler that doesn't execute JS, but it fixes the
// duplicate-title/description problem for Googlebot and social share previews,
// which do run JS. If true SSR/prerendering is added later, this same SEO_MAP
// can be reused there directly.
export default function SeoHead() {
  const [location] = useLocation();

  useEffect(() => {
    const { title, description } = getSeoForPath(location);

    document.title = title;

    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta(
      'meta[name="robots"]',
      "content",
      shouldNoindex(location) ? "noindex, nofollow" : "index, follow"
    );

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", getCanonicalUrl(location));

    // A translated page (Speak to Pedro) declares its own language and its
    // alternates; every other page is English with none.
    document.documentElement.lang = getLanguageForPath(location);
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    for (const alt of getLanguageAlternates(location)) {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", alt.hreflang);
      link.setAttribute("href", alt.href);
      document.head.appendChild(link);
    }
  }, [location]);

  return null;
}
