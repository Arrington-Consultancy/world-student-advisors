import { getLanguageForPath } from "@shared/seo";

/**
 * The cookie banner's words, in the page's language. Every page is English
 * except Speak to Pedro's Portuguese pages, where an English banner would be
 * the first thing a family in Luanda reads. The English copy is the banner's
 * original wording, unchanged; what the buttons do is unchanged in both.
 */
export interface ConsentCopy {
  ariaLabel: string;
  heading: string;
  body: string;
  linkLabel: string;
  after: string;
  essentialOnly: string;
  acceptAll: string;
}

const EN: ConsentCopy = {
  ariaLabel: "Cookie consent",
  heading: "Your privacy matters",
  body: "We use essential cookies to make this site work. With your consent, we'd also like to use analytics cookies to understand how families use the site so we can improve it. You can change your mind at any time. Read our",
  linkLabel: "Privacy Policy",
  after: "for details.",
  essentialOnly: "Essential only",
  acceptAll: "Accept all",
};

const PT: ConsentCopy = {
  ariaLabel: "Consentimento de cookies",
  heading: "A sua privacidade é importante",
  body: "Usamos cookies essenciais para que este site funcione. Com o seu consentimento, gostaríamos também de usar cookies de análise para perceber como as famílias usam o site e melhorá-lo. Pode mudar de ideias a qualquer momento. Consulte a nossa",
  linkLabel: "Política de Privacidade (em inglês)",
  after: "para mais informações.",
  essentialOnly: "Apenas essenciais",
  acceptAll: "Aceitar todos",
};

export function consentCopyForPath(path: string): ConsentCopy {
  return getLanguageForPath(path) === "pt" ? PT : EN;
}
