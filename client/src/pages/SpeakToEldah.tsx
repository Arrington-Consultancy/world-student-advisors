import CounsellorLandingPage from "./CounsellorLandingPage";
import { ELDAH_PAGE } from "@/lib/speakToEldah";

/** Speak to Eldah, the first Student Counsellor page (Tim Hunt, 12 November 2026). Content: client/src/lib/speakToEldah.ts. */
export default function SpeakToEldah() {
  return <CounsellorLandingPage content={ELDAH_PAGE} />;
}
