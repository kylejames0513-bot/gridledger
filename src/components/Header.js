'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teamLogoUrl, getTeamById } from '@/lib/constants';

export default function Header({ allPlayers = [], news = [], onProClick }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const ref = useRef(null);

  const results = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return allPlayers.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [search, allPlayers]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setFocused(false); setShowNotif(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header ref={ref} style={{ height: 54, display: 'flex', alignItems: 'center', padding: '0 20px', background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }} onClick={() => router.push('/')}>
        <svg viewBox="0 0 36 36" fill="none" style={{ width: 32, height: 32 }}>
          <path d="M18 2L32 10V26L18 34L4 26V10L18 2Z" fill="#1a1d24" stroke="#b8952e" strokeWidth="1.2"/>
          <path d="M18 12V24M14 16L22 20M22 16L14 20" stroke="#b8952e" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
        </svg>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1.5, color: '#1a1d24', lineHeight: 1 }}>
            GRID<span style={{ color: 'var(--gold)' }}>LEDGER</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2, color: 'var(--text-muted)', marginTop: 1 }}>NFL CAP COMMAND CENTER</div>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 380, margin: '0 16px', position: 'relative' }}>
        <input placeholder="Search any player..." value={search} onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 200)}
          style={{ width: '100%', background: '#f4f5f7', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 16px', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', color: 'var(--text)' }} />
        {focused && results.length > 0 && (
          <div className="gl-card" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, padding: 4, zIndex: 50, maxHeight: 320, overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,.1)' }}>
            {results.map(p => {
              const team = getTeamById(p.team_id);
              return (
                <button key={p.id} onClick={() => { router.push(`/teams/${p.team_id}`); setSearch(''); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'left', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {team?.espn && <img src={teamLogoUrl(team.espn)} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />}
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{p.position} • {p.team_id}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <button className="gl-btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => setShowNotif(!showNotif)}>
            🔔
          </button>
          {showNotif && (
            <div className="gl-card" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 300, padding: 4, zIndex: 50, boxShadow: '0 12px 40px rgba(0,0,0,.1)' }}>
              <div style={{ padding: '8px 12px', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', borderBottom: '1px solid var(--border)' }}>ALERTS</div>
              {(news || []).slice(0, 5).map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)', borderRadius: 8 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', marginTop: 5, flexShrink: 0 }} />
                  <span>{n.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onProClick} className="hide-mobile" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--gold)', background: 'var(--gold-light)', border: '1px solid var(--gold-border)', borderRadius: 20, padding: '4px 14px', cursor: 'pointer', fontFamily: 'var(--font)' }}>PRO</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--red)' }}>
          <span className="animate-pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} /> LIVE
        </div>
      </div>
    </header>
  );
}
