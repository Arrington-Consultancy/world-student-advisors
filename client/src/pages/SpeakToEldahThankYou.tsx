import { CounsellorThankYouPage } from "./CounsellorLandingPage";
import { ELDAH_PAGE } from "@/lib/speakToEldah";

/** Where Eldah's Pipedrive form can send the student after submitting. Noindex, linked from nowhere. */
export default function SpeakToEldahThankYou() {
  return <CounsellorThankYouPage content={ELDAH_PAGE} />;
}
