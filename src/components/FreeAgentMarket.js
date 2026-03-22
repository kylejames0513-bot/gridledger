'use client';
import { useState, useMemo } from 'react';
import { formatMoney, posColor, POSITIONS } from '@/lib/constants';

function evaluateOffer(fa, offer) {
  const marketAPY = fa.market_value || fa.projected_value || 1;
  const offerTotal = offer.apy * offer.years;
  const gtdPct = offerTotal > 0 ? offer.guaranteed / offerTotal : 0;
  let ratio = offer.apy / marketAPY;
  ratio += Math.min(offer.years * 0.02, 0.1);
  ratio += Math.min(gtdPct * 0.15, 0.12);
  if (fa.age) ratio += Math.max(0, (fa.age - 28) * 0.015);
  ratio += (Math.random() - 0.5) * 0.1;

  if (ratio >= 0.95) return { result: 'accepted', message: fa.name + ' accepts your offer!', emoji: '✅' };
  if (ratio >= 0.85) {
    const cAPY = Math.round(marketAPY * (0.95 + Math.random() * 0.1) * 10) / 10;
    const cGtd = Math.round(cAPY * offer.years * (0.4 + Math.random() * 0.15) * 10) / 10;
    return { result: 'counter', emoji: '🤝', message: fa.name + "'s agent counters: " + offer.years + 'yr / ' + formatMoney(cAPY) + ' APY / ' + formatMoney(cGtd) + ' GTD', counter: { apy: cAPY, years: offer.years, guaranteed: cGtd } };
  }
  if (ratio >= 0.7) return { result: 'rejected', message: fa.name + ' is looking for significantly more money.', emoji: '❌' };
  return { result: 'insulted', message: fa.name + "'s agent says \"Don't waste our time.\"", emoji: '🚫' };
}

export default function FreeAgentMarket({ freeAgents = [], capSpace = 0, onSign }) {
  const [posFilter, setPosFilter] = useState('ALL');
  const [offering, setOffering] = useState(null);
  const [offerYears, setOfferYears] = useState(2);
  const [offerAPY, setOfferAPY] = useState('');
  const [offerGtd, setOfferGtd] = useState('');
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = freeAgents;
    if (posFilter !== 'ALL') list = list.filter(fa => fa.position === posFilter);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(fa => fa.name.toLowerCase().includes(q)); }
    return list;
  }, [freeAgents, posFilter, search]);

  function startOffer(fa) {
    const mv = fa.market_value || fa.projected_value || 5;
    setOffering(fa); setOfferAPY(mv.toFixed(1)); setOfferGtd((mv * 2 * 0.4).toFixed(1)); setOfferYears(2); setResult(null);
  }

  function submitOffer() {
    if (!offering) return;
    const ev = evaluateOffer(offering, { apy: parseFloat(offerAPY) || 0, years: parseInt(offerYears) || 1, guaranteed: parseFloat(offerGtd) || 0 });
    setResult(ev);
    if (ev.result === 'accepted') {
      setTimeout(() => {
        onSign && onSign({ ...offering, projected_value: parseFloat(offerAPY) || 0, contract_years: parseInt(offerYears) || 1, contract_guaranteed: parseFloat(offerGtd) || 0 });
        setOffering(null); setResult(null);
      }, 1500);
    }
  }

  function acceptCounter() {
    if (!result || !result.counter || !offering) return;
    onSign && onSign({ ...offering, projected_value: result.counter.apy, contract_years: result.counter.years, contract_guaranteed: result.counter.guaranteed });
    setOffering(null); setResult(null);
  }

  const resultStyles = {
    accepted: { bg: '#f0fdf4', border: '#bbf7d0', text: 'var(--green)' },
    counter: { bg: '#fffbeb', border: '#fde68a', text: 'var(--orange)' },
    rejected: { bg: '#fef2f2', border: '#fecaca', text: 'var(--red)' },
    insulted: { bg: '#fef2f2', border: '#fecaca', text: 'var(--red)' },
  };

  const inputStyle = {
    width: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
    padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--mono)', color: 'var(--text)',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cap space: <strong style={{ color: capSpace >= 0 ? 'var(--green)' : 'var(--red)' }}>{capSpace >= 0 ? '' : '-'}{formatMoney(Math.abs(capSpace))}</strong></span>
        <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className="gl-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
          <option value="ALL">All Positions</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ flex: 1, minWidth: 120 }}>
          <input placeholder="Search player..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, fontFamily: 'var(--font)' }} />
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>{filtered.length} available</span>
      </div>

      {offering && (
        <div className="gl-card" style={{ padding: 20, marginBottom: 16, border: '1px solid var(--gold-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{offering.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {offering.position} &bull; Age {offering.age} &bull; Market: <strong style={{ color: 'var(--gold)' }}>{formatMoney(offering.market_value || offering.projected_value)}/yr</strong>
                {offering.former_team ? ' • From: ' + offering.former_team : ''}
              </div>
            </div>
            <button onClick={() => { setOffering(null); setResult(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>&times;</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 }}>Years</div>
              <select value={offerYears} onChange={e => setOfferYears(e.target.value)} style={inputStyle}>
                {[1,2,3,4,5].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 }}>APY ($M)</div>
              <input type="number" step="0.1" min="0" value={offerAPY} onChange={e => setOfferAPY(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 }}>Guaranteed ($M)</div>
              <input type="number" step="0.1" min="0" value={offerGtd} onChange={e => setOfferGtd(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ background: '#f7f8f9', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Value</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text)' }}>{formatMoney((parseFloat(offerAPY) || 0) * (parseInt(offerYears) || 1))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>GTD %</span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{(((parseFloat(offerGtd) || 0) / ((parseFloat(offerAPY) || 1) * (parseInt(offerYears) || 1))) * 100).toFixed(0)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>vs Market</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: (parseFloat(offerAPY) || 0) >= (offering.market_value || offering.projected_value || 1) * 0.9 ? 'var(--green)' : 'var(--orange)' }}>
                {(((parseFloat(offerAPY) || 0) / (offering.market_value || offering.projected_value || 1)) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {result && (() => {
            const rc = resultStyles[result.result] || resultStyles.rejected;
            return (
              <div style={{ padding: 12, borderRadius: 10, marginBottom: 14, background: rc.bg, border: '1px solid ' + rc.border }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: rc.text }}>{result.emoji} {result.result === 'accepted' ? 'DEAL!' : result.result === 'counter' ? 'COUNTER OFFER' : 'REJECTED'}</div>
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

          {!result && <button onClick={submitOffer} className="gl-btn gl-btn-gold" style={{ width: '100%', padding: '10px 0', fontSize: 13 }}>Submit Offer</button>}
          {result && (result.result === 'rejected' || result.result === 'insulted') && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setResult(null)} className="gl-btn-ghost" style={{ flex: 1, padding: '8px 0', fontSize: 12 }}>Revise Offer</button>
              <button onClick={() => { setOffering(null); setResult(null); }} style={{ flex: 1, padding: '8px 0', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>Walk Away</button>
            </div>
          )}
        </div>
      )}

      <div className="gl-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 50px 80px 80px 80px', gap: 8, alignItems: 'center', padding: '10px 16px', background: '#fafbfc', borderBottom: '1px solid var(--border)', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-faint)' }}>
          <span>Pos</span><span>Player</span><span>Age</span><span>Market</span><span>Former</span><span></span>
        </div>
        {filtered.map(fa => {
          const pc = posColor(fa.position);
          return (
            <div key={fa.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 50px 80px 80px 80px', gap: 8, alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-light)', transition: 'background .1s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span><span className="pos-badge" style={{ background: pc.bg, color: pc.fg }}>{fa.position}</span></span>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fa.name}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>{fa.age}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{formatMoney(fa.market_value || fa.projected_value)}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fa.former_team || '—'}</span>
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
