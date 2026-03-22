'use client';
import { useState } from 'react';
import { formatMoney } from '@/lib/constants';

export default function ProModal({ show, onClose, user, isPro, onLogin }) {
  const [loading, setLoading] = useState(false);
  const [priceType, setPriceType] = useState('monthly');

  if (!show) return null;

  async function handleCheckout() {
    if (!user) { onLogin?.(); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, email: user.email, priceType,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Failed to create checkout');
    } catch(e) {
      alert('Checkout error: ' + e.message);
    }
    setLoading(false);
  }

  if (isPro) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 380, margin: 16, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#b8952e', marginBottom: 6 }}>GRIDLEDGER PRO</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>You're a Pro!</h2>
          <p style={{ fontSize: 13, color: '#7a8190', lineHeight: 1.6 }}>Full access to all GM tools, trade simulator, and advanced analytics.</p>
          <button onClick={onClose} style={{ marginTop: 18, padding: '10px 28px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg, #b8952e, #9a7c22)', color: '#fff' }}>Got it</button>
        </div>
      </div>
    );
  }

  const features = [
    'Cut, restructure & extend players',
    'Realistic trade simulator with GM approval',
    'Free agent market with negotiation system',
    'Multi-year cap projections',
    'Export rosters to CSV',
    'Save & share GM scenarios',
    'AI-powered trade analyzer',
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420, margin: 16, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#b8952e', marginBottom: 8 }}>GRIDLEDGER PRO</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Unlock GM Mode</h2>
        <p style={{ fontSize: 13, color: '#7a8190', marginBottom: 20, lineHeight: 1.6 }}>Full access to salary cap management tools and advanced analytics.</p>

        <div style={{ textAlign: 'left', marginBottom: 20 }}>
          {features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13, color: '#4a5060' }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>{f}
            </div>
          ))}
        </div>

        {/* Price Toggle */}
        <div style={{ display: 'flex', gap: 2, background: '#f0f1f3', borderRadius: 10, padding: 3, marginBottom: 14, justifyContent: 'center' }}>
          <button onClick={() => setPriceType('monthly')} style={{ padding: '6px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: priceType === 'monthly' ? '#fff' : 'transparent', color: priceType === 'monthly' ? '#1a1d24' : '#9ca3af', boxShadow: priceType === 'monthly' ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>Monthly</button>
          <button onClick={() => setPriceType('yearly')} style={{ padding: '6px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: priceType === 'yearly' ? '#fff' : 'transparent', color: priceType === 'yearly' ? '#1a1d24' : '#9ca3af', boxShadow: priceType === 'yearly' ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>Yearly <span style={{ color: '#16a34a', fontSize: 10 }}>save 37%</span></button>
        </div>

        <div style={{ fontSize: 32, fontWeight: 800, color: '#b8952e', marginBottom: 2 }}>
          {priceType === 'monthly' ? '$7.99' : '$59.99'}
          <span style={{ fontSize: 14, color: '#b0b5be' }}>/{priceType === 'monthly' ? 'mo' : 'yr'}</span>
        </div>
        <div style={{ fontSize: 11, color: '#c4c9d0', marginBottom: 20 }}>7-day free trial included</div>

        <button onClick={handleCheckout} disabled={loading}
          style={{ width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none', cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
            background: loading ? '#e5e7eb' : user ? 'linear-gradient(135deg, #b8952e, #9a7c22)' : '#1a1d24',
            color: '#fff' }}>
          {loading ? 'Loading...' : user ? 'Start 7-Day Free Trial' : 'Sign Up to Start Free Trial'}
        </button>

        {!user && (
          <div style={{ marginTop: 10, fontSize: 11, color: '#b0b5be' }}>
            Already have an account? <button onClick={onLogin} style={{ color: '#b8952e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>Sign in</button>
          </div>
        )}

        <button onClick={onClose} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: '#c4c9d0', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Maybe later</button>
      </div>
    </div>
  );
}
