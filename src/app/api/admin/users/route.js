import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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

export async function POST(request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  try {
    const { action, userId, isPro } = await request.json();

    if (action === 'toggle_pro') {
      await supabase.from('profiles').update({
        is_pro: isPro,
        pro_expires_at: isPro ? null : new Date().toISOString(),
      }).eq('id', userId);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_user') {
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
