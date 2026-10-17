import AdvisorLandingPage from "./AdvisorLandingPage";
import { MADALITSO_PAGE } from "@/lib/speakToMadalitso";

/** Speak to Madalitso, the Malawi landing page (Tim Hunt, 16 October 2026). Content: client/src/lib/speakToMadalitso.ts. */
export default function SpeakToMadalitso() {
  return <AdvisorLandingPage content={MADALITSO_PAGE} />;
}
