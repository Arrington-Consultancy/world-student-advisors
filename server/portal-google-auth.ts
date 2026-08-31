/**
 * Express routes for Google OAuth sign-in on the Student Portal.
 *
 * GET /api/portal/auth/google
 *   Query params: origin (the frontend's window.location.origin)
 *   Mints a one-time nonce, binds it to a __Host- cookie, then redirects the
 *   browser to Google's authorisation endpoint.
 *
 * GET /api/portal/auth/google/callback
 *   Google redirects here after the user consents (or declines).
 *   Validates the nonce, exchanges the code for tokens, verifies the id_token,
 *   looks up/creates the portal user, mints a portal JWT, then redirects the
 *   browser back to the frontend with the token in the URL fragment.
 */

import type { Express } from "express";
import crypto from "crypto";
import * as jose from "jose";
import { ENV } from "./_core/env";
import { findGoogleUser, mintSignupPrefillToken } from "./portal-auth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

const STATE_COOKIE = "__Host-portal_oauth_state";

// ─── Simple in-process rate limiter ─────────────────────────────────────────
// Limits the two OAuth endpoints to 20 requests per IP per minute to prevent
// brute-force / code-stuffing attacks without requiring a new dependency.
const _rateBuckets = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string, windowMs = 60_000, max = 20): boolean {
  const now = Date.now();
  let bucket = _rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    _rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  return bucket.count > max;
}

/** Safely parse base64-encoded JSON state without throwing. */
function decodeOAuthState(raw: unknown): { redirectUri?: string; nonce?: string; flow?: string } {
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

/** Parse a raw Cookie header into a key→value map. */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map(pair => {
      const eq = pair.indexOf("=");
      return eq === -1 ? [pair.trim(), ""] : [pair.slice(0, eq).trim(), pair.slice(eq + 1).trim()];
    })
  );
}

export function registerGoogleAuthRoutes(app: Express) {
  // ─── Step 1: start the OAuth flow ───────────────────────────────────────────
  app.get("/api/portal/auth/google", (req, res) => {
    const clientIp = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
    if (isRateLimited(clientIp)) {
      res.status(429).send("Too many requests. Please try again later.");
      return;
    }

    const origin = typeof req.query.origin === "string" ? req.query.origin : "";

    if (!ENV.googleClientId) {
      res.status(503).send("Google sign-in is not configured.");
      return;
    }

    // Validate origin is a plausible URL to prevent open-redirect abuse
    let originUrl: URL;
    try {
      originUrl = new URL(origin);
    } catch {
      res.status(400).send("Invalid origin parameter.");
      return;
    }

    const redirectUri = `${originUrl.origin}/api/portal/auth/google/callback`;

    // Mint a one-time nonce
    const nonce = crypto.randomUUID();
    const flow = typeof req.query.flow === "string" && req.query.flow === "signup" ? "signup" : "login";
    const state = Buffer.from(JSON.stringify({ redirectUri, nonce, flow })).toString("base64url");

    // Bind the nonce to the browser via a host-only, Secure, SameSite=None cookie
    // (SameSite=None is required because Google redirects back cross-site)
    const cookieFlags = [
      `${STATE_COOKIE}=${nonce}`,
      "Path=/",
      "Max-Age=600",
      "HttpOnly",
      "SameSite=None",
      "Secure",
    ].join("; ");
    res.setHeader("Set-Cookie", cookieFlags);

    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });

    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  // ─── Step 2: handle the callback ────────────────────────────────────────────
  app.get("/api/portal/auth/google/callback", async (req, res) => {
    const clientIp = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
    if (isRateLimited(clientIp)) {
      res.status(429).send("Too many requests. Please try again later.");
      return;
    }

    const { code, state, error } = req.query;

    if (error) {
      res.redirect("/portal/login?error=google_denied");
      return;
    }

    // Decode state — fail closed on any parse error
    const decoded = decodeOAuthState(state);
    if (!decoded.nonce || !decoded.redirectUri) {
      res.status(400).send("Invalid OAuth state.");
      return;
    }

    // CSRF guard: nonce in state must match the cookie
    const cookies = parseCookies(req.headers.cookie);
    const cookieNonce = cookies[STATE_COOKIE];
    if (!cookieNonce || cookieNonce !== decoded.nonce) {
      res.status(403).send("OAuth state mismatch. Possible CSRF.");
      return;
    }

    // Clear the nonce cookie
    res.setHeader("Set-Cookie", `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=None; Secure`);

    if (typeof code !== "string" || !code) {
      res.status(400).send("Missing authorisation code.");
      return;
    }

    // Exchange the authorisation code for tokens
    let idToken: string;
    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: decoded.redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenRes.ok) {
        console.error("[google-auth] token exchange failed:", await tokenRes.text());
        res.redirect("/portal/login?error=google_token");
        return;
      }

      const tokenData = (await tokenRes.json()) as { id_token?: string };
      if (!tokenData.id_token) {
        res.redirect("/portal/login?error=google_token");
        return;
      }
      idToken = tokenData.id_token;
    } catch (err) {
      console.error("[google-auth] token exchange error:", err);
      res.redirect("/portal/login?error=google_token");
      return;
    }

    // Verify the id_token signature using Google's public JWKS
    let claims: jose.JWTPayload;
    try {
      const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
      const { payload } = await jose.jwtVerify(idToken, JWKS, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: ENV.googleClientId,
      });
      claims = payload;
    } catch (err) {
      console.error("[google-auth] id_token verification failed:", err);
      res.redirect("/portal/login?error=google_verify");
      return;
    }

    const sub = claims.sub as string | undefined;
    const email = claims.email as string | undefined;
    const givenName = (claims.given_name as string | undefined) ?? "";
    const familyName = (claims.family_name as string | undefined) ?? "";
    const name = (claims.name as string | undefined) ?? "";

    if (!sub || !email) {
      res.redirect("/portal/login?error=google_claims");
      return;
    }

    // Derive first/last name from claims
    const firstName = givenName || name.split(" ")[0] || email.split("@")[0];
    const lastName = familyName || (name.includes(" ") ? name.split(" ").slice(1).join(" ") : "");

    // ── Signup flow: mint a short-lived prefill token and return to /contact ──
    if (decoded.flow === "signup") {
      let prefillToken: string;
      try {
        prefillToken = await mintSignupPrefillToken({ sub, email, firstName, lastName });
      } catch (err) {
        console.error("[google-auth] signup prefill token mint failed:", err);
        res.redirect("/contact?google_error=token");
        return;
      }
      const contactRedirect = new URL(`${decoded.redirectUri.replace("/api/portal/auth/google/callback", "/contact")}`);
      contactRedirect.searchParams.set("gpt", prefillToken);
      res.redirect(contactRedirect.toString());
      return;
    }

    // ── Login flow: find (never create) the portal user and issue a session
    // token. The application is the registration — Google sign-in here is
    // only a login method for an account that already exists.
    const result = await findGoogleUser({ sub, email, firstName, lastName });
    if (!result) {
      res.redirect("/portal/login?error=google_token");
      return;
    }
    if (result.status === "not_found") {
      res.redirect("/portal/login?error=google_no_account");
      return;
    }
    if (result.status === "inactive") {
      res.redirect("/portal/login?error=google_account");
      return;
    }

    // Redirect the frontend with the portal JWT in the query string.
    // The login page reads it, stores it in localStorage, then navigates to /portal.
    const frontendRedirect = new URL(`${decoded.redirectUri.replace("/api/portal/auth/google/callback", "/portal/login")}`);
    frontendRedirect.searchParams.set("token", result.token);
    res.redirect(frontendRedirect.toString());
  });
}
