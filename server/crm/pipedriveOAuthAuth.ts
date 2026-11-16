/**
 * The workforce's Pipedrive authentication strategy: Bearer token from the
 * WSA OAuth grant, against the company's own API domain. Fails closed with
 * a plain message when the grant is missing, expired beyond refresh, or
 * unconfigured; never falls back to the website's API token.
 */
import type { PipedriveAuth } from "../pipedrive-read";
import { getPipedriveOAuthAccess, type PipedriveOAuthStatus } from "./pipedriveOAuth";

export const OAUTH_STATUS_MESSAGE: Record<Exclude<PipedriveOAuthStatus, "operational">, string> = {
  unconfigured: "The WSA Pipedrive OAuth application is not configured on this service.",
  not_authorised: "The WSA Pipedrive OAuth application has not been authorised by a WSA account yet.",
  reauthorisation_required: "The WSA Pipedrive OAuth grant can no longer be refreshed and needs to be authorised again.",
};

async function access() {
  const r = await getPipedriveOAuthAccess();
  if (!r.ok) throw new Error(OAUTH_STATUS_MESSAGE[r.status as Exclude<PipedriveOAuthStatus, "operational">]);
  return r;
}

export const pipedriveOAuthAuth: PipedriveAuth = {
  baseUrl: async () => `${(await access()).apiDomain}/api/v1`,
  headers: async () => ({ Authorization: `Bearer ${(await access()).accessToken}` }),
  queryToken: async () => null,
};
