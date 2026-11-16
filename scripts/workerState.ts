/**
 * Prints the real operational state of every worker, derived exactly as
 * the Staff Portal derives it.
 *
 * Useful when changing the register: the portal reads the same two
 * functions, so if this disagrees with the portal, the portal is stale
 * rather than the register being wrong.
 */
import { listWorkers } from "../server/workforce/registry";
import { getStatusDisplay } from "../client/src/components/workforce/statusDisplay";

for (const w of listWorkers()) {
  const off = w.capabilities.filter(c => c.unavailableBecause).map(c => c.name);
  const display = getStatusDisplay({
    specificationStatus: w.specificationStatus as never,
    staffPortalExecutionStatus: w.staffPortalExecutionStatus as never,
    canOpenForLiveExecution: w.staffPortalExecutionAuthorised,
    gatekeeperReview: w.gatekeeperReview as never,
    unavailableCapabilities: off,
  });
  console.log(
    w.canonicalName.padEnd(30) + display.label.padEnd(20) + (off.length ? `off: ${off.join(", ")}` : ""),
  );
}
