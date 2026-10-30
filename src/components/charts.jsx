import { useState, useId, useRef, useEffect } from 'react';
import { fmt } from '../lib/pricing.js';

/**
 * Barras horizontais com uma só série, linhas de referência, tooltip ao passar e tabela equivalente.
 * rows: [{ label, value, lo?, hi?, tone: 'main'|'muted'|'warn', note? }]
 * refs: [{ value, label }]
 */
export function HBars({ title, sub, unit, rows, refs = [], max, decimals = 0, table }) {
  const [hover, setHover] = useState(null);
  const id = useId(); const box = useRef(); const [cw, setCw] = useState(640);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(([e]) => setCw(Math.round(e.contentRect.width) || 640)); ro.observe(el); return () => ro.disconnect(); }, []);
  const narrow = cw < 480;                                   // em ecrãs estreitos o rótulo vai por cima da barra, em tamanho real
  const W = cw, LW = narrow ? 0 : 200, RW = 56, BH = narrow ? 18 : 22, GAP = narrow ? 34 : 22, TOP = narrow ? 44 : 26, BOT = 30;
  const H = TOP + rows.length * (BH + GAP) - GAP + BOT;
  const mx = max ?? Math.max(...rows.map(r => r.hi ?? r.value), ...refs.map(r => r.value)) * 1.08;
  const x = v => LW + (W - LW - RW) * v / mx;
  const ticks = niceTicks(mx);
  const fill = t => t === 'muted' ? '#9AA0A6' : t === 'warn' ? '#E37400' : '#1A73E8';
  return (
    <figure className="chart" aria-labelledby={`${id}-t`}>
      <figcaption><h3 id={`${id}-t`}>{title}</h3>{sub && <p>{sub}</p>}</figcaption>
      <div className="chart-plot" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${title}. ${rows.map(r => `${r.label}: ${fmt(r.value, decimals)} ${unit}`).join('; ')}.`}>
          {ticks.map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1={TOP - 8} y2={H - BOT + 4} stroke="#E8EAED" /><text x={x(t)} y={H - 10} textAnchor="middle" className="ch-tick">{fmt(t, 0)}</text></g>)}
          {refs.map(rf => (
            <g key={rf.label} className="ch-ref">
              <line x1={x(rf.value)} x2={x(rf.value)} y1={TOP - (narrow ? 34 : 14)} y2={H - BOT + 4} stroke="#202124" strokeWidth="1.5" strokeDasharray="0" />
              <text x={x(rf.value) + (rf.anchor === 'end' ? -6 : 6)} y={TOP - (narrow ? 34 : 14)} textAnchor={rf.anchor || 'start'} className="ch-reflab">{rf.label}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const y = TOP + i * (BH + GAP), w = Math.max(3, x(r.value) - LW);
            return (
              <g key={r.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} className="ch-row">
                <rect x={0} y={y - GAP / 2} width={W} height={BH + GAP} fill="transparent" />
                {narrow ? <text x={0} y={y - 8} className="ch-lab">{r.label}</text> : <text x={LW - 12} y={y + BH / 2 + 5} textAnchor="end" className="ch-lab">{r.label}</text>}
                <path d={`M${LW},${y} h${w - 4} a4,4 0 0 1 4,4 v${BH - 8} a4,4 0 0 1 -4,4 h${-(w - 4)} z`} fill={fill(r.tone)} opacity={hover === null || hover === i ? 1 : 0.45} />
                {r.lo != null && r.hi != null && <line x1={x(r.lo)} x2={x(r.hi)} y1={y + BH / 2} y2={y + BH / 2} stroke="#202124" strokeWidth="2" strokeLinecap="round" opacity=".55" />}
                <text x={Math.max(x(r.value), r.hi ? x(r.hi) : 0) + 8} y={y + BH / 2 + 5} className="ch-val">{fmt(r.value, decimals)}{r.tone === 'warn' ? ' ⚠' : ''}</text>
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="ch-tip" style={{ top: `${(TOP + hover * (BH + GAP) - 6) / H * 100}%`, left: `${Math.min(70, x(rows[hover].value) / W * 100)}%` }} role="status">
            <b>{rows[hover].label}</b>
            <span className="mono">{fmt(rows[hover].value, decimals)} {unit}{rows[hover].lo != null ? ` (${fmt(rows[hover].lo, decimals)}–${fmt(rows[hover].hi, decimals)})` : ''}</span>
            {rows[hover].note && <small>{rows[hover].note}</small>}
          </div>
        )}
      </div>
      <details className="ch-table">
        <summary>Ver os números em tabela</summary>
        <table>
          <thead><tr><th>{table?.[0] || 'Caso'}</th><th>{table?.[1] || unit}</th><th>Nota</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.label}><td>{r.label}</td><td className="mono">{fmt(r.value, decimals)}{r.lo != null ? ` (${fmt(r.lo, decimals)}–${fmt(r.hi, decimals)})` : ''}</td><td>{r.note || ''}</td></tr>)}
            {refs.map(rf => <tr key={rf.label}><td>{rf.label}</td><td className="mono">{fmt(rf.value, decimals)}</td><td>Referência</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

function niceTicks(mx) {
  const raw = mx / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  const step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  const out = []; for (let v = 0; v <= mx + 1e-9; v += step) out.push(v); return out;
}
