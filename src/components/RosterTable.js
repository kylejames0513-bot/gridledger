'use client';
import { useState, useMemo } from 'react';
import { formatMoney, posColor, POSITIONS, SALARY_CAP_2026 } from '@/lib/constants';

export default function RosterTable({ roster = [], onAction, showActions = true }) {
  const [rosterTab, setRosterTab] = useState('active');
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('cap_hit');
  const [sortDir, setSortDir] = useState('desc');
  const [expanded, setExpanded] = useState(null);

  const active = roster.filter(p => p.roster_status === 'active' && p.status === 'active');
  const ps = roster.filter(p => p.roster_status === 'practice_squad' && p.status === 'active');
  const dead = roster.filter(p => p.roster_status === 'dead' || p.status === 'free_agent');
  const current = rosterTab === 'active' ? active : rosterTab === 'ps' ? ps : dead;

  const maxCap = useMemo(() => Math.max(...active.map(p => p.contract?.cap_hit || 0), 1), [active]);

  const filtered = useMemo(() => {
    let list = current.slice();
    if (posFilter !== 'ALL') list = list.filter(p => p.position === posFilter);
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    list.sort((a, b) => {
      let av, bv;
      if (sortCol === 'name') { av = a.name; bv = b.name; }
      else if (sortCol === 'age') { av = a.age || 0; bv = b.age || 0; }
      else if (sortCol === 'year_expires') { av = a.contract?.year_expires || 9999; bv = b.contract?.year_expires || 9999; }
      else { av = a.contract?.[sortCol] || 0; bv = b.contract?.[sortCol] || 0; }
      if (typeof av === 'number') return sortDir === 'desc' ? bv - av : av - bv;
      return sortDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
    return list;
  }, [current, posFilter, search, sortCol, sortDir]);

  const doSort = col => { if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortCol(col); setSortDir('desc'); } };
  const arrow = col => sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';
  const capColor = v => v > 25 ? 'var(--red)' : v > 12 ? 'var(--gold)' : 'var(--text)';
  const barColor = v => v > 25 ? '#dc2626' : v > 15 ? '#b8952e' : v > 8 ? '#2563eb' : '#d1d5db';

  const FABadge = ({ year }) => {
    if (!year) return <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>-</span>;
    const diff = year - 2026;
    const c = diff <= 0 ? { bg: '#fef2f2', fg: '#dc2626' } : diff === 1 ? { bg: '#fffbeb', fg: '#d97706' } : { bg: '#f0fdf4', fg: '#16a34a' };
    return <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 5, background: c.bg, color: c.fg }}>{year <= 2026 ? 'UFA' : year}</span>;
  };

  const ActionBtns = ({ player }) => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {[
        { act: 'cut', label: 'Cut', bg: '#fef2f2', c: '#dc2626', bc: '#fecaca' },
        { act: 'restructure', label: 'Restr', bg: '#eff6ff', c: '#2563eb', bc: '#bfdbfe' },
        { act: 'june1', label: 'Jun1', bg: '#fffbeb', c: '#d97706', bc: '#fde68a' },
        { act: 'extend', label: 'Ext', bg: '#f0fdf4', c: '#16a34a', bc: '#bbf7d0' },
      ].map(a => (
        <button key={a.act} onClick={e => { e.stopPropagation(); onAction?.(a.act, player); }}
          style={{ fontFamily: 'var(--font)', padding: '5px 10px', fontSize: 10, fontWeight: 700, borderRadius: 7, border: `1px solid ${a.bc}`, background: a.bg, color: a.c, cursor: 'pointer' }}>{a.label}</button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="gl-tabs" style={{ width: 'fit-content', marginBottom: 12 }}>
        {[
          { key: 'active', label: 'Active', count: active.length },
          { key: 'ps', label: 'Practice Sq', count: ps.length },
          { key: 'dead', label: 'Dead Cap', count: dead.length },
        ].map(t => (
          <button key={t.key} onClick={() => setRosterTab(t.key)} className={`gl-tab ${rosterTab === t.key ? 'active' : ''}`}>
            {t.label} <span style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: .5 }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className="gl-btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }}>
          <option value="ALL">All Pos</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ flex: 1, minWidth: 120 }}>
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 14px', fontSize: 12, outline: 'none', fontFamily: 'var(--font)', color: 'var(--text)' }} />
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>{filtered.length} players</span>
      </div>

      {/* ═══ DESKTOP TABLE ═══ */}
      <div className="gl-card gl-table-wrap" style={{ overflow: 'auto' }}>
        <table className="gl-table" style={{ minWidth: 920 }}>
          <thead>
            <tr>
              <th onClick={() => doSort('name')} style={{ minWidth: 160 }}>Player{arrow('name')}</th>
              <th>Pos</th>
              <th onClick={() => doSort('age')}>Age{arrow('age')}</th>
              <th onClick={() => doSort('cap_hit')}>Cap Hit{arrow('cap_hit')}</th>
              <th style={{ width: 50 }}>%</th>
              <th onClick={() => doSort('base_salary')}>Base{arrow('base_salary')}</th>
              <th onClick={() => doSort('cash_total')}>Cash{arrow('cash_total')}</th>
              <th onClick={() => doSort('dead_cap')}>Dead{arrow('dead_cap')}</th>
              <th onClick={() => doSort('year_expires')}>FA{arrow('year_expires')}</th>
              {rosterTab === 'active' && showActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const pc = posColor(p.position);
              const c = p.contract || {};
              const capPct = c.cap_hit > 0 ? ((c.cap_hit / SALARY_CAP_2026) * 100).toFixed(1) : '0.0';
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{p.name}</span>
                      {c.guaranteed > 0 && (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-faint)' }}>
                          GTD {formatMoney(c.guaranteed)} • {c.years}yr / {formatMoney(c.total_value)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td><span className="pos-badge" style={{ background: pc.bg, color: pc.fg }}>{p.position}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.age || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: capColor(c.cap_hit) }}>{formatMoney(c.cap_hit)}</span>
                      <div style={{ width: 50, height: 4, background: '#f0f1f3', borderRadius: 2, flexShrink: 0 }}>
                        <div style={{ width: Math.min((c.cap_hit / maxCap) * 100, 100) + '%', height: '100%', background: barColor(c.cap_hit), borderRadius: 2, transition: 'width .3s' }} />
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>{capPct}%</span></td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{formatMoney(c.base_salary)}</span></td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: c.cash_total > c.cap_hit ? 'var(--green)' : 'var(--text-secondary)' }}>{c.cash_total > 0 ? formatMoney(c.cash_total) : '-'}</span></td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--red)', opacity: .5 }}>{c.dead_cap ? `$${Math.abs(c.dead_cap).toFixed(1)}M` : '-'}</span></td>
                  <td><FABadge year={c.year_expires} /></td>
                  {rosterTab === 'active' && showActions && <td><ActionBtns player={p} /></td>}
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>No players found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ═══ MOBILE CARDS ═══ */}
      <div className="gl-card" style={{ overflow: 'hidden' }}>
        {filtered.map(p => {
          const pc = posColor(p.position);
          const c = p.contract || {};
          const capPct = c.cap_hit > 0 ? ((c.cap_hit / SALARY_CAP_2026) * 100).toFixed(1) : '0.0';
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="player-card-mobile"
              onClick={() => setExpanded(isOpen ? null : p.id)}
              style={{ flexDirection: 'column', gap: 6, padding: '14px 16px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pos-badge" style={{ background: pc.bg, color: pc.fg }}>{p.position}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>
                    Age {p.age || '-'} {c.year_expires ? `• FA ${c.year_expires}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: capColor(c.cap_hit) }}>{formatMoney(c.cap_hit)}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-faint)' }}>{capPct}% of cap</div>
                </div>
              </div>
              <div style={{ height: 3, background: '#f0f1f3', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((c.cap_hit / maxCap) * 100, 100)}%`, height: '100%', background: barColor(c.cap_hit), borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span>Base <strong style={{ color: 'var(--text-secondary)' }}>{formatMoney(c.base_salary)}</strong></span>
                {c.cash_total > 0 && <span>Cash <strong style={{ color: 'var(--text-secondary)' }}>{formatMoney(c.cash_total)}</strong></span>}
                <span>Dead <strong style={{ color: 'var(--red)', opacity: .6 }}>{c.dead_cap ? `$${Math.abs(c.dead_cap).toFixed(1)}M` : '$0'}</strong></span>
              </div>
              {isOpen && (
                <div className="animate-slide-up" style={{ paddingTop: 10, borderTop: '1px solid var(--border-light)', marginTop: 4 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                    {[
                      { label: 'GUARANTEED', val: formatMoney(c.guaranteed), color: 'var(--orange)' },
                      { label: 'TOTAL VALUE', val: formatMoney(c.total_value), color: 'var(--text)' },
                      { label: 'SIGNING BONUS', val: formatMoney(c.signing_bonus), color: 'var(--text-secondary)' },
                      { label: 'CONTRACT', val: c.years ? `${c.years}yr` : '-', color: 'var(--text-secondary)' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#f7f8f9', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-faint)', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: s.color }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                  {rosterTab === 'active' && showActions && <ActionBtns player={p} />}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="player-card-mobile" style={{ justifyContent: 'center', padding: 40, color: 'var(--text-muted)' }}>No players found</div>}
      </div>
    </div>
  );
}
