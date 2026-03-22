'use client';
import { useState, useMemo } from 'react';
import { NFL_TEAMS, posColor, formatMoney, getTeamById, SALARY_CAP_2026 } from '@/lib/constants';

// ═══ POSITION VALUE TIERS (Madden-style) ═══
const POS_TIER = { QB: 10, EDGE: 8.5, CB: 8, WR: 7.5, OT: 7.5, LT: 7.5, RT: 7, IDL: 7, DT: 6.5, DE: 7, S: 6.5, FS: 6.5, SS: 6.5, LB: 6, ILB: 6, OLB: 6.5, TE: 6, RB: 5, OG: 5.5, LG: 5.5, RG: 5.5, C: 5.5, G: 5.5, T: 7, FB: 3, K: 3.5, P: 3, LS: 2 };
const PICK_VALUES = { 1: 28, 2: 16, 3: 10, 4: 6, 5: 3.5, 6: 2, 7: 1 };

function playerTradeValue(p) {
  const c = p.contract || {};
  const posTier = POS_TIER[p.position] || 4;
  const capHit = c.cap_hit || 0;
  const age = p.age || 27;
  // Base value from position importance
  let val = posTier * 3;
  // Cap hit adds value (expensive = better player usually)
  val += Math.min(capHit * 1.2, 30);
  // Age curve: peaks at 26, drops fast after 30
  if (age <= 25) val += (25 - age) * 0.8;
  else if (age <= 28) val += (28 - age) * 0.3;
  else val -= (age - 28) * 1.5;
  // QB premium
  if (p.position === 'QB' && capHit > 20) val += 15;
  // Guaranteed money remaining adds trade difficulty
  val += Math.min((c.guaranteed || 0) * 0.3, 8);
  return Math.max(1, Math.round(val * 10) / 10);
}

function evaluateTrade(sendPlayers, recvPlayers, sendPicks, recvPicks, myTeamData, partnerTeamData) {
  // Calculate total value each side is giving up
  const sendVal = sendPlayers.reduce((s, p) => s + playerTradeValue(p), 0) + sendPicks.reduce((s, pk) => s + (PICK_VALUES[pk] || 0), 0);
  const recvVal = recvPlayers.reduce((s, p) => s + playerTradeValue(p), 0) + recvPicks.reduce((s, pk) => s + (PICK_VALUES[pk] || 0), 0);

  // Cap impact
  const sendCap = sendPlayers.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const recvCap = recvPlayers.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const myCapAfter = (myTeamData?.cap_space || 30) + sendCap - recvCap;
  const theirCapAfter = (partnerTeamData?.cap_space || 30) - sendCap + recvCap;

  // Dead money from trading players away
  const myDeadHit = sendPlayers.reduce((s, p) => s + (p.contract?.dead_cap || 0), 0);
  const theirDeadHit = recvPlayers.reduce((s, p) => s + (p.contract?.dead_cap || 0), 0);

  // Fairness ratio (1.0 = perfectly fair)
  const fairness = sendVal > 0 ? recvVal / sendVal : 0;

  // GM decision logic
  let status = 'pending';
  let reason = '';
  let emoji = '⏳';

  if (sendPlayers.length === 0 && sendPicks.length === 0) {
    status = 'invalid'; reason = 'Select players or picks to send'; emoji = '⚠️';
  } else if (recvPlayers.length === 0 && recvPicks.length === 0) {
    status = 'invalid'; reason = 'Select players or picks to receive'; emoji = '⚠️';
  } else if (theirCapAfter < 0) {
    status = 'rejected'; reason = 'Trade partner cannot absorb the cap hit'; emoji = '💰';
  } else if (myCapAfter < 0) {
    status = 'rejected'; reason = 'You cannot absorb the incoming cap hit'; emoji = '💰';
  } else if (fairness > 2.5) {
    status = 'rejected'; reason = 'Trade partner\'s GM: "This is insulting. No deal."'; emoji = '🚫';
  } else if (fairness > 1.8) {
    status = 'rejected'; reason = 'Trade partner\'s GM: "You\'re not giving us enough value."'; emoji = '❌';
  } else if (fairness > 1.35) {
    status = 'unlikely'; reason = 'Trade partner\'s GM: "We\'d need more to make this work."'; emoji = '🤔';
  } else if (fairness >= 0.7) {
    status = 'approved'; reason = 'Both GMs agree. Trade is fair.'; emoji = '✅';
  } else if (fairness >= 0.5) {
    status = 'steal'; reason = 'Trade partner\'s GM accepts — you\'re getting a steal!'; emoji = '🔥';
  } else {
    status = 'unlikely'; reason = 'Your front office thinks you\'re overpaying.'; emoji = '⚠️';
  }

  return { sendVal, recvVal, fairness, status, reason, emoji, myCapAfter, theirCapAfter, myDeadHit, theirDeadHit, sendCap, recvCap };
}

export default function TradeSimulator({ teamId, roster = [], allRosters = {}, onExecuteTrade, teamData = null }) {
  const [partner, setPartner] = useState('');
  const [sel1, setSel1] = useState([]);
  const [sel2, setSel2] = useState([]);
  const [sendPicks, setSendPicks] = useState([]);
  const [recvPicks, setRecvPicks] = useState([]);
  const [tradeResult, setTradeResult] = useState(null);
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');

  const team = getTeamById(teamId);
  const partnerTeam = partner ? getTeamById(partner) : null;
  const myActive = roster.filter(p => p.roster_status === 'active' && p.status === 'active');
  const theirRoster = partner ? (allRosters[partner] || []) : [];
  const theirActive = theirRoster.filter(p => p.roster_status === 'active' && p.status === 'active');

  const sendPlayers = sel1.map(id => myActive.find(p => p.id === id)).filter(Boolean);
  const recvPlayers = sel2.map(id => theirActive.find(p => p.id === id)).filter(Boolean);

  // Use a simple object for partner team data
  const partnerData = useMemo(() => {
    const tr = theirRoster;
    const used = tr.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
    return { cap_space: SALARY_CAP_2026 - used };
  }, [theirRoster]);

  const eval_ = useMemo(() => {
    return evaluateTrade(sendPlayers, recvPlayers, sendPicks, recvPicks, teamData || { cap_space: 30 }, partnerData);
  }, [sendPlayers, recvPlayers, sendPicks, recvPicks, teamData, partnerData]);

  function toggle(list, setList, id) { setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function togglePick(list, setList, round) { setList(prev => prev.includes(round) ? prev.filter(x => x !== round) : [...prev, round]); }

  function exec() {
    if (eval_.status !== 'approved' && eval_.status !== 'steal') {
      setTradeResult(eval_);
      return;
    }
    onExecuteTrade?.(partner, sel1, sel2);
    setTradeResult({ ...eval_, executed: true });
    setTimeout(() => { setSel1([]); setSel2([]); setSendPicks([]); setRecvPicks([]); setTradeResult(null); }, 2000);
  }

  // Fairness meter color
  const meterColor = eval_.fairness >= 0.7 && eval_.fairness <= 1.35 ? '#16a34a'
    : eval_.fairness > 1.35 && eval_.fairness <= 1.8 ? '#d97706'
    : eval_.fairness > 1.8 ? '#dc2626'
    : eval_.fairness >= 0.5 ? '#2563eb' : '#dc2626';

  const meterPct = Math.min(Math.max(eval_.fairness * 50, 5), 100);
  const statusColors = { approved: '#16a34a', steal: '#2563eb', unlikely: '#d97706', rejected: '#dc2626', invalid: '#9ca3af', pending: '#9ca3af' };

  if (!partner) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Trade with:</span>
          <select value={partner} onChange={e => { setPartner(e.target.value); setSel1([]); setSel2([]); setSendPicks([]); setRecvPicks([]); setTradeResult(null); }}
            className="gl-btn-ghost" style={{ padding: '8px 12px', fontSize: 13 }}>
            <option value="">Select team...</option>
            {NFL_TEAMS.filter(t => t.id !== teamId).map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
          </select>
        </div>
        <div className="gl-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⇄</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Select a trade partner above</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Sim-style trade logic — the other GM must approve the deal</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Trade with:</span>
        <select value={partner} onChange={e => { setPartner(e.target.value); setSel1([]); setSel2([]); setSendPicks([]); setRecvPicks([]); setTradeResult(null); }}
          className="gl-btn-ghost" style={{ padding: '8px 12px', fontSize: 13 }}>
          <option value="">Select team...</option>
          {NFL_TEAMS.filter(t => t.id !== teamId).map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
        </select>
      </div>

      {/* Trade Result Toast */}
      {tradeResult && (
        <div style={{ padding: 16, borderRadius: 14, marginBottom: 16, background: tradeResult.executed ? '#f0fdf4' : tradeResult.status === 'rejected' ? '#fef2f2' : '#fffbeb', border: '1px solid ' + (statusColors[tradeResult.status] || '#ddd') + '40' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: statusColors[tradeResult.status] }}>{tradeResult.emoji} {tradeResult.executed ? 'TRADE EXECUTED!' : tradeResult.status === 'approved' ? 'APPROVED' : 'TRADE ' + tradeResult.status.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{tradeResult.reason}</div>
          {!tradeResult.executed && tradeResult.status !== 'approved' && <button onClick={() => setTradeResult(null)} className="gl-btn-ghost" style={{ marginTop: 8, fontSize: 11 }}>Revise Trade</button>}
        </div>
      )}

      <div className="gl-card" style={{ overflow: 'hidden' }}>
        {/* Three-column trade layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 1fr' }}>

          {/* MY TEAM COLUMN */}
          <div style={{ borderRight: '1px solid var(--border)' }}>
            <div style={{ padding: '10px 14px', background: team?.color + '12', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: team?.color || '#b8952e' }} />
              <span style={{ fontWeight: 700, fontSize: 12 }}>{team?.name} Send</span>
            </div>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-light)' }}>
              <input placeholder="Search..." value={search1} onChange={e => setSearch1(e.target.value)} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 11, outline: 'none', fontFamily: 'var(--font)' }} />
            </div>
            {/* Draft picks */}
            <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 1, width: '100%', marginBottom: 2 }}>DRAFT PICKS</span>
              {[1,2,3,4,5,6,7].map(r => (
                <button key={r} onClick={() => togglePick(sendPicks, setSendPicks, r)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: sendPicks.includes(r) ? '1px solid var(--gold-border)' : '1px solid var(--border)', background: sendPicks.includes(r) ? 'var(--gold-light)' : '#fff', color: sendPicks.includes(r) ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--font)' }}>Rd {r}</button>
              ))}
            </div>
            <PlayerList players={myActive} selected={sel1} onToggle={id => toggle(sel1, setSel1, id)} search={search1} />
          </div>

          {/* CENTER PANEL — GM APPROVAL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: '#fafbfc', borderRight: '1px solid var(--border)' }}>
            <div style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 8 }}>GM APPROVAL</div>
              {/* Fairness Meter */}
              <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${meterPct}%`, background: meterColor, borderRadius: 4, transition: 'all .4s' }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: statusColors[eval_.status], textTransform: 'uppercase', letterSpacing: 1 }}>
                {eval_.status === 'invalid' ? 'WAITING...' : eval_.emoji + ' ' + eval_.status}
              </div>
              {eval_.reason && eval_.status !== 'invalid' && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{eval_.reason}</div>}
            </div>

            {/* Trade Value Comparison */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 6 }}>TRADE VALUE</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>You send</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red)' }}>{eval_.sendVal.toFixed(1)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>You get</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green)' }}>{eval_.recvVal.toFixed(1)}</span>
              </div>
            </div>

            {/* Cap Impact */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 6 }}>CAP IMPACT</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                <span style={{ color: 'var(--text-muted)' }}>Sending</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--green)' }}>+{formatMoney(eval_.sendCap)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                <span style={{ color: 'var(--text-muted)' }}>Receiving</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--red)' }}>-{formatMoney(eval_.recvCap)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>Your space after</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: eval_.myCapAfter >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatMoney(eval_.myCapAfter)}</span>
              </div>
            </div>

            {/* Dead Money Warning */}
            {eval_.myDeadHit > 0 && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: '#fef2f2' }}>
                <div style={{ fontSize: 9, color: '#dc2626', fontWeight: 600 }}>⚠ Dead Cap: {formatMoney(eval_.myDeadHit)}</div>
              </div>
            )}

            {/* Execute Button */}
            <div style={{ padding: '12px', marginTop: 'auto' }}>
              <button disabled={eval_.status === 'invalid'} onClick={exec}
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: eval_.status === 'invalid' ? 'not-allowed' : 'pointer', border: 'none', fontFamily: 'var(--font)',
                  background: eval_.status === 'approved' || eval_.status === 'steal' ? 'linear-gradient(135deg, #b8952e, #9a7c22)' : '#e5e7eb',
                  color: eval_.status === 'approved' || eval_.status === 'steal' ? '#fff' : '#9ca3af',
                }}>
                {eval_.status === 'approved' || eval_.status === 'steal' ? '✓ Execute Trade' : eval_.status === 'invalid' ? 'Select Players' : '✗ Trade Blocked'}
              </button>
            </div>
          </div>

          {/* PARTNER TEAM COLUMN */}
          <div>
            <div style={{ padding: '10px 14px', background: partnerTeam?.color + '12', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: partnerTeam?.color || '#666' }} />
              <span style={{ fontWeight: 700, fontSize: 12 }}>{partnerTeam?.name} Send</span>
            </div>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-light)' }}>
              <input placeholder="Search..." value={search2} onChange={e => setSearch2(e.target.value)} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 11, outline: 'none', fontFamily: 'var(--font)' }} />
            </div>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 1, width: '100%', marginBottom: 2 }}>DRAFT PICKS</span>
              {[1,2,3,4,5,6,7].map(r => (
                <button key={r} onClick={() => togglePick(recvPicks, setRecvPicks, r)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: recvPicks.includes(r) ? '1px solid var(--gold-border)' : '1px solid var(--border)', background: recvPicks.includes(r) ? 'var(--gold-light)' : '#fff', color: recvPicks.includes(r) ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--font)' }}>Rd {r}</button>
              ))}
            </div>
            <PlayerList players={theirActive} selected={sel2} onToggle={id => toggle(sel2, setSel2, id)} search={search2} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerList({ players, selected, onToggle, search }) {
  const filtered = search.trim() ? players.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : players;
  const sorted = [...filtered].sort((a, b) => (b.contract?.cap_hit || 0) - (a.contract?.cap_hit || 0));
  return (
    <div style={{ maxHeight: 400, overflowY: 'auto', padding: 4 }}>
      {sorted.map(p => {
        const picked = selected.includes(p.id);
        const pc = posColor(p.position);
        const tv = playerTradeValue(p);
        return (
          <button key={p.id} onClick={() => onToggle(p.id)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, textAlign: 'left', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', border: picked ? '1px solid var(--gold-border)' : '1px solid transparent', background: picked ? 'var(--gold-light)' : 'transparent', transition: 'all .1s', color: 'var(--text)' }}
            onMouseEnter={e => { if (!picked) e.currentTarget.style.background = 'var(--card-hover)'; }}
            onMouseLeave={e => { if (!picked) e.currentTarget.style.background = picked ? 'var(--gold-light)' : 'transparent'; }}>
            <span className="pos-badge" style={{ background: pc.bg, color: pc.fg, fontSize: 8 }}>{p.position}</span>
            <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{p.name}</span>
            {p.age && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-faint)' }}>{p.age}</span>}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{formatMoney(p.contract?.cap_hit)}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: meterClr(tv), flexShrink: 0, minWidth: 22, textAlign: 'right' }}>{tv.toFixed(0)}</span>
          </button>
        );
      })}
      {sorted.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>{search ? 'No matches' : 'No players loaded'}</div>}
    </div>
  );
}

function meterClr(v) { return v >= 30 ? '#16a34a' : v >= 18 ? '#2563eb' : v >= 10 ? '#d97706' : '#9ca3af'; }
