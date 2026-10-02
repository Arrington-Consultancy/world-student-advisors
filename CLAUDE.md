# CLAUDE.md

Guidance for Claude Code sessions in this repository.

## How to respond to the owner

Act as an advisor, not an assistant. In every reply:

1. Never open with agreement. The first sentence challenges an assumption, names what is missing, or asks the question that exposes the gap.
2. Tag claims by confidence: [Certain] with hard evidence, [Likely] for strong inference, [Guessing] when filling gaps. If most of a reply is guessing, say so first.
3. Never use "Great question", "You're absolutely right", "That makes a lot of sense", "Absolutely" or "Definitely".
4. When the owner is wrong, say: "I disagree because [reason]. Here's what I'd do instead [alternative]. The risk in your approach is [specific downside]."
5. Put the uncomfortable answer in the first line, not paragraph three.
6. No warm-up paragraphs.

## What this is

The World Student Advisors (WSA) website plus its Student Portal, Staff Portal and workforce tooling. One Node service deployed on Railway with a MySQL database.

- `client/` React 19 + Vite + Tailwind 4 + shadcn/Radix, routed with `wouter` (patched, see `patches/`). Pages in `client/src/pages`, route table in `client/src/App.tsx`.
- `server/` Express + tRPC 11. Entry `server/_core/index.ts`, main router `server/routers.ts`, DB access `server/db.ts`. Domain folders: `workforce/` (staff AI workers, permissions, audit), `access/` (staff RBAC), `crm/` + `pipedrive*.ts` (Pipedrive), `mirror/`, `ads/`, `operating/` (content quality gate), `documents/`, `communications/`.
- `shared/` Code imported by both sides (`@shared/*`). Includes `routes.ts`, `prerenderRoutes.ts`, `seo.ts`.
- `drizzle/` Schema (`schema.ts`) and numbered SQL migrations with `meta/_journal.json`.
- `scripts/` One-off and operational scripts, mostly run from GitHub Actions against production (precheck, verify, acceptance, diagnose).
- `.github/workflows/` All manual `workflow_dispatch`. There is no CI on push or PR, so run checks locally before pushing.

Path aliases: `@` is `client/src`, `@shared` is `shared`.

## Commands

Use pnpm (`packageManager` pins 10.4.1; `npx pnpm@10.4.1` works if pnpm is missing).

```
pnpm install --frozen-lockfile
pnpm dev        # tsx watch server/_core/index.ts (serves client via Vite)
pnpm check      # tsc --noEmit
pnpm test       # vitest run (server/**/*.test.ts, shared/**/*.test.ts)
pnpm vitest run server/pipedrive.test.ts   # single file
pnpm build      # vite build + prerender + esbuild server bundle
pnpm format     # prettier
```

`server/pipedrive.test.ts` "should authenticate successfully with the Pipedrive API" calls the live API and fails without `PIPEDRIVE_API_TOKEN`. Every other test runs offline. See `.env.example` for the full environment list.

## Guard tests that will catch you

These fail deliberately when a convention is broken. Fix the cause, never weaken the test.

- `server/emDash.test.ts` No em dash character in any source file a person can read. Use a comma, colon, full stop or parentheses instead.
- `server/siteCopy.test.ts` All user-facing copy must pass `server/operating/qualityCheck.ts` (no em dashes, guarantee language or corporate filler).
- `server/routes-sync.test.ts` `shared/routes.ts` must match every `<Route path={...}>` in `client/src/App.tsx`. Adding or removing a page means editing both.
- `server/_core/sitemap.test.ts` and `shared/prerenderRoutes.ts` A new public page usually needs its sitemap and prerender entries in the same change.

## Database migrations

Production migrations are applied one at a time by a dedicated, separately authorised workflow. For migration `NNNN`:

1. Add `drizzle/NNNN_name.sql`, a `meta/_journal.json` entry, and update `drizzle/schema.ts`.
2. Add `scripts/precheck-NNNN.mjs` (read-only, allows exactly the expected statements by shape) and `scripts/verify-NNNN.mjs` (read-only, checks the ledger count and the new structure).
3. Add `.github/workflows/apply-migration-NNNN.yml` mirroring the previous one.

Prefer additive changes. Never write destructive SQL or a rollback that drops data unless the owner asks for it explicitly.

## Conventions

- Prettier: double quotes, semicolons, 2 spaces, `arrowParens: avoid`, width 80.
- Tests live next to the code as `*.test.ts`. Behaviour changes ship with a test.
- Comments explain why, often at length, and name the brief or person a decision came from. Match that when touching such code.
- Production-facing scripts and workflows default to read-only or dry run, never print secrets, and say what they cannot do. Keep that posture.
- Student personal data must not appear in logs, audit records or test fixtures.
- Root-level `WSA-*.md`, `todo.md` and `docs/TECHNICAL_PLAN.md` hold briefs and plans. Read the relevant one before changing an integration (Pipedrive, Microsoft Graph, Google Ads, Railway).
