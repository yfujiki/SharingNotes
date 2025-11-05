'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function CreateTeamForm() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to create a team');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('teams').insert({
      name: teamName,
      owner_id: user.id,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Success - reset form and refresh
    setTeamName('');
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="team-name"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Team Name
          </label>
          <input
            id="team-name"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            placeholder="Enter team name"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !teamName.trim()}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {loading ? 'Creating...' : 'Create Team'}
        </button>
      </form>
    </div>
  );
}
