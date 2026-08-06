import { trpc } from "@/lib/trpc";

/** Fetches the (non-secret) Turnstile site key from the server at request time. */
export function useTurnstileSiteKey(): string {
  const { data } = trpc.system.turnstileSiteKey.useQuery();
  return data?.siteKey ?? "";
}
