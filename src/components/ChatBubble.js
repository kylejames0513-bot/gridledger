'use client';
import { useState, useEffect, useRef } from 'react';
import { getTeamById, teamLogoUrl } from '@/lib/constants';

function getSupabase() {
  if (typeof window === 'undefined') return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!window.__glChat) {
    const { createClient } = require('@supabase/supabase-js');
    window.__glChat = createClient(url, key);
  }
  return window.__glChat;
}

const FLAIRS = [
  { id: 'fan', label: 'Fan', color: '#6b7280' },
  { id: 'analyst', label: 'Analyst', color: '#2563eb' },
  { id: 'gm', label: 'Armchair GM', color: '#b8952e' },
  { id: 'degen', label: 'Cap Nerd', color: '#7c3aed' },
  { id: 'insider', label: 'Insider', color: '#dc2626' },
];

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState('');
  const [flair, setFlair] = useState('fan');
  const [showSetup, setShowSetup] = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);

  // Load saved name
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gl_chat_name');
      const savedFlair = localStorage.getItem('gl_chat_flair');
      if (saved) { setUserName(saved); setShowSetup(false); }
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

  function saveName() {
    const n = nameInput.trim();
    if (!n || n.length < 2) return;
    setUserName(n); setShowSetup(false);
    try { localStorage.setItem('gl_chat_name', n); localStorage.setItem('gl_chat_flair', flair); } catch(e) {}
  }

  async function send() {
    if (!input.trim() || !userName) return;
    const sb = getSupabase();
    if (!sb) return;
    const msg = input.trim().substring(0, 500);
    setInput('');
    await sb.from('chat_messages').insert({
      user_name: userName, message: msg,
      team_id: null, flair: flair,
    });
  }

  function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
  const flairInfo = FLAIRS.find(f => f.id === flair) || FLAIRS[0];

  // ─── FLOATING BUBBLE BUTTON ───
  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setUnread(0); }}
        style={{ position: 'fixed', bottom: 20, right: 20, width: 56, height: 56,
          borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 1000,
          background: 'linear-gradient(135deg, #b8952e, #9a7c22)',
          boxShadow: '0 4px 20px rgba(184,149,46,.4), 0 0 0 3px rgba(184,149,46,.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .2s, box-shadow .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
        <span style={{ fontSize: 24 }}>💬</span>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20,
            borderRadius: 10, background: '#dc2626', color: '#fff', fontSize: 10,
            fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 5px', fontFamily: 'var(--mono)',
            boxShadow: '0 2px 6px rgba(220,38,38,.4)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
    );
  }

  // ─── CHAT PANEL (open) ───
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
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none',
          color: '#9ca3af', cursor: 'pointer', fontSize: 18, padding: '2px 4px',
          lineHeight: 1, fontFamily: 'inherit' }}>✕</button>
      </div>

      {/* Setup screen */}
      {showSetup ? (
        <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>🏈</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Join the Conversation</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Pick a name and flair</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              placeholder="Display name..." maxLength={20}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
            {FLAIRS.map(f => (
              <button key={f.id} onClick={() => setFlair(f.id)}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  border: flair === f.id ? `2px solid ${f.color}` : '1px solid #e5e7eb',
                  background: flair === f.id ? f.color + '15' : '#fff',
                  color: flair === f.id ? f.color : '#9ca3af' }}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={saveName} disabled={nameInput.trim().length < 2}
            style={{ width: '100%', padding: '9px 0', borderRadius: 8, fontSize: 12,
              fontWeight: 700, border: 'none', cursor: nameInput.trim().length >= 2 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              background: nameInput.trim().length >= 2 ? 'linear-gradient(135deg, #b8952e, #9a7c22)' : '#e5e7eb',
              color: nameInput.trim().length >= 2 ? '#fff' : '#9ca3af' }}>
            Enter Chat
          </button>
        </div>

      ) : (
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>🏈</div>
                <div style={{ fontSize: 11 }}>No messages yet</div>
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
            display: 'flex', gap: 6, flexShrink: 0 }}>
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
