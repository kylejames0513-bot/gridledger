import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '50');

  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(limit);

      if (teamId) {
        query = query.or(`from_team_id.eq.${teamId},to_team_id.eq.${teamId}`);
      }
      if (type && type !== 'all') {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (!error && data) {
        return NextResponse.json({ transactions: data, source: 'database' });
      }
    } catch (e) {
      console.error('Transactions fetch failed:', e);
    }
  }

  return NextResponse.json({ transactions: [], source: 'demo' });
}
