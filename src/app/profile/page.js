'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGLAuth } from '@/components/ClientProviders';
import Header from '@/components/Header';
import { useNews, useAllPlayers } from '@/lib/use-data';
import { getSupabase } from '@/lib/supabase';
import { NFL_TEAMS, teamLogoUrl } from '@/lib/constants';

export default function ProfilePage() {
  const auth = useGLAuth();
  const router = useRouter();
  const news = useNews();
  const allPlayers = useAllPlayers();

  const [displayName, setDisplayName] = useState('');
  const [favTeam, setFavTeam] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [savedMoves, setSavedMoves] = useState([]);
  const [loadingMoves, setLoadingMoves] = useState(true);

  // Load profile data
  useEffect(() => {
    if (auth?.profile) {
      setDisplayName(auth.profile.display_name || '');
      setFavTeam(auth.profile.favorite_team || '');
    }
  }, [auth?.profile]);

  // Load saved GM moves
  useEffect(() => {
    if (!auth?.user) return;
    loadMoves();
  }, [auth?.user]);

  async function loadMoves() {
    const sb = getSupabase();
    if (!sb || !auth?.user) return;
    try {
      const { data } = await sb.from('gm_scenarios')
        .select('*, gm_moves(*)')
        .eq('user_id', auth.user.id)
        .order('updated_at', { ascending: false })
        .limit(10);
      setSavedMoves(data || []);
    } catch(e) {}
    setLoadingMoves(false);
  }

  async function saveProfile() {
    const sb = getSupabase();
    if (!sb || !auth?.user) return;
    setSaving(true);
    try {
      await sb.from('profiles').update({
        display_name: displayName.trim(),
        favorite_team: favTeam || null,
        updated_at: new Date().toISOString(),
      }).eq('id', auth.user.id);
      setToast('Profile saved!');
      setTimeout(() => setToast(''), 2500);
    } catch(e) {
      setToast('Error saving: ' + e.message);
    }
    setSaving(false);
  }

  async function deleteScenario(id) {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('gm_moves').delete().eq('scenario_id', id);
    await sb.from('gm_scenarios').delete().eq('id', id);
    setSavedMoves(prev => prev.filter(s => s.id !== id));
    setToast('Scenario deleted');
    setTimeout(() => setToast(''), 2500);
  }

  // Not logged in
  if (!auth?.loading && !auth?.user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Sign In Required</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>Create an account to manage your profile</p>
          <button onClick={() => auth?.openAuth?.()}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#1a1d24', color: '#fff', fontFamily: 'var(--font)' }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const favTeamObj = favTeam ? NFL_TEAMS.find(t => t.id === favTeam) : null;
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', background: '#f7f8f9', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header allPlayers={allPlayers} news={news} />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 60px' }}>
        <button onClick={() => router.push('/')} className="gl-btn-ghost" style={{ marginBottom: 16 }}>← Home</button>

        {/* Profile Header */}
        <div className="gl-card" style={{ padding: '24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #b8952e22, #9a7c2222)', border: '2px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'var(--gold)', flexShrink: 0 }}>
            {(auth?.displayName || '?')[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{auth?.displayName || 'User'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{auth?.user?.email}</div>
          </div>

          {auth?.isPro ? (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#fff', background: 'linear-gradient(135deg, #b8952e, #9a7c22)', padding: '4px 14px', borderRadius: 20 }}>PRO MEMBER</span>
          ) : (
            <button onClick={() => auth?.openPro?.()}
              style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--gold)', background: 'var(--gold-light)', border: '1px solid var(--gold-border)', padding: '4px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              UPGRADE TO PRO
            </button>
          )}
        </div>

        {/* Edit Profile */}
        <div className="gl-card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Edit Profile</div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>DISPLAY NAME</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" maxLength={30} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>FAVORITE TEAM</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {favTeamObj && <img src={teamLogoUrl(favTeamObj.espn)} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />}
              <select value={favTeam} onChange={e => setFavTeam(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select a team...</option>
                {NFL_TEAMS.map(t => <option key={t.id} value={t.id}>{t.city} {t.name}</option>)}
              </select>
            </div>
          </div>

          <button onClick={saveProfile} disabled={saving}
            style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font)',
              background: saving ? '#e5e7eb' : 'linear-gradient(135deg, #b8952e, #9a7c22)', color: '#fff' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Saved GM Scenarios */}
        <div className="gl-card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🏈 Saved GM Scenarios</div>
          {loadingMoves ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
          ) : savedMoves.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 11 }}>No saved scenarios yet</div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>Go to a team page and make GM moves — they'll save automatically</div>
            </div>
          ) : savedMoves.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name || 'Untitled Scenario'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {s.team_id} • {s.gm_moves?.length || 0} moves • {s.updated_at ? new Date(s.updated_at).toLocaleDateString() : ''}
                </div>
              </div>
              <button onClick={() => router.push(`/teams/${s.team_id}`)} className="gl-btn-ghost" style={{ padding: '5px 12px', fontSize: 10 }}>Open</button>
              <button onClick={() => deleteScenario(s.id)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, border: '1px solid #fecaca', background: '#fef2f2', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Delete</button>
            </div>
          ))}
        </div>

        {/* Account */}
        <div className="gl-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Account</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Email</span>
            <span style={{ color: 'var(--text)' }}>{auth?.user?.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status</span>
            <span style={{ color: auth?.isPro ? 'var(--gold)' : 'var(--text-muted)' }}>{auth?.isPro ? 'Pro' : 'Free'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>Member since</span>
            <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11 }}>{auth?.profile?.created_at ? new Date(auth.profile.created_at).toLocaleDateString() : '—'}</span>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => { auth?.signOut?.(); router.push('/'); }}
              style={{ padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: '1px solid #fecaca', background: '#fef2f2', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Sign Out
            </button>
          </div>
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
