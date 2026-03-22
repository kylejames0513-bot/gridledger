'use client';
export default function NewsTicker({ news }) {
  const items = (news && news.length > 0) ? news : [
    { title: 'NFL free agency period continues with major signings', type: 'signing' },
    { title: 'Teams restructuring contracts to create cap space', type: 'restructure' },
  ];
  const tc = { trade: { bg: '#f3e8ff', fg: '#7c3aed' }, signing: { bg: '#dcfce7', fg: '#16a34a' }, cut: { bg: '#fef2f2', fg: '#dc2626' }, restructure: { bg: '#dbeafe', fg: '#2563eb' }, news: { bg: '#fef3c7', fg: '#b45309' } };

  return (
    <div style={{ height: 34, background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, fontSize: 10, letterSpacing: 3, fontWeight: 800, color: '#fff', background: 'linear-gradient(90deg, #b8952e, #9a7c22)', height: '100%', display: 'flex', alignItems: 'center', padding: '0 18px', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)', zIndex: 2 }}>BREAKING</div>
      <div style={{ flex: 1, overflow: 'hidden', maskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)' }}>
        <div className="animate-ticker" style={{ display: 'flex', width: 'max-content' }}>
          {items.concat(items).map((n, i) => {
            const c = tc[n.type] || tc.news;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 28px', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, padding: '2px 8px', borderRadius: 5, background: c.bg, color: c.fg }}>{n.type || 'news'}</span>
                <span>{n.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
