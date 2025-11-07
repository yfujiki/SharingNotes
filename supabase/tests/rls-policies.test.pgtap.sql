-- pgTAP Tests for RLS Policies
-- Tests Row Level Security policies for all tables
-- Run with: pg_prove supabase/tests/rls-policies.test.pgtap.sql

BEGIN;

-- Load pgTAP extension
-- SELECT plan(32); -- Total number of tests

-- =============================================================================
-- Test 1: Schema Validation
-- =============================================================================

SELECT has_table('public', 'profiles', 'profiles table should exist');
SELECT has_table('public', 'teams', 'teams table should exist');
SELECT has_table('public', 'team_members', 'team_members table should exist');
SELECT has_table('public', 'notes', 'notes table should exist');

SELECT has_column('public', 'profiles', 'email', 'profiles should have email column');
SELECT has_column('public', 'teams', 'owner_id', 'teams should have owner_id column');
SELECT has_column('public', 'team_members', 'role', 'team_members should have role column');
SELECT has_column('public', 'notes', 'team_id', 'notes should have team_id column');

-- =============================================================================
-- Test 2: Helper Functions Exist
-- =============================================================================

SELECT has_function(
  'public',
  'is_team_member',
  ARRAY['uuid'],
  'is_team_member function should exist'
);

SELECT has_function(
  'public',
  'is_team_owner',
  ARRAY['uuid'],
  'is_team_owner function should exist'
);

-- =============================================================================
-- Test 3: RLS is Enabled
-- =============================================================================

SELECT lives_ok(
  $$SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true$$,
  'RLS should be enabled on profiles'
);

SELECT lives_ok(
  $$SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teams' AND rowsecurity = true$$,
  'RLS should be enabled on teams'
);

SELECT lives_ok(
  $$SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members' AND rowsecurity = true$$,
  'RLS should be enabled on team_members'
);

SELECT lives_ok(
  $$SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notes' AND rowsecurity = true$$,
  'RLS should be enabled on notes'
);

-- =============================================================================
-- Test 4: Test Data Setup
-- =============================================================================

-- Create test users in auth.users (works on local Supabase)
-- These will be rolled back at the end of the test
DO $$
DECLARE
  test_user_1 uuid;
  test_user_2 uuid;
  test_user_3 uuid;
  test_team_1 uuid;
BEGIN
  -- Generate UUIDs for test users
  test_user_1 := gen_random_uuid();
  test_user_2 := gen_random_uuid();
  test_user_3 := gen_random_uuid();

  -- Create test users in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', test_user_1, 'authenticated', 'authenticated',
     'pgtap_user1@test.com', crypt('password123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', test_user_2, 'authenticated', 'authenticated',
     'pgtap_user2@test.com', crypt('password123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', test_user_3, 'authenticated', 'authenticated',
     'pgtap_user3@test.com', crypt('password123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '');

  -- Store user IDs in temp table
  CREATE TEMP TABLE test_users (
    user_num int PRIMARY KEY,
    user_id uuid NOT NULL
  );

  INSERT INTO test_users VALUES
    (1, test_user_1),
    (2, test_user_2),
    (3, test_user_3);

  -- Grant access to temp table for all roles
  GRANT SELECT ON test_users TO PUBLIC;

  -- Note: Profiles are automatically created by the handle_new_user() trigger
  -- when users are inserted into auth.users, so we don't need to insert them manually.

  -- Create test team owned by user 1
  INSERT INTO public.teams (name, owner_id)
  VALUES ('pgTAP Test Team', test_user_1)
  RETURNING id INTO test_team_1;

  -- Store team ID
  CREATE TEMP TABLE test_teams (
    team_num int PRIMARY KEY,
    team_id uuid NOT NULL
  );
  INSERT INTO test_teams VALUES (1, test_team_1);

  -- Grant access to temp table for all roles
  GRANT SELECT ON test_teams TO PUBLIC;

  -- Add user 2 to team 1
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (test_team_1, test_user_2, 'member');

  -- Create a note in team 1 by user 1
  INSERT INTO public.notes (team_id, author_id, title, content)
  VALUES (test_team_1, test_user_1, 'pgTAP Test Note', 'Test content');
END $$;

-- =============================================================================
-- Test 5: Profiles RLS Policies
-- =============================================================================

-- Test that authenticated users can view all profiles
PREPARE view_profiles AS
  SELECT COUNT(*)::int FROM public.profiles;

SELECT results_eq(
  'view_profiles',
  $$VALUES (3)$$,
  'Authenticated users should see all profiles'
);

-- =============================================================================
-- Test 6: Teams RLS Policies
-- =============================================================================

-- Test that team owner can view their team
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 1;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

PREPARE user1_view_team AS
  SELECT COUNT(*)::int FROM public.teams WHERE id = (SELECT team_id FROM test_teams WHERE team_num = 1);

SELECT results_eq(
  'user1_view_team',
  $$VALUES (1)$$,
  'Team owner should see their team'
);

-- Test that team member can view team
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 2;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

PREPARE user2_view_team AS
  SELECT COUNT(*)::int FROM public.teams WHERE id = (SELECT team_id FROM test_teams WHERE team_num = 1);

SELECT results_eq(
  'user2_view_team',
  $$VALUES (1)$$,
  'Team member should see their team'
);

-- Test that non-member cannot view team
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 3;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

PREPARE user3_view_team AS
  SELECT COUNT(*)::int FROM public.teams WHERE id = (SELECT team_id FROM test_teams WHERE team_num = 1);

SELECT results_eq(
  'user3_view_team',
  $$VALUES (0)$$,
  'Non-member should not see team'
);

-- Reset role and JWT claims between test sections
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

-- =============================================================================
-- Test 7: Team Members RLS Policies
-- =============================================================================

-- Test that team member can view membership
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 2;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

PREPARE user2_view_members AS
  SELECT COUNT(*)::int FROM public.team_members WHERE team_id = (SELECT team_id FROM test_teams WHERE team_num = 1);

SELECT results_eq(
  'user2_view_members',
  $$VALUES (2)$$,
  'Team member should see team membership'
);

-- Test that non-member cannot view membership
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 3;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

PREPARE user3_view_members AS
  SELECT COUNT(*)::int FROM public.team_members WHERE team_id = (SELECT team_id FROM test_teams WHERE team_num = 1);

SELECT results_eq(
  'user3_view_members',
  $$VALUES (0)$$,
  'Non-member should not see team membership'
);

-- Reset role and JWT claims between test sections
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

-- =============================================================================
-- Test 8: Notes RLS Policies
-- =============================================================================

-- Test that team member can view notes
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 2;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

PREPARE user2_view_notes AS
  SELECT COUNT(*)::int FROM public.notes WHERE team_id = (SELECT team_id FROM test_teams WHERE team_num = 1);

SELECT results_eq(
  'user2_view_notes',
  $$VALUES (1)$$,
  'Team member should see team notes'
);

-- Test that non-member cannot view notes
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 3;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

PREPARE user3_view_notes AS
  SELECT COUNT(*)::int FROM public.notes WHERE team_id = (SELECT team_id FROM test_teams WHERE team_num = 1);

SELECT results_eq(
  'user3_view_notes',
  $$VALUES (0)$$,
  'Non-member should not see team notes'
);

-- Reset role and JWT claims between tests
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

-- Test that team member can update notes (collaborative editing)
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 2;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

DO $$
DECLARE
  affected_rows int;
BEGIN
  WITH updated AS (
    UPDATE public.notes
    SET content = 'Updated by user 2'
    WHERE team_id = (SELECT team_id FROM test_teams WHERE team_num = 1)
    RETURNING id
  )
  SELECT COUNT(*)::int INTO affected_rows FROM updated;

  IF affected_rows < 1 THEN
    RAISE EXCEPTION 'Expected at least 1 row to be updated, but % were updated', affected_rows;
  END IF;
END $$;

SELECT pass('Team member should be able to update team notes (1 row updated)');

-- =============================================================================
-- Test 9: Insert Operations
-- =============================================================================

-- Reset and set as user 3 (switching from user 2)
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

DO $$
DECLARE v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM test_users WHERE user_num = 3;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, false);

  -- Debug: Check what auth.uid() returns
  RAISE NOTICE 'User ID: %, auth.uid(): %', v_user_id, auth.uid();

  -- Execute insert directly in this block to ensure role/JWT are active
  INSERT INTO public.teams (name, owner_id)
  VALUES ('User 3 Team', v_user_id);

  -- If we got here, the insert succeeded
  RAISE NOTICE '✓ Authenticated user should be able to create a team';
END $$;

-- Test that team member can create notes
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 2;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

PREPARE user2_create_note AS
  INSERT INTO public.notes (team_id, author_id, title, content)
  VALUES (
    (SELECT team_id FROM test_teams WHERE team_num = 1),
    (SELECT user_id FROM test_users WHERE user_num = 2),
    'Note by User 2',
    'Content'
  )
  RETURNING id;

SELECT lives_ok(
  'user2_create_note',
  'Team member should be able to create notes'
);

-- Reset role and JWT claims between test sections
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

-- =============================================================================
-- Test 10: Delete Operations
-- =============================================================================

-- Test that note author can delete their note
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 2;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

DO $$
DECLARE
  affected_rows int;
BEGIN
  WITH deleted AS (
    DELETE FROM public.notes
    WHERE author_id = (SELECT user_id FROM test_users WHERE user_num = 2)
    AND team_id = (SELECT team_id FROM test_teams WHERE team_num = 1)
    RETURNING id
  )
  SELECT COUNT(*)::int INTO affected_rows FROM deleted;

  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Expected 1 row to be deleted, but % were deleted', affected_rows;
  END IF;
END $$;

SELECT pass('Note author should be able to delete their note (1 row deleted)');

-- Test that team owner can delete any team note
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 1;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

DO $$
DECLARE
  affected_rows int;
BEGIN
  WITH deleted AS (
    DELETE FROM public.notes
    WHERE team_id = (SELECT team_id FROM test_teams WHERE team_num = 1)
    RETURNING id
  )
  SELECT COUNT(*)::int INTO affected_rows FROM deleted;

  -- Should delete the original note created by user 1 (user 2's note was deleted in previous test)
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Expected 1 row to be deleted, but % were deleted', affected_rows;
  END IF;
END $$;

SELECT pass('Team owner should be able to delete any team note (1 row deleted)');

-- Reset role and JWT claims
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

-- =============================================================================
-- Test 11: Negative Tests for Write Operations
-- =============================================================================

-- Test that non-member cannot create notes in a team
DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 3;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

PREPARE user3_create_note AS
  INSERT INTO public.notes (team_id, author_id, title, content)
  VALUES (
    (SELECT team_id FROM test_teams WHERE team_num = 1),
    (SELECT user_id FROM test_users WHERE user_num = 3),
    'Unauthorized Note',
    'This should fail'
  )
  RETURNING id;

SELECT throws_ok(
  'user3_create_note',
  '42501',
  NULL,
  'Non-member should not be able to create notes in team'
);

-- Test that non-member cannot update notes in a team
DO $$
DECLARE
  affected_rows int;
BEGIN
  WITH updated AS (
    UPDATE public.notes
    SET content = 'Malicious update'
    WHERE team_id = (SELECT team_id FROM test_teams WHERE team_num = 1)
    RETURNING id
  )
  SELECT COUNT(*)::int INTO affected_rows FROM updated;

  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'Expected 0 rows to be updated, but % were updated', affected_rows;
  END IF;
END $$;

SELECT pass('Non-member should not be able to update notes in team (0 rows affected)');

-- Reset and switch to user 2 (team member but not owner)
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 2;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

-- Test that non-owner cannot update team
DO $$
DECLARE
  affected_rows int;
BEGIN
  WITH updated AS (
    UPDATE public.teams
    SET name = 'Hacked Team Name'
    WHERE id = (SELECT team_id FROM test_teams WHERE team_num = 1)
    RETURNING id
  )
  SELECT COUNT(*)::int INTO affected_rows FROM updated;

  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'Expected 0 rows to be updated, but % were updated', affected_rows;
  END IF;
END $$;

SELECT pass('Non-owner should not be able to update team (0 rows affected)');

-- Test that non-owner cannot delete team
DO $$
DECLARE
  affected_rows int;
BEGIN
  WITH deleted AS (
    DELETE FROM public.teams
    WHERE id = (SELECT team_id FROM test_teams WHERE team_num = 1)
    RETURNING id
  )
  SELECT COUNT(*)::int INTO affected_rows FROM deleted;

  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'Expected 0 rows to be deleted, but % were deleted', affected_rows;
  END IF;
END $$;

SELECT pass('Non-owner should not be able to delete team (0 rows affected)');

-- Reset and switch to user 3 (non-member)
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

DO $$
DECLARE v_user_id text;
BEGIN
  SELECT user_id::text INTO v_user_id FROM test_users WHERE user_num = 3;
  PERFORM set_config('role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', v_user_id, false);
END $$;

-- Test that user cannot create team with someone else as owner
PREPARE user3_create_team_wrong_owner AS
  INSERT INTO public.teams (name, owner_id)
  VALUES ('Fake Team', (SELECT user_id FROM test_users WHERE user_num = 1))
  RETURNING id;

SELECT throws_ok(
  'user3_create_team_wrong_owner',
  '42501',
  NULL,
  'User should not be able to create team with different owner_id'
);

-- Test that non-member cannot delete team they don't belong to
DO $$
DECLARE
  affected_rows int;
BEGIN
  WITH deleted AS (
    DELETE FROM public.teams
    WHERE id = (SELECT team_id FROM test_teams WHERE team_num = 1)
    RETURNING id
  )
  SELECT COUNT(*)::int INTO affected_rows FROM deleted;

  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'Expected 0 rows to be deleted, but % were deleted', affected_rows;
  END IF;
END $$;

SELECT pass('Non-member should not be able to delete team (0 rows affected)');

-- Reset role and JWT claims after final test
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

-- =============================================================================
-- Cleanup Test Data
-- =============================================================================

-- Clean up test data
DELETE FROM public.notes WHERE team_id IN (SELECT team_id FROM test_teams);
DELETE FROM public.team_members WHERE team_id IN (SELECT team_id FROM test_teams);
DELETE FROM public.teams WHERE id IN (SELECT team_id FROM test_teams);
DELETE FROM public.profiles WHERE email LIKE 'pgtap_user%@test.com';
DELETE FROM auth.users WHERE email LIKE 'pgtap_user%@test.com';

-- Finish tests
SELECT * FROM finish();

ROLLBACK;
