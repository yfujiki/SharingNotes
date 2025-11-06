'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface TeamMember {
  user_id: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  team_members: TeamMember[];
}

interface TeamMemberManagerProps {
  team: Team;
  onClose: () => void;
}

interface MemberWithProfile {
  user_id: string;
  role: string;
  display_name?: string;
  email?: string;
}

export function TeamMemberManager({ team, onClose }: TeamMemberManagerProps) {
  const router = useRouter();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [availableUsers, setAvailableUsers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchAvailableUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id]);

  const fetchMembers = async () => {
    const supabase = getSupabaseBrowserClient();

    // First, get team members
    const { data: teamMembersData, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', team.id);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      setError(`Failed to load members: ${membersError.message}`);
      setLoading(false);
      return;
    }

    // Then fetch profiles for those users
    const userIds = teamMembersData.map((m) => m.user_id);

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds);

    // Combine the data
    const membersWithProfiles = teamMembersData.map((member) => {
      const profile = profilesData?.find((p) => p.id === member.user_id);

      return {
        user_id: member.user_id,
        role: member.role,
        display_name: profile?.display_name,
        email: profile?.email,
      };
    });

    setMembers(membersWithProfiles);
    setLoading(false);
  };

  const fetchAvailableUsers = async () => {
    const supabase = getSupabaseBrowserClient();

    // Get all profiles
    const { data: allProfiles } = await supabase.from('profiles').select('id, display_name, email');

    // Get current team member IDs for THIS team
    const { data: teamMembersData } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', team.id);

    const memberIds = new Set(teamMembersData?.map((m) => m.user_id) || []);

    // Filter to show users NOT in this team (available to add)
    const available = allProfiles?.filter((p) => !memberIds.has(p.id)) || [];

    setAvailableUsers(
      available.map((p) => ({
        user_id: p.id,
        role: 'member',
        display_name: p.display_name,
        email: p.email,
      })),
    );
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      setError('Please select a user to add');
      return;
    }

    setAddMemberLoading(true);
    setError(null);
    setSuccessMessage(null);

    const supabase = getSupabaseBrowserClient();

    const { error: insertError } = await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: selectedUserId,
      role: 'member',
    });

    if (insertError) {
      setError(insertError.message);
      setAddMemberLoading(false);
      return;
    }

    setSuccessMessage('Member added successfully!');
    setSelectedUserId('');
    setAddMemberLoading(false);

    // Refresh members and available users
    await fetchMembers();
    await fetchAvailableUsers();
    router.refresh();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);
    setSuccessMessage(null);

    // For now, we'll create a simple invite system
    // In production, you'd want to send an email with an invite link
    // For this demo, we'll just show a message that the user needs to sign up

    setSuccessMessage(
      `Invitation prepared for ${inviteEmail}. In a production app, an email would be sent. For now, ask them to sign up and you can add them manually.`,
    );
    setInviteEmail('');
    setInviteLoading(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === team.owner_id) {
      setError('Cannot remove the team owner');
      return;
    }

    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', team.id)
      .eq('user_id', userId);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccessMessage('Member removed successfully');
    fetchMembers();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-neutral-900">
        {/* Header */}
        <div className="border-b border-neutral-200 p-6 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Manage Team: {team.name}
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Add Existing User Section */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Add Existing User
            </h3>
            {availableUsers.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                No users available to add. All registered users are already members of this team.
              </p>
            ) : (
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label
                    htmlFor="select-user"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Select User
                  </label>
                  <select
                    id="select-user"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    <option value="">-- Select a user --</option>
                    {availableUsers.map((user) => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.display_name || user.email || 'Unnamed User'}
                        {user.display_name && user.email && ` (${user.email})`}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addMemberLoading || !selectedUserId}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {addMemberLoading ? 'Adding...' : 'Add Member'}
                </button>
              </form>
            )}
          </div>

          {/* Invite by Email Section */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Invite by Email
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Invite users who don&apos;t have an account yet.
            </p>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label
                  htmlFor="invite-email"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Email Address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                  placeholder="newuser@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail.trim()}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
              >
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          </div>

          {/* Messages */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {successMessage}
            </div>
          )}

          {/* Members List */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Current Members
            </h3>

            {loading ? (
              <p className="text-neutral-600 dark:text-neutral-400">Loading members...</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const isOwner = member.user_id === team.owner_id;

                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50"
                    >
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {member.display_name || member.email || 'Unnamed User'}
                        </p>
                        {member.display_name && member.email && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {member.email}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            isOwner
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {member.role}
                        </span>

                        {!isOwner && (
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Remove member"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 p-6 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="w-full rounded-md bg-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
