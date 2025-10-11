import 'server-only';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { getSupabasePublicEnv } from './env';
import { getSupabaseServiceRoleKey } from './env.server';

type ServerSupabaseClient = SupabaseClient;

/**
 * Creates a Supabase client configured for server-side usage (API routes,
 * server components, server actions). Optionally pass an access token to act
 * on behalf of an authenticated user.
 */
export const createSupabaseServerClient = (
  accessToken?: string,
): ServerSupabaseClient => {
  const { url, anonKey } = getSupabasePublicEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
};

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
