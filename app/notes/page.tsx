import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NotesClient } from '@/components/notes/notes-client';

export default async function NotesPage() {
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
    .select('id, name, owner_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching teams:', error);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            My Notes
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Welcome back, {user.email}!
          </p>
        </div>

        <Link
          href="/teams"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Manage Teams
        </Link>
      </div>

      {!teams || teams.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            No Teams Yet
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            You need to create a team before you can create notes.
          </p>
          <Link
            href="/teams"
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Create Your First Team
          </Link>
        </div>
      ) : (
        <NotesClient teams={teams} userId={user.id} />
      )}
    </div>
  );
}
