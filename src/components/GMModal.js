'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/constants';

export default function GMModal({ action, player, onConfirm, onClose }) {
  const [restructureAmt, setRestructureAmt] = useState('');
  const [extYears, setExtYears] = useState('2');
  const [extValue, setExtValue] = useState('');
  if (!action || !player) return null;
  const c = player.contract || {};

  const cfg = {
    cut: { title: 'Release Player', color: 'var(--red)', btn: 'Confirm Release', btnBg: 'var(--red)', btnFg: '#fff' },
    june1: { title: 'Post-June 1st Cut', color: 'var(--orange)', btn: 'Confirm Designation', btnBg: 'var(--orange)', btnFg: '#fff' },
    restructure: { title: 'Restructure Contract', color: 'var(--blue)', btn: 'Confirm Restructure', btnBg: 'var(--blue)', btnFg: '#fff' },
    extend: { title: 'Contract Extension', color: 'var(--green)', btn: 'Confirm Extension', btnBg: 'var(--green)', btnFg: '#fff' },
  }[action];

  const inputStyle = {
    width: '100%', background: '#f7f8f9', border: '1px solid var(--border)', borderRadius: 10,
    padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--mono)', color: 'var(--text)',
  };

  function handleConfirm() {
    let details = {};
    if (action === 'cut') details = { savings: c.cap_hit - c.dead_cap, dead: c.dead_cap };
    else if (action === 'june1') { const sd = c.dead_cap / 2; details = { savings: c.cap_hit - sd, deadY1: sd, deadY2: sd }; }
    else if (action === 'restructure') { const cv = parseFloat(restructureAmt) || c.base_salary * 0.5; const nh = c.cap_hit - cv + cv / (c.years || 3); details = { convert: cv, newHit: nh, savings: c.cap_hit - nh }; }
    else if (action === 'extend') { const y = parseInt(extYears) || 2; const v = parseFloat(extValue) || c.base_salary * y * 0.9; details = { years: y, value: v, newAvg: v / (c.years + y) }; }
    onConfirm(action, player, details);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 18, padding: 24, minWidth: 360, maxWidth: 440, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,.12)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: cfg.color, margin: 0 }}>{cfg.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{player.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>&times;</button>
        </div>

        {action === 'cut' && (
          <ImpactBox>
            <Row label="Current Cap Hit" value={formatMoney(c.cap_hit)} />
            <Row label="Dead Money" value={formatMoney(c.dead_cap)} valueColor="var(--red)" />
            <Divider />
            <Row label="Cap Savings" value={formatMoney(c.cap_hit - c.dead_cap)} valueColor="var(--green)" bold />
          </ImpactBox>
        )}
        {action === 'june1' && (
          <ImpactBox>
            <Row label="Current Cap Hit" value={formatMoney(c.cap_hit)} />
            <Row label="Year 1 Dead" value={formatMoney(c.dead_cap / 2)} valueColor="var(--orange)" />
            <Row label="Year 2 Dead" value={formatMoney(c.dead_cap / 2)} valueColor="var(--orange)" />
            <Divider />
            <Row label="Year 1 Savings" value={formatMoney(c.cap_hit - c.dead_cap / 2)} valueColor="var(--green)" bold />
          </ImpactBox>
        )}
        {action === 'restructure' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 }}>Convert to Bonus ($M)</label>
              <input type="number" step="0.1" placeholder={`Max ${c.base_salary?.toFixed(1)}`} value={restructureAmt} onChange={e => setRestructureAmt(e.target.value)} style={inputStyle} />
            </div>
            <ImpactBox>
              <Row label="Current Cap Hit" value={formatMoney(c.cap_hit)} />
              {(() => { const cv = parseFloat(restructureAmt) || c.base_salary * 0.5; const nh = c.cap_hit - cv + cv / (c.years || 3); return <Row label="Estimated Savings" value={formatMoney(c.cap_hit - nh)} valueColor="var(--green)" bold />; })()}
            </ImpactBox>
          </div>
        )}
        {action === 'extend' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 }}>Years</label>
                <input type="number" min="1" max="6" value={extYears} onChange={e => setExtYears(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 }}>Total Value ($M)</label>
                <input type="number" step="0.1" value={extValue} onChange={e => setExtValue(e.target.value)} placeholder="Auto" style={inputStyle} />
              </div>
            </div>
            <ImpactBox>
              {(() => { const y = parseInt(extYears) || 2; const v = parseFloat(extValue) || c.base_salary * y * 0.9; return <Row label="New Annual Avg" value={`${formatMoney(v / (c.years + y))}/yr`} valueColor="var(--green)" bold />; })()}
            </ImpactBox>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} className="gl-btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>Cancel</button>
          <button onClick={handleConfirm} className="gl-btn" style={{ padding: '8px 20px', fontSize: 12, background: cfg.btnBg, color: cfg.btnFg, borderRadius: 10 }}>{cfg.btn}</button>
        </div>
      </div>
    </div>
  );
}

function ImpactBox({ children }) {
  return <div style={{ background: '#f7f8f9', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>{children}</div>;
}

function Row({ label, value, valueColor, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, borderTop: bold ? '1px solid var(--border)' : 'none', marginTop: bold ? 6 : 0, paddingTop: bold ? 8 : 3 }}>
      <span style={{ color: bold ? 'var(--text)' : 'var(--text-secondary)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: valueColor || 'var(--text)' }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border-light)', margin: '4px 0' }} />;
}
