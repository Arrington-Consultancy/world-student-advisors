import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trackMetaPageView } from "@/lib/metaPixel";

/**
 * Sends a Meta Pixel PageView on each client-side navigation. The first
 * page view is sent by loadMetaPixel() at init, so the initial render is
 * skipped here to avoid counting it twice.
 */
export default function MetaPixelRouteTracker() {
  const [location] = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    trackMetaPageView();
  }, [location]);

  return null;
}
