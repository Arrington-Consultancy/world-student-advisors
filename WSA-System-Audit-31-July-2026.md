# WSA System Audit — 31 July 2026

Repository: `Arrington-Consultancy/world-student-advisors`
Branch audited: `claude/wsa-system-audit-afzzqx` (up to date with `main` throughout)
Method: direct code inspection, `tsc --noEmit`, `vitest run`, `vite build`, live production-mode boot tests, and real-browser (Playwright/Chromium) screenshots of the running dev server. No Railway access at any point in this audit — no CLI, no API token, no MCP tool for it. Everything about live deployment state is marked unverified below rather than assumed.

---

## Status note — what has changed since this audit was written

Two pieces of follow-up implementation work landed after the findings below, on this same branch:

1. **Manus editor plugins removed from the production build** (commit `157136c`) — `vitePluginManusRuntime()` and `jsxLocPlugin()` were confirmed (by reading their source) to serve no function outside Manus's own visual editor, and were shipping to every production page load with no `NODE_ENV` gate. Removing them cut `dist/public/index.html` from 369.72 kB to 2.56 kB and the main JS bundle from 994.65 kB to 836.61 kB. Full before/after detail in "Risk 2" under Part 1 and in the implementation log at the end of this document.
2. **AI Interview Readiness Coach rebuilt** (commit `db3f03a`) — from a batch flow (generate all questions, answer all, one evaluation at the end) to a genuine one-question-at-a-time flow with intelligent follow-ups, per-answer scoring (score/strengths/weaknesses/missing information/research homework), and a code-enforced cap of one follow-up per question. The 85% average pass threshold for progressing to a live mock interview is preserved. Portal access remains fully open — no auth gating or rate limiting was added. Full detail at the end of this document.

The **Standard AI Interview Coach Question Bank** referenced throughout Part 3 as "not supplied" has since been received (31 July 2026, PDF) and is recorded in full in the addendum at the end of this document. It has **not yet been wired into the coach** — the coach still generates questions live per interview type rather than drawing from these curated questions. That is the next piece of outstanding work, not yet started as of this document being saved.

Everything else below reflects the state found at the time each section was written, and is otherwise unchanged.

---

# Part 1 — Initial system audit

## 1. Repository structure

Single-app repo: React 19 + Vite client (`client/`), Express + tRPC server (`server/`), Drizzle/MySQL schema (`drizzle/`). No monorepo, no separate portal codebase — the Student Portal is routes inside the same SPA, not a separate app.

Git history is short: 8 commits total at the time of this audit, all dated 29 July 2026. `2dbb530 Initial commit` is a near-empty scaffold; the real codebase lands in `b4aece1 Migrate off Manus: direct Anthropic AI, Gmail SMTP notifications`. The site was exported from the Manus no-code platform and was mid-migration to independent Railway hosting at the time of this audit.

Commit sequence at audit time:
1. `b4aece1` — Migrate off Manus: Anthropic direct, Gmail SMTP, deleted dead Manus scaffolding (voice/heartbeat/maps/image-gen/storage modules; OAuth left in place "confirmed dead")
2. `3f8a3ae` — Add manual Railway preview-deploy workflow
3. `6c5148d` — Replace Manus storage proxy with real static images
4. `956c87f` — Remove dead Manus OAuth/session system
5. `55897cf` — Rebuild Sign-up Form to single Pipedrive Lead workflow
6. `e442286` — Replace Gmail SMTP with Microsoft Graph mail
7. `f3326b5` — Fix Australia/NZ Pipedrive mislabelling, Nigeria phone number

## 2. Frontend/backend architecture

- **Server**: `server/_core/index.ts` is the real entrypoint (`tsx watch server/_core/index.ts` in dev, bundled to `dist/index.js` in build). Express + tRPC (`@trpc/server` v11) at `/api/trpc`, serves the Vite-built SPA statically in production.
- **Dead file found**: `server/index.ts` (33 lines) is a stale duplicate entrypoint — no tRPC router, no portal auth, different static-path logic. Not referenced by any `package.json` script. Confusing dead code, not a live risk, but should be deleted eventually.
- **Client**: wouter for routing (`client/src/App.tsx`), tRPC React Query client, Radix/shadcn UI kit, Tailwind v4.
- **LLM integration**: `server/_core/llm.ts` calls Anthropic directly (`@anthropic-ai/sdk`, model `claude-sonnet-5`), replacing the old Manus Forge proxy. JSON-schema output is implemented as a forced tool call since Anthropic has no native `json_schema` response format.

## 3. Student Portal

Full working auth infrastructure exists in `server/portal-auth.ts`: bcrypt password hashing, JWT (jose, HS256, 7-day expiry), password-reset tokens, a `portal_users` MySQL table. Registration happens automatically after a Sign-up Form submission, which creates a Pipedrive Person+Lead, then a portal user, then emails a password-set link.

**Nothing in the app currently requires login.** Every portal page (`/portal`, `/portal/resources`, `/portal/library`, `/portal/interview-coach`) is a public wouter route with no auth guard, client-side or server-side. Each page reads `localStorage.getItem("portal_token")` only to personalise ("Welcome back, X").

**Correction made during the follow-up audit (Part 2)**: this open-access state was initially assumed to be an accidental side effect of the Manus migration. That was wrong — `todo-o5lhf3hf.md` in the repo records it under `## Open-Access Portal (user request 28 Jul)`, a deliberate, explicit prior request, not a regression. Recorded here for the avoidance of doubt.

Separately, the Interview Coach being open access carries a real cost exposure: it's a public, unauthenticated, unrate-limited endpoint that calls the Anthropic API on every question generated and every answer submitted. No rate limiting exists anywhere in `server/` (confirmed by grep). `docs/TECHNICAL_PLAN.md` specifies "3 per IP per hour" as a requirement that was never implemented. This was flagged as a risk and — per explicit instruction on 31 July — deliberately **not** changed; open access and no rate limiting are preserved by design.

## 4. AI Interview Readiness Coach (as originally built)

`server/interviewCoach.ts` (pre-rebuild) — system prompt had explicit hard rules: never provide model answers, pass mark 85/100, explain *why* each weakness is weak without rewriting it, recommend concrete research topics. Output was structured (Anthropic tool-call schema): score, weaknesses, strengths, research recommendations, summary.

Gaps identified at the time (see Part 3 for the full dedicated audit): questions were generated in one batch up front and answered via Next/Previous navigation with a single evaluation at the very end — no real one-at-a-time interaction, no follow-up questions, no adaptation to a specific university/course beyond one free-text field. **These gaps have since been addressed** — see the Status Note above and the implementation log at the end of this document.

## 5. Authentication

Two separate, unrelated systems, one dead:
- **Manus OAuth "app owner" login** — flagged "confirmed dead" in `b4aece1`, then actually deleted in `956c87f`. Verified: no `oauth.ts`, `sdk.ts`, or `useAuth` hook remain in the tree. Clean removal.
- **Portal JWT auth** (`server/portal-auth.ts`) — technically functional but not gating anything (§3). `JWT_SECRET` env var backs it; if unset, `ENV.cookieSecret` is `""`, meaning the JWT would be signed with a predictable secret (`"" + "-portal"` = `"-portal"`). Could not verify from this session whether `JWT_SECRET` is actually set on Railway. Low real-world impact today since nothing is gated by the token, but worth setting correctly regardless.

## 6. Database

MySQL via Drizzle (`drizzle-orm/mysql2`), lazily connected in `server/db.ts` — the app runs fine with no `DATABASE_URL` set (logs a warning, portal features simply fail closed). Two migrations exist. Schema (`drizzle/schema.ts`):
- `users` — leftover from Manus OAuth, now orphaned, nothing writes to it since OAuth was deleted. Dead table.
- `portal_users` — actively used by sign-up/login/reset flow.
- `resources` — defined in schema, **but no tRPC router queries it**. Actual portal content in `PortalResources.tsx`/`PortalLibrary.tsx` is a hardcoded array in the client source, not DB-driven.
- `failed_submissions` — actively used, a genuinely good pattern: if a sign-up fails to reach Pipedrive, it's durably logged here plus a staff email alert, rather than silently lost.

Could not verify whether these migrations have actually been applied to a live Railway MySQL instance, or whether a MySQL service even exists on the Railway project.

## 7. Pipedrive integration

`server/pipedrive.ts` (330 lines) — searches existing Person by email then phone before creating (avoids duplicates), creates a Lead (not a Deal — a deliberate choice per an in-code comment, not switched to Deals "without direct evidence WSA staff require one"), attaches a formatted Note with the full submission.

Field/option ID maps carry comments dated 2026-07-29 claiming verification "against the live WSA Pipedrive account's /personFields." Could not independently confirm these hex field keys and numeric option IDs from this session — no live Pipedrive credential available. The `f3326b5` Australia/New Zealand mislabelling fix shows this mapping has already had at least one real-world bug, so these should be treated as "believed correct as of 29 Jul," not verified at audit time.

`server/pipedrive.test.ts` validates the token against the live API but fails in every sandbox session used for this audit — expected, since `PIPEDRIVE_API_TOKEN` isn't set in any of these environments. Not evidence of a production problem.

## 8. Email integration

Microsoft Graph (`server/_core/graphMail.ts`), replacing Gmail SMTP as of `e442286`. App-only client-credentials OAuth (`Mail.Send` application permission), sends as `tim.hunt@worldstudentadvisors.com`. The commit message's claim of a verified real send could not be independently re-confirmed — no Microsoft tenant credentials available in any audit session. Code quality is sound: never throws, logs and returns `false` on failure, doesn't block the user-facing response.

## 9. Railway services and deployment configuration

**Could not inspect the Railway project at all**, in either audit session — no Railway CLI, no Railway MCP tool, no API token available. From the repo alone:
- No `railway.json`, `railway.toml`, `Procfile`, or `Dockerfile` — deployment config lives entirely in the Railway dashboard, invisible from here.
- `.github/workflows/deploy-preview.yml` is manual-only (`workflow_dispatch`), explicitly scoped to a separate, throwaway preview project, not the live domain.
- No CI runs on push — no lint/typecheck/test/build gate before merge, and no visible auto-deploy-on-push workflow for the real site.
- `server/_core/env.ts` derives `publicSiteUrl` from `RAILWAY_PUBLIC_DOMAIN` if `PUBLIC_SITE_URL` isn't set — a sensible Railway-aware fallback, the one piece of evidence the app is Railway-aware at all.

No statement can be made about current deployment health, live domain status, or whether the live site matches this branch.

## 10. Environment variables required (from code)

```
DATABASE_URL            MySQL connection string; portal/resources features fail closed without it
JWT_SECRET               portal JWT signing secret (empty string if unset — see §5)
ANTHROPIC_API_KEY        Interview Coach; throws if missing when a request comes in
PIPEDRIVE_API_TOKEN      all Pipedrive writes; throws if missing when a request comes in
MICROSOFT_TENANT_ID
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET  Graph mail; all three required or email silently no-ops (warns, doesn't throw)
MICROSOFT_SEND_AS_MAILBOX  optional, defaults to tim.hunt@worldstudentadvisors.com
STAFF_NOTIFY_EMAILS      optional, comma-separated, defaults to a hardcoded 6-address list in env.ts
PUBLIC_SITE_URL          optional, falls back to RAILWAY_PUBLIC_DOMAIN then localhost
PORT                     optional, defaults 3000
```
Could not confirm which of these are actually set on Railway in either audit session.

## 11. Broken, incomplete, or risky areas — as found

1. **Portal had no access control anywhere** — confirmed deliberate per §3 correction, not a bug.
2. **Manus's builder/debug runtime was shipping to production** — `vite.config.ts` unconditionally included `vitePluginManusRuntime()` and `jsxLocPlugin()`. Confirmed via a real production build: `dist/public/index.html` inlined a ~140 kB minified blob (error catcher, session-replay hooks, contenteditable cursor-style injection, undo/redo handling — Manus's in-browser visual editor). **Resolved 31 July** — see Status Note.
3. **No rate limiting anywhere in `server/`** — despite being a written requirement in `docs/TECHNICAL_PLAN.md`. Exposes the Interview Coach (Anthropic cost) and the sign-up form (Pipedrive spam) to abuse. **Deliberately left unchanged** per explicit 31 July instruction.
4. **`resources` DB table unused** — portal content hardcoded in the client instead.
5. **`users` table orphaned** — dead schema from deleted Manus OAuth.
6. **`server/index.ts` dead duplicate entrypoint**.
7. **`ComponentShowcase.tsx` (1437 lines) and `AIChatBox.tsx` (335 lines) are unrouted dead code** in the client bundle — not reachable by any user, contributing to bundle size.
8. **Pipedrive field/option ID maps unverified from any audit session** — trust the 29 Jul "verified against live account" comment at your own risk until someone re-checks with a real token.
9. **`JWT_SECRET` unset would mean predictable JWT signing** for the portal login — low-stakes while nothing is gated by it.

## 12. What was verified vs not, at initial audit time

**Verified directly**: `pnpm install`, `tsc --noEmit` (clean), `vitest run` (5/6 pass, the 1 failure being the sandbox-only Pipedrive credential test), `vite build` (succeeds, working `dist/index.js` + `dist/public/`). All routing, auth-gating, and Pipedrive/email/LLM logic read directly from source.

**Not verified**: Railway project/services/env vars/deploy history/live domain/logs; live Pipedrive account field IDs and token validity; live Microsoft 365 tenant/Graph delivery; live MySQL database existence or migration state; any live browser/mobile testing of the enquiry form, registration, login, or WhatsApp links.

---

# Part 2 — Follow-up audit: verification, visual inspection, and AI Coach deep-dive

## A. Items "reported completed", verified against current code

| Item | Status | Evidence |
|---|---|---|
| Australia removed, not redirected to NZ | Confirmed | `Contact.tsx` destination dropdown has no Australia option; `server/pipedrive.ts` comment explains the deliberate removal (commit `f3326b5`) |
| OnCampus study locations added | Confirmed | `Partners.tsx` — OnCampus present in partner list and homepage strip |
| Nigeria phone number corrected | Confirmed | `Contact.tsx` and `Counsellors.tsx` both show `+234 812 929 2769` |
| Microsoft Graph email sending implemented | Code confirmed, live delivery not verifiable | `graphMail.ts` is a correctly structured client-credentials OAuth sender; no tenant credentials available to re-test a real send |
| Pipedrive and enquiry flow working | Code confirmed, live API not verifiable | Sound dedupe/Lead/Note logic; live token test still fails in every sandbox for lack of a real credential, proving nothing either way |

## B. Items needing audit/confirmation, verified via live screenshots (Playwright + Chromium against the real running dev server)

**Remove the Hartpury image — was NOT done, despite a prior "verified" claim.** A previous session's todo file (`todo-o5lhf3hf.md`) claimed this complete, but scoped its check only to the "Non-UK Universities" section. Hartpury was still live in three places at audit time: `Partners.tsx:102-108` (Sports Academies card), `Partners.tsx:219` (main UK Universities list), and `Home.tsx:524` (homepage partner-logo strip) — all using `hartpury_78473937.jpg`. Confirmed by screenshot as well as source.

**Remove the General Enquiry form — already done.** `Contact.tsx` has exactly one form (the Sign-up Form). `TrainingWorkshops.tsx` carries an explicit comment: `CTA is a mailto link with pre-filled subject (the general enquiry form was removed)` — done in commit `55897cf`.

**Learning Hub video — a real, reproducible bug found.** The homepage's Learning Hub teaser (`Home.tsx:602-612`) overlays a text caption on top of an image (`youtube_thumb_student_journey_a742c8be.jpg`) that is itself a screenshot of a YouTube thumbnail with its own caption baked in near the bottom. Both text layers land in the same position and become illegible — confirmed live via screenshot. `LearningHub.tsx` itself was checked separately against the older "remove dormant video" note — every entry there maps to a real, live `youtubeId`; the bug is specifically the homepage teaser image, not the Learning Hub page.

**Country grouping — done.** `Counsellors.tsx:280-343` groups the team by region (UK, Kenya, Nigeria, Ghana, Angola, Malawi), confirmed live.

**Google Reviews integration — done, and done honestly.** `Counsellors.tsx:440-459` links to the real WSA Google Business profile (`kgmid=/g/11dyn90b42`). No fabricated review content reproduced on-site.

**Phone number auto-detection — done, working as designed.** `InternationalPhoneInput.tsx` calls `ipapi.co/json/` client-side, sets default country by IP geolocation, falls back to GB silently on failure. Note: `ipapi.co`'s free tier is rate-limited (~1,000 requests/day) — at real marketing volume this could start silently falling back to GB for a portion of visitors.

**WSA font consistency — confirmed, root cause found.** `client/src/index.css:11-12` sets both `--font-sans` and `--font-serif` to `'Source Sans 3'` — there is no distinct heading/display typeface anywhere in the current site. `bugfix_notes.md` in this repo documents a *previous* fix where headings used Cormorant Garamond with a Palatino fallback chain, verified via screenshot at the time. `grep` confirms zero references to Cormorant Garamond anywhere in the current codebase. Read as a regression lost during the Manus-platform migration, when `client/index.html`'s font `<link>` tags were rewritten down to a single Google Fonts request.

**Body text readability — partially confirmed, partially a judgement call.** `--foreground: oklch(0 0 0)` confirms main body text is genuinely pure black, matching a prior "pure black" fix claim. Separately, several sections use low-opacity white text on dark backgrounds (e.g. `Counsellors.tsx`'s "How it works" section uses `text-white/50`) — a real, lower-contrast pattern, but whether it reads as a problem is a judgement call for WSA, not a code defect.

**About page image quality — confirmed, real defect.** The About page hero image (`wsa_who_we_are_banner_02a48684.jpg`) is visibly overexposed — the right two-thirds is blown out with highlights losing detail. Confirmed via screenshot.

**Counsellor photo quality (found while checking, not on the original list)** — Babatunde Abdulia Azeez's photo (`babatunde_azeez_1f9d8fb7.png`) is a video-frame grab with a leftover ▶ play-button icon baked into the image, next to three clean professional headshots for the rest of the Nigeria team. Confirmed via screenshot.

**Correct name order where required — could not verify from code.** Form and counsellor listings apply Western given-name-first order uniformly. No basis in the codebase to determine which, if any, should display differently — needs direct confirmation from the named individuals or WSA staff.

**HND wording — a real structural issue, not just wording.** `Contact.tsx` offers "HND" as an option in both "Highest Qualification" (correct — a qualification already held) and "Desired Level of Study" (questionable — HND isn't a sensible *target* next qualification). `PreMasters.tsx`'s own copy makes exactly this point: HND holders should be routed to Top-Up or Pre-Master's next, not "HND" again. `server/pipedrive.ts`'s `LEVEL_MAP` already documents the resulting confusion: `hnd: 46, // Other (no dedicated HND option in this field — HND lives on Highest Qualification instead)` — meaning a student selecting "HND" as Desired Level has that choice silently recorded as "Other" in Pipedrive.

**Homepage WSA branding under Study Options — no specific defect pinned down.** Checked the homepage's Study Destinations section, the "Trusted education partners" section directly below it, the header logo, and brand-name styling consistency across pages. Found that the stylised `**World**_Student_Advisors` treatment appears on About/Footer/Counsellors but is absent on Home and Study Options (which use plain "WSA"). Real but minor inconsistency — not confidently the thing originally meant; needs a more specific description or screenshot to act on precisely.

**Counsellor font and contact formatting — mostly explained by missing data.** Several counsellor cards have no email/WhatsApp because that data was never supplied (already flagged as blocked in a prior session's notes, still blocked). The visible effect is uneven card bottoms where contact info is present vs absent — not a code defect, downstream of the data gap.

## C. AI Interview Readiness Coach — original mechanics audit (pre-rebuild)

- **Where questions came from**: generated live by Claude on every request via `server/_core/llm.ts` → `server/interviewCoach.ts`. Nothing pre-written or persisted.
- **Hard-coded / prompt / file / database?**: none of the above stored questions — generated fresh per session, never persisted anywhere.
- **How questions were selected**: not "selected" — generated on demand, constrained by interview type, optional free-text course/subject, and a count. No logic controlling emphasis per request beyond the model's own judgement.
- **Intelligent follow-ups?**: no, at the time of this audit — fixed flow: generate N questions up front, student answers all, single evaluation pass at the end. Identified as the single biggest functional gap. **Since resolved** — see Status Note.
- **Scoring and feedback**: single Claude call over the full transcript, returning score/weaknesses/strengths/research recommendations/summary, with an explicit hard rule against ever supplying model answers.
- **Adaptation to course/university/country/visa type**: weak — `interviewType` and a free-text `courseOrSubject` field were the only context; no structured knowledge base of specific universities or visa routes.
- **Portal gating**: none, confirmed deliberate (§A/B above). No rate limiting — confirmed unchanged by design.
- **Staff question bank**: not available at the time of this audit — flagged as a blocking gap rather than fabricated. **Since received** — see Status Note and the addendum at the end of this document.

## D. Technical checks (second pass)

- `tsc --noEmit`: clean.
- `vitest run`: 5/6 pass, same sandbox-only Pipedrive failure as before.
- `vite build` + esbuild server bundle: clean, including a full production-mode boot test.
- **New this pass — verified tRPC error handling empirically rather than assumed**: dev mode leaks full stack traces and file paths in HTTP error responses; production mode was tested directly (built server, `NODE_ENV=production`, live request) and correctly strips this down to just the error message and code. No stack, no paths, in production. This was checked, not assumed, specifically to avoid reporting a false risk.
- Portal auth, Pipedrive, MS Graph: code unchanged since Part 1, same conclusions.
- Railway: still entirely unverifiable.

## E. Risks and priorities identified at the time (see Status Note for what has since been resolved)

1. Hartpury image still live in 3 places, contradicting a prior "done" claim — **still open**.
2. No rate limiting on the public Interview Coach — **deliberately left unchanged**, real cost exposure remains.
3. Lost brand heading font (Cormorant Garamond) — **still open**.
4. Homepage Learning Hub teaser overlapping-caption bug — **still open**.
5. `JWT_SECRET` unconfirmed on Railway — **still open**, low current impact.
6. About page hero image overexposed — **still open**.
7. Manus editor runtime shipping to production — **resolved 31 July**.
8. Interview Coach lacking one-at-a-time flow and follow-ups — **resolved 31 July**.

---

# Implementation log — 31 July 2026

Two pieces of implementation work were completed and pushed to `claude/wsa-system-audit-afzzqx` after the audit above. No deploy, no merge to `main`, no PR opened.

## 1. Manus editor plugins removed (commit `157136c`)

Confirmed by reading plugin source directly that `vitePluginManusRuntime()` and `jsxLocPlugin()` serve no function outside Manus's own visual editor (click-to-edit overlay, error catcher, session replay, and per-element `data-loc` source attributes respectively) and have no `NODE_ENV` gate, so both were shipping to every production page load with nothing on Railway to consume them.

**Files changed**: `vite.config.ts` (removed the two imports and two plugin invocations), `package.json` (removed the two now-unused devDependencies), `pnpm-lock.yaml` (updated via `pnpm install`).

**Before → after production bundle**, verified via a real build:

| File | Before | After | Change |
|---|---|---|---|
| `dist/public/index.html` | 369.72 kB (gzip 106.03 kB) | 2.56 kB (gzip 0.87 kB) | −367.16 kB (−99.3%) |
| `dist/public/assets/index-*.js` | 994.65 kB (gzip 235.43 kB) | 836.61 kB (gzip 216.22 kB) | −158.04 kB (−15.9%) |
| `dist/index.js` (server) | 46.4 kB | 46.3 kB | unchanged |

Grepped the new build for `manus-runtime`, `__MANUS_HOST_DEV__`, and `data-loc` — zero matches. Booted the built server in production mode and confirmed `/`, `/portal`, and a `system.health` tRPC call all still returned correctly. `tsc --noEmit` clean, `vitest run` unaffected (same 5/6 baseline), production build succeeds.

## 2. AI Interview Coach rebuilt (commit `db3f03a`)

Replaced the batch flow with a genuine one-question-at-a-time interview: each answer is assessed as submitted, and a vague/incomplete/contradictory/too-short first attempt gets exactly one intelligent follow-up question before being scored — the cap is enforced in code (`assessAnswer` in `server/interviewCoach.ts` forces `needsFollowUp = false` on any second attempt regardless of what the model returns), not left to the model's discretion.

**Files changed**: `server/interviewCoach.ts` (rewritten), `server/routers.ts` (interviewCoach sub-router replaced), `client/src/pages/InterviewCoach.tsx` (rewritten), `server/interviewCoach.test.ts` (new, 11 tests).

- Four interview types relabelled exactly: "CAS Interview Preparation" / "UKVI Credibility Interview Preparation" / "University Interview Preparation" / "Course-Specific Interview Preparation".
- New endpoints: `startSession`, `submitAnswer` (returns either a follow-up question or a final score/strengths/weaknesses/missingInformation/researchHomework), `finishSession` (pure aggregation, no LLM call, applies the 85% average pass threshold).
- Model-answer prohibition preserved in every prompt; tested by asserting the actual prompt text sent to the LLM contains the rule.
- Course/university personalisation preserved via the existing optional free-text field — no new data invented.
- Open access and no rate limiting preserved exactly — verified live (unauthenticated request returns the expected "ANTHROPIC_API_KEY is not configured" error, not a 401/403).
- No video/audio/camera/microphone/lighting/Wi-Fi assessment added, as instructed.

**Verification**: `tsc --noEmit` clean. `vitest run`: 17 tests, 16 pass (11 new — type labels, follow-up cap enforcement even against a deliberately misbehaving mocked model, blank-answer short-circuit, 85% threshold at the exact boundary, model-answer prohibition in both prompts); the 1 failure is the unrelated pre-existing Pipedrive credential test. Production build succeeds (bundle grew +4.1 kB JS, +3.8 kB server, proportionate to the added logic). Live smoke test against the built production server: `finishSession` genuinely computed 80+90→85%→pass end to end; `startSession`/`submitAnswer` wiring confirmed correct; old endpoint names correctly return 404, confirming a clean rename with no dangling duplicate; `/portal/interview-coach` and `/` still serve 200.

**Explicitly not built, and why**:
- **Saved progress across sessions** — not built. No student identity exists in this flow (open access, no auth by instruction), so there's nothing to attach saved progress to without either requiring identity (conflicts with "keep it openly accessible") or building anonymous local-storage persistence, which wasn't requested and carries its own scope questions (retention, cross-device behaviour) better decided explicitly than assumed.
- **Pipedrive personalisation** — not built, same root cause: no identity signal to link an anonymous coach session to a specific Pipedrive Person.
- **Named-counsellor referral at pass time** — not built, same root cause. The summary screen tells the student they're ready for a live mock interview with their Student Counsellor, but doesn't route to a specific one.

All three share one architectural fork: the coach is intentionally identity-less, and each of these needs to know who the student is. That's a decision point, not an oversight.

---

# Addendum — Standard AI Interview Coach Question Bank (received 31 July 2026)

Supplied by WSA as a PDF on 31 July 2026, after the AI Coach rebuild above. **Not yet wired into the coach** — recorded here in full for reference and as the next piece of outstanding work.

## 1. CAS Interview Preparation

1. Why have you chosen to study in the UK rather than in your home country?
2. What motivated you to choose this particular course, and how does it relate to your academic background?
3. Can you explain how this course will help you achieve your long-term career goals?
4. Why did you choose this university over other institutions offering similar programmes?
5. What other universities did you consider, and why did you ultimately choose this one?
6. What do you know about your course, including the modules you will study?
7. What did you study previously, and how does it prepare you for this programme?
8. Who is sponsoring your studies?
9. How will your tuition fees and living expenses be funded throughout your studies?
10. Can you explain the source of the funds you have shown for your visa application?
11. Do you have any family members living in the UK?
12. What are your plans after completing your studies, and do you intend to return to your home country?
13. What ties do you have to your home country, such as family, employment opportunities, business interests, or property?
14. Have you arranged accommodation for your studies, and can you explain where you plan to live while studying in the UK?

## 2. UKVI Credibility Interview Preparation

1. Why do you want to study in the UK?
2. Why have you chosen this course?
3. Why have you chosen this university?
4. What other universities did you apply to?
5. What do you know about your course and its modules?
6. How does this course relate to your previous studies?
7. How will this course help your future career?
8. Who is paying for your studies?
9. How much are your tuition fees?
10. How will you meet your living expenses in the UK?
11. Do you plan to work while studying in the UK?
12. Do you have relatives or friends in the UK?
13. What will you do after completing your studies?
14. What accommodation arrangements have you made in the UK, and how will you pay for your accommodation during your studies?

## 3. University Interview Preparation

1. Why have you chosen this course?
2. Why have you chosen to study this course at this university?
3. What specific aspects of the curriculum interest you most?
4. Which modules are you most looking forward to studying and why?
5. What do you know about the university and its reputation?
6. What research strengths or facilities of the university attracted you?
7. How does your academic background prepare you for this course?
8. What relevant skills or experience do you bring to this programme?
9. How do you plan to fund your tuition fees and living expenses?
10. What are your academic and professional goals?
11. What are your career plans after completing the course?
12. How will this qualification help you contribute to your home country?
13. What are your expectations of studying and living in the UK?
14. What is the nearest airport to your university, and how do you plan to travel from the airport to your accommodation?

## 4. Course-Specific Interview Preparation

1. Why are you interested in this specific course?
2. What inspired you to pursue this field of study?
3. What do you know about the main subjects covered in this course?
4. Which module interests you the most and why?
5. What skills do you expect to gain from this course?
6. How does this course relate to your previous studies or work experience?
7. What challenges do you expect in this course, and how will you manage them?
8. Have you undertaken any projects, research, or practical activities related to this subject?
9. What current developments or trends in this field interest you?
10. How do you think this course will improve your professional skills?
11. What type of career do you hope to pursue after graduation?
12. How will this qualification help you progress academically or professionally?
13. Why do you believe you are a suitable candidate for this course?
