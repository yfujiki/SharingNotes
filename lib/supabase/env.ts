export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

let cachedPublicEnv: SupabasePublicEnv | null = null;

/**
 * Reads the public Supabase environment variables that are safe to expose to
 * both browser and server contexts.
 */
export const getSupabasePublicEnv = (): SupabasePublicEnv => {
  if (cachedPublicEnv) {
    return cachedPublicEnv;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!anonKey) {
    throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  cachedPublicEnv = { url, anonKey };
  return cachedPublicEnv;
};
