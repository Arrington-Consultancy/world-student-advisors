import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import App from "./App";

/**
 * Build-time-only render path (see scripts/prerender.mjs). Mirrors the
 * provider tree client/src/main.tsx builds for the browser — same trpc
 * client shape, same QueryClientProvider — so every page renders under
 * exactly the same context it does for a real visitor. The only difference
 * is the router: wouter's default location hook accepts an `ssrPath` on
 * <Router>, which it feeds to React's useSyncExternalStore as the required
 * server snapshot — wouter's own supported SSR path (an earlier attempt to
 * use wouter/memory-location's `static: true` mode does *not* do this and
 * throws "Missing getServerSnapshot" under React 19's real renderToString,
 * despite being wouter's documented-sounding "SSR" helper — ssrPath is the
 * one that actually works). Nothing here ever calls fetch — none of the
 * prerendered routes fire a query on mount, and even if one did, React
 * Query only starts fetching from an effect, which renderToString never
 * runs — so this never makes a network call during the build.
 */
export function renderRoute(path: string): string {
  const queryClient = new QueryClient();
  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
      }),
    ],
  });

  return renderToString(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router ssrPath={path} ssrSearch="">
          <App />
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
