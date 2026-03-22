'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import NewsTicker from '@/components/NewsTicker';
import ProModal from '@/components/ProModal';
import { NFL_TEAMS, SALARY_CAP_2026, formatMoney, getTeamsByDiv, getTeamsByDivision, teamLogo } from '@/lib/constants';
import { useTeams, useNews, useAllPlayers, useProStatus } from '@/lib/use-data';

export default function HomePage() {
  const router = useRouter();
  const { teams, source } = useTeams();
  const news = useNews();
  const allPlayers = useAllPlayers();
  const { isPro, setIsPro } = useProStatus();
  const [showPro, setShowPro] = useState(false);

  const teamMap = useMemo(() => {
    if (!teams) return {};
    const m = {};
    teams.forEach(t => m[t.id] = t);
    return m;
  }, [teams]);

  const divisions = ['East', 'North', 'South', 'West'];
  const getDiv = typeof getTeamsByDivision === 'function' ? getTeamsByDivision : getTeamsByDiv;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f1f3' }}>
      <Header allPlayers={allPlayers} news={news} onProClick={() => setShowPro(true)} />
      <NewsTicker news={news} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px 60px' }}>
        {/* Hero */}
        <div className="gl-card" style={{ textAlign: 'center', marginBottom: 48, padding: '36px 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18, padding: '5px 16px', borderRadius: 20, background: 'rgba(184,149,46,.05)', border: '1px solid rgba(184,149,46,.1)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#b8952e', letterSpacing: 1.5 }}>2026 NFL SALARY CAP SEASON</span>
          </div>
          <h1 style={{ fontSize: 'clamp(30px, 6vw, 46px)', fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 14 }}>
            THE <span style={{ color: '#b8952e' }}>GRIDLEDGER</span>
          </h1>
          <p style={{ fontSize: 14, color: '#b0b5be', maxWidth: 400, margin: '0 auto', lineHeight: 1.8 }}>
            Real contracts. Live transactions. Full GM tools.
            <br /><span style={{ color: '#7a8190' }}>The definitive salary cap command center for all 32 NFL teams.</span>
          </p>
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, maxWidth: 520, margin: '28px auto 0' }}>
            {[
              { label: '2026 CAP', val: '$301.2M', color: '#b8952e' },
              { label: 'TEAMS', val: '32', color: '#1a1d24' },
              { label: 'SOURCE', val: source === 'supabase' ? 'LIVE' : 'DEMO', color: source === 'supabase' ? '#16a34a' : '#d97706' },
              { label: 'STATUS', val: 'LIVE', color: '#dc2626' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f7f8f9', borderRadius: 14, padding: '14px 10px', textAlign: 'center', border: '1px solid #f0f1f3' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#c4c9d0', marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Teams */}
        {['AFC', 'NFC'].map(conf => (
          <div key={conf} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: conf === 'AFC' ? '#dc2626' : '#2563eb' }}>{conf}</span>
              <div style={{ flex: 1, height: 1, background: '#eaecf0' }} />
            </div>
            <div className="div-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {divisions.map(div => (
                <div key={div} className="gl-card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #f2f4f7', background: '#fafbfc' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#b0b5be' }}>{div.toUpperCase()}</span>
                  </div>
                  <div style={{ padding: 6 }}>
                    {(getDiv(conf, div) || []).map((t, i, arr) => {
                      const data = teamMap[t.id];
                      const space = data?.cap_space;
                      return (
                        <button key={t.id} onClick={() => router.push(`/teams/${t.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 12, cursor: 'pointer', transition: 'background .15s', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', fontFamily: 'inherit', borderBottom: i < arr.length - 1 ? '1px solid #f9fafb' : 'none', color: 'inherit' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <img src={teamLogo(t.espn)} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d24' }}>{t.city} {t.name}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="money" style={{ fontSize: 12.5, fontWeight: 600, color: space != null ? (space >= 0 ? '#16a34a' : '#dc2626') : '#c4c9d0' }}>
                              {space != null ? `${space >= 0 ? '+' : ''}${space.toFixed(1)}M` : '—'}
                            </div>
                            <div style={{ fontSize: 9, color: '#d1d5db', marginTop: 1 }}>cap space</div>
                          </div>
                          <span style={{ color: '#d1d5db', fontSize: 16 }}>›</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* News */}
        {news && news.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#b0b5be', marginBottom: 10 }}>LATEST TRANSACTIONS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {news.slice(0, 6).map((n, i) => {
                const tc = { trade: { bg: '#f3e8ff', fg: '#7c3aed' }, signing: { bg: '#dcfce7', fg: '#16a34a' }, cut: { bg: '#fef2f2', fg: '#dc2626' }, restructure: { bg: '#dbeafe', fg: '#2563eb' } };
                const c = tc[n.type] || { bg: '#fef3c7', fg: '#b8952e' };
                return (
                  <div key={i} className="gl-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, padding: '3px 8px', borderRadius: 5, flexShrink: 0, background: c.bg, color: c.fg, textTransform: 'uppercase' }}>{n.type || 'news'}</span>
                    <div style={{ fontSize: 13, color: '#7a8190', lineHeight: 1.4 }}>{n.title}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 11, color: '#c4c9d0', borderTop: '1px solid #eaecf0', paddingTop: 24, marginTop: 32 }}>
          GridLedger — NFL Salary Cap Command Center • Data from Spotrac • 2026 Season
        </div>
      </div>
      {showPro && <ProModal show={showPro} onClose={() => setShowPro(false)} onActivatePro={() => { setIsPro(true); setShowPro(false); }} />}
    </div>
  );
}
