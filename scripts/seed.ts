#!/usr/bin/env tsx
/**
 * Seed script for development/testing
 * Creates demo teams and notes for the authenticated user
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nMake sure these are set in your .env.local file');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seed() {
  console.log('🌱 Starting seed process...\n');

  // Get the first user from auth.users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error('❌ Error fetching users:', usersError.message);
    process.exit(1);
  }

  if (!users || users.users.length === 0) {
    console.error('❌ No users found. Please sign up a test user first through the application.');
    console.error('   Visit your app and create an account, then run this seed script again.');
    process.exit(1);
  }

  const demoUserId = users.users[0].id;
  const demoUserEmail = users.users[0].email;
  console.log(`📧 Using user: ${demoUserEmail} (${demoUserId})\n`);

  // Create demo teams
  console.log('🏢 Creating teams...');
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .insert([
      { name: 'Personal Projects', owner_id: demoUserId },
      { name: 'Work Team', owner_id: demoUserId },
      { name: 'Study Group', owner_id: demoUserId },
    ])
    .select();

  if (teamsError) {
    console.error('❌ Error creating teams:', teamsError.message);
    process.exit(1);
  }

  console.log(`   ✅ Created ${teams.length} teams\n`);

  const [personalTeam, workTeam, studyTeam] = teams;

  // Create demo notes for Personal Projects
  console.log('📝 Creating notes for Personal Projects...');
  const { error: personalNotesError } = await supabase.from('notes').insert([
    {
      team_id: personalTeam.id,
      author_id: demoUserId,
      title: 'Welcome to Shared Notes!',
      content: `This is your first note! Here are some tips:

- Click on any note to view its full content
- Create new notes using the form above
- Share notes with your team members
- Edit or delete notes you've created

Enjoy collaborating!`,
    },
    {
      team_id: personalTeam.id,
      author_id: demoUserId,
      title: 'Project Ideas',
      content: `Some project ideas to explore:

1. Build a task management app
2. Create a personal blog
3. Develop a weather dashboard
4. Make a recipe organizer

Feel free to add your own ideas below!`,
    },
    {
      team_id: personalTeam.id,
      author_id: demoUserId,
      title: 'Learning Resources',
      content: `Useful resources for web development:

- MDN Web Docs (https://developer.mozilla.org)
- React Documentation
- Next.js Documentation
- Supabase Documentation

Bookmark these for quick reference!`,
    },
  ]);

  if (personalNotesError) {
    console.error('❌ Error creating personal notes:', personalNotesError.message);
    process.exit(1);
  }

  console.log('   ✅ Created 3 notes\n');

  // Create demo notes for Work Team
  console.log('📝 Creating notes for Work Team...');
  const { error: workNotesError } = await supabase.from('notes').insert([
    {
      team_id: workTeam.id,
      author_id: demoUserId,
      title: 'Team Meeting Notes',
      content: `Meeting Date: 2025-11-06

Agenda:
- Q1 Planning
- New feature roadmap
- Team retrospective

Action Items:
- [ ] Finalize Q1 objectives
- [ ] Schedule design review
- [ ] Update documentation`,
    },
    {
      team_id: workTeam.id,
      author_id: demoUserId,
      title: 'Feature Specifications',
      content: `New Feature: User Dashboard

Requirements:
- Display user activity metrics
- Show recent notes
- Team collaboration stats
- Export functionality

Deadline: End of Q1`,
    },
    {
      team_id: workTeam.id,
      author_id: demoUserId,
      title: 'Code Review Checklist',
      content: `Before submitting a PR:

✓ Tests pass
✓ No console errors
✓ Code follows style guide
✓ Documentation updated
✓ Performance checked
✓ Accessibility tested`,
    },
  ]);

  if (workNotesError) {
    console.error('❌ Error creating work notes:', workNotesError.message);
    process.exit(1);
  }

  console.log('   ✅ Created 3 notes\n');

  // Create demo notes for Study Group
  console.log('📝 Creating notes for Study Group...');
  const { error: studyNotesError } = await supabase.from('notes').insert([
    {
      team_id: studyTeam.id,
      author_id: demoUserId,
      title: 'Chapter 1: Introduction',
      content: `Key Concepts:

- Variables and data types
- Control flow
- Functions and scope
- Arrays and objects

Practice exercises due next week!`,
    },
    {
      team_id: studyTeam.id,
      author_id: demoUserId,
      title: 'Study Schedule',
      content: `Weekly Study Plan:

Monday: Chapter review
Wednesday: Practice problems
Friday: Group discussion
Sunday: Quiz preparation

Stay consistent!`,
    },
    {
      team_id: studyTeam.id,
      author_id: demoUserId,
      title: 'Exam Preparation Tips',
      content: `Tips for success:

1. Review notes regularly
2. Practice coding problems
3. Join study sessions
4. Ask questions early
5. Take breaks

Good luck everyone!`,
    },
  ]);

  if (studyNotesError) {
    console.error('❌ Error creating study notes:', studyNotesError.message);
    process.exit(1);
  }

  console.log('   ✅ Created 3 notes\n');

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Created 3 teams`);
  console.log(`   - Created 9 notes`);
  console.log(`\n🎉 Your database is now seeded with demo data!`);
}

seed().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
