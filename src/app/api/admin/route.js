import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const ADMIN_EMAILS = ['kylejames0513@gmail.com'];

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  try {
    const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const now = new Date();
    const week = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const stats = {
      total: users?.length || 0,
      pro: users?.filter(u => u.is_pro).length || 0,
      recent: users?.filter(u => new Date(u.created_at) > week).length || 0,
    };
    return NextResponse.json({ users: users || [], stats });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
