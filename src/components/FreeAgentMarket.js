'use client';
import { useState, useMemo } from 'react';
import { formatMoney, posColor, POSITIONS, SALARY_CAP_2026 } from '@/lib/constants';

// ═══ PLAYER PREFERENCE PROFILES ═══
const PROFILES = {
  money: { label: 'Money-Driven', emoji: '💰', desc: 'Wants max value. Will go wherever pays most.' },
  winner: { label: 'Ring Chaser', emoji: '🏆', desc: 'Willing to take less to compete for a title.' },
  role: { label: 'Wants Starter Role', emoji: '⭐', desc: 'Values guaranteed playing time over money.' },
  loyal: { label: 'Hometown Loyalty', emoji: '🏠', desc: 'Prefers to stay close to former team or region.' },
  fresh: { label: 'Fresh Start', emoji: '🔄', desc: 'Looking for a change of scenery.' },
};

function getPlayerProfile(fa) {
  // Deterministic pseudo-random from name
  const hash = fa.name.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const keys = Object.keys(PROFILES);
  // Older players more likely to chase rings, younger chase money
  if ((fa.age || 27) >= 31 && hash % 3 !== 0) return 'winner';
  if ((fa.age || 27) <= 24 && hash % 4 !== 0) return 'money';
  return keys[hash % keys.length];
}

// ═══ MARKET VALUE RANGE ═══
function getMarketRange(fa) {
  const mv = fa.market_value || fa.projected_value || 3;
  return { min: Math.round(mv * 0.75 * 10) / 10, mid: mv, max: Math.round(mv * 1.25 * 10) / 10 };
}

// ═══ OFFER EVALUATION (sim-style) ═══
function evaluateOffer(fa, offer, capSpace) {
  const profile = getPlayerProfile(fa);
  const range = getMarketRange(fa);
  const offerAPY = parseFloat(offer.apy) || 0;
  const offerYears = parseInt(offer.years) || 1;
  const offerGtd = parseFloat(offer.guaranteed) || 0;
  const totalVal = offerAPY * offerYears;
  const gtdPct = totalVal > 0 ? offerGtd / totalVal : 0;

  // Can they even fit under the cap?
  if (offerAPY > capSpace) {
    return { result: 'rejected', emoji: '💰', message: 'You don\'t have enough cap space for this deal.', reason: 'cap' };
  }

  // Base satisfaction: how does APY compare to market?
  let satisfaction = offerAPY / (range.mid || 1);

  // Profile modifiers
  if (profile === 'money') {
    satisfaction *= 0.9; // Harder to please — wants overpay
    if (gtdPct >= 0.5) satisfaction += 0.08; // Loves guaranteed money
    if (offerYears >= 4) satisfaction += 0.05;
  } else if (profile === 'winner') {
    satisfaction *= 1.15; // More flexible on money
    if (offerYears <= 2) satisfaction += 0.05; // OK with prove-it deals
  } else if (profile === 'role') {
    satisfaction *= 1.05;
    if (offerYears >= 3) satisfaction += 0.08; // Wants commitment
  } else if (profile === 'loyal') {
    satisfaction *= 1.0; // Neutral
  } else if (profile === 'fresh') {
    satisfaction *= 1.08;
  }

  // Term bonus: longer deals = more security
  satisfaction += Math.min(offerYears * 0.015, 0.06);
  // Guarantee bonus
  satisfaction += Math.min(gtdPct * 0.12, 0.1);
  // Age factor: older players more willing to take less
  if (fa.age && fa.age >= 30) satisfaction += (fa.age - 29) * 0.02;
  // Randomness (±5%)
  satisfaction += (Math.sin(fa.name.length * 7.3) * 0.05);

  if (satisfaction >= 1.0) return { result: 'accepted', emoji: '✅', message: `${fa.name} accepts! ${offerYears}yr / ${formatMoney(offerAPY)} APY`, reason: 'deal' };
  if (satisfaction >= 0.88) {
    // Counter offer
    const bump = range.mid * (1.0 + (1.0 - satisfaction) * 0.5);
    const cAPY = Math.round(bump * 10) / 10;
    const cGtd = Math.round(cAPY * offerYears * (0.35 + Math.random() * 0.15) * 10) / 10;
    return { result: 'counter', emoji: '🤝', message: `${fa.name}'s agent counters: ${offerYears}yr / ${formatMoney(cAPY)} APY / ${formatMoney(cGtd)} GTD`, counter: { apy: cAPY, years: offerYears, guaranteed: cGtd } };
  }
  if (satisfaction >= 0.72) return { result: 'rejected', emoji: '❌', message: `${fa.name} declines — looking for significantly more.`, reason: 'low' };
  return { result: 'insulted', emoji: '🚫', message: `${fa.name}'s camp: "Don't insult us. We're not interested."`, reason: 'insult' };
}

export default function FreeAgentMarket({ freeAgents = [], capSpace = 0, onSign }) {
  const [posFilter, setPosFilter] = useState('ALL');
  const [offering, setOffering] = useState(null);
  const [offerYears, setOfferYears] = useState(2);
  const [offerAPY, setOfferAPY] = useState('');
  const [offerGtd, setOfferGtd] = useState('');
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('value');

  const filtered = useMemo(() => {
    let list = freeAgents;
    if (posFilter !== 'ALL') list = list.filter(fa => fa.position === posFilter);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(fa => fa.name.toLowerCase().includes(q)); }
    if (sortBy === 'value') list = [...list].sort((a, b) => (b.market_value || b.projected_value || 0) - (a.market_value || a.projected_value || 0));
    else if (sortBy === 'age') list = [...list].sort((a, b) => (a.age || 99) - (b.age || 99));
    else if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [freeAgents, posFilter, search, sortBy]);

  function startOffer(fa) {
    const range = getMarketRange(fa);
    setOffering(fa);
    setOfferAPY(range.mid.toFixed(1));
    setOfferGtd((range.mid * 2 * 0.4).toFixed(1));
    setOfferYears(2);
    setResult(null);
  }

  function submitOffer() {
    if (!offering) return;
    const ev = evaluateOffer(offering, { apy: offerAPY, years: offerYears, guaranteed: offerGtd }, capSpace);
    setResult(ev);
    if (ev.result === 'accepted') {
      setTimeout(() => {
        onSign?.({ ...offering, projected_value: parseFloat(offerAPY) || 0, contract_years: parseInt(offerYears) || 1, contract_guaranteed: parseFloat(offerGtd) || 0 });
        setOffering(null); setResult(null);
      }, 1500);
    }
  }

  function acceptCounter() {
    if (!result?.counter || !offering) return;
    if (result.counter.apy > capSpace) { setResult({ result: 'rejected', emoji: '💰', message: 'Not enough cap space for the counter offer.' }); return; }
    onSign?.({ ...offering, projected_value: result.counter.apy, contract_years: result.counter.years, contract_guaranteed: result.counter.guaranteed });
    setOffering(null); setResult(null);
  }

  const inputStyle = { width: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--mono)', color: 'var(--text)' };
  const rc = { accepted: { bg: '#f0fdf4', bd: '#bbf7d0', fg: 'var(--green)' }, counter: { bg: '#fffbeb', bd: '#fde68a', fg: 'var(--orange)' }, rejected: { bg: '#fef2f2', bd: '#fecaca', fg: 'var(--red)' }, insulted: { bg: '#fef2f2', bd: '#fecaca', fg: 'var(--red)' } };

  return (
    <div>
      {/* Header bar with filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cap room: <strong style={{ color: capSpace >= 10 ? 'var(--green)' : capSpace >= 0 ? 'var(--orange)' : 'var(--red)' }}>{formatMoney(Math.abs(capSpace))}</strong></span>
        <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className="gl-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
          <option value="ALL">All Positions</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="gl-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
          <option value="value">Sort: Market Value</option>
          <option value="age">Sort: Age</option>
          <option value="name">Sort: Name</option>
        </select>
        <div style={{ flex: 1, minWidth: 120 }}>
          <input placeholder="Search player..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font)' }} />
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>{filtered.length} available</span>
      </div>

      {/* OFFER PANEL */}
      {offering && (() => {
        const profile = getPlayerProfile(offering);
        const pInfo = PROFILES[profile];
        const range = getMarketRange(offering);
        const apyNum = parseFloat(offerAPY) || 0;
        const yrsNum = parseInt(offerYears) || 1;
        const gtdNum = parseFloat(offerGtd) || 0;
        const totalVal = apyNum * yrsNum;
        const gtdPct = totalVal > 0 ? (gtdNum / totalVal * 100).toFixed(0) : 0;
        const vsMkt = range.mid > 0 ? (apyNum / range.mid * 100).toFixed(0) : 0;

        return (
          <div className="gl-card" style={{ padding: 20, marginBottom: 16, border: '1px solid var(--gold-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{offering.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {offering.position} &bull; Age {offering.age || '?'} &bull; {offering.former_team ? 'From ' + offering.former_team : ''}
                </div>
              </div>
              <button onClick={() => { setOffering(null); setResult(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>&times;</button>
            </div>

            {/* Player Profile Badge */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, padding: 10, borderRadius: 10, background: '#f7f8f9', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-faint)', marginBottom: 4 }}>PLAYER PROFILE</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{pInfo.emoji} {pInfo.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{pInfo.desc}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 10, background: '#f7f8f9', border: '1px solid var(--border)', minWidth: 120, textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-faint)', marginBottom: 4 }}>MARKET RANGE</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{formatMoney(range.min)}</span>
                  <span style={{ color: 'var(--gold)', fontWeight: 700, margin: '0 4px' }}>{formatMoney(range.mid)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{formatMoney(range.max)}</span>
                </div>
              </div>
            </div>

            {/* Offer Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 4 }}>YEARS</div>
                <select value={offerYears} onChange={e => setOfferYears(e.target.value)} style={inputStyle}>
                  {[1,2,3,4,5,6].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 4 }}>APY ($M)</div>
                <input type="number" step="0.1" min="0" value={offerAPY} onChange={e => setOfferAPY(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 4 }}>GUARANTEED ($M)</div>
                <input type="number" step="0.1" min="0" value={offerGtd} onChange={e => setOfferGtd(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Offer Summary */}
            <div style={{ background: '#f7f8f9', borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Value</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{formatMoney(totalVal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>GTD %</span>
                <span style={{ fontFamily: 'var(--mono)' }}>{gtdPct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>vs Market</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: vsMkt >= 95 ? 'var(--green)' : vsMkt >= 80 ? 'var(--orange)' : 'var(--red)' }}>{vsMkt}%</span>
              </div>
              {apyNum > capSpace && (
                <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                  ⚠ Exceeds cap space by {formatMoney(apyNum - capSpace)}
                </div>
              )}
            </div>

            {/* Negotiation Result */}
            {result && (() => {
              const c = rc[result.result] || rc.rejected;
              return (
                <div style={{ padding: 12, borderRadius: 10, marginBottom: 14, background: c.bg, border: '1px solid ' + c.bd }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.fg }}>{result.emoji} {result.result === 'accepted' ? 'DEAL!' : result.result === 'counter' ? 'COUNTER OFFER' : 'REJECTED'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{result.message}</div>
                  {result.result === 'counter' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button onClick={acceptCounter} className="gl-btn gl-btn-gold" style={{ padding: '6px 16px', fontSize: 11 }}>Accept Counter</button>
                      <button onClick={() => setResult(null)} className="gl-btn-ghost" style={{ padding: '6px 16px', fontSize: 11 }}>Revise Offer</button>
                      <button onClick={() => { setOffering(null); setResult(null); }} style={{ padding: '6px 16px', background: 'none', color: 'var(--text-muted)', border: 'none', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>Walk Away</button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Action Buttons */}
            {!result && <button onClick={submitOffer} className="gl-btn gl-btn-gold" style={{ width: '100%', padding: '10px 0', fontSize: 13 }}>Submit Offer</button>}
            {result && (result.result === 'rejected' || result.result === 'insulted') && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setResult(null)} className="gl-btn-ghost" style={{ flex: 1, padding: '8px 0', fontSize: 12 }}>Revise Offer</button>
                <button onClick={() => { setOffering(null); setResult(null); }} style={{ flex: 1, padding: '8px 0', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>Walk Away</button>
              </div>
            )}
          </div>
        );
      })()}

      {/* FA LIST */}
      <div className="gl-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 40px 60px 70px 50px 70px', gap: 8, alignItems: 'center', padding: '10px 16px', background: '#fafbfc', borderBottom: '1px solid var(--border)', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-faint)' }}>
          <span>POS</span><span>PLAYER</span><span>AGE</span><span>TYPE</span><span>MARKET</span><span></span><span></span>
        </div>
        {filtered.map(fa => {
          const pc = posColor(fa.position);
          const profile = getPlayerProfile(fa);
          const pInfo = PROFILES[profile];
          return (
            <div key={fa.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 40px 60px 70px 50px 70px', gap: 8, alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-light)', transition: 'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span><span className="pos-badge" style={{ background: pc.bg, color: pc.fg }}>{fa.position}</span></span>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fa.name}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>{fa.age || '—'}</span>
              <span title={pInfo.desc} style={{ fontSize: 10, cursor: 'help' }}>{pInfo.emoji}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{formatMoney(fa.market_value || fa.projected_value)}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fa.former_team || '—'}</span>
              <span style={{ textAlign: 'right' }}>
                <button onClick={() => startOffer(fa)} className="gl-btn gl-btn-gold" style={{ padding: '5px 14px', fontSize: 10, borderRadius: 7 }}>Offer</button>
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>No free agents available</div>}
      </div>
    </div>
  );
}
