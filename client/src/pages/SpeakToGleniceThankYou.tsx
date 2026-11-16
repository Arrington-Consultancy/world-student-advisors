import { CounsellorThankYouPage } from "./CounsellorLandingPage";
import { GLENICE_PAGE } from "@/lib/speakToGlenice";

/** Where Glenice's Pipedrive form can send the student after submitting. Noindex, linked from nowhere. */
export default function SpeakToGleniceThankYou() {
  return <CounsellorThankYouPage content={GLENICE_PAGE} />;
}
