import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      const { data: players, error } = await supabase
        .from('players')
        .select(`
          *,
          contracts!inner (
            base_salary, cap_hit, dead_cap, guaranteed,
            years, total_value, signing_bonus, is_current
          )
        `)
        .eq('team_id', teamId)
        .eq('contracts.is_current', true)
        .order('name');

      if (!error && players) {
        // Flatten contract onto player
        const roster = players.map(p => ({
          ...p,
          contract: p.contracts?.[0] || null,
        }));
        return NextResponse.json({ roster, source: 'database' });
      }
    } catch (e) {
      console.error('Roster fetch failed:', e);
    }
  }

  return NextResponse.json({ roster: [], source: 'demo' });
}
