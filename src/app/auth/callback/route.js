import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') || 'signup';
  const next = searchParams.get('next') || '/';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Handle code exchange (PKCE flow — most common for email verification)
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, origin));
      }
    } catch(e) {}
  }

  // Handle token_hash (magic link flow)
  if (token_hash) {
    try {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (!error) {
        return NextResponse.redirect(new URL(next, origin));
      }
    } catch(e) {}
  }

  // Fallback — redirect to confirm page which handles hash fragments
  return NextResponse.redirect(new URL('/auth/confirm', origin));
}
