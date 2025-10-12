import { NextResponse } from 'next/server';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to notes page after successful verification
  return NextResponse.redirect(new URL('/notes', requestUrl.origin));
}
