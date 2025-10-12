# Strategy: Notes domain schema & auth UX

- **Issue**: [#2](https://github.com/yfujiki/SharingNotes/issues/2)
- **Status**: Draft
- **Owner**: TBD
- **Last updated**: 2025-10-12

## Objectives
- Introduce a minimal notes data model (tables, relationships, RLS policies) to support authenticated users storing and sharing notes.
- Upgrade the Next.js app with Supabase Auth UI flows (sign in/out) and integrate session state into the diagnostics page.
- Provide seed data and local scripts so contributors can validate end-to-end note CRUD operations.

## Success Criteria
- Supabase database hosts `notes` table with row-level security enforcing owner access by default.
- Seed script creates sample users/notes for local testing.
- App displays auth status, allows login/logout, and renders a note list per user.
- `/check` page reflects authenticated states and queries live notes data.

## Scope
- **In scope**: Database schema, Supabase migrations or SQL scripts, auth UI components, note listing/stubbed detail page, documentation updates.
- **Out of scope**: Rich collaborative editing, sharing UI beyond basic list, offline sync, CI automation.

## Assumptions
- Supabase project already configured with email/password auth enabled.
- Team prefers SQL migrations committed to repo (via Supabase CLI or raw SQL).
- Local developers can run Supabase CLI or apply SQL manually.

## Proposed Technical Decisions
1. **Schema management**
   - Use Supabase CLI migrations stored in `supabase/migrations`. Target tables: `profiles` (user metadata) and `notes` (`user_id`, `title`, `content`, timestamps).
   - Define RLS policies: owners can CRUD their notes; optionally allow invited collaborators.
2. **Auth integration**
   - Add Supabase Auth UI (either custom forms or `@supabase/auth-helpers-nextjs`).
   - Persist session in server components using cookies; leverage helper client in `lib/supabase`.
3. **Application updates**
   - Create `/notes` route showing user’s notes fetched server-side.
   - Update `/check` to run a `notes` query when authenticated.
4. **Tooling & scripts**
   - Add `pnpm supabase:migrate` and `pnpm supabase:reset` scripts.
   - Provide seed script or SQL to insert demo notes.

## Work Plan
1. **Database setup**
   - Initialize Supabase CLI migration structure, add `notes` table and policies.
   - Commit migration files and update documentation.
2. **Auth scaffolding**
   - Implement sign-in/sign-out components/routes; ensure session propagation server/client.
   - Update layout to show user avatar/status.
3. **Notes listing**
   - Build `/notes` page with server-side data fetching.
   - Add client hooks for future CRUD.
4. **Diagnostics & docs**
   - Extend `/check` to surface note query results.
   - Update README/AGENTS docs with schema/auth instructions.

## Deliverables
- Supabase migration files and seed scripts.
- Auth UI components linked to Supabase.
- `/notes` page listing logged-in user’s notes.
- Updated diagnostics and documentation (README, AGENTS, Knowledges if SOPs created).

## Dependencies & Coordination
- Requires Supabase project admin access to apply migrations.
- Coordinate with design/product for auth UX decisions.
- Dependent on Issue #1 foundation landing in main branch.

## Risks & Mitigations
- **RLS misconfiguration**: add tests or manual verification for access control.
- **Auth complexity**: start with email/password; document expansion plans.
- **Migration drift**: enforce CLI usage and document workflow in Knowledges.

## Validation Plan
- Run `pnpm supabase:migrate` locally; confirm schema and policies apply.
- Create test accounts, ensure notes CRUD respects RLS.
- Verify `/notes` shows correct data post-login; `/check` displays note query results.

## Follow-ups
- Extend to collaborative sharing (future issue).
- Add automated tests for notes API once schema stabilizes.
- Consider integrating Supabase Realtime for live updates.

## Related Docs
- `Strategies/issue-1.md` – Prior scaffolding plan.
- `AGENTS.md` – System overview and environment requirements.
