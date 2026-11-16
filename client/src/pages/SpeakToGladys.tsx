import AdvisorLandingPage from "./AdvisorLandingPage";
import { GLADYS_PAGE } from "@/lib/speakToGladys";

/** Speak to Gladys, the Ghana landing page (Tim Hunt, 24 October 2026). Content: client/src/lib/speakToGladys.ts. */
export default function SpeakToGladys() {
  return <AdvisorLandingPage content={GLADYS_PAGE} />;
}
