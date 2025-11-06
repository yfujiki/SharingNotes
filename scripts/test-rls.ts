#!/usr/bin/env tsx
/**
 * RLS Policy Tests - TypeScript Version
 * Tests Row Level Security policies using Supabase client library
 *
 * This validates that RLS policies work correctly through the API layer
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Admin client (service role - bypasses RLS)
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to create authenticated client for a user
async function createUserClient(accessToken: string) {
  const client = createClient(supabaseUrl!, supabaseAnonKey!);
  await client.auth.setSession({
    access_token: accessToken,
    refresh_token: 'dummy-refresh-token',
  });
  return client;
}

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  client: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface TestTeam {
  id: string;
  name: string;
  owner_id: string;
}

interface TestNote {
  id: string;
  team_id: string;
  author_id: string;
  title: string;
}

let testUsers: TestUser[] = [];
let testTeams: TestTeam[] = [];
let testNotes: TestNote[] = [];

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');

  // Delete test notes
  for (const note of testNotes) {
    await adminClient.from('notes').delete().eq('id', note.id);
  }

  // Delete test teams
  for (const team of testTeams) {
    await adminClient.from('teams').delete().eq('id', team.id);
  }

  // Delete test users
  for (const user of testUsers) {
    await adminClient.from('profiles').delete().eq('id', user.id);
    await adminClient.auth.admin.deleteUser(user.id);
  }

  testUsers = [];
  testTeams = [];
  testNotes = [];
}

async function createTestUser(email: string, password: string): Promise<TestUser> {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create user ${email}: ${error?.message}`);
  }

  // Create a separate client to sign in
  const userClient = createClient(supabaseUrl!, supabaseAnonKey!);

  const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    throw new Error(`Failed to sign in user ${email}: ${signInError?.message}`);
  }

  const testUser: TestUser = {
    id: data.user.id,
    email,
    accessToken: signInData.session.access_token,
    client: userClient, // Store the already-authenticated client
  };

  testUsers.push(testUser);
  return testUser;
}

async function runTests() {
  console.log('========================================');
  console.log('RLS Policy Tests Starting');
  console.log('========================================');

  try {
    // Create test users
    console.log('\n📝 Creating test users...');
    const user1 = await createTestUser('test-rls-1@example.com', 'password123');
    const user2 = await createTestUser('test-rls-2@example.com', 'password123');
    const user3 = await createTestUser('test-rls-3@example.com', 'password123');

    console.log(`✓ Created User 1: ${user1.id}`);
    console.log(`✓ Created User 2: ${user2.id}`);
    console.log(`✓ Created User 3: ${user3.id}`);

    // Test 1: Teams RLS
    console.log('\n========================================');
    console.log('Test 1: Teams RLS Policies');
    console.log('========================================');

    const user1Client = user1.client;
    const user2Client = user2.client;
    const user3Client = user3.client;

    // Verify user 1 is authenticated
    const { data: sessionData } = await user1Client.auth.getSession();
    if (!sessionData.session) {
      throw new Error('User 1 client is not authenticated');
    }
    console.log(`User 1 session: ${sessionData.session.user.id}`);

    // User 1 creates a team
    const { data: team1, error: team1Error } = await user1Client
      .from('teams')
      .insert({ name: 'Test Team 1', owner_id: user1.id })
      .select()
      .single();

    if (team1Error || !team1) {
      throw new Error(`User 1 failed to create team: ${team1Error?.message}`);
    }
    testTeams.push(team1);
    console.log('✓ User 1 can create team');

    // User 2 creates their own team
    const { data: team2, error: team2Error } = await user2Client
      .from('teams')
      .insert({ name: 'Test Team 2', owner_id: user2.id })
      .select()
      .single();

    if (team2Error || !team2) {
      throw new Error(`User 2 failed to create team: ${team2Error?.message}`);
    }
    testTeams.push(team2);
    console.log('✓ User 2 can create team');

    // Test 2: Team Members RLS
    console.log('\n========================================');
    console.log('Test 2: Team Members RLS Policies');
    console.log('========================================');

    // User 1 adds User 2 to Team 1
    const { error: addMemberError } = await user1Client
      .from('team_members')
      .insert({ team_id: team1.id, user_id: user2.id, role: 'member' });

    if (addMemberError) {
      throw new Error(`Owner failed to add member: ${addMemberError.message}`);
    }
    console.log('✓ Owner can add members to team');

    // User 2 can view Team 1
    const { data: viewedTeam, error: viewError } = await user2Client
      .from('teams')
      .select()
      .eq('id', team1.id)
      .single();

    if (viewError || !viewedTeam) {
      throw new Error('✗ Member cannot view their team');
    }
    console.log('✓ Member can view team they belong to');

    // User 3 cannot view Team 1
    const { data: blockedTeam, error: blockedError } = await user3Client
      .from('teams')
      .select()
      .eq('id', team1.id)
      .single();

    if (blockedTeam) {
      throw new Error('✗ Non-member can view team');
    }
    console.log('✓ Non-member cannot view team');

    // Test 3: Notes RLS
    console.log('\n========================================');
    console.log('Test 3: Notes RLS Policies');
    console.log('========================================');

    // User 1 creates a note
    const { data: note1, error: noteError } = await user1Client
      .from('notes')
      .insert({
        team_id: team1.id,
        author_id: user1.id,
        title: 'Test Note 1',
        content: 'Original content',
      })
      .select()
      .single();

    if (noteError || !note1) {
      throw new Error(`Failed to create note: ${noteError?.message}`);
    }
    testNotes.push(note1);
    console.log('✓ Team member can create note');

    // User 2 (team member) can view the note
    const { data: viewedNote, error: viewNoteError } = await user2Client
      .from('notes')
      .select()
      .eq('id', note1.id)
      .single();

    if (viewNoteError || !viewedNote) {
      throw new Error('✗ Team member cannot view team notes');
    }
    console.log('✓ Team member can view team notes');

    // User 2 (team member) can update User 1's note
    const { error: updateError } = await user2Client
      .from('notes')
      .update({ content: 'Updated by User 2' })
      .eq('id', note1.id);

    if (updateError) {
      throw new Error(`✗ Team member cannot update notes: ${updateError.message}`);
    }
    console.log('✓ Any team member can update notes');

    // User 3 (non-member) cannot view the note
    const { data: blockedNote, error: blockedNoteError } = await user3Client
      .from('notes')
      .select()
      .eq('id', note1.id)
      .single();

    if (blockedNote) {
      throw new Error('✗ Non-member can view team notes');
    }
    console.log('✓ Non-member cannot view team notes');

    // User 3 (non-member) cannot update the note
    const { error: blockedUpdateError } = await user3Client
      .from('notes')
      .update({ content: 'Malicious update' })
      .eq('id', note1.id);

    if (!blockedUpdateError) {
      throw new Error('✗ Non-member can update team notes');
    }
    console.log('✓ Non-member cannot update team notes');

    // Test 4: Profiles RLS
    console.log('\n========================================');
    console.log('Test 4: Profiles RLS Policies');
    console.log('========================================');

    // User 1 can view all profiles
    const { data: allProfiles, error: profilesError } = await user1Client.from('profiles').select();

    if (profilesError || !allProfiles || allProfiles.length === 0) {
      throw new Error('✗ Authenticated user cannot view profiles');
    }
    console.log('✓ Authenticated user can view all profiles');

    // User 1 can update their own profile
    const { error: updateProfileError } = await user1Client
      .from('profiles')
      .update({ display_name: 'Updated Name' })
      .eq('id', user1.id);

    if (updateProfileError) {
      throw new Error(`✗ User cannot update their own profile: ${updateProfileError.message}`);
    }
    console.log('✓ User can update their own profile');

    // User 1 cannot update User 2's profile
    const { error: blockedProfileError } = await user1Client
      .from('profiles')
      .update({ display_name: 'Malicious Update' })
      .eq('id', user2.id);

    if (!blockedProfileError) {
      throw new Error('✗ User can update other profiles');
    }
    console.log('✓ User cannot update other profiles');

    // Test 5: Delete Operations
    console.log('\n========================================');
    console.log('Test 5: Delete Operations');
    console.log('========================================');

    // User 2 creates a note
    const { data: note2, error: note2Error } = await user2Client
      .from('notes')
      .insert({
        team_id: team1.id,
        author_id: user2.id,
        title: 'Note by User 2',
        content: 'Content',
      })
      .select()
      .single();

    if (note2Error || !note2) {
      throw new Error(`Failed to create note: ${note2Error?.message}`);
    }
    testNotes.push(note2);

    // User 1 (owner) can delete User 2's note
    const { error: deleteError } = await user1Client.from('notes').delete().eq('id', note2.id);

    if (deleteError) {
      throw new Error(`✗ Team owner cannot delete team notes: ${deleteError.message}`);
    }
    console.log('✓ Team owner can delete any team note');

    // Author can delete their own note
    const { error: selfDeleteError } = await user1Client.from('notes').delete().eq('id', note1.id);

    if (selfDeleteError) {
      throw new Error(`✗ Author cannot delete their own note: ${selfDeleteError.message}`);
    }
    console.log('✓ Author can delete their own note');

    console.log('\n========================================');
    console.log('All RLS Policy Tests PASSED ✓');
    console.log('========================================');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await cleanupTestData();
    console.log('✓ Cleanup completed\n');
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
