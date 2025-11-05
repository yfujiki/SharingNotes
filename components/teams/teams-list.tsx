'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TeamMemberManager } from './team-member-manager';

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

interface TeamsListProps {
  teams: Team[];
  currentUserId: string;
}

export function TeamsList({ teams, currentUserId }: TeamsListProps) {
  const router = useRouter();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete "${teamName}"? This action cannot be undone and will delete all notes associated with this team.`)) {
      return;
    }

    setDeletingTeamId(teamId);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('teams').delete().eq('id', teamId);

    if (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team. Please try again.');
      setDeletingTeamId(null);
      return;
    }

    // Success - refresh the page
    router.refresh();
  };

  if (teams.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-neutral-600 dark:text-neutral-400">
          You don&apos;t have any teams yet. Create one to get started!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {teams.map((team) => {
          const isOwner = team.owner_id === currentUserId;
          const memberCount = team.team_members?.length || 0;

          return (
            <div
              key={team.id}
              className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {team.name}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    {isOwner && (
                      <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        Owner
                      </span>
                    )}
                  </p>
                </div>

                {isOwner && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTeam(team)}
                      className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      Manage Members
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id, team.name)}
                      disabled={deletingTeamId === team.id}
                      className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                    >
                      {deletingTeamId === team.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Member Manager Modal */}
      {selectedTeam && (
        <TeamMemberManager
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </>
  );
}
