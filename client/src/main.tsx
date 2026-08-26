import { trpc } from "@/lib/trpc";
import { captureAdClickIds } from "@/lib/adClickIds";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot, hydrateRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

// Capture gclid/gbraid/wbraid from the landing URL, if present, regardless
// of which page a visitor first arrives on.
captureAdClickIds();

const queryClient = new QueryClient();

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[API Query Error]", event.query.state.error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[API Mutation Error]", event.mutation.state.error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

const rootEl = document.getElementById("root")!;
const tree = (
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

// Routes prerendered at build time (shared/prerenderRoutes.ts) send real
// markup in #root, marked with data-prerendered so the client knows to
// attach to it (hydrateRoot) instead of replacing it (createRoot) — every
// other route still renders exactly as before.
if (rootEl.dataset.prerendered === "true") {
  hydrateRoot(rootEl, tree);
} else {
  createRoot(rootEl).render(tree);
}
