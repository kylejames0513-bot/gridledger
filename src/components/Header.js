'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teamLogoUrl, getTeamById } from '@/lib/constants';
import { useGLAuth } from '@/components/ClientProviders';

export default function Header({ allPlayers = [], news = [] }) {
  const router = useRouter();
  const auth = useGLAuth();
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const ref = useRef(null);

  const results = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return allPlayers.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [search, allPlayers]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setFocused(false); setShowNotif(false); setShowUser(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initial = auth?.displayName?.[0]?.toUpperCase() || '?';

  return (
    <header ref={ref} style={{ height: 54, display: 'flex', alignItems: 'center', padding: '0 20px', background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
      {/* Logo */}
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

      {/* Search */}
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

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button className="gl-btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => setShowNotif(!showNotif)}>🔔</button>
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

        {/* PRO badge */}
        {auth?.isPro ? (
          <span className="hide-mobile" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#fff', background: 'linear-gradient(135deg, #b8952e, #9a7c22)', borderRadius: 20, padding: '4px 14px', fontFamily: 'var(--font)' }}>PRO</span>
        ) : (
          <button onClick={() => auth?.openPro?.()} className="hide-mobile" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--gold)', background: 'var(--gold-light)', border: '1px solid var(--gold-border)', borderRadius: 20, padding: '4px 14px', cursor: 'pointer', fontFamily: 'var(--font)' }}>PRO</button>
        )}

        {/* LIVE indicator */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--red)' }}>
          <span className="animate-pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} /> LIVE
        </div>

        {/* User / Sign In */}
        {auth?.user ? (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUser(!showUser)}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--gold-border)', background: 'linear-gradient(135deg, #b8952e22, #9a7c2222)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font)' }}>
              {initial}
            </button>
            {showUser && (
              <div className="gl-card" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 220, padding: 6, zIndex: 50, boxShadow: '0 12px 40px rgba(0,0,0,.12)' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{auth.displayName}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{auth.user.email}</div>
                  {auth.isPro && <span style={{ display: 'inline-block', marginTop: 4, fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#fff', background: 'linear-gradient(135deg, #b8952e, #9a7c22)', borderRadius: 4, padding: '2px 8px' }}>PRO MEMBER</span>}
                </div>

                {!auth.isPro && (
                  <button onClick={() => { setShowUser(false); auth.openPro?.(); }}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--gold)', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    ⭐ Upgrade to Pro
                  </button>
                )}
                <button onClick={() => { setShowUser(false); auth.signOut(); }}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--red)', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => auth?.openAuth?.()}
            style={{ padding: '6px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', background: '#1a1d24', color: '#fff' }}>
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
