import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET - fetch user's scenarios
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const teamId = searchParams.get('teamId');

  const supabase = getSupabaseAdmin();
  if (!supabase || !sessionId) {
    return NextResponse.json({ scenarios: [] });
  }

  try {
    let query = supabase
      .from('gm_scenarios')
      .select(`*, gm_moves(*)`)
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false });

    if (teamId) query = query.eq('team_id', teamId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ scenarios: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - create scenario or add move
export async function POST(request) {
  const body = await request.json();
  const { action, sessionId, teamId, scenarioId, move } = body;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not connected' }, { status: 503 });
  }

  try {
    if (action === 'create_scenario') {
      const { data, error } = await supabase
        .from('gm_scenarios')
        .insert({
          session_id: sessionId,
          team_id: teamId,
          name: body.name || 'My Scenario',
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ scenario: data });
    }

    if (action === 'add_move' && scenarioId && move) {
      // Count existing moves for ordering
      const { count } = await supabase
        .from('gm_moves')
        .select('*', { count: 'exact', head: true })
        .eq('scenario_id', scenarioId);

      const { data, error } = await supabase
        .from('gm_moves')
        .insert({
          scenario_id: scenarioId,
          move_type: move.move_type,
          player_name: move.player_name,
          details: move.details || {},
          cap_impact: move.cap_impact || 0,
          move_order: (count || 0) + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ move: data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - remove scenario
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get('scenarioId');

  const supabase = getSupabaseAdmin();
  if (!supabase || !scenarioId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('gm_scenarios')
      .delete()
      .eq('id', scenarioId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
