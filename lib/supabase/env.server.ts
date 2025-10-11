import 'server-only';

let cachedServiceRoleKey: string | null = null;

/**
 * Reads the Supabase service role key. This helper is server-only; do not
 * import it into client components because it exposes sensitive credentials.
 */
export const getSupabaseServiceRoleKey = (): string => {
  if (cachedServiceRoleKey) {
    return cachedServiceRoleKey;
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');
  }

  cachedServiceRoleKey = key;
  return cachedServiceRoleKey;
};
