import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CreateTeamForm } from '@/components/teams/create-team-form';
import { TeamsList } from '@/components/teams/teams-list';

export default async function TeamsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware should handle this, but add as backup
  if (!user) {
    redirect('/auth/login');
  }

  // Fetch user's teams
  const { data: teams, error } = await supabase
    .from('teams')
    .select(
      `
      id,
      name,
      owner_id,
      created_at,
      team_members (
        user_id,
        role
      )
    `,
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching teams:', error);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Teams
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Manage your teams and collaborate with others.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Create Team Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Create a Team
          </h2>
          <CreateTeamForm />
        </div>

        {/* Teams List Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Your Teams
          </h2>
          <TeamsList teams={teams || []} currentUserId={user.id} />
        </div>
      </div>
    </div>
  );
}
