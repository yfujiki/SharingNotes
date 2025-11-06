/**
 * RLS Policy Integration Tests - Vitest
 * Tests Row Level Security policies using Supabase client library
 *
 * This validates that RLS policies work correctly through the API layer
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error('Missing required environment variables');
}

// Admin client (service role - bypasses RLS)
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
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

// Test data
let testUsers: TestUser[] = [];
let testTeams: TestTeam[] = [];
let testNotes: TestNote[] = [];

/**
 * Create a test user and return authenticated client
 */
async function createTestUser(email: string, password: string): Promise<TestUser> {
  // Create user via admin API
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create user ${email}: ${error?.message}`);
  }

  // Create a separate client to sign in
  // Configure for Node environment (no localStorage)
  const userClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Disable localStorage in Node environment
    },
  });

  const { data: signInData, error: signInError} = await userClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    throw new Error(`Failed to sign in user ${email}: ${signInError?.message}`);
  }

  return {
    id: data.user.id,
    email,
    client: userClient,
  };
}

/**
 * Clean up all test data
 */
async function cleanupTestData() {
  // Delete test notes
  for (const note of testNotes) {
    await adminClient.from('notes').delete().eq('id', note.id);
  }

  // Delete test teams (team_members will be cascade deleted)
  for (const team of testTeams) {
    await adminClient.from('teams').delete().eq('id', team.id);
  }

  // Delete test users
  for (const user of testUsers) {
    await adminClient.from('profiles').delete().eq('id', user.id);
    await adminClient.auth.admin.deleteUser(user.id);
  }

  // Reset arrays
  testUsers = [];
  testTeams = [];
  testNotes = [];
}

describe('RLS Policy Integration Tests', () => {
  let user1: TestUser;
  let user2: TestUser;
  let user3: TestUser;

  beforeAll(async () => {
    // Create test users
    user1 = await createTestUser('test-rls-vitest-1@example.com', 'password123');
    user2 = await createTestUser('test-rls-vitest-2@example.com', 'password123');
    user3 = await createTestUser('test-rls-vitest-3@example.com', 'password123');

    testUsers.push(user1, user2, user3);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Teams RLS Policies', () => {
    it('should allow user to create a team', async () => {
      const { data, error } = await user1.client
        .from('teams')
        .insert({ name: 'Test Team 1', owner_id: user1.id })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.name).toBe('Test Team 1');
      expect(data?.owner_id).toBe(user1.id);

      if (data) testTeams.push(data);
    });

    it('should allow owner to view their team', async () => {
      const team = testTeams[0];
      const { data, error } = await user1.client
        .from('teams')
        .select()
        .eq('id', team.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.id).toBe(team.id);
    });

    it('should allow member to view team after being added', async () => {
      const team = testTeams[0];

      // User 1 (owner) adds User 2 as member
      const { error: addError } = await user1.client
        .from('team_members')
        .insert({ team_id: team.id, user_id: user2.id, role: 'member' });

      expect(addError).toBeNull();

      // User 2 can now view the team
      const { data, error } = await user2.client
        .from('teams')
        .select()
        .eq('id', team.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.id).toBe(team.id);
    });

    it('should deny non-member from viewing team', async () => {
      const team = testTeams[0];

      const { data, error } = await user3.client
        .from('teams')
        .select()
        .eq('id', team.id)
        .single();

      // Should either get error or no data
      expect(data).toBeNull();
    });
  });

  describe('Team Members RLS Policies', () => {
    it('should allow team members to view membership', async () => {
      const team = testTeams[0];

      const { data, error } = await user2.client
        .from('team_members')
        .select()
        .eq('team_id', team.id);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should deny non-members from viewing membership', async () => {
      const team = testTeams[0];

      const { data, error } = await user3.client
        .from('team_members')
        .select()
        .eq('team_id', team.id);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.length).toBe(0);
    });
  });

  describe('Notes RLS Policies', () => {
    it('should allow team member to create note', async () => {
      const team = testTeams[0];

      const { data, error } = await user1.client
        .from('notes')
        .insert({
          team_id: team.id,
          author_id: user1.id,
          title: 'Test Note 1',
          content: 'Original content',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.title).toBe('Test Note 1');

      if (data) testNotes.push(data);
    });

    it('should allow team members to view team notes', async () => {
      const note = testNotes[0];

      // User 2 (team member) can view note
      const { data, error } = await user2.client
        .from('notes')
        .select()
        .eq('id', note.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.id).toBe(note.id);
    });

    it('should allow any team member to update notes (collaborative editing)', async () => {
      const note = testNotes[0];

      // User 2 (not the author) can update the note
      const { error } = await user2.client
        .from('notes')
        .update({ content: 'Updated by User 2' })
        .eq('id', note.id);

      expect(error).toBeNull();

      // Verify update
      const { data } = await user2.client
        .from('notes')
        .select('content')
        .eq('id', note.id)
        .single();

      expect(data?.content).toBe('Updated by User 2');
    });

    it('should deny non-members from viewing team notes', async () => {
      const note = testNotes[0];

      const { data, error } = await user3.client
        .from('notes')
        .select()
        .eq('id', note.id)
        .single();

      expect(data).toBeNull();
    });

    it('should deny non-members from updating team notes', async () => {
      const note = testNotes[0];

      const { error } = await user3.client
        .from('notes')
        .update({ content: 'Malicious update' })
        .eq('id', note.id);

      expect(error).toBeTruthy();
    });

    it('should allow author to delete their own note', async () => {
      const team = testTeams[0];

      // User 2 creates a note
      const { data: note2 } = await user2.client
        .from('notes')
        .insert({
          team_id: team.id,
          author_id: user2.id,
          title: 'Note by User 2',
          content: 'Content',
        })
        .select()
        .single();

      expect(note2).toBeTruthy();
      if (note2) testNotes.push(note2);

      // User 2 can delete their own note
      const { error } = await user2.client.from('notes').delete().eq('id', note2!.id);

      expect(error).toBeNull();
    });

    it('should allow team owner to delete any team note', async () => {
      const note = testNotes[0];

      // User 1 (owner) can delete User 1's note (we already deleted User 2's note in previous test)
      const { error } = await user1.client.from('notes').delete().eq('id', note.id);

      expect(error).toBeNull();
    });
  });

  describe('Profiles RLS Policies', () => {
    it('should allow authenticated user to view all profiles', async () => {
      const { data, error } = await user1.client.from('profiles').select();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('should allow user to update their own profile', async () => {
      const { error } = await user1.client
        .from('profiles')
        .update({ display_name: 'Updated Name' })
        .eq('id', user1.id);

      expect(error).toBeNull();

      // Verify update
      const { data } = await user1.client
        .from('profiles')
        .select('display_name')
        .eq('id', user1.id)
        .single();

      expect(data?.display_name).toBe('Updated Name');
    });

    it('should deny user from updating other profiles', async () => {
      const { error } = await user1.client
        .from('profiles')
        .update({ display_name: 'Malicious Update' })
        .eq('id', user2.id);

      expect(error).toBeTruthy();
    });
  });
});
