'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setStatus('error'); return; }

    // Supabase will auto-handle the token from the URL hash
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus('success');
        setTimeout(() => router.push('/'), 2000);
      }
    });

    // Also check if already signed in
    sb.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setStatus('success');
        setTimeout(() => router.push('/'), 2000);
      }
    });

    // Timeout fallback
    const timer = setTimeout(() => {
      if (status === 'verifying') setStatus('error');
    }, 10000);
    return () => clearTimeout(timer);
  }, [router, status]);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 400, margin: 16, boxShadow: '0 8px 32px rgba(0,0,0,.06)' }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Verifying your email...</h2>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Please wait a moment</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', marginBottom: 6 }}>Email Verified!</h2>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Redirecting to GridLedger...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', marginBottom: 6 }}>Verification Failed</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>The link may have expired. Try signing in again.</p>
            <button onClick={() => router.push('/')}
              style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#1a1d24', color: '#fff', fontFamily: 'inherit' }}>
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
