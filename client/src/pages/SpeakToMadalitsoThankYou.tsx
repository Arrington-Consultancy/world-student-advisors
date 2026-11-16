import AdvisorThankYouPage from "./AdvisorThankYouPage";
import { MADALITSO_PAGE } from "@/lib/speakToMadalitso";

/** Where Madalitso's Pipedrive form sends the student after submitting. Noindex, linked from nowhere. */
export default function SpeakToMadalitsoThankYou() {
  return <AdvisorThankYouPage content={MADALITSO_PAGE} />;
}
