'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGLAuth } from '@/components/ClientProviders';
import Header from '@/components/Header';
import { useNews, useAllPlayers } from '@/lib/use-data';
import { getSupabase } from '@/lib/supabase';

// Add your email(s) here
const ADMIN_EMAILS = ['kylejames0513@gmail.com'];

export default function AdminPage() {
  const auth = useGLAuth();
  const router = useRouter();
  const news = useNews();
  const allPlayers = useAllPlayers();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const isAdmin = auth?.user && ADMIN_EMAILS.includes(auth.user.email);

  useEffect(() => {
    if (!auth?.loading && !isAdmin) return;
    loadUsers();
  }, [auth?.loading, isAdmin]);

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.stats) setStats(data.stats);
    } catch(e) {}
    setLoading(false);
  }

  async function togglePro(userId, currentStatus) {
    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_pro', userId, isPro: !currentStatus }),
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_pro: !currentStatus } : u));
      setToast(`Pro ${!currentStatus ? 'granted' : 'revoked'}`);
      setTimeout(() => setToast(''), 2500);
    } catch(e) { alert('Failed: ' + e.message); }
  }

  async function deleteUser(userId, email) {
    if (!confirm(`Delete ${email}? This cannot be undone.`)) return;
    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', userId }),
      });
      setUsers(prev => prev.filter(u => u.id !== userId));
      setToast('User deleted');
      setTimeout(() => setToast(''), 2500);
    } catch(e) { alert('Failed: ' + e.message); }
  }

  // Not admin
  if (!auth?.loading && !isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>Owner access only</p>
          <button onClick={() => router.push('/')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#1a1d24', color: '#fff', fontFamily: 'var(--font)' }}>Go Home</button>
        </div>
      </div>
    );
  }

  const filtered = search.trim()
    ? users.filter(u => (u.display_name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header allPlayers={allPlayers} news={news} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px' }}>
        <button onClick={() => router.push('/')} className="gl-btn-ghost" style={{ marginBottom: 16 }}>← Home</button>

        <div className="gl-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🛡️ Owner Dashboard</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Manage users, grant Pro access, view stats</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'TOTAL USERS', val: stats.total || users.length, color: 'var(--text)' },
            { label: 'PRO MEMBERS', val: stats.pro || users.filter(u => u.is_pro).length, color: 'var(--gold)' },
            { label: 'FREE USERS', val: (stats.total || users.length) - (stats.pro || users.filter(u => u.is_pro).length), color: 'var(--blue)' },
            { label: 'NEW (7 DAYS)', val: stats.recent || 0, color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="gl-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* User search */}
        <div style={{ marginBottom: 12 }}>
          <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 360, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
        </div>

        {/* Users table */}
        <div className="gl-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 80px 80px 100px 120px', gap: 8, padding: '10px 16px', background: '#fafbfc', borderBottom: '1px solid var(--border)', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-faint)' }}>
            <span>NAME</span><span>EMAIL</span><span>STATUS</span><span>TEAM</span><span>JOINED</span><span>ACTIONS</span>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</div>
          ) : filtered.map(u => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 80px 80px 100px 120px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border-light)', alignItems: 'center', fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{u.display_name || '—'}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
              <span>
                {u.is_pro
                  ? <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #b8952e, #9a7c22)', padding: '2px 8px', borderRadius: 4 }}>PRO</span>
                  : <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>FREE</span>
                }
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>{u.favorite_team || '—'}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)' }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => togglePro(u.id, u.is_pro)}
                  style={{ padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, border: '1px solid var(--border)', background: u.is_pro ? '#fef2f2' : '#f0fdf4', color: u.is_pro ? 'var(--red)' : 'var(--green)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  {u.is_pro ? 'Revoke' : 'Grant'} Pro
                </button>
                <button onClick={() => deleteUser(u.id, u.email)}
                  style={{ padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, border: '1px solid #fecaca', background: '#fef2f2', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No users found</div>
          )}
        </div>
      </main>

      {toast && (
        <div className="animate-toast" style={{ position: 'fixed', top: 60, right: 12, background: 'var(--card)', border: '1px solid var(--gold-border)', borderRadius: 12, padding: '8px 18px', color: 'var(--gold)', fontSize: 12, fontWeight: 600, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
