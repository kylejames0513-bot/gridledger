'use client';
import { SALARY_CAP_2026, formatMoney, POSITION_GROUPS } from '@/lib/constants';

export default function CapOverview({ roster = [], teamColor = '#b8952e', teamData = null }) {
  const active = roster.filter(p => p.roster_status === 'active' && p.status === 'active');
  const ps = roster.filter(p => p.roster_status === 'practice_squad');
  const dead = roster.filter(p => p.roster_status === 'dead' || p.status === 'free_agent');

  // Use team table data if available (includes rollover + top-51 rule)
  // Otherwise fall back to summing contracts
  const activeCap = active.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const psCap = ps.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const deadCap = dead.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const clientCapUsed = activeCap + psCap + deadCap;

  // Prefer DB values from teams table (correct: includes rollover, top-51)
  const capTotal = teamData?.cap_total || SALARY_CAP_2026;
  const capUsed = teamData?.cap_used != null ? teamData.cap_used : clientCapUsed;
  const space = teamData?.cap_space != null ? teamData.cap_space : (capTotal - clientCapUsed);
  const deadMoney = teamData?.dead_money != null ? teamData.dead_money : deadCap;

  const topQB = Math.max(0, ...active.filter(p => p.position === 'QB').map(p => p.contract?.cap_hit || 0));
  const totalGuar = active.reduce((s, p) => s + (p.contract?.guaranteed || 0), 0);

  // Allocation breakdown (from individual contracts — for the bar)
  const offCap = active.filter(p => POSITION_GROUPS.offense.includes(p.position)).reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const defCap = active.filter(p => POSITION_GROUPS.defense.includes(p.position)).reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const stCap = active.filter(p => POSITION_GROUPS.special.includes(p.position)).reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const otherCap = activeCap - offCap - defCap - stCap;
  const totalOff = offCap + (otherCap > 0 ? Math.round(otherCap * offCap / (offCap + defCap || 1) * 10) / 10 : 0);
  const totalDef = defCap + (otherCap > 0 ? Math.round(otherCap * defCap / (offCap + defCap || 1) * 10) / 10 : 0);

  const stats = [
    { label: 'ADJUSTED CAP', val: formatMoney(capTotal), color: 'var(--text)' },
    { label: 'COMMITTED', val: formatMoney(capUsed), color: 'var(--gold)', sub: `${((capUsed / capTotal) * 100).toFixed(1)}%` },
    { label: 'TOP-51 SPACE', val: `${space < 0 ? '-' : ''}${formatMoney(Math.abs(space))}`, color: space >= 0 ? 'var(--green)' : 'var(--red)' },
    { label: 'DEAD MONEY', val: formatMoney(deadMoney), color: 'var(--red)' },
    { label: 'TOP QB', val: formatMoney(topQB), color: 'var(--blue)' },
    { label: 'GUARANTEED', val: formatMoney(totalGuar), color: 'var(--orange)' },
  ];

  const barTotal = totalOff + totalDef + stCap + psCap + deadCap;
  const segs = [
    { color: '#3b82f6', val: totalOff, label: 'Offense' },
    { color: '#8b5cf6', val: totalDef, label: 'Defense' },
    { color: '#b8952e', val: stCap, label: 'ST' },
    { color: '#16a34a', val: psCap, label: 'PS' },
    { color: '#dc2626', val: deadCap, label: 'Dead' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="cap-grid-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        {stats.map(s => (
          <div key={s.label} className="gl-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-faint)', marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
            {s.sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="gl-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-faint)' }}>CAP ALLOCATION</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>{formatMoney(capUsed)} / {formatMoney(capTotal)}</span>
        </div>
        <div style={{ height: 10, background: '#f4f5f7', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
          {segs.map((seg, i) => (
            <div key={i} style={{ height: '100%', width: `${Math.max((seg.val / (barTotal || 1)) * 100, 0)}%`, background: seg.color, transition: 'width .5s', borderRadius: i === 0 ? '5px 0 0 5px' : i === segs.length - 1 ? '0 5px 5px 0' : 0 }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
          {segs.map(seg => (
            <span key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: seg.color }} />
              {seg.label} <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>{formatMoney(seg.val)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}