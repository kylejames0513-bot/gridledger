import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { NFL_TEAMS } from '@/lib/constants';

// This endpoint syncs external data into Supabase.
// Call via Vercel Cron (vercel.json) or manually.
// In production, you'd scrape NFL.com/transactions or use an API like ESPN/Sportradar.

export async function GET(request) {
  // Verify cron secret
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const results = { teams: 0, transactions: 0, errors: [] };

  try {
    // 1. Ensure all 32 teams exist
    const { data: existingTeams } = await supabase.from('teams').select('id');
    const existingIds = new Set((existingTeams || []).map(t => t.id));

    const newTeams = NFL_TEAMS.filter(t => !existingIds.has(t.id)).map(t => ({
      id: t.id,
      name: t.name,
      city: t.city,
      conference: t.conf,
      division: t.div,
      color: t.color,
      accent: t.accent,
    }));

    if (newTeams.length > 0) {
      const { error } = await supabase.from('teams').insert(newTeams);
      if (error) results.errors.push(`Teams insert: ${error.message}`);
      else results.teams = newTeams.length;
    }

    // 2. Recalculate cap totals for all teams
    for (const team of NFL_TEAMS) {
      try {
        await supabase.rpc('recalc_team_cap', { tid: team.id });
      } catch (e) {
        // Function may not exist yet in fresh DB
      }
    }

    // 3. Future: Fetch from NFL.com transaction wire
    // const nflData = await fetchNFLTransactions();
    // await supabase.from('transactions').upsert(nflData);

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
      results,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message, results }, { status: 500 });
  }
}
