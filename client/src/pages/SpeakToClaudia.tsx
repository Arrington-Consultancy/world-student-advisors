import CounsellorLandingPage from "./CounsellorLandingPage";
import { CLAUDIA_PAGE } from "@/lib/speakToClaudia";

/** Speak to Claudia (Tim Hunt, 14 November 2026). Content: client/src/lib/speakToClaudia.ts. Her form sends students to /contact/thank-you. */
export default function SpeakToClaudia() {
  return <CounsellorLandingPage content={CLAUDIA_PAGE} />;
}
