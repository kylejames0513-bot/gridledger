'use client';
import { useState, useEffect } from 'react';
import { getSupabase } from './supabase';
import { NFL_TEAMS, SALARY_CAP_2026, DRAFT_ROUNDS } from './constants';

function normMoney(val) {
  if (val == null) return 0;
  const n = Number(val);
  if (isNaN(n)) return 0;
  if (Math.abs(n) > 500) return Math.round(n / 1000000 * 100) / 100;
  return Math.round(n * 100) / 100;
}

function normContract(raw) {
  if (!raw) return { base_salary: 0, cap_hit: 0, dead_cap: 0, guaranteed: 0, signing_bonus: 0, roster_bonus: 0, years: 1, total_value: 0, cash_total: 0, year_expires: null };
  return {
    base_salary: normMoney(raw.base_salary), cap_hit: normMoney(raw.cap_hit), dead_cap: normMoney(raw.dead_cap),
    guaranteed: normMoney(raw.guaranteed), signing_bonus: normMoney(raw.signing_bonus), roster_bonus: normMoney(raw.roster_bonus),
    years: raw.years || 1, total_value: normMoney(raw.total_value),
    cash_total: normMoney(raw.cash_total), year_expires: raw.year_expires || null,
  };
}

function isJunk(name) {
  if (!name || name.trim().length < 3) return true;
  return /^R\d+[,\s]/.test(name.trim());
}

function demoRoster(teamId) {
  const names = ['Patrick Mahomes','Josh Allen','Lamar Jackson','Joe Burrow','Jalen Hurts','Justin Herbert','CeeDee Lamb','Tyreek Hill','Ja\'Marr Chase','Amon-Ra St. Brown','Travis Kelce','Saquon Barkley','Derrick Henry','Nick Chubb','Myles Garrett','Micah Parsons','TJ Watt','Sauce Gardner','Jaire Alexander'];
  const positions = ['QB','QB','QB','QB','QB','QB','WR','WR','WR','WR','TE','RB','RB','RB','DE','LB','LB','CB','CB'];
  return names.map((name, i) => ({
    id: `demo-${teamId}-${i}`, team_id: teamId, name, position: positions[i], age: 25 + (i % 8),
    status: 'active', roster_status: 'active', experience: 3 + (i % 5),
    contract: { base_salary: 5 + i * 2.1, cap_hit: 8 + i * 2.5, dead_cap: 2 + i * 0.8, guaranteed: 3 + i * 1.2, signing_bonus: 1 + i * 0.5, roster_bonus: 0, years: 1 + (i % 4), total_value: 20 + i * 5 },
  }));
}

function demoFreeAgents() {
  const fas = ['Kirk Cousins','Davante Adams','Derrick Henry','Austin Ekeler','Mike Evans','Chris Godwin','Hunter Henry','Calais Campbell','Jadeveon Clowney','Stephon Gilmore','Tyrann Mathieu','Jason Kelce','Brandon Graham','Darius Slay','Xavien Howard'];
  const pos = ['QB','WR','RB','RB','WR','WR','TE','DE','DE','CB','S','C','DE','CB','CB'];
  return fas.map((name, i) => ({ id: `fa-${i}`, name, position: pos[i], age: 29 + (i % 6), experience: 8 + (i % 4), projected_value: 4 + Math.round(Math.random() * 18 * 10) / 10 }));
}

// ─── HOOKS ────────────────────────────────────────────────────

export function useTeams() {
  const [teams, setTeams] = useState(null);
  const [source, setSource] = useState('loading');
  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      if (sb) { try { const { data } = await sb.from('teams').select('*').order('id'); if (data?.length) { setTeams(data); setSource('supabase'); return; } } catch(e){} }
      setTeams(NFL_TEAMS.map(t => ({ ...t, cap_total: SALARY_CAP_2026, cap_used: 0, cap_space: SALARY_CAP_2026, dead_money: 0 })));
      setSource('demo');
    })();
  }, []);
  return { teams, source };
}

export function useTeamData(teamId) {
  const [teamData, setTeamData] = useState(null);
  useEffect(() => {
    if (!teamId) return;
    (async () => {
      const sb = getSupabase();
      if (sb) {
        try {
          const { data } = await sb.from('teams').select('*').eq('id', teamId).single();
          if (data) { setTeamData(data); return; }
        } catch(e) {}
      }
      setTeamData(null);
    })();
  }, [teamId]);
  return teamData;
}

export function useRoster(teamId) {
  const [roster, setRoster] = useState(null);
  const [source, setSource] = useState('loading');
  useEffect(() => {
    if (!teamId) return;
    (async () => {
      const sb = getSupabase();
      if (sb) {
        try {
          const { data: players } = await sb.from('players').select('*').eq('team_id', teamId).order('name');
          if (players?.length) {
            const { data: contracts } = await sb.from('contracts').select('*').eq('team_id', teamId).eq('is_current', true);
            const cmap = {}; (contracts || []).forEach(c => cmap[c.player_id] = c);
            setRoster(players.filter(p => !isJunk(p.name)).map(p => ({ ...p, contract: normContract(cmap[p.id]) })));
            setSource('supabase'); return;
          }
        } catch(e){}
      }
      setRoster(demoRoster(teamId)); setSource('demo');
    })();
  }, [teamId]);
  return { roster, setRoster, source };
}

export function useAllRosters() {
  const [rosters, setRosters] = useState({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      if (sb) {
        try {
          const { data: players } = await sb.from('players').select('*').eq('status', 'active');
          const { data: contracts } = await sb.from('contracts').select('*').eq('is_current', true);
          if (players?.length) {
            const cmap = {}; (contracts || []).forEach(c => cmap[c.player_id] = c);
            const grouped = {};
            players.forEach(p => { if (isJunk(p.name)) return; if (!grouped[p.team_id]) grouped[p.team_id] = []; grouped[p.team_id].push({ ...p, contract: normContract(cmap[p.id]) }); });
            setRosters(grouped); setLoaded(true); return;
          }
        } catch(e){}
      }
      const g = {}; NFL_TEAMS.forEach(t => g[t.id] = demoRoster(t.id));
      setRosters(g); setLoaded(true);
    })();
  }, []);
  return { rosters, loaded };
}

export function useDraftPicks(teamId) {
  const [picks, setPicks] = useState([]);
  useEffect(() => {
    if (!teamId) return;
    (async () => {
      const sb = getSupabase();
      if (sb) { try { const { data } = await sb.from('draft_picks').select('*').eq('current_owner', teamId).order('round'); if (data?.length) { setPicks(data); return; } } catch(e){} }
      setPicks(DRAFT_ROUNDS.map((r, i) => ({ id: `default-${i}`, round: r.round, year: 2026, trade_value: r.tradeValue, original_team: teamId, current_owner: teamId })));
    })();
  }, [teamId]);
  return picks;
}

export function useTransactions(teamId) {
  const [tx, setTx] = useState(null);
  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      if (sb) {
        try {
          let q = sb.from('transactions').select('*').order('transaction_date', { ascending: false }).limit(50);
          if (teamId) q = q.or(`from_team_id.eq.${teamId},to_team_id.eq.${teamId}`);
          const { data } = await q;
          if (data?.length) { setTx(data); return; }
        } catch(e){}
      }
      setTx([]);
    })();
  }, [teamId]);
  return tx;
}

export function useNews() {
  const [news, setNews] = useState(null);
  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      if (sb) {
        try {
          const { data } = await sb.from('news').select('*').order('published_at', { ascending: false }).limit(20);
          if (data?.length) {
            setNews(data.map(n => ({ ...n, title: n.headline || n.title, type: n.category || n.type })));
            return;
          }
        } catch(e) {}
      }
      setNews([
        { id: 1, title: 'Free agency opens with blockbuster trades', source: 'NFL.com', type: 'trade', published_at: new Date().toISOString() },
        { id: 2, title: 'Teams rush to clear cap space before deadline', source: 'ESPN', type: 'signing', published_at: new Date().toISOString() },
        { id: 3, title: 'Several veterans released in cap moves', source: 'NFL Network', type: 'cut', published_at: new Date().toISOString() },
      ]);
    })();
  }, []);
  return news;
}

export function useAllPlayers() {
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      if (sb) { try { const { data } = await sb.from('players').select('id,team_id,name,position,age').eq('status', 'active').order('name').limit(2000); if (data?.length) { setPlayers(data.filter(p => !isJunk(p.name))); return; } } catch(e){} }
      setPlayers([]);
    })();
  }, []);
  return players;
}

export function useFreeAgents() {
  const [fas, setFas] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      if (sb) {
        try {
          const { data, error } = await sb
            .from('free_agents')
            .select('*')
            .eq('status', 'available')
            .order('market_value', { ascending: false })
            .limit(300);
          if (!error && data?.length) {
            setFas(data.map(fa => ({
              ...fa,
              projected_value: fa.market_value || 0,
              experience: fa.experience || 0,
            })));
            setLoaded(true);
            return;
          }
        } catch(e) {}
      }
      setFas(demoFreeAgents());
      setLoaded(true);
    })();
  }, []);

  return { freeAgents: fas, setFreeAgents: setFas, loaded };
}

// ─── AUTH ──────────────────────────────────────────────────────

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }

    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadProfile(sb, session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadProfile(sb, session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(sb, userId) {
    try {
      const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
      setProfile(data);
    } catch(e) {}
    setLoading(false);
  }

  async function signUp(email, password, displayName) {
    const sb = getSupabase();
    if (!sb) return { error: { message: 'Not connected' } };
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    });
    return { data, error };
  }

  async function signIn(email, password) {
    const sb = getSupabase();
    if (!sb) return { error: { message: 'Not connected' } };
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function updateProfile(updates) {
    const sb = getSupabase();
    if (!sb || !user) return;
    await sb.from('profiles').update(updates).eq('id', user.id);
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
  }

  return {
    user,
    profile,
    loading,
    isPro: profile?.is_pro || false,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };
}

export function useProStatus() {
  // Legacy compat — uses auth under the hood
  const [isPro, setIsPro] = useState(false);
  return { isPro, setIsPro, togglePro: () => setIsPro(p => !p) };
}
