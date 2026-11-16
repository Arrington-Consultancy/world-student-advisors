/**
 * Which specialists the Staff Portal's directory shows, and in what mode.
 *
 * Tom Arrington, 16 September 2026: the normal staff experience is Ask WSA
 * AI; manual selection sits behind "Choose a specialist" and shows only the
 * specialists the authenticated member can reach. This is presentation:
 * `reachableByYou` is decided server-side in workforce.listWorkers from the
 * member's functional scopes, and every ask still meets the same server
 * check whatever this function returns. Nothing here grants, hides a
 * permission, or changes who owns what (Operational Standard v1.0 §1 and
 * §33; Access Control Standard v1.0 §9).
 */
export interface DirectoryWorkerLike {
  id: string;
  reachableByYou: boolean;
}

/** Platform and governance functions are never offered as a door. */
export const HIDDEN_FROM_DIRECTORY: ReadonlySet<string> = new Set(["staff_receptionist", "wsa_governance_assurance", "wsa_core_brain"]);

export type DirectoryMode =
  /** The member's own reachable specialists only. */
  | "reachable"
  /** No scope resolved for this login (for example the shared password): the whole roster, as before, with unreachable cards inert. */
  | "all";

export function directoryFor<T extends DirectoryWorkerLike>(workers: readonly T[]): { workers: T[]; mode: DirectoryMode } {
  const visible = workers.filter(w => !HIDDEN_FROM_DIRECTORY.has(w.id));
  const reachable = visible.filter(w => w.reachableByYou);
  if (reachable.length > 0) return { workers: reachable, mode: "reachable" };
  return { workers: visible, mode: "all" };
}
