'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import ChatBubble from '@/components/ChatBubble';
import AuthModal from '@/components/AuthModal';
import ProModal from '@/components/ProModal';
import { getSupabase } from '@/lib/supabase';

const AuthContext = createContext(null);
export function useGLAuth() { return useContext(AuthContext); }

export default function ClientProviders({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showPro, setShowPro] = useState(false);

  // Listen for auth state
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }

    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user || null);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
      setProfile(data);
    } catch(e) {}
    setLoading(false);
  }

  const handleAuth = useCallback(async (mode, email, password, displayName) => {
    const sb = getSupabase();
    if (!sb) return { error: { message: 'Not connected' } };
    const siteUrl = window.location.origin;
    if (mode === 'signup') {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${siteUrl}/auth/confirm`,
        },
      });
      return { data, error };
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      return { data, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const isPro = profile?.is_pro || false;
  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || null;

  const ctx = {
    user, profile, loading, isPro, displayName,
    signOut,
    openAuth: () => setShowAuth(true),
    openPro: () => setShowPro(true),
  };

  return (
    <AuthContext.Provider value={ctx}>
      {children}
      <ChatBubble auth={ctx} />
      <AuthModal
        show={showAuth}
        onClose={() => setShowAuth(false)}
        onAuth={handleAuth}
      />
      <ProModal
        show={showPro}
        onClose={() => setShowPro(false)}
        user={user}
        isPro={isPro}
        onLogin={() => { setShowPro(false); setShowAuth(true); }}
      />
    </AuthContext.Provider>
  );
}
