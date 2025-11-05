'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { NotesList } from './notes-list';
import { CreateNoteForm } from './create-note-form';

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface Note {
  id: string;
  team_id: string;
  author_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

interface NotesClientProps {
  teams: Team[];
  userId: string;
}

export function NotesClient({ teams, userId }: NotesClientProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (selectedTeamId) {
      fetchNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  const fetchNotes = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('team_id', selectedTeamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      setNotes(data || []);
    }

    setLoading(false);
  };

  const handleNoteCreated = () => {
    setShowCreateForm(false);
    fetchNotes();
  };

  return (
    <div className="space-y-6">
      {/* Team Selector */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <label
          htmlFor="team-select"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          Select Team
        </label>
        <select
          id="team-select"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Create Note Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Notes
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {showCreateForm ? 'Cancel' : 'Create Note'}
        </button>
      </div>

      {/* Create Note Form */}
      {showCreateForm && (
        <CreateNoteForm
          teamId={selectedTeamId}
          userId={userId}
          onNoteCreated={handleNoteCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Notes List */}
      {loading ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-neutral-600 dark:text-neutral-400">Loading notes...</p>
        </div>
      ) : (
        <NotesList notes={notes} userId={userId} onNoteUpdated={fetchNotes} />
      )}
    </div>
  );
}
