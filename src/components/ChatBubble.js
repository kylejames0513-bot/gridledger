'use client';
import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';

const FLAIRS = [
  { id: 'fan', label: 'Fan', color: '#6b7280' },
  { id: 'analyst', label: 'Analyst', color: '#2563eb' },
  { id: 'gm', label: 'Armchair GM', color: '#b8952e' },
  { id: 'degen', label: 'Cap Nerd', color: '#7c3aed' },
  { id: 'insider', label: 'Insider', color: '#dc2626' },
];

export default function ChatBubble({ auth }) {
  const auth = useGLAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [flair, setFlair] = useState('fan');
  const [showFlairPicker, setShowFlairPicker] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);

  const isLoggedIn = !!auth?.user;
  const userName = auth?.displayName || 'Guest';

  // Load saved flair
  useEffect(() => {
    try {
      const savedFlair = localStorage.getItem('gl_chat_flair');
      if (savedFlair) setFlair(savedFlair);
    } catch(e) {}
  }, []);

  // Fetch messages + realtime
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    async function load() {
      const { data } = await sb.from('chat_messages')
        .select('*').is('team_id', null)
        .order('created_at', { ascending: true }).limit(80);
      if (data) setMessages(data);
    }
    load();

    const channel = sb.channel('chat-global-bubble')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
      }, (payload) => {
        setMessages(prev => [...prev.slice(-79), payload.new]);
        if (!open) setUnread(prev => prev + 1);
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [open]);

  useEffect(() => {
    if (open) { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnread(0); }
  }, [messages, open]);

  function saveFlair(f) {
    setFlair(f);
    setShowFlairPicker(false);
    try { localStorage.setItem('gl_chat_flair', f); } catch(e) {}
  }

  async function send() {
    if (!input.trim() || !isLoggedIn) return;
    const sb = getSupabase();
    if (!sb) return;
    const msg = input.trim().substring(0, 500);
    setInput('');
    await sb.from('chat_messages').insert({
      user_name: userName,
      message: msg,
      team_id: null,
      flair: flair,
    });
  }

  function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
  const flairInfo = FLAIRS.find(f => f.id === flair) || FLAIRS[0];

  // ─── FLOATING BUBBLE ───
  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setUnread(0); }}
        style={{ position: 'fixed', bottom: 20, right: 20, width: 56, height: 56,
          borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 1000,
          background: 'linear-gradient(135deg, #b8952e, #9a7c22)',
          boxShadow: '0 4px 20px rgba(184,149,46,.4), 0 0 0 3px rgba(184,149,46,.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
        <span style={{ fontSize: 24 }}>💬</span>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20,
            borderRadius: 10, background: '#dc2626', color: '#fff', fontSize: 10,
            fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 5px', fontFamily: 'var(--mono)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
    );
  }

  // ─── CHAT PANEL ───
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, width: 360, height: 500,
      borderRadius: 18, zIndex: 1000, display: 'flex', flexDirection: 'column',
      background: '#fff', border: '1px solid #e5e7eb',
      boxShadow: '0 12px 40px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.04)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1a1d24, #2a2d34)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>💬</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>GridLedger Chat</span>
          <span style={{ fontSize: 9, color: '#b8952e', background: 'rgba(184,149,46,.15)',
            padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isLoggedIn && (
            <button onClick={() => setShowFlairPicker(!showFlairPicker)}
              style={{ fontSize: 9, fontWeight: 600, color: flairInfo.color, background: flairInfo.color + '25', padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {flairInfo.label} ▾
            </button>
          )}
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none',
            color: '#9ca3af', cursor: 'pointer', fontSize: 18, padding: '2px 4px', lineHeight: 1, fontFamily: 'inherit' }}>✕</button>
        </div>
      </div>

      {/* Flair picker */}
      {showFlairPicker && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', background: '#fafbfc', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FLAIRS.map(f => (
            <button key={f.id} onClick={() => saveFlair(f.id)}
              style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                border: flair === f.id ? `2px solid ${f.color}` : '1px solid #e5e7eb',
                background: flair === f.id ? f.color + '15' : '#fff',
                color: flair === f.id ? f.color : '#9ca3af' }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Not logged in */}
      {!isLoggedIn ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Sign in to Chat</div>
          <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginBottom: 16 }}>Create a free account to join the conversation</div>
          <button onClick={() => { setOpen(false); auth?.openAuth?.(); }}
            style={{ padding: '9px 24px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: 'linear-gradient(135deg, #1a1d24, #2a2d34)', color: '#fff' }}>
            Sign In / Sign Up
          </button>
        </div>

      ) : (
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🏈</div>
                <div style={{ fontSize: 11 }}>No messages yet — say something!</div>
              </div>
            )}
            {messages.map((m, i) => {
              const isMe = m.user_name === userName;
              const mf = FLAIRS.find(f => f.id === m.flair) || FLAIRS[0];
              const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div key={m.id || i} style={{ marginBottom: 6, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: mf.color + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: mf.color, flexShrink: 0, marginTop: 1 }}>
                    {m.user_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 11, color: isMe ? '#b8952e' : '#1a1d24' }}>{m.user_name}</span>
                      <span style={{ fontSize: 7, fontWeight: 600, color: mf.color, background: mf.color + '12', padding: '1px 4px', borderRadius: 3 }}>{mf.label}</span>
                      <span style={{ fontSize: 8, color: '#c4c9d0', marginLeft: 'auto' }}>{time}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.4, wordBreak: 'break-word' }}>{m.message}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', background: '#fafbfc',
            display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: flairInfo.color + '20',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: flairInfo.color, flexShrink: 0 }}>
              {userName[0]?.toUpperCase()}
            </div>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Type a message..." maxLength={500}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 11, outline: 'none', fontFamily: 'inherit', background: '#fff',
                boxSizing: 'border-box' }} />
            <button onClick={send} disabled={!input.trim()}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                background: input.trim() ? 'linear-gradient(135deg, #b8952e, #9a7c22)' : '#e5e7eb',
                color: input.trim() ? '#fff' : '#9ca3af', flexShrink: 0 }}>
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
