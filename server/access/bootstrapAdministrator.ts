/**
 * Is this signed-in person the bootstrap access administrator?
 *
 * Tom Arrington, 17 September 2026: "i need to make my own approval
 * possible, I cant test the system without this." The access screen had
 * refused every self-change since 3 September, correctly for every ordinary
 * administrator and uselessly for the one account that is the root of trust
 * anyway: the account named in ACCESS_BOOTSTRAP_EMAIL, which is set by
 * whoever holds Railway access and could edit the database directly.
 *
 * The answer is computed from two things the request cannot influence: the
 * verified session (an Entra individual identity, so the email was asserted
 * by Microsoft and not typed by anybody) and the deployment's environment.
 * The shared executive session never qualifies: it is not an individual
 * identity, whatever email string it carries. An unset setting means nobody
 * qualifies, so a deployment without the bootstrap variable keeps the old
 * rule for everyone.
 */
import { ENV } from "../_core/env";
import type { StaffSession } from "../staffSession";

export function isBootstrapAdministrator(
  session: StaffSession,
  bootstrapEmail: string = ENV.accessBootstrapEmail,
): boolean {
  if (session.authMethod !== "entra_sso") return false;
  const configured = bootstrapEmail.trim().toLowerCase();
  if (configured === "") return false;
  return session.email.trim().toLowerCase() === configured;
}
