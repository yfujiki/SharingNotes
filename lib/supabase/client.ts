'use client';

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './env';

type BrowserSupabaseClient = SupabaseClient;

const createBrowserClient = (): BrowserSupabaseClient => {
  const { url, anonKey } = getSupabasePublicEnv();

  return createSupabaseBrowserClient(url, anonKey, {
    cookies: {
      getAll() {
        return document.cookie.split('; ').map((cookie) => {
          const [name, ...rest] = cookie.split('=');
          return { name, value: rest.join('=') };
        });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookie = `${name}=${value}`;
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
          if (options?.path) cookie += `; path=${options.path}`;
          if (options?.domain) cookie += `; domain=${options.domain}`;
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
          if (options?.secure) cookie += '; secure';
          document.cookie = cookie;
        });
      },
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
