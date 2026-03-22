'use client';
export default function ProModal({ show, onClose, user, onLogin, onActivatePro }) {
  if (!show) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420, margin: 16, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#b8952e', marginBottom: 8 }}>GRIDLEDGER PRO</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Unlock GM Mode</h2>
        <p style={{ fontSize: 13, color: '#7a8190', marginBottom: 24, lineHeight: 1.6 }}>
          Full access to salary cap management tools, trade simulator, and advanced analytics.
        </p>

        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          {[
            'Cut, restructure & extend players',
            'Trade simulator with cap impact',
            'Free agent market with offer system',
            'Multi-year cap projections',
            'Export rosters to CSV',
            'Real-time push notifications',
            'AI-powered trade analyzer',
          ].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13, color: '#4a5060' }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>{f}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 32, fontWeight: 800, color: '#b8952e', marginBottom: 2 }}>
          $7.99<span style={{ fontSize: 14, color: '#b0b5be' }}>/mo</span>
        </div>
        <div style={{ fontSize: 11, color: '#c4c9d0', marginBottom: 20 }}>or $59.99/year (save 37%)</div>

        {!user ? (
          <div>
            <button onClick={onLogin}
              style={{ width: '100%', padding: '12px 0', background: '#1a1d24', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>
              Sign Up to Start Free Trial
            </button>
            <div style={{ fontSize: 11, color: '#b0b5be' }}>Already have an account? <button onClick={onLogin} style={{ color: '#b8952e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>Sign in</button></div>
          </div>
        ) : (
          <button onClick={onActivatePro}
            style={{ width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #b8952e, #9a7c22)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Start 7-Day Free Trial
          </button>
        )}

        <button onClick={onClose} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: '#c4c9d0', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Maybe later</button>
      </div>
    </div>
  );
}
