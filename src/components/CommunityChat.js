'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getTeamById, teamLogoUrl, posColor } from '@/lib/constants';

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

export default function CommunityChat({ teamId = null }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState('');
  const [flair, setFlair] = useState('fan');
  const [showSetup, setShowSetup] = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [tab, setTab] = useState(teamId ? 'team' : 'global');
  const bottomRef = useRef(null);
  const team = teamId ? getTeamById(teamId) : null;

  // Load saved name
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gl_chat_name');
      const savedFlair = localStorage.getItem('gl_chat_flair');
      if (saved) { setUserName(saved); setShowSetup(false); }
      if (savedFlair) setFlair(savedFlair);
    } catch(e) {}
  }, []);

  // Fetch messages + realtime subscribe
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    const filterTeam = tab === 'team' && teamId ? teamId : null;

    async function load() {
      let q = sb.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(100);
      if (filterTeam) q = q.eq('team_id', filterTeam);
      else q = q.is('team_id', null);
      const { data } = await q;
      if (data) setMessages(data);
    }
    load();

    const channel = sb.channel('chat-' + (filterTeam || 'global'))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        ...(filterTeam ? { filter: `team_id=eq.${filterTeam}` } : {}),
      }, (payload) => {
        setMessages(prev => [...prev.slice(-99), payload.new]);
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [tab, teamId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function saveName() {
    const n = nameInput.trim();
    if (!n || n.length < 2) return;
    setUserName(n);
    setShowSetup(false);
    try {
      localStorage.setItem('gl_chat_name', n);
      localStorage.setItem('gl_chat_flair', flair);
    } catch(e) {}
  }

  async function send() {
    if (!input.trim() || !userName) return;
    const sb = getSupabase();
    if (!sb) return;
    const msg = input.trim().substring(0, 500);
    setInput('');
    await sb.from('chat_messages').insert({
      user_name: userName,
      message: msg,
      team_id: tab === 'team' && teamId ? teamId : null,
      flair: flair,
    });
  }

  function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
  const flairInfo = FLAIRS.find(f => f.id === flair) || FLAIRS[0];

  // ─── NAME SETUP ───
  if (showSetup) {
    return (
      <div className="gl-card" style={{ padding: 28, maxWidth: 380, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>💬</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Join the Chat</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Pick a name and flair to start talking</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 4 }}>DISPLAY NAME</div>
          <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()}
            placeholder="Your name..." maxLength={20}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-faint)', marginBottom: 6 }}>FLAIR</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FLAIRS.map(f => (
              <button key={f.id} onClick={() => setFlair(f.id)}
                style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: flair === f.id ? `2px solid ${f.color}` : '1px solid var(--border)',
                  background: flair === f.id ? f.color + '15' : '#fff',
                  color: flair === f.id ? f.color : 'var(--text-muted)', fontFamily: 'var(--font)' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={saveName} disabled={nameInput.trim().length < 2}
          className="gl-btn gl-btn-gold" style={{ width: '100%', padding: '10px 0', fontSize: 13, borderRadius: 10 }}>
          Enter Chat
        </button>
      </div>
    );
  }

  // ─── MAIN CHAT UI ───
  return (
    <div className="gl-card" style={{ display: 'flex', flexDirection: 'column', height: 480, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: '#fafbfc', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>💬</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Community</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)' }}>{messages.length} msgs</span>
        </div>
        {teamId && (
          <div style={{ display: 'flex', gap: 2, background: '#f0f1f3', borderRadius: 8, padding: 2 }}>
            <button onClick={() => setTab('team')} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', background: tab === 'team' ? '#fff' : 'transparent', color: tab === 'team' ? 'var(--text)' : 'var(--text-muted)', boxShadow: tab === 'team' ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
              {team?.name || 'Team'}
            </button>
            <button onClick={() => setTab('global')} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', background: tab === 'global' ? '#fff' : 'transparent', color: tab === 'global' ? 'var(--text)' : 'var(--text-muted)', boxShadow: tab === 'global' ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
              League
            </button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: flairInfo.color, background: flairInfo.color + '15', padding: '2px 8px', borderRadius: 6 }}>{flairInfo.label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{userName}</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🏈</div>
            <div style={{ fontSize: 12 }}>No messages yet — be the first!</div>
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.user_name === userName;
          const mFlair = FLAIRS.find(f => f.id === m.flair) || FLAIRS[0];
          const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const mTeam = m.team_id ? getTeamById(m.team_id) : null;
          return (
            <div key={m.id || i} style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: mFlair.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: mFlair.color, flexShrink: 0, marginTop: 2 }}>
                {m.user_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: isMe ? 'var(--gold)' : 'var(--text)' }}>{m.user_name}</span>
                  <span style={{ fontSize: 8, fontWeight: 600, color: mFlair.color, background: mFlair.color + '12', padding: '1px 5px', borderRadius: 4 }}>{mFlair.label}</span>
                  {mTeam && <img src={teamLogoUrl(mTeam.espn)} alt="" style={{ width: 12, height: 12, objectFit: 'contain' }} />}
                  <span style={{ fontSize: 9, color: 'var(--text-faint)', marginLeft: 'auto' }}>{time}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'break-word' }}>{m.message}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: '#fafbfc', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Type a message..." maxLength={500}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)', background: '#fff' }} />
        <button onClick={send} disabled={!input.trim()}
          style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font)',
            background: input.trim() ? 'linear-gradient(135deg, #b8952e, #9a7c22)' : '#e5e7eb',
            color: input.trim() ? '#fff' : '#9ca3af' }}>
          Send
        </button>
      </div>
    </div>
  );
}
