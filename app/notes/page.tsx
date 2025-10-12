import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function NotesPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware should handle this, but add as backup
  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          My Notes
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Welcome back, {user.email}! Your notes will appear here.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Server-Side Session ✅
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            This page is a <strong>server component</strong> that successfully read your session from cookies.
          </p>
          <div className="mt-4 rounded bg-neutral-100 p-3 font-mono text-sm dark:bg-neutral-800">
            <div><strong>User ID:</strong> {user.id}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Email Verified:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}</div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-neutral-600 dark:text-neutral-400">
            Notes functionality coming soon. This page is protected and requires authentication.
          </p>
        </div>
      </div>
    </div>
  );
}
