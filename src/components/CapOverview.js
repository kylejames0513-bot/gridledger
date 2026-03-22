'use client';
import { SALARY_CAP_2026, formatMoney } from '@/lib/constants';

// OTC position codes mapped to groups
const OFF_POSITIONS = ['QB','RB','WR','TE','OT','OG','C','LT','LG','RG','RT','G','T','FB','HB','FL','SE'];
const DEF_POSITIONS = ['DE','DT','DL','ED','EDGE','IDL','OLB','ILB','LB','CB','S','FS','SS','NT','MLB','SAF','DB','WILL','MIKE','SAM','SLB','WLB'];
const ST_POSITIONS = ['K','P','LS','KR','PR','ST'];

export default function CapOverview({ roster = [], teamColor = '#b8952e', teamData = null }) {
  const active = roster.filter(p => p.roster_status === 'active' && p.status === 'active');
  const ps = roster.filter(p => p.roster_status === 'practice_squad');
  const dead = roster.filter(p => p.roster_status === 'dead' || p.status === 'free_agent');

  // Sum from individual contracts
  const activeCap = active.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const psCap = ps.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const deadCap = dead.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const clientCapUsed = activeCap + psCap + deadCap;

  // Prefer DB values from teams table (OTC's actual numbers with rollover + top-51)
  const capTotal = teamData?.cap_total || SALARY_CAP_2026;
  const capUsed = teamData?.cap_used != null ? teamData.cap_used : clientCapUsed;
  const space = teamData?.cap_space != null ? teamData.cap_space : (capTotal - clientCapUsed);
  const deadMoney = teamData?.dead_money != null ? teamData.dead_money : deadCap;

  const topQB = Math.max(0, ...active.filter(p => p.position === 'QB').map(p => p.contract?.cap_hit || 0));
  const totalGuar = active.reduce((s, p) => s + (p.contract?.guaranteed || 0), 0);

  // Allocation breakdown using expanded OTC position codes
  const offCap = active.filter(p => OFF_POSITIONS.includes(p.position)).reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const defCap = active.filter(p => DEF_POSITIONS.includes(p.position)).reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const stCap = active.filter(p => ST_POSITIONS.includes(p.position)).reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const unkCap = activeCap - offCap - defCap - stCap;

  // Distribute unknown-position cap proportionally between O and D
  const knownTotal = offCap + defCap;
  const totalOff = knownTotal > 0
    ? offCap + Math.round(unkCap * (offCap / knownTotal) * 10) / 10
    : offCap + Math.round(unkCap * 0.55 * 10) / 10;  // Default 55/45 O/D split if no positions known
  const totalDef = knownTotal > 0
    ? defCap + Math.round(unkCap * (defCap / knownTotal) * 10) / 10
    : defCap + Math.round(unkCap * 0.45 * 10) / 10;

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
  ].filter(s => s.val > 0);

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
            <div key={i} style={{
              height: '100%',
              width: `${Math.max((seg.val / (barTotal || 1)) * 100, 0.5)}%`,
              background: seg.color,
              transition: 'width .5s',
              borderRadius: i === 0 ? '5px 0 0 5px' : i === segs.length - 1 ? '0 5px 5px 0' : 0,
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          {segs.map((seg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{seg.label}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: 'var(--text)' }}>{formatMoney(seg.val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}