'use client';
import { getTeamById, teamLogoUrl } from '@/lib/constants';
export default function TransactionList({ transactions = [] }) {
  if (!transactions || transactions.length === 0) return (
    <div className="gl-card" style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📰</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No Transactions</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Transaction data will appear here once scraped</div>
    </div>
  );
  const tc = { signing: '#16a34a', release: '#dc2626', trade: '#7c3aed', restructure: '#2563eb', reserve: '#d97706', other: '#71717a', Signed: '#16a34a', Released: '#dc2626', Traded: '#7c3aed', Restructured: '#2563eb', Extended: '#0d9488' };
  return (
    <div className="gl-card" style={{ overflow: 'hidden' }}>
      {transactions.map((t, i) => (
        <div key={t.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < transactions.length - 1 ? '1px solid var(--border-light)' : 'none', transition: 'background .1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)', minWidth: 50, flexShrink: 0 }}>
            {t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
          </span>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', flex: 1 }}>{t.player_name}</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: tc[t.type] || tc.other }}>{t.type}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.details || ''}</span>
        </div>
      ))}
    </div>
  );
}
