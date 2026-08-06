import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import { ENV } from "./env";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  // The site key is not secret — safe to serve to any client. Served at
  // request time (not baked in at Vite build time) so it always reflects
  // the real Railway env var regardless of when the client bundle was built.
  turnstileSiteKey: publicProcedure.query(() => ({ siteKey: ENV.turnstileSiteKey })),
});
