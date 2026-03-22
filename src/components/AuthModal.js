'use client';
import { useState } from 'react';

export default function AuthModal({ show, onClose, onAuth }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  if (!show) return null;

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid var(--border)', fontSize: 13, outline: 'none',
    fontFamily: 'var(--font)', background: '#f7f8f9', boxSizing: 'border-box',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true); setSuccess('');
    try {
      if (mode === 'signup') {
        const res = await onAuth('signup', email, password, name);
        if (res?.error) throw new Error(res.error.message);
        setSuccess('Check your email to confirm your account!');
      } else {
        const res = await onAuth('signin', email, password);
        if (res?.error) throw new Error(res.error.message);
        onClose();
      }
    } catch(err) {
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 400, margin: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#b8952e', marginBottom: 6 }}>GRIDLEDGER</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            {mode === 'signin' ? 'Sign in to your account' : 'Join the NFL cap community'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>DISPLAY NAME</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required style={inputStyle} />
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={inputStyle} />
          </div>

          {error && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 12, marginBottom: 12, border: '1px solid #fecaca' }}>{error}</div>}
          {success && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontSize: 12, marginBottom: 12, border: '1px solid #bbf7d0' }}>{success}</div>}

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none', cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
              background: loading ? '#e5e7eb' : 'linear-gradient(135deg, #1a1d24, #2a2d34)', color: '#fff' }}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(''); }}
            style={{ fontSize: 12, fontWeight: 700, color: '#b8952e', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        <button onClick={onClose} style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none', color: '#c4c9d0', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
      </div>
    </div>
  );
}
