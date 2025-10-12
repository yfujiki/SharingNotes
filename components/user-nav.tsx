'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function UserNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    setSigningOut(false);
  };

  if (loading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-300 dark:bg-neutral-700" />
    );
  }

  if (!user) {
    return (
      <a
        href="/auth/login"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          {user.email?.[0].toUpperCase() || 'U'}
        </div>
        <span className="text-sm text-neutral-700 dark:text-neutral-300">
          {user.email}
        </span>
      </div>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="rounded-md border border-neutral-300 px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {signingOut ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  );
}
