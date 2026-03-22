'use client';
import { useState } from 'react';

export default function AuthModal({ onClose, onAuth, auth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'login') {
      const { error: err } = await auth.signIn(email, password);
      if (err) setError(err.message);
      else { onAuth?.(); onClose(); }
    } else {
      if (password.length < 6) { setError('Password must be 6+ characters'); setLoading(false); return; }
      const { error: err } = await auth.signUp(email, password, name);
      if (err) setError(err.message);
      else setSuccess('Check your email for a confirmation link!');
    }
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 400, margin: 16 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <svg viewBox="0 0 36 36" fill="none" style={{ width: 40, height: 40, margin: '0 auto 12px' }}>
            <path d="M18 2L32 10V26L18 34L4 26V10L18 2Z" fill="#1a1d24" stroke="#b8952e" strokeWidth="1.2"/>
            <path d="M18 12V24M14 16L22 20M22 16L14 20" stroke="#b8952e" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
          </svg>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ fontSize: 13, color: '#7a8190' }}>
            {mode === 'login' ? 'Sign in to your GridLedger account' : 'Join GridLedger and unlock GM tools'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#7a8190', marginBottom: 4, display: 'block' }}>Display Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #eaecf0', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#f7f8f9' }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#7a8190', marginBottom: 4, display: 'block' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #eaecf0', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#f7f8f9' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#7a8190', marginBottom: 4, display: 'block' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #eaecf0', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#f7f8f9' }} />
          </div>

          {error && <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
          {success && <div style={{ fontSize: 12, color: '#16a34a', background: '#f0fdf4', padding: '8px 12px', borderRadius: 8 }}>{success}</div>}

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px 0', background: '#1a1d24', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: loading ? .6 : 1, marginTop: 4 }}>
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#7a8190' }}>
          {mode === 'login' ? (
            <span>No account? <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }} style={{ color: '#b8952e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Sign up</button></span>
          ) : (
            <span>Already have one? <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} style={{ color: '#b8952e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Sign in</button></span>
          )}
        </div>

        <button onClick={onClose} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: '#c4c9d0', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
      </div>
    </div>
  );
}
