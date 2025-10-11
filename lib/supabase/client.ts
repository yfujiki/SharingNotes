'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './env';

type BrowserSupabaseClient = SupabaseClient;

const createBrowserClient = (): BrowserSupabaseClient => {
  const { url, anonKey } = getSupabasePublicEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      storageKey: 'sb-sharing-notes-auth',
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
};

const globalForSupabase = globalThis as unknown as {
  __supabaseBrowserClient?: BrowserSupabaseClient;
};

/**
 * Returns (or lazily instantiates) a browser Supabase client.
 */
export const getSupabaseBrowserClient = (): BrowserSupabaseClient => {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient is only available in the browser');
  }

  if (!globalForSupabase.__supabaseBrowserClient) {
    globalForSupabase.__supabaseBrowserClient = createBrowserClient();
  }

  return globalForSupabase.__supabaseBrowserClient;
};
