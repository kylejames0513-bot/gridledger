'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import NewsTicker from '@/components/NewsTicker';
import { useAllRosters, useNews, useAllPlayers } from '@/lib/use-data';
import { formatMoney, posColor, getTeamById, teamLogoUrl } from '@/lib/constants';

const POSITIONS = ['QB','WR','RB','TE','EDGE','IDL','DT','DE','CB','S','LB','OT','LT','RT','OG','LG','RG','C','K','P'];

export default function RankingsPage() {
  const router = useRouter();
  const { rosters, loaded } = useAllRosters();
  const news = useNews();
  const allPlayers = useAllPlayers();
  const [pos, setPos] = useState('QB');
  const [count, setCount] = useState(15);

  const ranked = useMemo(() => {
    if (!loaded) return [];
    const all = [];
    Object.entries(rosters).forEach(([teamId, players]) => {
      players.forEach(p => {
        if (p.position === pos && p.roster_status === 'active' && p.contract?.cap_hit > 0) {
          all.push({ ...p, teamId });
        }
      });
    });
    return all.sort((a, b) => (b.contract?.cap_hit || 0) - (a.contract?.cap_hit || 0)).slice(0, count);
  }, [rosters, loaded, pos, count]);

  const maxCap = ranked[0]?.contract?.cap_hit || 1;
  const avgCap = ranked.length > 0 ? ranked.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0) / ranked.length : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header allPlayers={allPlayers} news={news} />
      <NewsTicker news={news} />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 60px' }}>
        <button onClick={() => router.push('/')} className="gl-btn-ghost" style={{ marginBottom: 16 }}>← Home</button>

        <div className="gl-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📊 Position Rankings</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Top earners at every position across the NFL — sorted by 2026 cap hit</p>
        </div>

        {/* Position selector */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
          {POSITIONS.map(p => {
            const pc = posColor(p);
            return (
              <button key={p} onClick={() => setPos(p)}
                style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', border: pos === p ? `2px solid ${pc.fg}` : '1px solid var(--border)', background: pos === p ? pc.bg : 'var(--card)', color: pos === p ? pc.fg : 'var(--text-muted)' }}>
                {p}
              </button>
            );
          })}
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <div className="gl-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)' }}>{formatMoney(maxCap)}</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', marginTop: 3 }}>HIGHEST {pos}</div>
          </div>
          <div className="gl-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{formatMoney(Math.round(avgCap * 10) / 10)}</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', marginTop: 3 }}>AVG TOP {count}</div>
          </div>
          <div className="gl-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)' }}>{ranked.length}</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', marginTop: 3 }}>PLAYERS</div>
          </div>
        </div>
