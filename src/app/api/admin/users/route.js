import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  // Use service role with full admin access
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Get auth users directly (most reliable)
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
      return NextResponse.json({ error: 'Auth admin error: ' + authErr.message }, { status: 500 });
    }
    const authUsers = authData?.users || [];

    // Try to get profiles (may be empty)
    let profiles = [];
    try {
      const { data } = await supabase.from('profiles').select('*');
      profiles = data || [];
    } catch(e) {}
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.id] = p; });

    // Merge auth users with profiles
    const users = authUsers.map(u => {
      const p = profileMap[u.id] || {};
      return {
        id: u.id,
        email: u.email || '—',
        display_name: p.display_name || u.user_metadata?.display_name || u.email?.split('@')[0] || '—',
        is_pro: p.is_pro || false,
        favorite_team: p.favorite_team || null,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at || null,
        email_confirmed: !!u.email_confirmed_at,
        has_profile: !!profileMap[u.id],
      };
    });

    const now = new Date();
    const week = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const stats = {
      total: users.length,
      pro: users.filter(u => u.is_pro).length,
      recent: users.filter(u => u.created_at && new Date(u.created_at) > week).length,
    };

    return NextResponse.json({ users, stats });
  } catch(e) {
    return NextResponse.json({ error: e.message, stack: e.stack?.substring(0, 500) }, { status: 500 });
  }
}

export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { action, userId, isPro } = await request.json();

    if (action === 'toggle_pro') {
      // Try update first
      const { data, error } = await supabase.from('profiles')
        .update({ is_pro: isPro, pro_expires_at: isPro ? null : new Date().toISOString() })
        .eq('id', userId)
        .select();

      // If no rows updated, profile doesn't exist — create it
      if (!data || data.length === 0) {
        // Get email from auth
        const { data: authData } = await supabase.auth.admin.getUserById(userId);
        const email = authData?.user?.email || '';
        const name = authData?.user?.user_metadata?.display_name || email.split('@')[0];

        await supabase.from('profiles').insert({
          id: userId, email, display_name: name,
          is_pro: isPro, pro_expires_at: isPro ? null : new Date().toISOString(),
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_user') {
      try { await supabase.from('profiles').delete().eq('id', userId); } catch(e) {}
      try { await supabase.auth.admin.deleteUser(userId); } catch(e) {}
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
