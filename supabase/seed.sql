-- Supabase seed data for development/testing
-- This script creates demo teams and notes

-- Note: This seed assumes you have at least one user created through the auth system.
-- You'll need to update the user_id values below with actual user IDs from your auth.users table.

-- Instructions:
-- 1. Sign up a test user in your application
-- 2. Get the user ID from your Supabase dashboard (Auth > Users)
-- 3. Replace 'YOUR_USER_ID_HERE' with the actual UUID
-- 4. Run: pnpm supabase:seed

-- Example: Replace this with your actual user ID
-- You can get this by running:
-- SELECT id FROM auth.users LIMIT 1;

DO $$
DECLARE
  demo_user_id uuid;
  team1_id uuid;
  team2_id uuid;
  team3_id uuid;
BEGIN
  -- Get the first user from auth.users (or create a demo user)
  -- In production, you'd want to use a specific test user
  SELECT id INTO demo_user_id FROM auth.users LIMIT 1;

  -- If no user exists, you need to sign up first through the app
  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Please sign up a test user first through the application.';
  END IF;

  -- Create demo teams
  INSERT INTO public.teams (id, name, owner_id)
  VALUES
    (gen_random_uuid(), 'Personal Projects', demo_user_id),
    (gen_random_uuid(), 'Work Team', demo_user_id),
    (gen_random_uuid(), 'Study Group', demo_user_id)
  RETURNING id INTO team1_id;

  -- Get the team IDs we just created
  SELECT id INTO team1_id FROM public.teams WHERE name = 'Personal Projects' AND owner_id = demo_user_id;
  SELECT id INTO team2_id FROM public.teams WHERE name = 'Work Team' AND owner_id = demo_user_id;
  SELECT id INTO team3_id FROM public.teams WHERE name = 'Study Group' AND owner_id = demo_user_id;

  -- Create demo notes for Personal Projects
  INSERT INTO public.notes (team_id, author_id, title, content)
  VALUES
    (team1_id, demo_user_id, 'Welcome to Shared Notes!',
     E'This is your first note! Here are some tips:\n\n- Click on any note to view its full content\n- Create new notes using the form above\n- Share notes with your team members\n- Edit or delete notes you''ve created\n\nEnjoy collaborating!'),

    (team1_id, demo_user_id, 'Project Ideas',
     E'Some project ideas to explore:\n\n1. Build a task management app\n2. Create a personal blog\n3. Develop a weather dashboard\n4. Make a recipe organizer\n\nFeel free to add your own ideas below!'),

    (team1_id, demo_user_id, 'Learning Resources',
     E'Useful resources for web development:\n\n- MDN Web Docs (https://developer.mozilla.org)\n- React Documentation\n- Next.js Documentation\n- Supabase Documentation\n\nBookmark these for quick reference!');

  -- Create demo notes for Work Team
  INSERT INTO public.notes (team_id, author_id, title, content)
  VALUES
    (team2_id, demo_user_id, 'Team Meeting Notes',
     E'Meeting Date: 2025-11-06\n\nAgenda:\n- Q1 Planning\n- New feature roadmap\n- Team retrospective\n\nAction Items:\n- [ ] Finalize Q1 objectives\n- [ ] Schedule design review\n- [ ] Update documentation'),

    (team2_id, demo_user_id, 'Feature Specifications',
     E'New Feature: User Dashboard\n\nRequirements:\n- Display user activity metrics\n- Show recent notes\n- Team collaboration stats\n- Export functionality\n\nDeadline: End of Q1'),

    (team2_id, demo_user_id, 'Code Review Checklist',
     E'Before submitting a PR:\n\n✓ Tests pass\n✓ No console errors\n✓ Code follows style guide\n✓ Documentation updated\n✓ Performance checked\n✓ Accessibility tested');

  -- Create demo notes for Study Group
  INSERT INTO public.notes (team_id, author_id, title, content)
  VALUES
    (team3_id, demo_user_id, 'Chapter 1: Introduction',
     E'Key Concepts:\n\n- Variables and data types\n- Control flow\n- Functions and scope\n- Arrays and objects\n\nPractice exercises due next week!'),

    (team3_id, demo_user_id, 'Study Schedule',
     E'Weekly Study Plan:\n\nMonday: Chapter review\nWednesday: Practice problems\nFriday: Group discussion\nSunday: Quiz preparation\n\nStay consistent!'),

    (team3_id, demo_user_id, 'Exam Preparation Tips',
     E'Tips for success:\n\n1. Review notes regularly\n2. Practice coding problems\n3. Join study sessions\n4. Ask questions early\n5. Take breaks\n\nGood luck everyone!');

  RAISE NOTICE 'Seed data created successfully for user %', demo_user_id;
  RAISE NOTICE 'Created 3 teams and 9 notes';
END $$;
