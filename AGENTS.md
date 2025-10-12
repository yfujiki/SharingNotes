# Repository Guidelines

## Project Overview
Sharing Notes is a Next.js App Router project wired to Supabase so engineers can rapidly prototype authenticated note-sharing features. The codebase currently focuses on environment safety checks, Supabase connectivity, and deployment readiness instead of domain logic.

## Architecture & Module Layout
- **App Router (`app/`)**: Contains the landing page, diagnostics UI under `check/`, and the `/api/supabase-health` route for server health checks. `layout.tsx` defines global fonts and metadata.
- **Supabase Abstractions (`lib/supabase/`)**: Provides environment guards plus factory functions for browser, server-anon, and service-role clients. Server-only modules use `server-only` to stay out of client bundles.
- **Tooling (`scripts/`, configs)**: `scripts/check-env.ts` validates required Supabase env vars. ESLint/Prettier/TypeScript configuration is in `eslint.config.mjs`, `.prettierrc.json`, and `tsconfig.json`. Workspace editor defaults live in `.vscode/settings.json`.
- **Strategies**: Planning docs live in `Strategies/`; see `issue-1.md` for the scaffolding roadmap. No SOPs are documented yet (`Knowledges/` absent).

## Tech Stack & Integrations
- **Framework**: Next.js 15 App Router with React 19 and TypeScript strict mode.
- **Data Layer**: Supabase JS v2; no database schema committed yet. Service-role key is reserved for privileged server operations.
- **Styling**: Uses default CSS modules (`globals.css`) with utility classes; Tailwind is not enabled despite dependencies.
- **Build Tooling**: pnpm for package management; ESLint + Prettier for formatting; `tsx` for running Node/TS scripts.

## Environment & Secrets
- Mandatory vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only). Guard utilities throw during boot if any are missing.
- `.env.example` documents required values; `.env.local` is gitignored. `pnpm check-env` must succeed before local dev or CI runs.

## Diagnostics & Operations
- Visit `/check` during local or deployed runs to confirm Supabase session access, admin API permissions, and view masked env values.
- `/api/supabase-health` returns a JSON heartbeat consumed by the client diagnostic.
- `pnpm lint`, `pnpm typecheck`, and `pnpm format:check` enforce code quality; (tests not yet implemented).

## Deployment Notes
- Deploy via Vercel’s GitHub integration. Configure the three Supabase env vars for Preview/Production in project settings. Verify `{deployment}/check` and `{deployment}/api/supabase-health` after each release.

## Known Gaps & Next Steps
- No automated tests or database schema migrations are present.
- Tailwind dependency exists but is unused; confirm future styling direction.
- Authentication UX and note-domain features remain unimplemented.

## Related Docs
- `AGENTS-README.md` — documentation index (create/update as docs evolve).
- `Strategies/issue-1.md` — scaffolding strategy and work plan.
- `README.md` — developer quickstart, diagnostics instructions.
