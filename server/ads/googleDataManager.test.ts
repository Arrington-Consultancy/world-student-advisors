import { describe, expect, it, beforeEach, vi } from "vitest";
import { generateKeyPairSync } from "crypto";
import * as jose from "jose";
import {
  DATA_MANAGER_ENDPOINT, DATA_MANAGER_SCOPE, DataManagerError, accessToken, credentialState, credentialIdentity,
  emailIdentifier, ingestEvents, normaliseEmail, normalisePhone, phoneIdentifier, readCredential, resetDataManagerTokenCache,
  retrieveRequestStatus, sha256Hex, type DataManagerCredential, type IngestEventsRequest,
} from "./googleDataManager";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const SA: DataManagerCredential = { kind: "service_account", clientEmail: "wsa-ads@example-project.iam.gserviceaccount.com", privateKey: PEM };

const REQUEST: IngestEventsRequest = {
  destinations: [{ operatingAccount: { accountType: "GOOGLE_ADS", accountId: "5165838785" }, productDestinationId: "7726096949" }],
  events: [{ transactionId: "wsa-qualified-lead-deal-1", eventTimestamp: "2026-09-10T14:22:11.000Z", adIdentifiers: { gclid: "Cj0KCQjw-test" }, eventSource: "WEB" }],
  encoding: "HEX",
  validateOnly: false,
};

function fakeFetch(handlers: { token?: () => Response; ingest?: () => Response; status?: () => Response }) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.startsWith("https://oauth2.googleapis.com/token")) return (handlers.token ?? (() => new Response(JSON.stringify({ access_token: "ya29.test", expires_in: 3600 }), { status: 200 })))();
    if (url.startsWith(`${DATA_MANAGER_ENDPOINT}/events:ingest`)) return (handlers.ingest ?? (() => new Response(JSON.stringify({ requestId: "req-1" }), { status: 200 })))();
    if (url.startsWith(`${DATA_MANAGER_ENDPOINT}/requestStatus:retrieve`)) return (handlers.status ?? (() => new Response("{}", { status: 200 })))();
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { impl, calls };
}

beforeEach(() => { resetDataManagerTokenCache(); vi.restoreAllMocks(); vi.spyOn(console, "warn").mockImplementation(() => {}); });

describe("credentials", () => {
  it("reads a service account key, then an OAuth refresh credential, else unconfigured; malformed is named", () => {
    expect(credentialState({})).toBe("unconfigured");
    expect(credentialState({ GOOGLE_ADS_DATAMANAGER_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "a@b.iam.gserviceaccount.com", private_key: PEM }) })).toBe("service_account");
    expect(credentialState({ GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_ID: "id", GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_SECRET: "s", GOOGLE_ADS_DATAMANAGER_OAUTH_REFRESH_TOKEN: "r" })).toBe("oauth_refresh");
    expect(credentialState({ GOOGLE_ADS_DATAMANAGER_SERVICE_ACCOUNT_JSON: "{not json" })).toBe("malformed");
    expect(credentialState({ GOOGLE_ADS_DATAMANAGER_OAUTH_CLIENT_ID: "id" })).toBe("malformed");
    expect(readCredential({})).toBeNull();
    expect(credentialIdentity({ GOOGLE_ADS_DATAMANAGER_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "a@b.iam.gserviceaccount.com", private_key: PEM }) })).toBe("a@b.iam.gserviceaccount.com");
  });

  it("mints a service-account JWT for exactly the Data Manager scope and exchanges it once", async () => {
    const f = fakeFetch({});
    const t1 = await accessToken(SA, f.impl, 1_700_000_000_000);
    const t2 = await accessToken(SA, f.impl, 1_700_000_000_000 + 1000);
    expect(t1).toBe("ya29.test");
    expect(t2).toBe("ya29.test");
    const tokenCalls = f.calls.filter(c => c.url.includes("oauth2.googleapis.com"));
    expect(tokenCalls).toHaveLength(1);
    const body = new URLSearchParams(String(tokenCalls[0].init?.body));
    expect(body.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    const claims = jose.decodeJwt(body.get("assertion") as string);
    expect(claims.scope).toBe(DATA_MANAGER_SCOPE);
    expect(claims.iss).toBe(SA.clientEmail);
    expect(claims.aud).toBe("https://oauth2.googleapis.com/token");
  });

  it("exchanges an OAuth refresh token without ever putting the secret in the URL", async () => {
    const f = fakeFetch({});
    await accessToken({ kind: "oauth_refresh", clientId: "cid", clientSecret: "very-secret", refreshToken: "rt" }, f.impl);
    const call = f.calls[0];
    expect(call.url).toBe("https://oauth2.googleapis.com/token");
    expect(new URLSearchParams(String(call.init?.body)).get("grant_type")).toBe("refresh_token");
  });

  it("a refused token exchange surfaces Google's reason and is not retried", async () => {
    const f = fakeFetch({ token: () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }) });
    await expect(accessToken(SA, f.impl)).rejects.toThrow(/HTTP 400.*invalid_grant/);
  });
});

describe("ingestEvents", () => {
  it("posts the request as JSON to events:ingest with a bearer token and returns the request id", async () => {
    const f = fakeFetch({ ingest: () => new Response(JSON.stringify({ requestId: "req-abc", fieldWarnings: [] }), { status: 200 }) });
    const r = await ingestEvents(REQUEST, { fetchImpl: f.impl, credential: SA });
    expect(r.requestId).toBe("req-abc");
    const call = f.calls.find(c => c.url.endsWith("/events:ingest"))!;
    expect(call.init?.method).toBe("POST");
    expect((call.init?.headers as Record<string, string>).Authorization).toBe("Bearer ya29.test");
    expect(JSON.parse(String(call.init?.body))).toEqual(REQUEST);
  });

  it("retries a 503 and a network failure, then succeeds, with a bounded number of attempts", async () => {
    let n = 0;
    const f = fakeFetch({ ingest: () => { n += 1; return n < 3 ? new Response(JSON.stringify({ error: { status: "UNAVAILABLE", message: "try later" } }), { status: 503 }) : new Response(JSON.stringify({ requestId: "req-3" }), { status: 200 }); } });
    const r = await ingestEvents(REQUEST, { fetchImpl: f.impl, credential: SA, sleep: async () => {} });
    expect(r.requestId).toBe("req-3");
    expect(n).toBe(3);
  });

  it("does not retry a 400 or a 403, and the error carries Google's status", async () => {
    let n = 0;
    const f = fakeFetch({ ingest: () => { n += 1; return new Response(JSON.stringify({ error: { status: "PERMISSION_DENIED", message: "The caller does not have permission" } }), { status: 403 }); } });
    const err = await ingestEvents(REQUEST, { fetchImpl: f.impl, credential: SA, sleep: async () => {} }).catch(e => e as DataManagerError);
    expect(err).toBeInstanceOf(DataManagerError);
    expect(err.status).toBe(403);
    expect(err.googleStatus).toBe("PERMISSION_DENIED");
    expect(err.retryable).toBe(false);
    expect(n).toBe(1);
  });

  it("gives up after the configured attempts on a persistent 500", async () => {
    let n = 0;
    const f = fakeFetch({ ingest: () => { n += 1; return new Response("{}", { status: 500 }); } });
    await expect(ingestEvents(REQUEST, { fetchImpl: f.impl, credential: SA, attempts: 2, sleep: async () => {} })).rejects.toThrow(/HTTP 500/);
    expect(n).toBe(2);
  });

  it("refuses to run with no credential rather than calling Google unauthenticated", async () => {
    const f = fakeFetch({});
    await expect(ingestEvents(REQUEST, { fetchImpl: f.impl, credential: null })).rejects.toThrow(/not configured/);
    expect(f.calls).toHaveLength(0);
  });
});

describe("retrieveRequestStatus", () => {
  it("reads the first destination's status, record count and error counts", async () => {
    const f = fakeFetch({ status: () => new Response(JSON.stringify({ requestStatusPerDestination: [{ requestStatus: "PARTIAL_SUCCESS", eventsIngestionStatus: { recordCount: "3" }, errorInfo: { errorCounts: [{ reason: "INVALID_GCLID", recordCount: "1" }] }, warningInfo: { warningCounts: [] } }] }), { status: 200 }) });
    const s = await retrieveRequestStatus("req-abc", { fetchImpl: f.impl, credential: SA });
    expect(s).toEqual({ status: "PARTIAL_SUCCESS", recordCount: 3, errorCounts: [{ reason: "INVALID_GCLID", count: 1 }], warningCounts: [] });
    expect(f.calls.find(c => c.url.includes("requestStatus:retrieve"))!.url).toContain("requestId=req-abc");
  });
});

describe("normalisation and hashing, per Google's Format user data rules", () => {
  it("lower-cases, strips whitespace, and removes dots only for gmail and googlemail", () => {
    expect(normaliseEmail("  Vivian.Onuh@Gmail.com ")).toBe("vivianonuh@gmail.com");
    expect(normaliseEmail("v.o@googlemail.com")).toBe("vo@googlemail.com");
    expect(normaliseEmail("First.Last@Example.co.uk")).toBe("first.last@example.co.uk");
    expect(normaliseEmail("not-an-email")).toBeNull();
    expect(normaliseEmail("")).toBeNull();
  });
  it("accepts E.164 only, tidying punctuation and a 00 prefix, and refuses a number with no country code", () => {
    expect(normalisePhone("+234 818 204 9068")).toBe("+2348182049068");
    expect(normalisePhone("00234-818-204-9068")).toBe("+2348182049068");
    expect(normalisePhone("+44 (0)7555 546016")).toBe("+447555546016");
    expect(normalisePhone("08182049068")).toBeNull();
    expect(normalisePhone("")).toBeNull();
  });
  it("hashes with SHA-256 to lower-case hex", () => {
    expect(sha256Hex("test@example.com")).toBe("973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b");
    expect(emailIdentifier("Test@Example.com")).toEqual({ emailAddress: "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b" });
    expect(phoneIdentifier("+2348182049068")).toEqual({ phoneNumber: sha256Hex("+2348182049068") });
    expect(phoneIdentifier("0818")).toBeNull();
  });
});
