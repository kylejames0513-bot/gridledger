'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import NewsTicker from '@/components/NewsTicker';
import CapOverview from '@/components/CapOverview';
import RosterTable from '@/components/RosterTable';
import GMModal from '@/components/GMModal';
import TradeSimulator from '@/components/TradeSimulator';
import FreeAgentMarket from '@/components/FreeAgentMarket';
import DraftPicks from '@/components/DraftPicks';
import TransactionList from '@/components/TransactionList';
import GMLog from '@/components/GMLog';
import ProModal from '@/components/ProModal';
import { getTeamById, SALARY_CAP_2026, formatMoney, teamLogoUrl } from '@/lib/constants';
import { useRoster, useAllPlayers, useTransactions, useNews, useAllRosters, useDraftPicks, useFreeAgents } from '@/lib/use-data';
import { generateFreeAgents } from '@/lib/demo-data';

const TABS = [
  { key: 'roster', label: 'Roster', icon: '📋' },
  { key: 'fa', label: 'Free Agents', icon: '✍️' },
  { key: 'trade', label: 'Trade Sim', icon: '⇄' },
  { key: 'picks', label: 'Draft Picks', icon: '🎯' },
  { key: 'tx', label: 'Transactions', icon: '📰' },
  { key: 'gm', label: 'GM Log', icon: '🏈' },
];

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.teamId;
  const team = getTeamById(teamId);

  const { roster: baseRoster, source: rosterSource } = useRoster(teamId);
  const allPlayers = useAllPlayers();
  const transactions = useTransactions(teamId);
  const globalTx = useTransactions();
  const news = useNews();
  const { rosters: allBaseRosters, loaded: rostersLoaded } = useAllRosters();
  const draftPicks = useDraftPicks(teamId);
  const { freeAgents, setFreeAgents } = useFreeAgents();

  const [localModifications, setLocalModifications] = useState({});
  const [addedPlayers, setAddedPlayers] = useState([]);
  const [gmMoves, setGmMoves] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [activeTab, setActiveTab] = useState('roster');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [showPro, setShowPro] = useState(false);

  const roster = useMemo(() => {
    if (!baseRoster) return [];
    let r = baseRoster.map(p => localModifications[p.id] ? { ...p, ...localModifications[p.id] } : p);
    return [...r, ...addedPlayers];
  }, [baseRoster, localModifications, addedPlayers]);

  const allRosters = useMemo(() => rostersLoaded ? allBaseRosters : {}, [allBaseRosters, rostersLoaded]);
  const capUsed = roster.reduce((s, p) => s + (p.contract?.cap_hit || 0), 0);
  const capSpace = SALARY_CAP_2026 - capUsed;
  const teamGM = gmMoves.filter(m => m.teamId === teamId);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }
  function addMove(move) { setGmMoves(prev => [...prev, { ...move, teamId, id: Date.now() }]); }
  function handleAction(action, player) { setModal({ action, player }); }

  function handleConfirm(action, player, details) {
    const c = player.contract || {};
    setUndoStack(prev => [...prev, { localModifications: { ...localModifications }, addedPlayers: [...addedPlayers], moves: [...gmMoves] }]);
    if (action === 'cut') {
      setLocalModifications(prev => ({ ...prev, [player.id]: { status: 'free_agent', roster_status: 'dead', contract: { ...c, cap_hit: c.dead_cap } } }));
      addMove({ move_type: 'cut', player_name: player.name, details, cap_impact: -(c.cap_hit - c.dead_cap) });
      showToast(`Released ${player.name} — saved ${formatMoney(c.cap_hit - c.dead_cap)}`);
    } else if (action === 'june1') {
      const sd = Math.round(c.dead_cap / 2 * 10) / 10;
      setLocalModifications(prev => ({ ...prev, [player.id]: { status: 'free_agent', roster_status: 'dead', contract: { ...c, cap_hit: sd, dead_cap: sd } } }));
      addMove({ move_type: 'post_june_1', player_name: player.name, details, cap_impact: -(c.cap_hit - sd) });
      showToast(`Post-June 1 cut: ${player.name}`);
    } else if (action === 'restructure') {
      const convert = details.convert || c.base_salary * 0.5;
      const newHit = Math.round((c.cap_hit - convert + convert / (c.years || 3)) * 10) / 10;
      setLocalModifications(prev => ({ ...prev, [player.id]: { contract: { ...c, cap_hit: newHit, dead_cap: Math.round((c.dead_cap + convert * 0.8) * 10) / 10 } } }));
      addMove({ move_type: 'restructure', player_name: player.name, details: { ...details, savings: Math.round((c.cap_hit - newHit) * 10) / 10 }, cap_impact: -(c.cap_hit - newHit) });
      showToast(`Restructured ${player.name} — saved ${formatMoney(c.cap_hit - newHit)}`);
    } else if (action === 'extend') {
      const years = details.years || 2;
      const value = details.value || c.base_salary * years * 0.9;
      const newHit = Math.round(value / (c.years + years) * 10) / 10;
      setLocalModifications(prev => ({ ...prev, [player.id]: { contract: { ...c, cap_hit: newHit, years: c.years + years } } }));
      addMove({ move_type: 'extend', player_name: player.name, details, cap_impact: -(c.cap_hit - newHit) });
      showToast(`Extended ${player.name} — ${years}yr/${formatMoney(value)}`);
    }
    setModal(null);
  }

  function handleSignFA(fa) {
    setUndoStack(prev => [...prev, { localModifications: { ...localModifications }, addedPlayers: [...addedPlayers], moves: [...gmMoves] }]);
    const np = {
      id: `${teamId}-FA-${fa.id}`, team_id: teamId, name: fa.name, position: fa.position,
      number: Math.floor(Math.random() * 89) + 1, age: fa.age, experience: fa.experience,
      status: 'active', roster_status: 'active',
      contract: { base_salary: fa.projected_value, cap_hit: fa.projected_value, dead_cap: Math.round(fa.projected_value * 0.2 * 10) / 10, guaranteed: Math.round(fa.projected_value * 0.4 * 10) / 10, years: fa.contract_years || 1, total_value: fa.projected_value },
    };
    setAddedPlayers(prev => [...prev, np]);
    setFreeAgents(prev => prev.filter(f => f.id !== fa.id));
    addMove({ move_type: 'sign_fa', player_name: fa.name, details: { value: fa.projected_value }, cap_impact: -fa.projected_value });
    showToast(`Signed ${fa.name} — ${formatMoney(fa.projected_value)}/yr`);
  }

  function handleTrade(partnerId, sendIds, recvIds) {
    setUndoStack(prev => [...prev, { localModifications: { ...localModifications }, addedPlayers: [...addedPlayers], moves: [...gmMoves] }]);
    const newMods = { ...localModifications };
    sendIds.forEach(pid => { newMods[pid] = { status: 'free_agent', roster_status: 'dead', contract: { cap_hit: 0, dead_cap: 0, base_salary: 0, guaranteed: 0, years: 0 } }; });
    setLocalModifications(newMods);
    const theirRoster = allRosters[partnerId] || [];
    const received = recvIds.map(pid => { const p = theirRoster.find(x => x.id === pid); return p ? { ...p, team_id: teamId } : null; }).filter(Boolean);
    setAddedPlayers(prev => [...prev, ...received]);
    const pt = getTeamById(partnerId);
    addMove({ move_type: 'trade', player_name: `${sendIds.length} for ${recvIds.length}`, details: { partner: pt?.name } });
    showToast(`Trade with ${pt?.name} executed!`);
  }

  function handleUndo() {
    if (!undoStack.length) return;
    const last = undoStack[undoStack.length - 1];
    setLocalModifications(last.localModifications);
    setAddedPlayers(last.addedPlayers);
    setGmMoves(last.moves);
    setUndoStack(prev => prev.slice(0, -1));
    showToast('Move undone');
  }

  function handleReset() {
    setLocalModifications({}); setAddedPlayers([]);
    setGmMoves(prev => prev.filter(m => m.teamId !== teamId));
    setUndoStack([]); showToast('All moves reset');
  }

  if (!team) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏈</div>
          <p style={{ color: 'var(--text-muted)' }}>Team not found</p>
          <button onClick={() => router.push('/')} style={{ marginTop: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textDecoration: 'underline' }}>Go home</button>
        </div>
      </div>
    );
  }

  if (!baseRoster || !news) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img src={teamLogoUrl(team.espn)} alt="" style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading {team.name}...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header allPlayers={allPlayers} news={news} onProClick={() => setShowPro(true)} />
      <NewsTicker news={news} />
      {showPro && <ProModal show={showPro} onClose={() => setShowPro(false)} />}

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px 80px' }}>
        <button onClick={() => router.push('/')} className="gl-btn-ghost" style={{ marginBottom: 16 }}>← All Teams</button>

        {/* Team Header */}
        <div className="gl-card" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 28px', marginBottom: 12, borderRadius: 18 }}>
          <img src={teamLogoUrl(team.espn)} alt={team.name} style={{ width: 60, height: 60, objectFit: 'contain' }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1, margin: 0 }}>
              {team.city} {team.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              {team.conf} • {team.div} Division
              {rosterSource === 'supabase' && <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 11 }}>● Live</span>}
              {rosterSource === 'demo' && <span>● Demo</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {teamGM.length > 0 && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--gold)', background: 'var(--gold-light)', border: '1px solid var(--gold-border)', padding: '5px 12px', borderRadius: 8, fontWeight: 600 }}>
                {teamGM.length} move{teamGM.length !== 1 ? 's' : ''}
              </span>
            )}
            {teamGM.length > 0 && <button onClick={handleReset} className="gl-btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}>↺ Reset</button>}
          </div>
        </div>

        <CapOverview roster={roster} teamColor={team.color} />

        {/* Tabs */}
        <div className="gl-tabs" style={{ margin: '14px 0' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`gl-tab ${activeTab === t.key ? 'active' : ''}`}>
              <span style={{ fontSize: 13 }}>{t.icon}</span>
              <span className="hide-mobile">{t.label}</span>
              {t.key === 'gm' && teamGM.length > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: .5 }}>({teamGM.length})</span>}
              {t.key === 'fa' && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: .5 }}>{freeAgents.length}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'roster' && <RosterTable roster={roster} onAction={handleAction} showActions={true} />}
        {activeTab === 'fa' && <FreeAgentMarket freeAgents={freeAgents} capSpace={capSpace} onSign={handleSignFA} />}
        {activeTab === 'trade' && <TradeSimulator teamId={teamId} roster={roster} allRosters={allRosters} onExecuteTrade={handleTrade} />}
        {activeTab === 'picks' && <DraftPicks picks={draftPicks} />}
        {activeTab === 'tx' && <TransactionList transactions={(transactions?.length ? transactions : globalTx) || []} />}
        {activeTab === 'gm' && <GMLog moves={teamGM} onUndo={handleUndo} onReset={handleReset} />}
      </main>

      {modal && <GMModal action={modal.action} player={modal.player} onConfirm={handleConfirm} onClose={() => setModal(null)} />}

      {toast && (
        <div className="animate-toast" style={{ position: 'fixed', top: 60, right: 12, background: 'var(--card)', border: '1px solid var(--gold-border)', borderRadius: 12, padding: '8px 18px', color: 'var(--gold)', fontSize: 12, fontWeight: 600, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          ✓ {toast}
        </div>
      )}

      {undoStack.length > 0 && teamGM.length > 0 && (
        <div style={{ position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'var(--card)', border: '1px solid var(--gold-border)', borderRadius: 14, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 40, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Last: <strong style={{ color: 'var(--gold)' }}>{teamGM[teamGM.length - 1]?.move_type}</strong> — {teamGM[teamGM.length - 1]?.player_name}
          </span>
          <button onClick={handleUndo} className="gl-btn gl-btn-gold" style={{ padding: '5px 14px', fontSize: 10, borderRadius: 7 }}>↺ Undo</button>
        </div>
      )}
    </div>
  );
}
