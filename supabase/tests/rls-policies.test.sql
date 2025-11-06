-- RLS Policy Tests
-- Tests Row Level Security policies for all tables
-- Run this with service role credentials

-- Test framework setup
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create test users
DO $$
DECLARE
  user1_id uuid;
  user2_id uuid;
  user3_id uuid;
  team1_id uuid;
  team2_id uuid;
  note1_id uuid;
  note2_id uuid;
BEGIN
  RAISE NOTICE E'\n========================================';
  RAISE NOTICE 'RLS Policy Tests Starting';
  RAISE NOTICE '========================================';

  -- Clean up any existing test data
  DELETE FROM auth.users WHERE email LIKE 'test%@rls-test.com';

  -- Create test users (simplified - in real tests use auth.users properly)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'test1@rls-test.com', crypt('password', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'test2@rls-test.com', crypt('password', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'test3@rls-test.com', crypt('password', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated')
  RETURNING id INTO user1_id, user2_id, user3_id;

  -- Create profiles for test users
  INSERT INTO public.profiles (id, email, display_name)
  VALUES
    (user1_id, 'test1@rls-test.com', 'Test User 1'),
    (user2_id, 'test2@rls-test.com', 'Test User 2'),
    (user3_id, 'test3@rls-test.com', 'Test User 3');

  RAISE NOTICE E'\n--- Created Test Users ---';
  RAISE NOTICE 'User 1: %', user1_id;
  RAISE NOTICE 'User 2: %', user2_id;
  RAISE NOTICE 'User 3: %', user3_id;

  -- Test 1: Teams RLS Policies
  RAISE NOTICE E'\n========================================';
  RAISE NOTICE 'Test 1: Teams RLS Policies';
  RAISE NOTICE '========================================';

  -- User 1 creates a team
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub TO user1_id::text;

  INSERT INTO public.teams (name, owner_id)
  VALUES ('Team 1', user1_id)
  RETURNING id INTO team1_id;

  RAISE NOTICE '✓ User 1 can create team';

  -- User 2 creates their own team
  SET LOCAL request.jwt.claim.sub TO user2_id::text;

  INSERT INTO public.teams (name, owner_id)
  VALUES ('Team 2', user2_id)
  RETURNING id INTO team2_id;

  RAISE NOTICE '✓ User 2 can create team';

  -- Reset role
  RESET ROLE;

  -- Test 2: Team Members RLS Policies
  RAISE NOTICE E'\n========================================';
  RAISE NOTICE 'Test 2: Team Members RLS Policies';
  RAISE NOTICE '========================================';

  -- Add User 2 to Team 1
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub TO user1_id::text;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (team1_id, user2_id, 'member');

  RAISE NOTICE '✓ Owner can add members to team';

  -- Test that User 2 can see Team 1
  SET LOCAL request.jwt.claim.sub TO user2_id::text;

  PERFORM * FROM public.teams WHERE id = team1_id;
  IF FOUND THEN
    RAISE NOTICE '✓ Member can view team they belong to';
  ELSE
    RAISE EXCEPTION '✗ Member cannot view their team';
  END IF;

  -- Test that User 3 cannot see Team 1
  SET LOCAL request.jwt.claim.sub TO user3_id::text;

  PERFORM * FROM public.teams WHERE id = team1_id;
  IF NOT FOUND THEN
    RAISE NOTICE '✓ Non-member cannot view team';
  ELSE
    RAISE EXCEPTION '✗ Non-member can view team';
  END IF;

  RESET ROLE;

  -- Test 3: Notes RLS Policies
  RAISE NOTICE E'\n========================================';
  RAISE NOTICE 'Test 3: Notes RLS Policies';
  RAISE NOTICE '========================================';

  -- User 1 creates a note in Team 1
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub TO user1_id::text;

  INSERT INTO public.notes (team_id, author_id, title, content)
  VALUES (team1_id, user1_id, 'Note 1', 'Content 1')
  RETURNING id INTO note1_id;

  RAISE NOTICE '✓ Team member can create note';

  -- User 2 (team member) can view the note
  SET LOCAL request.jwt.claim.sub TO user2_id::text;

  PERFORM * FROM public.notes WHERE id = note1_id;
  IF FOUND THEN
    RAISE NOTICE '✓ Team member can view team notes';
  ELSE
    RAISE EXCEPTION '✗ Team member cannot view team notes';
  END IF;

  -- User 2 (team member) can update User 1's note
  UPDATE public.notes
  SET content = 'Updated by User 2'
  WHERE id = note1_id;

  IF FOUND THEN
    RAISE NOTICE '✓ Any team member can update notes';
  ELSE
    RAISE EXCEPTION '✗ Team member cannot update notes';
  END IF;

  -- User 3 (non-member) cannot view the note
  SET LOCAL request.jwt.claim.sub TO user3_id::text;

  PERFORM * FROM public.notes WHERE id = note1_id;
  IF NOT FOUND THEN
    RAISE NOTICE '✓ Non-member cannot view team notes';
  ELSE
    RAISE EXCEPTION '✗ Non-member can view team notes';
  END IF;

  -- User 3 (non-member) cannot update the note
  BEGIN
    UPDATE public.notes
    SET content = 'Malicious update'
    WHERE id = note1_id;

    IF NOT FOUND THEN
      RAISE NOTICE '✓ Non-member cannot update team notes';
    ELSE
      RAISE EXCEPTION '✗ Non-member can update team notes';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '✓ Non-member cannot update team notes (blocked by RLS)';
  END;

  RESET ROLE;

  -- Test 4: Profiles RLS Policies
  RAISE NOTICE E'\n========================================';
  RAISE NOTICE 'Test 4: Profiles RLS Policies';
  RAISE NOTICE '========================================';

  -- User 1 can view all profiles
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub TO user1_id::text;

  PERFORM * FROM public.profiles WHERE id = user2_id;
  IF FOUND THEN
    RAISE NOTICE '✓ Authenticated user can view all profiles';
  ELSE
    RAISE EXCEPTION '✗ Authenticated user cannot view profiles';
  END IF;

  -- User 1 can update their own profile
  UPDATE public.profiles
  SET display_name = 'Updated Name'
  WHERE id = user1_id;

  IF FOUND THEN
    RAISE NOTICE '✓ User can update their own profile';
  ELSE
    RAISE EXCEPTION '✗ User cannot update their own profile';
  END IF;

  -- User 1 cannot update User 2's profile
  BEGIN
    UPDATE public.profiles
    SET display_name = 'Malicious Update'
    WHERE id = user2_id;

    IF NOT FOUND THEN
      RAISE NOTICE '✓ User cannot update other profiles';
    ELSE
      RAISE EXCEPTION '✗ User can update other profiles';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '✓ User cannot update other profiles (blocked by RLS)';
  END;

  RESET ROLE;

  -- Test 5: Delete Operations
  RAISE NOTICE E'\n========================================';
  RAISE NOTICE 'Test 5: Delete Operations';
  RAISE NOTICE '========================================';

  -- User 1 creates another note
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub TO user1_id::text;

  INSERT INTO public.notes (team_id, author_id, title, content)
  VALUES (team1_id, user1_id, 'Note 2', 'Content 2')
  RETURNING id INTO note2_id;

  -- Author can delete their own note
  DELETE FROM public.notes WHERE id = note2_id;
  IF FOUND THEN
    RAISE NOTICE '✓ Author can delete their own note';
  ELSE
    RAISE EXCEPTION '✗ Author cannot delete their own note';
  END IF;

  -- Team owner can delete team member's note
  SET LOCAL request.jwt.claim.sub TO user1_id::text;

  -- User 2 creates a note
  SET LOCAL request.jwt.claim.sub TO user2_id::text;
  INSERT INTO public.notes (team_id, author_id, title, content)
  VALUES (team1_id, user2_id, 'Note by User 2', 'Content')
  RETURNING id INTO note2_id;

  -- User 1 (owner) deletes User 2's note
  SET LOCAL request.jwt.claim.sub TO user1_id::text;
  DELETE FROM public.notes WHERE id = note2_id;

  IF FOUND THEN
    RAISE NOTICE '✓ Team owner can delete any team note';
  ELSE
    RAISE EXCEPTION '✗ Team owner cannot delete team notes';
  END IF;

  RESET ROLE;

  -- Clean up test data
  RAISE NOTICE E'\n========================================';
  RAISE NOTICE 'Cleaning up test data...';
  RAISE NOTICE '========================================';

  DELETE FROM public.notes WHERE team_id IN (team1_id, team2_id);
  DELETE FROM public.team_members WHERE team_id IN (team1_id, team2_id);
  DELETE FROM public.teams WHERE id IN (team1_id, team2_id);
  DELETE FROM public.profiles WHERE id IN (user1_id, user2_id, user3_id);
  DELETE FROM auth.users WHERE email LIKE 'test%@rls-test.com';

  RAISE NOTICE E'\n========================================';
  RAISE NOTICE 'All RLS Policy Tests PASSED ✓';
  RAISE NOTICE '========================================';

END $$;
