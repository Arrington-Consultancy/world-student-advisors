import CounsellorLandingPage from "./CounsellorLandingPage";
import { MANET_PAGE } from "@/lib/speakToManet";

/** Speak to Manet (Tim Hunt, 12 November 2026). Content: client/src/lib/speakToManet.ts. */
export default function SpeakToManet() {
  return <CounsellorLandingPage content={MANET_PAGE} />;
}
