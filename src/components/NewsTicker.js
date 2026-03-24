'use client';
export default function NewsTicker({ news }) {
  // Filter out generic filler headlines
  const filtered = (news || []).filter(n => {
    const t = (n.title || n.headline || '').toLowerCase();
    if (t.length < 15) return false;
    if (/^espn$|^nfl$|^nfl news$/i.test(t)) return false;
    if (t.includes('espn') && !t.includes('report') && t.length < 30) return false;
    return true;
  });

  const items = filtered.length > 0 ? filtered : [
    { title: 'GridLedger — Real-time NFL salary cap data from OverTheCap', type: 'news' },
    { title: 'Use GM Mode to cut, trade, and restructure players', type: 'news' },
  ];

  const tc = {
    trade: { bg: '#f3e8ff', fg: '#7c3aed' },
    signing: { bg: '#dcfce7', fg: '#16a34a' },
    cut: { bg: '#fef2f2', fg: '#dc2626' },
    restructure: { bg: '#dbeafe', fg: '#2563eb' },
    injury: { bg: '#fef3c7', fg: '#d97706' },
    draft: { bg: '#e0e7ff', fg: '#4f46e5' },
    news: { bg: '#f3f4f6', fg: '#6b7280' },
    other: { bg: '#f3f4f6', fg: '#6b7280' },
  };

  return (
    <div style={{ height: 36, background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, fontSize: 10, letterSpacing: 3, fontWeight: 800, color: '#fff', background: 'linear-gradient(90deg, #b8952e, #9a7c22)', height: '100%', display: 'flex', alignItems: 'center', padding: '0 18px', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)', zIndex: 2 }}>
        BREAKING
      </div>
      <div style={{ flex: 1, overflow: 'hidden', maskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)' }}>
        <div className="animate-ticker" style={{ display: 'flex', width: 'max-content' }}>
          {items.concat(items).map((n, i) => {
            const cat = n.type || n.category || 'news';
            const c = tc[cat] || tc.news;
            const title = n.title || n.headline || '';
            const url = n.url || n.source_url || null;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 32px', whiteSpace: 'nowrap', fontSize: 12, flexShrink: 0 }}>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, padding: '2px 8px', borderRadius: 5, background: c.bg, color: c.fg, textTransform: 'uppercase' }}>
                  {cat}
                </span>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                    {title}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>{title}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
