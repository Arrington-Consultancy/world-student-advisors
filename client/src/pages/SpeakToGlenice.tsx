import CounsellorLandingPage from "./CounsellorLandingPage";
import { GLENICE_PAGE } from "@/lib/speakToGlenice";

/** Speak to Glenice (Tim Hunt, 12 November 2026). Content: client/src/lib/speakToGlenice.ts. */
export default function SpeakToGlenice() {
  return <CounsellorLandingPage content={GLENICE_PAGE} />;
}
