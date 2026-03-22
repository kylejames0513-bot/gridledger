'use client';
export default function GMLog({ moves = [], onUndo, onReset }) {
  const tc = { cut: '#dc2626', post_june_1: '#d97706', restructure: '#2563eb', extend: '#16a34a', trade: '#7c3aed', sign_fa: '#0d9488' };
  if (!moves.length) return (
    <div className="gl-card" style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🏈</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No Moves Yet</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Cut, trade, sign, restructure — play GM</div>
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {onUndo && <button onClick={onUndo} className="gl-btn-ghost" style={{ fontSize: 11 }}>↺ Undo Last</button>}
        {onReset && <button onClick={onReset} className="gl-btn-ghost" style={{ fontSize: 11, color: 'var(--red)' }}>Reset All</button>}
      </div>
      <div className="gl-card" style={{ overflow: 'hidden' }}>
        {moves.map((m, i) => (
          <div key={m.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < moves.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: tc[m.move_type] || '#71717a', minWidth: 70 }}>{m.move_type?.replace('_', ' ')}</span>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', flex: 1 }}>{m.player_name}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              {m.cap_impact ? `${m.cap_impact > 0 ? '+' : ''}${m.cap_impact.toFixed(1)}M` : m.details?.savings ? `-${m.details.savings}M saved` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
