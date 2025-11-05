'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Note {
  id: string;
  team_id: string;
  author_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

interface NotesListProps {
  notes: Note[];
  userId: string;
  onNoteUpdated: () => void;
}

export function NotesList({ notes, userId, onNoteUpdated }: NotesListProps) {
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    setDeletingNoteId(noteId);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.from('notes').delete().eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note: ' + error.message);
    } else {
      onNoteUpdated();
    }

    setDeletingNoteId(null);
  };

  const toggleExpand = (noteId: string) => {
    setExpandedNoteId(expandedNoteId === noteId ? null : noteId);
  };

  if (notes.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-neutral-600 dark:text-neutral-400">
          No notes yet. Create your first note to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => {
        const isExpanded = expandedNoteId === note.id;
        const isAuthor = note.author_id === userId;
        const isDeleting = deletingNoteId === note.id;

        return (
          <div
            key={note.id}
            className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {note.title}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {new Date(note.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpand(note.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </button>

                  {isAuthor && (
                    <button
                      onClick={() => handleDelete(note.id)}
                      disabled={isDeleting}
                      className="text-sm text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              {isExpanded && note.content && (
                <div className="mt-4 rounded-md bg-neutral-50 p-4 dark:bg-neutral-800/50">
                  <pre className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300 font-sans">
                    {note.content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
