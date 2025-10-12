# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds Next.js App Router routes. Key entries: `page.tsx` (landing), `check/` (Supabase diagnostics), `api/supabase-health/` (health endpoint).
- `lib/supabase/` centralizes browser, server, and service-role clients plus env utilities.
- `scripts/check-env.ts` validates required Supabase environment variables.
- Supporting configuration lives in `eslint.config.mjs`, `tsconfig.json`, `.vscode/settings.json`, and `.env.example`.

## Build, Test, and Development Commands
- `pnpm dev` — start the Next.js dev server.
- `pnpm build` — produce an optimized production build.
- `pnpm start` — run the compiled app locally.
- `pnpm lint` — ESLint with Prettier alignment; fails on warnings.
- `pnpm typecheck` — TypeScript compiler in `--noEmit` mode.
- `pnpm check-env` — load `.env.local` and flag missing Supabase credentials (auto-runs before `pnpm dev`).
- `pnpm format` / `pnpm format:check` — Prettier write or verify modes.

## Coding Style & Naming Conventions
- TypeScript-first, using strict mode (`tsconfig.json`).
- Prettier config: 2-space indentation (default), single quotes, trailing commas, 100-char line width.
- ESLint extends `next/core-web-vitals` and `next/typescript` with `eslint-config-prettier` for formatting harmony.
- Store shared utilities under `lib/`; keep client-entry files under `app/` and server scripts under `scripts/`.

## Testing Guidelines
- No automated test framework yet; add Vitest/Playwright as the product evolves.
- For now, rely on `pnpm check-env`, `/check`, and `/api/supabase-health` diagnostics before submitting changes.

## Commit & Pull Request Guidelines
- Use concise imperative commit messages (e.g., `Add Supabase health endpoint`).
- Link GitHub issues in the PR description and summarize functional impact plus manual verifications (`/check`, curl health, lint/typecheck).
- Include screenshots or terminal output when touching UI or diagnostics to prove success states.

## Deployment Tips
- Deploy via Vercel GitHub integration. Populate Preview & Production env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- After each deploy, validate `{deployment}/check` and `{deployment}/api/supabase-health` return `ok`.
