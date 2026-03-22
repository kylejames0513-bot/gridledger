'use client';

import { useState, useMemo } from 'react';
import { NFL_TEAMS, posColor, formatMoney, getTeamById } from '@/lib/constants';

export default function TradeSimulator({ teamId, roster = [], allRosters = {}, onExecuteTrade }) {
  const [partner, setPartner] = useState('');
  const [sel1, setSel1] = useState([]);
  const [sel2, setSel2] = useState([]);
  const team = getTeamById(teamId);
  const partnerTeam = partner ? getTeamById(partner) : null;
  const myActive = roster.filter(p => p.roster_status === 'active' && p.status === 'active');
  const theirRoster = partner ? (allRosters[partner] || []) : [];
  const theirActive = theirRoster.filter(p => p.roster_status === 'active' && p.status === 'active');

  const impact = useMemo(() => {
    const send = sel1.reduce((s, id) => s + (myActive.find(p => p.id === id)?.contract?.cap_hit || 0), 0);
    const recv = sel2.reduce((s, id) => s + (theirActive.find(p => p.id === id)?.contract?.cap_hit || 0), 0);
    return { send: Math.round(send * 10) / 10, recv: Math.round(recv * 10) / 10, net: Math.round((recv - send) * 10) / 10 };
  }, [sel1, sel2, myActive, theirActive]);

  function toggle(list, setList, id) { setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function exec() { if (!sel1.length || !sel2.length) return; onExecuteTrade?.(partner, sel1, sel2); setSel1([]); setSel2([]); }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>Trade with:</span>
        <select value={partner} onChange={e => { setPartner(e.target.value); setSel1([]); setSel2([]); }}
          className="gl-btn-ghost" style={{ padding: '8px 12px', fontSize: 13 }}>
          <option value="">Select team...</option>
          {NFL_TEAMS.filter(t => t.id !== teamId).map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
        </select>
      </div>
      {partner ? (
        <div className="gl-card trade-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', overflow: 'hidden' }}>
          <TradeCol label={`${team?.name} Send`} color={team?.color} players={myActive} selected={sel1} onToggle={id => toggle(sel1, setSel1, id)} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, background: '#f7f8f9', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-faint)' }}>Cap Impact</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>Sending</div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>{formatMoney(impact.send)}</div>
            </div>
            <div style={{ fontSize: 18, color: 'var(--gold)' }}>⇄</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>Receiving</div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>{formatMoney(impact.recv)}</div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>Net</div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 16, color: impact.net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {impact.net >= 0 ? '+' : ''}{formatMoney(impact.net)}
              </div>
            </div>
            <button disabled={!sel1.length || !sel2.length} onClick={exec}
              className="gl-btn gl-btn-gold" style={{ width: '100%', padding: '9px 0', fontSize: 11, borderRadius: 10 }}>
              Execute Trade
            </button>
          </div>
          <TradeCol label={`${partnerTeam?.name} Send`} color={partnerTeam?.color} players={theirActive} selected={sel2} onToggle={id => toggle(sel2, setSel2, id)} />
        </div>
      ) : (
        <div className="gl-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⇄</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Select a trade partner above</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Pick players from each side and see cap impact in real time</div>
        </div>
      )}
    </div>
  );
}

function TradeCol({ label, color, players, selected, onToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 300 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fafbfc', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: color || 'var(--gold)' }} />
        {label}
      </div>
      <div style={{ flex: 1, maxHeight: 380, overflowY: 'auto', padding: 4 }}>
        {players.map(p => {
          const picked = selected.includes(p.id);
          const pc = posColor(p.position);
          return (
            <button key={p.id} onClick={() => onToggle(p.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                borderRadius: 10, textAlign: 'left', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)',
                border: picked ? '1px solid var(--gold-border)' : '1px solid transparent',
                background: picked ? 'var(--gold-light)' : 'transparent',
                transition: 'all .1s', color: 'var(--text)',
              }}
              onMouseEnter={e => { if (!picked) e.currentTarget.style.background = 'var(--card-hover)'; }}
              onMouseLeave={e => { if (!picked) e.currentTarget.style.background = 'transparent'; }}>
              <span className="pos-badge" style={{ background: pc.bg, color: pc.fg }}>{p.position}</span>
              <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{formatMoney(p.contract?.cap_hit)}</span>
            </button>
          );
        })}
        {players.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>No players loaded</div>
        )}
      </div>
    </div>
  );
}
