'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface CreateNoteFormProps {
  teamId: string;
  userId: string;
  onNoteCreated: () => void;
  onCancel: () => void;
}

export function CreateNoteForm({
  teamId,
  userId,
  onNoteCreated,
  onCancel,
}: CreateNoteFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();

    const { error: insertError } = await supabase.from('notes').insert({
      team_id: teamId,
      author_id: userId,
      title,
      content,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Success - reset form and notify parent
    setTitle('');
    setContent('');
    setLoading(false);
    onNoteCreated();
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        Create New Note
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="note-title"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Title
          </label>
          <input
            id="note-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            placeholder="Enter note title"
          />
        </div>

        <div>
          <label
            htmlFor="note-content"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Content
          </label>
          <textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            placeholder="Enter note content"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {loading ? 'Creating...' : 'Create Note'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
