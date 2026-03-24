import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  try {
    // Try profiles table first
    const { data: profiles, error: profErr } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false });

    // Also get auth users for complete picture
    let authUsers = [];
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      authUsers = authData?.users || [];
    } catch(e) {}

    // Merge: use profiles as base, fill in from auth users
    let users = [];
    if (profiles && profiles.length > 0) {
      users = profiles.map(p => {
        const au = authUsers.find(u => u.id === p.id);
        return {
          ...p,
          email: p.email || au?.email || '—',
          display_name: p.display_name || au?.user_metadata?.display_name || au?.email?.split('@')[0] || '—',
          last_sign_in: au?.last_sign_in_at || null,
        };
      });
    } else {
      // Profiles table empty — build from auth users
      users = authUsers.map(u => ({
        id: u.id,
        email: u.email,
        display_name: u.user_metadata?.display_name || u.email?.split('@')[0] || '—',
        is_pro: false,
        favorite_team: null,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
      }));
    }

    const now = new Date();
    const week = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const stats = {
      total: users.length,
      pro: users.filter(u => u.is_pro).length,
      recent: users.filter(u => u.created_at && new Date(u.created_at) > week).length,
    };
    return NextResponse.json({ users, stats });
  } catch(e) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}

export async function POST(request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  try {
    const { action, userId, isPro } = await request.json();

    if (action === 'toggle_pro') {
      // Update profiles table
      const { error } = await supabase.from('profiles').update({
        is_pro: isPro,
        pro_expires_at: isPro ? null : new Date().toISOString(),
      }).eq('id', userId);
      // If profile doesn't exist, create it
      if (error) {
        await supabase.from('profiles').upsert({
          id: userId, is_pro: isPro,
          pro_expires_at: isPro ? null : new Date().toISOString(),
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_user') {
      await supabase.from('profiles').delete().eq('id', userId);
      try { await supabase.auth.admin.deleteUser(userId); } catch(e) {}
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
