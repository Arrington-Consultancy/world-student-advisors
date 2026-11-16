import AdvisorThankYouPage from "./AdvisorThankYouPage";
import { GLADYS_PAGE } from "@/lib/speakToGladys";

/** Where Gladys's Pipedrive form sends the student after submitting. Noindex, linked from nowhere. */
export default function SpeakToGladysThankYou() {
  return <AdvisorThankYouPage content={GLADYS_PAGE} />;
}
