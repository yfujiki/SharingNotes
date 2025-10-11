# Strategy: Project scaffolding & environments

- **Issue**: [#1](https://github.com/yfujiki/SharingNotes/issues/1)
- **Status**: Draft
- **Owner**: TBD
- **Last updated**: 2025-10-11

## Objectives

- Stand up a Next.js App Router project configured for Supabase usage across server and client components.
- Ensure local development and Vercel preview environments share a consistent configuration surface (env vars, secrets, scripts).
- Provide clear contributor documentation for installing dependencies, running the app, and validating the Supabase connection.

## Success Criteria

- Local `pnpm install && pnpm dev` boots the app, rendering a connectivity status page that hits Supabase via both client and server helpers.
- Vercel deploy (preview + production) builds without manual tweaks once environment variables are populated.
- README documents setup, env management, and links to Supabase project configuration.

## Scope

- **In scope**: Next.js project bootstrap, Supabase client wiring, environment variable management, lint/test scripts, documentation.
- **Out of scope**: Auth UX, note domain pages, RLS policies, CI configuration beyond lint/test commands.

## Assumptions

- Node 22.x LTS and pnpm are acceptable defaults for the team; adapt if strategy doc feedback prefers npm/yarn.
- Supabase project already exists; we can fetch URL and anon/service keys from dashboard.
- No existing source code in repository conflicts with App Router bootstrap.

## Proposed Technical Decisions

1. **Framework baseline**
   - Use `create-next-app@latest` with App Router, TypeScript, ESLint, Tailwind optional (confirm with team).
   - Configure absolute imports via `tsconfig.json` baseUrl + paths.
2. **Package management**
   - Adopt `pnpm` for workspace efficiency; commit `pnpm-lock.yaml`. Provide fallback instructions for npm if contributors prefer.
3. **Supabase client abstraction**
   - Create `lib/supabase/client.ts` (for browser) and `lib/supabase/server.ts` (for server components) wrapping `createBrowserClient` / `createServerClient`.
   - Centralize Supabase env variable access, throwing early if missing.
4. **Environment configuration**
   - Maintain `.env.example` and `.env.local` (gitignored). Document required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), optional `NEXT_PUBLIC_SITE_URL`.
   - Provide helper script `scripts/check-env.ts` or a Next middleware to surface missing vars in dev builds.
5. **Quality tooling**
   - Configure ESLint + Prettier alignment (maybe `eslint-config-next` + team overrides) and add `lint`/`typecheck` scripts.
   - Introduce Husky + lint-staged only if team agrees; otherwise mention as future enhancement.
6. **Connectivity page**
   - Build `/app/check/page.tsx` that fetches current user session and runs a sample Supabase query (e.g., `select 1`). Show success/failure states and environment info.

## Work Plan

1. **Bootstrap project skeleton**
   - Run `pnpm create next-app` with desired flags inside repository.
   - Clean default boilerplate (placeholder components, CSS) to a minimal layout.
2. **Set up tooling & scripts**
   - Add `.nvmrc` (optional), configure `pnpm lint`, `pnpm typecheck`, `pnpm test` (placeholder), and update `package.json`.
   - Install dev dependencies for linting, Prettier, and (optionally) testing framework placeholder.
3. **Wire Supabase configuration**
   - Install `@supabase/supabase-js` and create helper modules for server/client usage.
   - Implement utilities to read environment variables safely.
4. **Implement connectivity page**
   - Add route under `/app/(public)/status` or `/check` to verify Supabase connectivity for both SSR and client contexts.
   - Include instructions on replacing this diagnostic page later.
5. **Document environment setup**
   - Update README with: prerequisites (Node/pnpm), Supabase project linking steps, environment variable table, commands cheat-sheet.
   - Include `.env.example` with placeholder values and notes about service-role secrecy.
6. **Verify Vercel deployment**
   - Configure project on Vercel (if not already). Set environment variables (Preview vs Production) using values from Supabase.
   - Trigger deploy, confirm health of connectivity page, and record steps in documentation.

## Deliverables

- Next.js project committed with lint/typecheck scripts.
- `lib/supabase` helpers for client/server usage.
- `.env.example` + README updates detailing setup.
- Diagnostic page verifying Supabase connectivity.
- Notes on Vercel configuration (README section "Deployment").

## Dependencies & Coordination

- Requires Supabase project credentials (coordinate with project owner).
- Requires Vercel project access to configure env vars.
- Depends on Issue #2 for database schema but only for placeholder queries; initial ping can be simple `select now()`.

## Risks & Mitigations

- **Missing env vars cause runtime crashes** → add guard utilities and documentation, run `pnpm dev` smoke test before PR.
- **Service role key exposure** → ensure server-only key is never referenced in client bundles; use Next.js server actions or API route for server calls.
- **Vercel mismatch with local env** → maintain parity by storing env var names identically and documenting differences.

## Validation Plan

- Manual: run `pnpm dev`, visit `/check` page, observe success state.
- Optional automated: add simple Vitest test for env guard utility.
- After deploy: verify Vercel preview loads and the connectivity check passes.

## Follow-ups

- Once Issue #1 lands, initiate Issue #2 schema work and update connectivity page to query real tables.
- Evaluate adding CI (Issue #7) to run lint/typecheck on future PRs.
