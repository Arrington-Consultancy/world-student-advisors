import { CounsellorThankYouPage } from "./CounsellorLandingPage";
import { MANET_PAGE } from "@/lib/speakToManet";

/** Where Manet's Pipedrive form can send the student after submitting. Noindex, linked from nowhere. */
export default function SpeakToManetThankYou() {
  return <CounsellorThankYouPage content={MANET_PAGE} />;
}
