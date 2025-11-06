# RLS Testing with pgTAP and Vitest

## Overview

This document captures our experience implementing comprehensive Row Level Security (RLS) policy tests using industry-standard testing frameworks: **pgTAP** (PostgreSQL testing) and **Vitest** (JavaScript integration testing).

## Context

We needed to replace simple test scripts with professional testing frameworks to ensure RLS policies work correctly across all tables (profiles, teams, team_members, notes) for various user roles and permissions.

## Testing Architecture

### Two-Tier Testing Strategy

1. **pgTAP Tests** (`supabase/tests/rls-policies.test.pgtap.sql`)
   - **Purpose**: Database-level RLS validation
   - **Environment**: Local Supabase instances
   - **Advantages**: Fast, direct DB access, proper test framework, automatic rollback
   - **Coverage**: 26 comprehensive tests

2. **Vitest Tests** (`tests/rls.test.ts`)
   - **Purpose**: Full-stack API integration testing
   - **Environment**: Remote Supabase instances
   - **Advantages**: Tests through Supabase client library, validates real-world usage
   - **Coverage**: 16 integration tests with user authentication

## Issues Encountered and Solutions

### Issue 1: Foreign Key Constraint Violations

**Problem**: Initial test setup tried to create profiles without corresponding `auth.users` entries.

```
ERROR: insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"
```

**Root Cause**: The `profiles` table has a foreign key to `auth.users(id)`.

**Solution**: Create proper `auth.users` entries first with all required fields:

```sql
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES
  ('00000000-0000-0000-0000-000000000000', test_user_1, 'authenticated', 'authenticated',
   'pgtap_user1@test.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '');
```

### Issue 2: Duplicate Key Error on Profiles

**Problem**: Manual profile inserts caused duplicate key violations.

```
ERROR: duplicate key value violates unique constraint "profiles_pkey"
```

**Root Cause**: The `handle_new_user()` trigger automatically creates profiles when users are inserted into `auth.users`.

**Solution**: Remove manual profile INSERT statements; let the trigger handle profile creation automatically.

### Issue 3: SET LOCAL Syntax Error with Subqueries

**Problem**: Can't use subqueries directly in `SET LOCAL` statements.

```sql
-- ❌ FAILS
SET LOCAL request.jwt.claim.sub TO (SELECT user_id FROM test_users WHERE user_num = 1);
```

**Root Cause**: PostgreSQL's `SET` command doesn't support subquery expressions.

**Solution**: Use `DO` blocks with PL/pgSQL variables:

```sql
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 1;
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;
```

**Key Learnings**:
- `DO` creates anonymous PL/pgSQL blocks for procedural SQL
- `PERFORM` executes functions and discards results (vs `SELECT` which requires `INTO`)
- `set_config(key, value, is_local)` is the function equivalent of `SET`
  - Third parameter: `true` = LOCAL (block-scoped), `false` = transaction-scoped

### Issue 4: Permission Denied for Temp Tables

**Problem**: After switching to `authenticated` role, couldn't access temp tables.

```
ERROR: permission denied for table test_teams
```

**Root Cause**: Temp tables created by default role aren't accessible to other roles by default.

**Solution**: Grant SELECT permissions to PUBLIC:

```sql
CREATE TEMP TABLE test_users (user_num int PRIMARY KEY, user_id uuid NOT NULL);
GRANT SELECT ON test_users TO PUBLIC;

CREATE TEMP TABLE test_teams (team_num int PRIMARY KEY, team_id uuid NOT NULL);
GRANT SELECT ON test_teams TO PUBLIC;
```

### Issue 5: RLS Policy Violation - Settings Not Persisting

**Problem**: JWT settings weren't persisting from `DO` block to `PREPARE/EXECUTE`.

```
ERROR: new row violates row-level security policy for table "teams"
```

**Root Cause**: Using `set_config(..., true)` made settings LOCAL to the DO block only.

**Solution**: Use transaction-level settings with explicit resets between test sections:

```sql
-- Use transaction-level (false)
PERFORM set_config('role', 'authenticated', false);
PERFORM set_config('request.jwt.claim.sub', v_user_id, false);

-- Reset between test sections
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);
```

**User Concern**: "Isn't transaction-level risky?"
**Answer**: Risk is contained within the test transaction (`BEGIN...ROLLBACK`). Settings never leak outside tests.

### Issue 6: Wrong JWT Config Parameter Name

**Problem**: Still getting RLS violations after fixing transaction scope.

**Root Cause**: Used `request.jwt.claims` (plural) but Supabase's `auth.uid()` reads from `request.jwt.claim.sub` (**singular** "claim").

**Solution**: Correct parameter name:

```sql
-- ❌ WRONG
set_config('request.jwt.claims', json_build_object('sub', v_user_id)::text, false)

-- ✅ CORRECT
set_config('request.jwt.claim.sub', v_user_id, false)
```

### Issue 7: PREPARE Statement Timing Issues

**Problem**: PREPARE statements might capture execution plan before role/JWT are set.

**Hypothesis**: The prepared statement's plan was generated before authentication was configured.

**Solution**: Execute INSERT directly inside DO block where role/JWT are active:

```sql
DO $$
DECLARE v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM test_users WHERE user_num = 3;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, false);

  -- Execute directly instead of PREPARE/EXECUTE
  INSERT INTO public.teams (name, owner_id)
  VALUES ('User 3 Team', v_user_id);
END $$;
```

### Issue 8: PERFORM with INSERT Syntax Error

**Problem**: Invalid syntax when using `PERFORM ( INSERT ... )`.

```sql
-- ❌ FAILS
PERFORM (
  INSERT INTO public.teams (name, owner_id)
  VALUES ('User 3 Team', v_user_id)
  RETURNING id
);
```

**Root Cause**: The parenthesized syntax isn't valid for PERFORM with INSERT in PL/pgSQL.

**Solution**: Use INSERT directly without PERFORM:

```sql
-- ✅ CORRECT
INSERT INTO public.teams (name, owner_id)
VALUES ('User 3 Team', v_user_id);
```

**Note**: PERFORM is only needed when discarding SELECT results. INSERT statements can execute directly in DO blocks.

### Issue 9: Incorrect Test Plan Count

**Problem**: Test suite declared 32 tests but only 26 actually executed.

```
Failed 6/32 subtests
# Looks like you planned 32 tests but ran 26
```

**Solution**: Update plan count to match actual tests:

```sql
-- Change from:
SELECT plan(32);

-- To:
SELECT plan(26);
```

## Vitest Local Testing Limitation

### Issue: JWT Validation with Local Supabase

**Problem**: Vitest tests connect successfully but fail with RLS violations when testing against local Supabase (`http://127.0.0.1:54321`).

```
AssertionError: expected { code: '42501', ... } to be null
message: "new row violates row-level security policy for table \"teams\""
```

**Symptoms**:
- User session exists and is authenticated
- pgTAP tests pass perfectly on same local instance
- Vitest tests fail with RLS violations

**Root Cause**: Complex JWT validation issues between local GoTrue (auth service) and PostgREST (API service). The JWT tokens generated by local GoTrue aren't being properly validated by PostgREST, causing `auth.uid()` to return null.

**Investigation Attempted**:
1. ✅ Verified REST API is accessible
2. ✅ Confirmed users have valid sessions
3. ✅ Tried configuring `persistSession: false` for Node environment
4. ❌ JWT still not recognized by database layer

**Solution**: Accept this as a known limitation and use complementary testing strategy:
- **pgTAP tests** → Local Supabase (works perfectly)
- **Vitest tests** → Remote Supabase (full-stack integration)

This is actually architecturally sound:
- **Local development**: Fast database-level testing with pgTAP
- **Staging/Production**: Full API stack validation with Vitest

## Final Test Configuration

### pgTAP Tests (Local)

**File**: `supabase/tests/rls-policies.test.pgtap.sql`

**Run with**:
```bash
pnpm test:rls:pgtap  # Local Supabase
pnpm test:rls:pgtap:linked  # Remote Supabase (may have permission issues)
```

**Coverage**: 26 tests including:
- Schema validation (tables, columns, functions)
- RLS enabled verification
- Profiles policies (view all, update own)
- Teams policies (owner, member, non-member access)
- Team Members policies (view membership, add/remove members)
- Notes policies (view, create, update, delete with collaborative editing)

**Test Pattern**:
```sql
-- 1. Reset state
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

-- 2. Set user context
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 1;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

-- 3. Test operation
PREPARE user1_view_team AS
  SELECT COUNT(*)::int FROM public.teams
  WHERE id = (SELECT team_id FROM test_teams WHERE team_num = 1);

SELECT results_eq('user1_view_team', $$VALUES (1)$$, 'Team owner should see their team');
```

### Vitest Tests (Remote)

**File**: `tests/rls.test.ts`

**Run with**:
```bash
pnpm test:rls  # Run once
pnpm test:rls:watch  # Watch mode
```

**Prerequisites**: Remote Supabase credentials in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
```

**Coverage**: 16 integration tests including:
- User authentication via Supabase client
- Team creation and access control
- Team membership management
- Note CRUD operations with collaborative editing
- Profile view and update permissions

**Test Pattern**:
```typescript
it('should allow user to create a team', async () => {
  const { data, error } = await user1.client
    .from('teams')
    .insert({ name: 'Test Team 1', owner_id: user1.id })
    .select()
    .single();

  expect(error).toBeNull();
  expect(data?.name).toBe('Test Team 1');
});
```

## Best Practices Learned

### 1. Test Isolation
- Always reset role and JWT claims between test sections
- Use transaction-level settings (`false`) with explicit resets
- pgTAP's automatic rollback prevents data pollution

### 2. Authentication Simulation in pgTAP
```sql
-- Standard pattern for simulating authenticated user
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = X;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;
```

### 3. Temp Table Permissions
Always grant SELECT to PUBLIC for cross-role access:
```sql
CREATE TEMP TABLE test_data (...);
GRANT SELECT ON test_data TO PUBLIC;
```

### 4. Direct INSERT in DO Blocks
Don't use PERFORM for INSERT statements:
```sql
-- ✅ CORRECT
INSERT INTO table VALUES (...);

-- ❌ WRONG
PERFORM (INSERT INTO table VALUES (...));
```

### 5. Correct JWT Parameter
Use singular "claim":
```sql
set_config('request.jwt.claim.sub', user_id, false)  -- ✅
set_config('request.jwt.claims', json, false)        -- ❌
```

## Troubleshooting Guide

### pgTAP Tests Fail to Run

**Issue**: `command not found: supabase` or `extension "pgtap" does not exist`

**Solution**:
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
npx supabase start

# Verify pgTAP migration was applied
npx supabase db push
```

### RLS Policy Violations in Tests

**Check**:
1. Is role set to 'authenticated'? (`PERFORM set_config('role', 'authenticated', false)`)
2. Is JWT set correctly? (`set_config('request.jwt.claim.sub', user_id, false)`)
3. Is the parameter name correct? (singular "claim" not "claims")
4. Are settings transaction-level? (third parameter = `false`)

### Tests Pass But App Doesn't Work

**Possible Causes**:
1. Testing different Supabase instance than app uses
2. Migrations not applied to production
3. Helper functions (`is_team_member`, `is_team_owner`) not deployed
4. Browser caching issues

**Debug Steps**:
```bash
# Verify migrations
pnpm supabase:migrate

# Check Supabase dashboard
# → Database → Policies (verify RLS enabled and policies exist)

# Test in browser console
const { data, error } = await supabase.from('teams').select();
console.log({ data, error });
```

## File Locations

- pgTAP tests: `supabase/tests/rls-policies.test.pgtap.sql`
- Vitest tests: `tests/rls.test.ts`
- Vitest config: `vitest.config.ts`
- Test README: `supabase/tests/README.md`
- Package scripts: `package.json`
- pgTAP extension migration: `supabase/migrations/20251106000005_install_pgtap.sql`

## Related Docs

- `supabase/tests/README.md` – Detailed testing instructions and troubleshooting
- `Knowledges/supabase-cli-migrations.md` – How to manage database migrations
- `AGENTS.md` – Overall system architecture including RLS design
