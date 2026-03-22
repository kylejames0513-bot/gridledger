'use client';
export default function DraftPicks({ picks = [] }) {
  if (!picks || picks.length === 0) return (
    <div className="gl-card" style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No Draft Picks</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Draft pick data will appear once scraped</div>
    </div>
  );
  const roundLabels = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th' };
  const roundColors = { 1: '#b8952e', 2: '#2563eb', 3: '#7c3aed', 4: '#0d9488', 5: '#71717a', 6: '#71717a', 7: '#71717a' };
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>2026 Draft Capital</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
        {picks.map((pk, i) => (
          <div key={pk.id || i} className="gl-card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: roundColors[pk.round] || '#71717a' }}>{roundLabels[pk.round] || `R${pk.round}`}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>{pk.year || 2026}</div>
            {pk.trade_value > 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', background: '#f7f8f9', padding: '2px 8px', borderRadius: 4, marginTop: 6, display: 'inline-block' }}>{pk.trade_value} pts</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
