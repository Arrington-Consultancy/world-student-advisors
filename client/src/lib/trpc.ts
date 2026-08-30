import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

/**
 * The server's own return types, so a component renders the shape the
 * server actually sends rather than a hand-written guess that can drift.
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
