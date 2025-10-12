import 'server-only';

import { NextResponse } from 'next/server';

import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from '@/lib/supabase/server';

export async function GET() {
  try {
    const serverClient = await createSupabaseServerClient();
    const serviceRoleClient = createSupabaseServiceRoleClient();

    const [{ error: serverError }, adminResult] = await Promise.all([
      serverClient.auth.getSession(),
      serviceRoleClient.auth.admin.listUsers({ page: 1, perPage: 1 }),
    ]);

    if (serverError) {
      throw serverError;
    }

    if (adminResult.error) {
      throw adminResult.error;
    }

    const userCount = adminResult.data?.users.length ?? 0;

    return NextResponse.json(
      {
        ok: true,
        serverAuth: 'ok',
        adminAuth: 'ok',
        sampleUserCount: userCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Supabase health check failed', error);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
