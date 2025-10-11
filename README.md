# Sharing Notes

Starter Next.js app configured for Supabase usage across client and server contexts.

## Prerequisites

- Node.js 22.x (LTS)
- pnpm 9+
- Supabase project (URL + anon/service keys)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Description |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key for trusted server usage |

   > Keep the service role key out of client bundles and version control.

3. Validate your environment configuration:

   ```bash
   pnpm check-env
   ```

   The script reads `.env.local` and warns if required Supabase values are missing or still set to placeholders. It also runs automatically before `pnpm dev`.

4. Start the development server:

   ```bash
   pnpm dev
   ```

   Visit `http://localhost:3000` to confirm the app loads.

5. Verify Supabase connectivity (optional but recommended):

   ```bash
   curl http://localhost:3000/api/supabase-health
   ```

   A healthy response looks like:

   ```json
   {
     "ok": true,
     "serverAuth": "ok",
     "adminAuth": "ok",
     "sampleUserCount": 0
   }
   ```

## Quality checks

- `pnpm lint` – ESLint against the project with Prettier-aligned rules.
- `pnpm typecheck` – TypeScript compiler in no-emit mode.
- `pnpm format` – Prettier write mode for supported files.
- `pnpm format:check` – Prettier verification without modifying files.

## Editor integration

The repo ships with `.vscode/settings.json` to enable Prettier formatting and ESLint fixes on save in VSCode or Cursor. Install the **Prettier - Code formatter** extension if your editor doesn’t already include it.

## Supabase Client Helpers

Shared abstractions live under `lib/supabase/`:

- `lib/supabase/client.ts` – browser singleton for React client components/hooks.
- `lib/supabase/server.ts` – server-side helpers for server components, API routes, and server actions.
- `lib/supabase/env.ts` – guarded access to public Supabase environment variables.
- `lib/supabase/env.server.ts` – server-only accessor for the service role key.

Import the helpers that match your execution environment to avoid leaking secrets:

```ts
// app/some-client-component.tsx
const supabase = getSupabaseBrowserClient();

// app/api/example/route.ts
const supabase = createSupabaseServerClient();
```

## Next Steps

- Scaffold a connectivity check page that pings Supabase from both server and client contexts.
- Add lint/typecheck scripts and align tooling with the project strategy.
