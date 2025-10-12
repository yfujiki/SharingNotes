import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { getSupabasePublicEnv } from './env';
import { getSupabaseServiceRoleKey } from './env.server';

type ServerSupabaseClient = SupabaseClient;

/**
 * Creates a Supabase client configured for server-side usage (API routes,
 * server components, server actions) with proper cookie-based session management.
 * This client reads and writes the user session from/to HTTP cookies.
 */
export async function createSupabaseServerClient(): Promise<ServerSupabaseClient> {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Cookie setting can fail in Server Components during static rendering
          // This is expected behavior and can be ignored
        }
      },
    },
  });
}

/**
 * Service role client intended for trusted server workloads only.
 */
export const createSupabaseServiceRoleClient = (): ServerSupabaseClient => {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
