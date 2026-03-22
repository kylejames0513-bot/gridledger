import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { NFL_TEAMS, SALARY_CAP_2026 } from '@/lib/constants';

export async function GET() {
  const supabase = getSupabaseAdmin();

  // If Supabase connected, fetch from DB
  if (supabase) {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .order('id');

      if (!error && teams?.length) {
        return NextResponse.json({ teams, source: 'database' });
      }
    } catch (e) {
      console.error('DB fetch failed:', e);
    }
  }

  // Fallback: return static team data with calculated caps
  const teams = NFL_TEAMS.map(t => ({
    ...t,
    cap_total: SALARY_CAP_2026,
    cap_used: 0,
    cap_space: SALARY_CAP_2026,
    dead_money: 0,
  }));

  return NextResponse.json({ teams, source: 'static' });
}
